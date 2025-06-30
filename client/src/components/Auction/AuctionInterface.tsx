import React, { useState, useEffect, useRef } from 'react';
import { Gavel, User, DollarSign, Trophy, Shuffle, CheckCircle, XCircle, AlertCircle, Clock, Eye, MapPin, Camera, Target } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { useAuth } from '../../contexts/AuthContext';
import { Player } from '../../types';
import * as api from '../../api';

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
    updatePlayer
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
  const [lastSelectedPlayerId, setLastSelectedPlayerId] = useState<string | null>(null);
  const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null);
  const prevAuctionId = useRef<string | null>(null);

  // Find the active auction for the current tournament
  const activeAuction = auctions.find(
    a => a.status === 'active' &&
      a.tournamentId === myTournament?.id &&
      (lastSelectedPlayerId ? a.playerId === lastSelectedPlayerId : true)
  ) || auctions.find(
    a => a.status === 'active' && a.tournamentId === myTournament?.id
  );
  const tournamentTeams = teams.filter(t => t.tournamentId === myTournament?.id);
  const availablePlayers = players.filter(p =>
    (p.status === 'available' || p.status === 'unsold') && p.tournamentId === myTournament?.id
  );

  // Show notification helper
  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  // Function to cancel the current auction and prompt reselection
  const cancelCurrentAuction = async () => {
    if (activeAuction) {
      await completeAuction(activeAuction.id); // Mark as unsold
      showNotification('info', 'Previous auction could not be restored and was canceled. Please select the player again.');
      setShowPlayerSelection(true); // Show the player selection modal
    }
  };

  // Utility function to validate MongoDB ObjectId
  function isValidObjectId(id: string) {
    return typeof id === 'string' && /^[a-f\d]{24}$/i.test(id);
  }

  useEffect(() => {
    if (activeAuction) {
      const auctionId = String(activeAuction.id);
      // Directly extract playerId as a string from activeAuction
      let playerId = '';
      if (activeAuction.playerId && typeof activeAuction.playerId === 'object') {
        playerId = (activeAuction.playerId as any)._id || (activeAuction.playerId as any).id || '';
        if (!playerId) {
          const values = Object.values(activeAuction.playerId);
          playerId = values.find(v => typeof v === 'string') || '';
        }
      } else if (typeof activeAuction.playerId === 'string') {
        playerId = activeAuction.playerId;
      } else if ((activeAuction as any).player && typeof (activeAuction as any).player === 'object') {
        playerId = (activeAuction as any).player._id || (activeAuction as any).player.id || '';
        if (!playerId) {
          const values = Object.values((activeAuction as any).player);
          playerId = values.find(v => typeof v === 'string') || '';
        }
      } else if (typeof (activeAuction as any).player === 'string') {
        playerId = (activeAuction as any).player;
      }
      // Only call the API if playerId is a valid ObjectId
      if (isValidObjectId(playerId)) {
        api.fetchPlayerById(playerId).then(player => {
          setCurrentPlayer(player || null);
        });
      } else {
        cancelCurrentAuction();
        setCurrentPlayer(null);
      }
      setCurrentBid(activeAuction.currentBid || 0);
      setCurrentBidder(activeAuction.currentBidder || null);
      setAuctionStatus('active');
      // Only set bidAmount if auction changed
      if (auctionId !== prevAuctionId.current) {
        const initialBid = Math.max(
          currentPlayer?.basePrice ?? 0,
          activeAuction?.currentBid ?? 0
        );
        setBidAmount(initialBid.toString());
        prevAuctionId.current = auctionId;
      }
    } else {
      setAuctionStatus('idle');
      setCurrentPlayer(null);
      setBidAmount('');
      prevAuctionId.current = null;
    }
  }, [activeAuction, players]);

  const getRandomPlayer = () => {
    if (availablePlayers.length === 0) return null;
    const randomIndex = Math.floor(Math.random() * availablePlayers.length);
    return availablePlayers[randomIndex];
  };

  const startRandomAuction = async () => {
    const randomPlayer = getRandomPlayer();
    if (randomPlayer) {
      const auction = await startAuction(randomPlayer.id);
      if (auction) {
        showNotification('info', `Auction started for ${randomPlayer.name}`);
      } else {
        showNotification('error', 'Failed to start auction');
      }
    } else {
      showNotification('error', 'No available players for auction');
    }
  };

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

  const handleBid = async (teamId: string, amount: number) => {
    if (!activeAuction) return;

    // Log the payload for debugging
    console.log('Placing bid with:', {
      auctionId: activeAuction.id,
      teamId,
      amount
    });

    try {
      const success = await placeBid(activeAuction.id, teamId, amount);
      if (success) {
        showNotification('success', `Bid placed successfully: ${formatCurrency(amount)}`);
        setCurrentBid(amount);
        setCurrentBidder(teamId);
      } else {
        showNotification('error', 'Failed to place bid');
      }
    } catch (error) {
      showNotification('error', 'Error placing bid');
      console.error('Error placing bid:', error);
    }
  };

  const handleQuickBid = (teamId: string) => {
    const increment = currentBid < 5000000 ? 500000 : 1000000;
    const nextBid = currentBid + increment;
    handleBid(teamId, nextBid);
  };

  const handleCustomBid = () => {
    if (!bidAmount || !selectedTeam) return;
    const amount = parseInt(bidAmount);
    const team = tournamentTeams.find(t => t.id === selectedTeam);
    if (amount <= currentBid) {
      showNotification('error', 'Bid must be higher than current bid');
      return;
    }
    if (team && amount > team.remainingBudget) {
      showNotification('error', 'Selected team does not have enough balance to bid this amount');
      return;
    }
    handleBid(selectedTeam, amount);
    setBidAmount('');
    setSelectedTeam('');
  };

  const handleAuctionEnd = async (sold: boolean) => {
    if (!activeAuction) return;

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
      showNotification('error', 'Error completing auction');
      console.error('Error completing auction:', error);
    }
  };

  const handleResetAuction = () => {
    if (window.confirm('Are you sure you want to reset all player statuses and start fresh? This will clear all auction history.')) {
      resetPlayerStatuses();
      showNotification('success', 'Auction reset successfully');
    }
  };

  const formatCurrency = (amount: number) => {
    if (amount === 0) return '₹0';
    if (amount >= 10000000) {
      return `₹${(amount / 10000000).toFixed(1)}Cr`;
    } else if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(1)}L`;
    }
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getCurrentBidderTeam = () => {
    return currentBidder ? teams.find(t => t.id === currentBidder) : null;
  };

  const canBid = user?.role === 'auctioneer';
  const canView = user?.role === 'viewer' || user?.role === 'auctioneer';

  // Get auction history for current tournament
  const auctionHistory = auctions.filter(a =>
    a.tournamentId === myTournament?.id &&
    (a.status === 'sold' || a.status === 'unsold')
  ).sort((a, b) => new Date(b.endTime || '').getTime() - new Date(a.endTime || '').getTime());

  // Handler to mark a player as unsold
  const handleMarkUnsold = async (playerId: string) => {
    try {
      console.log('Marking player as unsold:', playerId);
      const result = await api.markPlayerUnsold(playerId);
      console.log('Mark unsold result:', result);
      showNotification('success', 'Player marked as unsold successfully');
      // No need to refetch or set local state, context will update automatically via socket
    } catch (error: any) {
      console.error('Error marking player as unsold:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to mark player as unsold';
      showNotification('error', errorMessage);
    }
  };

  // Add this function to handle the current bid button
  const handleCurrentBid = async () => {
    if (!activeAuction || !bidAmount || !selectedTeam) return;
    // Ensure auctionId and teamId are strings
    let auctionId = activeAuction.id;
    if (auctionId && typeof auctionId === 'object') {
      auctionId = (auctionId as any)._id || (auctionId as any).id || (auctionId as any).toString();
    }
    let teamId = selectedTeam;
    if (teamId && typeof teamId === 'object') {
      teamId = (teamId as any)._id || (teamId as any).id || (teamId as any).toString();
    }
    auctionId = String(auctionId);
    teamId = String(teamId);
    try {
      console.log('Placing bid with:', { auctionId, teamId, amount: Number(bidAmount) });
      await placeBid(auctionId, teamId, Number(bidAmount));
      showNotification('success', 'Current bid updated!');
    } catch (error) {
      showNotification('error', 'Failed to update current bid');
    }
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
                  onClick={startRandomAuction}
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
                      {player.photo ? (
                        <img
                          src={player.photo}
                          alt={player.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            target.nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                      ) : <User className="w-4 h-4 text-white" />}
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">{player.name}</h4>
                      <p className="text-sm text-gray-600">{player.role}</p>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600">
                    <p>Base Price: {formatCurrency(player.basePrice || 0)}</p>
                    {player.station && (
                      <div className="flex items-center space-x-1 mt-1">
                        <MapPin className="w-3 h-3" />
                        <span>{player.station}</span>
                      </div>
                    )}
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
                          const disabled = !!bidAmount && parseInt(bidAmount) > team.remainingBudget;
                          return (
                            <option key={team.id} value={team.id} disabled={disabled}>
                              {team.name} (Budget: {formatCurrency(team.remainingBudget)}){disabled ? ' - Insufficient Balance' : ''}
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
      {tournamentTeams.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Team Budgets</h3>
          <div className="space-y-4">
            {tournamentTeams.map(team => (
              <div key={team.id} className="mb-4 bg-white rounded-lg shadow-sm border-2 p-4 transition-all duration-200 hover:shadow-md"
                style={{ borderColor: team.color + '30' }}>
                <div className="flex justify-between items-center cursor-pointer" onClick={() => setExpandedTeamId(expandedTeamId === team.id ? null : team.id)}>
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden mr-3 shadow-sm"
                      style={{ backgroundColor: team.color + '20', border: `2px solid ${team.color + '40'}` }}>
                      {team.logo ? (
                        <img src={team.logo} alt={team.name} className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-5 h-5" style={{ color: team.color }} />
                      )}
                    </div>
                    <div>
                      <div className="font-semibold text-lg" style={{ color: team.color }}>{team.name}</div>
                      <div className="text-sm text-gray-600">{team.owner}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-lg" style={{ color: team.color }}>{formatCurrency(team.remainingBudget)}</div>
                    <div className="text-xs text-gray-500">{((1 - team.remainingBudget / team.budget) * 100).toFixed(1)}% used</div>
                    <div className="w-24 h-2 bg-gray-200 rounded-full mt-1">
                      <div
                        className="h-2 rounded-full transition-all duration-300"
                        style={{
                          width: `${((1 - team.remainingBudget / team.budget) * 100)}%`,
                          backgroundColor: team.color
                        }}
                      />
                    </div>
                  </div>
                </div>
                {expandedTeamId === team.id && (
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {players.filter(p => p.team === team.id).map(player => (
                      <div key={player.id} className="bg-gray-50 rounded-lg p-3 flex items-center justify-between border-l-4 transition-all duration-200 hover:shadow-sm"
                        style={{ borderLeftColor: team.color }}>
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center overflow-hidden">
                            {player.photo ? (
                              <img src={player.photo} alt={player.name} className="w-full h-full object-cover" />
                            ) : <User className="w-4 h-4 text-white" />}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{player.name}</div>
                            <div className="text-xs text-gray-600">{player.role}</div>
                            <div className="text-xs font-semibold" style={{ color: team.color }}>
                              Price: {formatCurrency(player.price || 0)}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkUnsold(player.id);
                          }}
                          className="ml-4 px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-xs transition-colors"
                        >
                          Mark Unsold
                        </button>
                      </div>
                    ))}
                    {players.filter(p => p.team === team.id).length === 0 && (
                      <div className="text-gray-500 text-sm col-span-full text-center py-4">
                        <User className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                        No players in this team yet.
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AuctionInterface;