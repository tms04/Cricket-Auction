import React, { useState, useEffect } from 'react';
import { Gavel, User, DollarSign, Trophy, Shuffle, CheckCircle, XCircle, AlertCircle, Clock, Eye, MapPin, Camera, Target } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { useAuth } from '../../contexts/AuthContext';
import { Player } from '../../types';

const AuctionInterface: React.FC = () => {
  const {
    players,
    teams,
    auctions,
    activeTournament,
    startAuction,
    placeBid,
    completeAuction,
    resetPlayerStatuses
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

  const activeAuction = auctions.find(a => a.status === 'active');
  const tournamentTeams = teams.filter(t => t.tournamentId === activeTournament?.id);
  const availablePlayers = players.filter(p =>
    p.status === 'available' && p.tournamentId === activeTournament?.id
  );

  // Show notification helper
  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  useEffect(() => {
    if (activeAuction) {
      const player = players.find(p => p.id === activeAuction.playerId);
      setCurrentPlayer(player || null);
      setCurrentBid(activeAuction.currentBid);
      setCurrentBidder(activeAuction.currentBidder || null);
      setAuctionStatus('active');
      // Set base price as default bid amount
      setBidAmount(player?.basePrice.toString() || '');
    } else {
      setAuctionStatus('idle');
      setCurrentPlayer(null);
      setBidAmount('');
    }
  }, [activeAuction, players]);

  const getRandomPlayer = () => {
    if (availablePlayers.length === 0) return null;
    const randomIndex = Math.floor(Math.random() * availablePlayers.length);
    return availablePlayers[randomIndex];
  };

  const startRandomAuction = () => {
    const randomPlayer = getRandomPlayer();
    if (randomPlayer) {
      const auction = startAuction(randomPlayer.id);
      if (auction) {
        showNotification('info', `Auction started for ${randomPlayer.name}`);
      } else {
        showNotification('error', 'Failed to start auction');
      }
    } else {
      showNotification('error', 'No available players for auction');
    }
  };

  const startSelectedPlayerAuction = (playerId: string) => {
    const auction = startAuction(playerId);
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

  const handleBid = (teamId: string, amount: number) => {
    if (!activeAuction) {
      showNotification('error', 'No active auction');
      return;
    }

    const team = teams.find(t => t.id === teamId);
    if (!team) {
      showNotification('error', 'Team not found');
      return;
    }

    if (amount <= currentBid) {
      showNotification('error', 'Bid must be higher than current bid');
      return;
    }

    if (team.remainingBudget < amount) {
      showNotification('error', `${team.name} doesn't have enough budget`);
      return;
    }

    const success = placeBid(activeAuction.id, teamId, amount);
    if (success) {
      showNotification('success', `${team.name} placed bid of ₹${(amount / 100000).toFixed(1)}L`);
    } else {
      showNotification('error', 'Failed to place bid');
    }
  };

  const handleQuickBid = (teamId: string) => {
    const increment = currentBid < 5000000 ? 500000 : 1000000; // 5L or 10L increment
    const amount = currentBid + increment;
    handleBid(teamId, amount);
  };

  const handleCustomBid = () => {
    const amount = parseInt(bidAmount);
    if (!selectedTeam) {
      showNotification('error', 'Please select a team');
      return;
    }
    if (isNaN(amount) || amount < 0) {
      showNotification('error', 'Please enter a valid bid amount');
      return;
    }
    handleBid(selectedTeam, amount);
    setBidAmount('');
    setSelectedTeam('');
  };

  const handleAuctionEnd = () => {
    if (activeAuction) {
      const success = completeAuction(activeAuction.id, currentBidder || undefined);
      if (success) {
        setAuctionStatus('completed');

        const player = players.find(p => p.id === activeAuction.playerId);
        const team = currentBidder ? teams.find(t => t.id === currentBidder) : null;

        if (team && player) {
          showNotification('success', `${player.name} sold to ${team.name} for ₹${(currentBid / 100000).toFixed(1)}L`);
        } else if (player) {
          showNotification('info', `${player.name} went unsold`);
        }

        setTimeout(() => {
          setAuctionStatus('idle');
          setCurrentPlayer(null);
          setCurrentBid(0);
          setCurrentBidder(null);
          setBidAmount('');
        }, 3000);
      }
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
    a.tournamentId === activeTournament?.id &&
    (a.status === 'sold' || a.status === 'unsold')
  ).sort((a, b) => new Date(b.endTime || '').getTime() - new Date(a.endTime || '').getTime());

  if (!activeTournament) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Trophy className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No active tournament selected</p>
          <p className="text-sm text-gray-500 mt-2">Please select an active tournament from the Master panel</p>
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
          <p className="text-gray-600">{activeTournament.name}</p>
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
                      ) : null}
                      <User className={`w-5 h-5 text-white ${player.photo ? 'hidden' : ''}`} />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">{player.name}</h4>
                      <p className="text-sm text-gray-600">{player.role} • {player.category}</p>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600">
                    <p>Base Price: {formatCurrency(player.basePrice)}</p>
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
                    <img
                      src={currentPlayer.photo}
                      alt={currentPlayer.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        target.nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                  ) : null}
                  <User className={`w-8 h-8 text-white ${currentPlayer.photo ? 'hidden' : ''}`} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{currentPlayer.name}</h3>
                  <div className="flex flex-col gap-1 mt-1 items-start">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mt-1">
                      {currentPlayer.role.replace('-', ' ').toUpperCase()}
                    </span>
                    {currentPlayer.age && (
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
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Category:</span>
                  <span className="ml-2 font-medium">{currentPlayer.category}</span>
                </div>
                <div>
                  <span className="text-gray-600">Base Price:</span>
                  <span className="ml-2 font-medium">{formatCurrency(currentPlayer.basePrice)}</span>
                </div>
                <div>
                  <span className="text-gray-600">Matches:</span>
                  <span className="ml-2 font-medium">{currentPlayer.stats.matches}</span>
                </div>
                {currentPlayer.stats.runs !== undefined && (
                  <div>
                    <span className="text-gray-600">Runs:</span>
                    <span className="ml-2 font-medium">{currentPlayer.stats.runs}</span>
                  </div>
                )}
                {currentPlayer.stats.wickets !== undefined && (
                  <div>
                    <span className="text-gray-600">Wickets:</span>
                    <span className="ml-2 font-medium">{currentPlayer.stats.wickets}</span>
                  </div>
                )}
                {currentPlayer.stats.average !== undefined && (
                  <div>
                    <span className="text-gray-600">Average:</span>
                    <span className="ml-2 font-medium">{currentPlayer.stats.average}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Bidding Section */}
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-emerald-50 to-emerald-100 rounded-lg p-4">
                <div className="text-center">
                  <p className="text-sm text-emerald-700 mb-1">Current Bid</p>
                  <p className="text-2xl font-bold text-emerald-900">{formatCurrency(currentBid)}</p>
                  {getCurrentBidderTeam() && (
                    <p className="text-sm text-emerald-700 mt-1">
                      Leading: {getCurrentBidderTeam()?.name}
                    </p>
                  )}
                </div>
              </div>

              {canBid && auctionStatus === 'active' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    {tournamentTeams.map((team) => {
                      const increment = currentBid < 5000000 ? 500000 : 1000000;
                      const nextBid = currentBid + increment;
                      const canAfford = team.remainingBudget >= nextBid;

                      return (
                        <button
                          key={team.id}
                          onClick={() => handleQuickBid(team.id)}
                          disabled={!canAfford}
                          className={`p-2 rounded-lg text-sm font-medium transition-colors ${currentBidder === team.id
                            ? 'bg-emerald-600 text-white'
                            : canAfford
                              ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              : 'bg-gray-50 text-gray-400 cursor-not-allowed'
                            }`}
                        >
                          {team.name}
                          <div className="text-xs opacity-75">
                            +{formatCurrency(increment)}
                          </div>
                          <div className="text-xs opacity-60">
                            Budget: {formatCurrency(team.remainingBudget)}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex space-x-2">
                    <input
                      type="number"
                      value={bidAmount}
                      onChange={(e) => setBidAmount(e.target.value)}
                      placeholder="Custom bid amount"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <select
                      value={selectedTeam}
                      onChange={(e) => setSelectedTeam(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="">Select Team</option>
                      {tournamentTeams.map((team) => (
                        <option key={team.id} value={team.id}>
                          {team.name}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={handleCustomBid}
                      disabled={!bidAmount || !selectedTeam}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Bid
                    </button>
                  </div>
                </div>
              )}

              {canBid && auctionStatus === 'active' && (
                <button
                  onClick={handleAuctionEnd}
                  className="w-full bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors"
                >
                  End Auction
                </button>
              )}
            </div>
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

      {/* Auction History for Viewers */}
      {canView && auctionHistory.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
            <Clock className="w-5 h-5" />
            <span>Auction History</span>
          </h3>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {auctionHistory.map((auction) => {
              const player = players.find(p => p.id === auction.playerId);
              const team = auction.currentBidder ? teams.find(t => t.id === auction.currentBidder) : null;

              return (
                <div key={auction.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center overflow-hidden">
                      {player?.photo ? (
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
                      ) : null}
                      <User className={`w-5 h-5 text-white ${player?.photo ? 'hidden' : ''}`} />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{player?.name}</p>
                      <p className="text-sm text-gray-600">{player?.role} • {player?.category}</p>
                      {player?.station && (
                        <div className="flex items-center space-x-1 text-xs text-gray-500">
                          <MapPin className="w-3 h-3" />
                          <span>{player.station}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    {auction.status === 'sold' && team ? (
                      <>
                        <p className="font-medium text-green-600">SOLD</p>
                        <p className="text-sm text-gray-600">{team.name}</p>
                        <p className="text-sm font-medium text-gray-900">{formatCurrency(auction.currentBid)}</p>
                      </>
                    ) : (
                      <p className="font-medium text-red-600">UNSOLD</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

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
              {players.filter(p => p.status === 'sold' && p.tournamentId === activeTournament.id).length}
            </p>
            <p className="text-sm text-green-700">Sold</p>
          </div>
          <div className="bg-red-50 rounded-lg p-3">
            <p className="text-2xl font-bold text-red-600">
              {players.filter(p => p.status === 'unsold' && p.tournamentId === activeTournament.id).length}
            </p>
            <p className="text-sm text-red-700">Unsold</p>
          </div>
          <div className="bg-purple-50 rounded-lg p-3">
            <p className="text-2xl font-bold text-purple-600">
              {players.filter(p => p.tournamentId === activeTournament.id).length}
            </p>
            <p className="text-sm text-purple-700">Total</p>
          </div>
        </div>
      </div>

      {/* Team Budgets */}
      {tournamentTeams.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Team Budgets</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tournamentTeams.map((team) => {
              const budgetUsed = team.budget - team.remainingBudget;
              const budgetPercentage = (budgetUsed / team.budget) * 100;

              return (
                <div key={team.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: team.color }}
                    />
                    <div>
                      <p className="font-medium text-gray-900">{team.name}</p>
                      <p className="text-sm text-gray-600">{team.players.length} players</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">{formatCurrency(team.remainingBudget)}</p>
                    <p className="text-sm text-gray-600">{budgetPercentage.toFixed(1)}% used</p>
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