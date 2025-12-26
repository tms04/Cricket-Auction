import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Gavel, User, Trophy, Shuffle, CheckCircle, XCircle, AlertCircle, MapPin, Target, Trash2 } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { useAuth } from '../../contexts/AuthContext';
import { Player, Team } from '../../types';
import * as api from '../../api';

const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0
});

const formatCurrency = (amount: number) => currencyFormatter.format(amount);

type SoldPlayersByTeam = Record<string, Player[]>;
const toNumber = (value?: number | string | null) => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
};

const AuctionInterface: React.FC = () => {
  const {
    players,
    teams,
    auctions,
    myTournament,
    startAuction,
    placeBid,
    completeAuction,
    resetPlayerStatuses,
    fetchPlayers
  } = useApp();
  const { user } = useAuth();

  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [auctionStatus, setAuctionStatus] = useState<'idle' | 'active' | 'completed'>('idle');
  const [currentBid, setCurrentBid] = useState(0);
  const [currentBidder, setCurrentBidder] = useState<string | null>(null);
  const [bidAmount, setBidAmount] = useState('');
  const [selectedTeam, setSelectedTeam] = useState('');
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info', message: string } | null>(null);
  const [showPlayerSelection, setShowPlayerSelection] = useState(false);
  const [showRandomSelector, setShowRandomSelector] = useState(false);
  const [lastSelectedPlayerId, setLastSelectedPlayerId] = useState<string | null>(null);
  const prevAuctionId = useRef<string | null>(null);
  const basePriceRef = useRef(0);

  // Find the active auction for the current tournament
  const activeAuction = auctions.find(
    a => a.status === 'active' &&
      a.tournamentId === myTournament?.id &&
      (lastSelectedPlayerId ? a.playerId === lastSelectedPlayerId : true)
  ) || auctions.find(
    a => a.status === 'active' && a.tournamentId === myTournament?.id
  );
  const tournamentTeams = useMemo(
    () => teams.filter(t => t.tournamentId === myTournament?.id),
    [teams, myTournament?.id]
  );
  const availablePlayers = useMemo(
    () => players.filter(p =>
      (p.status === 'available' || p.status === 'unsold') && p.tournamentId === myTournament?.id
    ),
    [players, myTournament?.id]
  );
  const categoryOptions = useMemo(() => {
    const fromTournament = (myTournament?.categories ?? []).map(c => c.category).filter(Boolean);
    const fromPlayers = players.map(p => p.category).filter(Boolean) as string[];
    return Array.from(new Set([...fromTournament, ...fromPlayers])).sort();
  }, [myTournament?.categories, players]);

  // Show notification helper
  const showNotification = useCallback((type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  }, []);

  // Function to cancel the current auction and prompt reselection
  const cancelCurrentAuction = useCallback(async () => {
    if (activeAuction) {
      if (!isValidObjectId(String(activeAuction.id))) {
        showNotification('error', 'Invalid auction id; cannot cancel current auction.');
        return;
      }
      await completeAuction(activeAuction.id);
      showNotification('info', 'Previous auction could not be restored and was canceled. Please select the player again.');
      setShowPlayerSelection(true);
    }
  }, [activeAuction, completeAuction, showNotification]);

  // Utility function to validate MongoDB ObjectId
  const isValidObjectId = (id: string) => typeof id === 'string' && /^[a-f\d]{24}$/i.test(id);

  useEffect(() => {
    if (!activeAuction) {
      setAuctionStatus('idle');
      setCurrentPlayer(null);
      setBidAmount('');
      prevAuctionId.current = null;
      return;
    }

    const auctionId = String(activeAuction.id);
    const playerId = activeAuction.playerId;
    if (!playerId) {
      cancelCurrentAuction();
      setCurrentPlayer(null);
      return;
    }

    const contextualPlayer = players.find(p => p.id === playerId);
    let effectiveBasePrice = basePriceRef.current;
    if (contextualPlayer) {
      effectiveBasePrice = contextualPlayer.basePrice ?? basePriceRef.current;
      basePriceRef.current = effectiveBasePrice;
      setCurrentPlayer(contextualPlayer);
    } else {
      api.fetchPlayerById(playerId, myTournament?.id)
        .then(player => {
          if (player) {
            const playerBase = player.basePrice ?? basePriceRef.current;
            basePriceRef.current = playerBase;
            setCurrentPlayer(player);
          } else {
            setCurrentPlayer(null);
          }
        })
        .catch(() => cancelCurrentAuction());
    }

    setCurrentBid(activeAuction.currentBid || 0);
    setCurrentBidder(activeAuction.currentBidder || null);
    setAuctionStatus('active');
    if (auctionId !== prevAuctionId.current) {
      const initialBid = Math.max(effectiveBasePrice, activeAuction.currentBid || 0);
      setBidAmount(initialBid.toString());
      prevAuctionId.current = auctionId;
    }
  }, [activeAuction, players, cancelCurrentAuction, myTournament?.id]);

  type RandomStatus = 'available' | 'unsold' | 'unsold1';

  const filterPlayersForRandom = useCallback(
    (category: string, status: RandomStatus) => {
      const targetCategory = category.toLowerCase();
      return players.filter(p =>
        p.tournamentId === myTournament?.id &&
        (p.category ?? '').toLowerCase() === targetCategory &&
        p.status === status
      );
    },
    [players, myTournament?.id]
  );

  const startRandomAuctionWithFilter = useCallback(
    async (category: string, status: RandomStatus) => {
      const pool = filterPlayersForRandom(category, status);
      if (!pool.length) {
        showNotification('error', `No ${status} players found in Category ${category}`);
        return;
      }
      const randomIndex = Math.floor(Math.random() * pool.length);
      const randomPlayer = pool[randomIndex];
      setLastSelectedPlayerId(randomPlayer.id);
      const auction = await startAuction(randomPlayer.id);
      if (auction) {
        showNotification('info', `Auction started for ${randomPlayer.name} (${category} - ${status})`);
        setShowRandomSelector(false);
      } else {
        showNotification('error', 'Failed to start auction');
      }
    },
    [filterPlayersForRandom, showNotification, startAuction]
  );

  const getPoolCount = useCallback(
    (category: string, status: RandomStatus) => filterPlayersForRandom(category, status).length,
    [filterPlayersForRandom]
  );

  const startSelectedPlayerAuction = async (playerId: string) => {
    setLastSelectedPlayerId(playerId);
    const auction = await startAuction(playerId);
    if (auction) {
      const player = players.find(p => p.id === playerId);
      setCurrentPlayer(player || null);
      setCurrentBid(auction.currentBid || 0);
      setCurrentBidder(auction.currentBidder || null);
      setAuctionStatus('active');
      showNotification('info', `Auction started for ${player?.name}`);
      setShowPlayerSelection(false);
    } else {
      showNotification('error', 'Failed to start auction');
    }
  };

  const handleAuctionEnd = async (sold: boolean) => {
    if (!activeAuction) return;
    if (!isValidObjectId(String(activeAuction.id))) {
      showNotification('error', 'Invalid auction id. Please restart the auction.');
      return;
    }

    try {
      let success = false;
      if (sold) {
        // Send selectedTeam and bidAmount as the final sale info
        success = await completeAuction(activeAuction.id, selectedTeam, Number(bidAmount));
      } else {
        // Mark as unsold
        success = await completeAuction(activeAuction.id);
      }
      if (success) {
        setAuctionStatus('completed');
        const player = players.find(p => p.id === activeAuction.playerId);
        const team = selectedTeam ? teams.find(t => t.id === selectedTeam) : null;
        if (sold && team && player) {
          showNotification('success', `${player.name} sold to ${team.name} for ${formatCurrency(Number(bidAmount))}`);
        } else if (player) {
          showNotification('info', `${player.name} went unsold`);
        }
        setTimeout(() => {
          setAuctionStatus('idle');
          setCurrentPlayer(null);
          setCurrentBid(0);
          setCurrentBidder(null);
          setBidAmount('');
          setSelectedTeam('');
        }, 3000);
      } else {
        showNotification('error', 'Failed to complete auction');
      }
    } catch (error) {
      console.error('Error completing auction:', error);
      showNotification('error', 'Error completing auction');
    }
  };

  const handleResetAuction = async () => {
    if (window.confirm('Are you sure you want to reset all player statuses and start fresh? This will clear all auction history.')) {
      await resetPlayerStatuses();
      showNotification('success', 'Auction reset successfully');
    }
  };

  const handleDeleteAllAuctions = async () => {
    if (!window.confirm('Are you sure you want to delete ALL auctions? This cannot be undone.')) return;
    try {
      await api.deleteAllAuctions();
      showNotification('success', 'All auctions deleted!');
      // Optionally refresh auction state here
    } catch (error) {
      if (error instanceof Error) {
        showNotification('error', error.message || 'Failed to delete all auctions');
      } else {
        showNotification('error', 'Failed to delete all auctions');
      }
    }
  };

  const handleRevertUnsold1Category = async (category: string) => {
    const confirmRevert = window.confirm(`Move all "${category}" UNSOLD1 players back to UNSOLD?`);
    if (!confirmRevert) return;
    try {
      const result = await api.revertUnsold1Category(category, myTournament?.id);
      showNotification('success', `Moved ${result.modified} player(s) from Unsold1 to Unsold`);
      await fetchPlayers?.();
    } catch (error) {
      if (error instanceof Error) {
        showNotification('error', error.message || 'Failed to move players');
      } else {
        showNotification('error', 'Failed to move players');
      }
    }
  };

  const handleRevertUnsoldCategory = async (category: string) => {
    const confirmRevert = window.confirm(`Revert all "${category}" UNSOLD players back to AVAILABLE?`);
    if (!confirmRevert) return;
    try {
      const result = await api.revertUnsoldCategory(category, myTournament?.id);
      showNotification('success', `Reverted ${result.modified} player(s) to available`);
      await fetchPlayers();
    } catch (error) {
      if (error instanceof Error) {
        showNotification('error', error.message || 'Failed to revert players');
      } else {
        showNotification('error', 'Failed to revert players');
      }
    }
  };

  const getCurrentBidderTeam = () => {
    return currentBidder ? teams.find(t => t.id === currentBidder) : null;
  };

  const canBid = user?.role === 'auctioneer';

  // Get auction history for current tournament
  // Handler to mark a player as unsold
  const handleMarkUnsold = async (playerId: string) => {
    try {
      console.log('Marking player as unsold:', playerId);
      const result = await api.markPlayerUnsold(playerId);
      console.log('Mark unsold result:', result);
      showNotification('success', 'Player marked as unsold successfully');
      // No need to refetch or set local state, context will update automatically via sockey
      // t
    } catch (error) {
      if (error instanceof Error) {
        console.error('Error marking player as unsold:', error);
        showNotification('error', error.message || 'Failed to mark player as unsold');
      } else {
        showNotification('error', 'Failed to mark player as unsold');
      }
    }
  };

  // Add this function to handle the current bid button
  const handleCurrentBid = async () => {
    if (!activeAuction || !bidAmount || !selectedTeam) return;
    const amount = Number(bidAmount);
    if (Number.isNaN(amount)) {
      showNotification('error', 'Enter a valid numeric bid');
      return;
    }
    try {
      await placeBid(activeAuction.id, selectedTeam, amount);
      showNotification('success', 'Current bid updated!');
    } catch {
      showNotification('error', 'Failed to update current bid');
    }
  };

  // New state for teams and sold players
  const [teamList, setTeamList] = useState<Team[]>([]);
  const [soldPlayersByTeam, setSoldPlayersByTeam] = useState<SoldPlayersByTeam>({});
  const [loadingTeams, setLoadingTeams] = useState(false);

  // Fetch teams and sold players for the current tournament
  const fetchTeamsAndSoldPlayers = useCallback(async () => {
    if (!myTournament) return;
    setLoadingTeams(true);
    try {
      const teamRes = await api.fetchTeams(1, 100, myTournament.id);
      setTeamList(teamRes.teams);
      const playerRes = await api.fetchPlayers(1, 500, myTournament.id);
      const soldPlayers = playerRes.players.filter((p) => p.status === 'sold' && p.team);
      const byTeam: SoldPlayersByTeam = {};
      soldPlayers.forEach((p) => {
        if (!p.team) return;
        const teamId = p.team;
        if (!byTeam[teamId]) byTeam[teamId] = [];
        byTeam[teamId].push(p);
      });
      setSoldPlayersByTeam(byTeam);
    } catch (error) {
      console.error('Failed to fetch teams or players', error);
      showNotification('error', 'Failed to fetch teams or players');
    } finally {
      setLoadingTeams(false);
    }
  }, [myTournament, showNotification]);

  // Add a refresh button for teams/players
  // Optionally, fetch on mount
  useEffect(() => {
    fetchTeamsAndSoldPlayers();
  }, [fetchTeamsAndSoldPlayers]);

  // Mark player as unsold and refresh
  const handleMarkUnsoldAndRefresh = async (playerId: string) => {
    await handleMarkUnsold(playerId);
    await fetchTeamsAndSoldPlayers();
  };

  if (!myTournament) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Trophy className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No tournament selected</p>
          <p className="text-sm text-gray-500 mt-2">Please contact the master/admin to assign you a tournament</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg flex items-center space-x-2 ${notification.type === 'success' ? 'bg-green-500 text-white' :
          notification.type === 'error' ? 'bg-red-500 text-white' :
            'bg-blue-500 text-white'
          }`}>
          {notification.type === 'success' && <CheckCircle className="w-5 h-5" />}
          {notification.type === 'error' && <XCircle className="w-5 h-5" />}
          {notification.type === 'info' && <AlertCircle className="w-5 h-5" />}
          <span>{notification.message}</span>
        </div>
      )}

      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {canBid ? 'Conduct Auction' : 'View Auction'}
          </h2>
          <p className="text-gray-600">{myTournament.name}</p>
        </div>
        {canBid && (
          <div className="flex space-x-3">
            {auctionStatus === 'idle' && (
              <>
                <button
                  onClick={() => setShowRandomSelector(true)}
                  disabled={availablePlayers.length === 0}
                  className="flex items-center space-x-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Shuffle className="w-4 h-4" />
                  <span>Random Auction</span>
                </button>
                <button
                  onClick={() => setShowPlayerSelection(true)}
                  disabled={availablePlayers.length === 0}
                  className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Target className="w-4 h-4" />
                  <span>Select Player</span>
                </button>
              </>
            )}
            <button
              onClick={handleResetAuction}
              className="flex items-center space-x-2 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors"
            >
              <Trophy className="w-4 h-4" />
              <span>Reset Auction</span>
            </button>
            <button
              onClick={handleDeleteAllAuctions}
              className="flex items-center space-x-2 bg-red-700 text-white px-4 py-2 rounded-lg hover:bg-red-800 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete All Auctions</span>
            </button>
          </div>
        )}
      </div>

      {/* Player Selection Modal */}
      {showPlayerSelection && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-4xl max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Select Player for Auction</h3>
              <button
                onClick={() => setShowPlayerSelection(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {availablePlayers.map((player) => (
                <div key={player.id} className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors cursor-pointer" onClick={() => startSelectedPlayerAuction(player.id)}>
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center overflow-hidden">
                      <span className="w-4 h-4 text-white font-bold text-lg">{player.name[0]}</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">{player.name}</h4>
                      {/* role is not guaranteed in summary, so skip or check existence */}
                    </div>
                  </div>
                  <div className="text-sm text-gray-600">
                    <p>Base Price: {formatCurrency(player.basePrice || 0)}</p>
                  </div>
                </div>
              ))}
            </div>
            {availablePlayers.length === 0 && (
              <div className="text-center py-8">
                <User className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600">No available players for auction</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Random Category Selector */}
      {showRandomSelector && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-3xl max-h-[80vh] overflow-y-auto space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Start Random Auction</h3>
                <p className="text-sm text-gray-600">Pick a category and status to draw a random player.</p>
              </div>
              <button
                onClick={() => setShowRandomSelector(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            {categoryOptions.length === 0 ? (
              <div className="text-center text-gray-600 py-6">
                No categories found for this tournament.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {categoryOptions.map(category => (
                  <div key={category} className="border border-gray-200 rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-gray-900">Category {category}</h4>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {(['available', 'unsold', 'unsold1'] as RandomStatus[]).map(status => {
                        const poolCount = getPoolCount(category, status);
                        const label =
                          status === 'available'
                            ? 'Available'
                            : status === 'unsold'
                              ? 'Unsold'
                              : 'Unsold1';
                        return (
                          <div key={status} className="flex flex-col">
                            <button
                              onClick={() => startRandomAuctionWithFilter(category, status)}
                              disabled={poolCount === 0}
                              className="flex flex-col items-start border border-gray-200 rounded-lg px-3 py-2 hover:border-emerald-500 hover:bg-emerald-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <span className="font-medium text-gray-900">{label}</span>
                              <span className="text-xs text-gray-600">{poolCount} players</span>
                            </button>
                            {status === 'unsold' && (
                              <button
                                onClick={() => handleRevertUnsoldCategory(category)}
                                disabled={poolCount === 0}
                                className="mt-2 text-xs text-left text-blue-600 hover:text-blue-800 disabled:text-gray-400 disabled:cursor-not-allowed"
                              >
                                Revert Unsold → Available
                              </button>
                            )}
                            {status === 'unsold1' && (
                              <button
                                onClick={() => handleRevertUnsold1Category(category)}
                                disabled={poolCount === 0}
                                className="mt-2 text-xs text-left text-purple-600 hover:text-purple-800 disabled:text-gray-400 disabled:cursor-not-allowed"
                              >
                                Move Unsold1 → Unsold
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Auction Status */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className={`w-3 h-3 rounded-full ${auctionStatus === 'active' ? 'bg-green-500 animate-pulse' :
              auctionStatus === 'completed' ? 'bg-blue-500' : 'bg-gray-400'
              }`} />
            <span className="font-medium text-gray-900">
              {auctionStatus === 'active' ? 'Auction Active' :
                auctionStatus === 'completed' ? 'Auction Completed' : 'Auction Idle'}
            </span>
          </div>
        </div>

        {currentPlayer && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Player Details */}
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center overflow-hidden">
                  {currentPlayer.photo ? (
                    <img src={currentPlayer.photo} alt={currentPlayer.name} className="w-full h-full object-cover" />
                  ) : <User className="w-4 h-4 text-white" />}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{currentPlayer.name}</h3>
                  <div className="flex flex-col gap-1 mt-1 items-start">
                    {currentPlayer.role && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {currentPlayer.role.toUpperCase()}
                      </span>
                    )}
                    {currentPlayer.age !== undefined && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        Age: {currentPlayer.age}
                      </span>
                    )}
                    {currentPlayer.station && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <MapPin className="w-3 h-3 mr-1 inline" />{currentPlayer.station}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {currentPlayer.previousYearTeam && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        Previous Team: {currentPlayer.previousYearTeam}
                      </span>
                    )}
                  </div>
                  <div className="mt-2 text-sm text-gray-600">
                    <span className="font-medium">Base Price:</span> {formatCurrency(currentPlayer.basePrice || 0)}
                  </div>
                  <div className="mt-2 text-lg font-semibold text-yellow-700">
                    Current Bid: {formatCurrency(currentBid)}
                  </div>
                  <div className="mt-1 text-md font-semibold text-yellow-800">
                    Current Bidder: {(() => { const team = getCurrentBidderTeam(); return team ? team.name : '-'; })()}
                  </div>
                </div>
              </div>
            </div>

            {/* Bidding Section */}
            {currentPlayer && auctionStatus === 'active' && canBid && (
              <div className="space-y-4">
                <div className="bg-green-50 rounded-lg p-4">
                  <h4 className="font-medium text-green-900 mb-3">Complete Auction</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-green-700 mb-1">Final Price (₹)</label>
                      <input
                        type="number"
                        value={bidAmount}
                        onChange={(e) => setBidAmount(e.target.value)}
                        placeholder="Final selling price"
                        className="w-full px-3 py-2 border border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                        min={currentPlayer.basePrice || 0}
                        step="100000"
                      />
                      <div className="flex flex-wrap gap-2 mt-2">
                        {[10000, 20000, 50000, 100000].map((inc) => (
                          <button
                            key={inc}
                            type="button"
                            className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded hover:bg-emerald-200 border border-emerald-300"
                            onClick={() => {
                              const current = parseInt(bidAmount) || 0;
                              setBidAmount((current + inc).toString());
                            }}
                          >
                            +{inc.toLocaleString('en-IN')}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-green-700 mb-1">Selling Team</label>
                      <select
                        value={selectedTeam}
                        onChange={(e) => setSelectedTeam(e.target.value)}
                        className="w-full px-3 py-2 border border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      >
                        <option value="">Select winning team</option>
                        {tournamentTeams.map((team) => {
                          const remainingBudget = toNumber(team.remainingBudget);
                          const disabled = !!bidAmount && Number(bidAmount) > remainingBudget;
                          return (
                            <option key={team.id} value={team.id} disabled={disabled}>
                              {team.name} (Budget: {formatCurrency(remainingBudget)}){disabled ? ' - Insufficient Balance' : ''}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                    <div className="flex items-end space-x-2">
                      <button
                        onClick={handleCurrentBid}
                        disabled={!bidAmount || !selectedTeam}
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Current Bid
                      </button>
                      <button
                        onClick={() => handleAuctionEnd(true)}
                        disabled={!bidAmount || !selectedTeam}
                        className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        SOLD
                      </button>
                      <button
                        onClick={() => handleAuctionEnd(false)}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                      >
                        UNSOLD
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {auctionStatus === 'idle' && (
          <div className="text-center py-12">
            <Gavel className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Auction</h3>
            <p className="text-gray-600">
              {canBid ? 'Choose "Random Auction" or "Select Player" to begin' : 'Waiting for auction to start'}
            </p>
            {availablePlayers.length === 0 && (
              <p className="text-sm text-orange-600 mt-2">
                No available players. Use "Reset Auction" to start fresh.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Available Players Summary */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Auction Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div className="bg-blue-50 rounded-lg p-3">
            <p className="text-2xl font-bold text-blue-600">{availablePlayers.length}</p>
            <p className="text-sm text-blue-700">Available</p>
          </div>
          <div className="bg-green-50 rounded-lg p-3">
            <p className="text-2xl font-bold text-green-600">
              {players.filter(p => p.status === 'sold' && p.tournamentId === myTournament.id).length}
            </p>
            <p className="text-sm text-green-700">Sold</p>
          </div>
          <div className="bg-red-50 rounded-lg p-3">
            <p className="text-2xl font-bold text-red-600">
              {players.filter(p => p.status === 'unsold' && p.tournamentId === myTournament.id).length}
            </p>
            <p className="text-sm text-red-700">Unsold</p>
          </div>
          <div className="bg-purple-50 rounded-lg p-3">
            <p className="text-2xl font-bold text-purple-600">
              {players.filter(p => p.tournamentId === myTournament.id).length}
            </p>
            <p className="text-sm text-purple-700">Total</p>
          </div>
        </div>
      </div>

      {/* Team Budgets */}
      {myTournament && teamList.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Team Budgets</h3>
            <button
              onClick={fetchTeamsAndSoldPlayers}
              className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
              disabled={loadingTeams}
            >
              {loadingTeams ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
          <div className="space-y-4">
            {teamList.map(team => {
              const remainingBudget = toNumber(team.remainingBudget);
              const totalBudget = Math.max(toNumber(team.budget), 1);
              const usedPercentage = ((totalBudget - remainingBudget) / totalBudget) * 100;
              const safeColor = team.color || '#888';
              return (
                <div key={team.id} className="mb-4 bg-white rounded-lg shadow-sm border-2 p-4 transition-all duration-200 hover:shadow-md"
                  style={{ borderColor: safeColor + '30' }}>
                  <div className="flex justify-between items-center cursor-pointer">
                    <div className="flex items-center">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden mr-3 shadow-sm"
                        style={{ backgroundColor: safeColor + '20', border: `2px solid ${safeColor + '40'}` }}>
                        {team.logo ? (
                          <img src={team.logo} alt={team.name} className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-5 h-5" style={{ color: safeColor }} />
                        )}
                      </div>
                      <div>
                        <div className="font-semibold text-lg" style={{ color: safeColor }}>{team.name}</div>
                        <div className="text-sm text-gray-600">{team.owner}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-lg" style={{ color: safeColor }}>{formatCurrency(remainingBudget)}</div>
                      <div className="text-xs text-gray-500">{usedPercentage.toFixed(1)}% used</div>
                      <div className="w-24 h-2 bg-gray-200 rounded-full mt-1">
                        <div
                          className="h-2 rounded-full transition-all duration-300"
                          style={{
                            width: `${usedPercentage}%`,
                            backgroundColor: safeColor
                          }}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {(soldPlayersByTeam[team.id] || []).map(player => (
                      <div key={player.id} className="bg-gray-50 rounded-lg p-3 flex items-center justify-between border-l-4 transition-all duration-200 hover:shadow-sm"
                        style={{ borderLeftColor: safeColor }}>
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center overflow-hidden">
                            <span className="w-4 h-4 text-white font-bold text-lg">{player.name[0]}</span>
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{player.name}</div>
                            <div className="text-xs font-semibold" style={{ color: safeColor }}>
                              Price: {formatCurrency(player.price || 0)}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkUnsoldAndRefresh(player.id);
                          }}
                          className="ml-4 px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-xs transition-colors"
                        >
                          Mark Unsold
                        </button>
                      </div>
                    ))}
                    {(soldPlayersByTeam[team.id] || []).length === 0 && (
                      <div className="text-gray-500 text-sm col-span-full text-center py-4">
                        <User className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                        No players in this team yet.
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default AuctionInterface;