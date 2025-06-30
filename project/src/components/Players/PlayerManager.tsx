import React, { useState } from 'react';
import { Plus, Search, Filter, User, Award, Flag, DollarSign, Edit2, Trash2, CheckCircle, XCircle, MapPin, Camera } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { useAuth } from '../../contexts/AuthContext';
import { Player } from '../../types';

const PlayerManager: React.FC = () => {
  const { players, addPlayer, updatePlayer, deletePlayer, activeTournament } = useApp();
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    age: 25,
    nationality: 'India',
    station: '',
    role: 'batsman' as const,
    category: 'C' as const,
    basePrice: 0,
    photo: '',
    matches: 0,
    runs: 0,
    wickets: 0,
    average: 0,
    strikeRate: 0
  });

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      age: 25,
      nationality: 'India',
      station: '',
      role: 'batsman',
      category: 'C',
      basePrice: 0,
      photo: '',
      matches: 0,
      runs: 0,
      wickets: 0,
      average: 0,
      strikeRate: 0
    });
    setEditingPlayer(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!activeTournament) {
      showNotification('error', 'Please select an active tournament first');
      return;
    }
    
    try {
      if (editingPlayer) {
        updatePlayer(editingPlayer.id, {
          name: formData.name,
          age: formData.age,
          nationality: formData.nationality,
          station: formData.station,
          role: formData.role,
          category: formData.category,
          basePrice: formData.basePrice,
          photo: formData.photo || undefined,
          stats: {
            matches: formData.matches,
            runs: formData.role === 'bowler' ? undefined : formData.runs,
            wickets: formData.role === 'batsman' ? undefined : formData.wickets,
            average: formData.average,
            strikeRate: formData.strikeRate
          }
        });
        showNotification('success', 'Player updated successfully');
      } else {
        const newPlayer: Omit<Player, 'id'> = {
          name: formData.name,
          age: formData.age,
          nationality: formData.nationality,
          station: formData.station,
          role: formData.role,
          category: formData.category,
          basePrice: formData.basePrice,
          photo: formData.photo || undefined,
          tournamentId: activeTournament.id,
          stats: {
            matches: formData.matches,
            runs: formData.role === 'bowler' ? undefined : formData.runs,
            wickets: formData.role === 'batsman' ? undefined : formData.wickets,
            average: formData.average,
            strikeRate: formData.strikeRate
          },
          status: 'available'
        };
        
        addPlayer(newPlayer);
        showNotification('success', 'Player added successfully');
      }
      
      resetForm();
      setShowForm(false);
    } catch (error) {
      showNotification('error', 'Failed to save player');
      console.error('Error saving player:', error);
    }
  };

  const handleEdit = (player: Player) => {
    setEditingPlayer(player);
    setFormData({
      name: player.name,
      age: player.age,
      nationality: player.nationality,
      station: player.station,
      role: player.role,
      category: player.category,
      basePrice: player.basePrice,
      photo: player.photo || '',
      matches: player.stats.matches,
      runs: player.stats.runs || 0,
      wickets: player.stats.wickets || 0,
      average: player.stats.average || 0,
      strikeRate: player.stats.strikeRate || 0
    });
    setShowForm(true);
  };

  const handleDelete = (player: Player) => {
    if (window.confirm(`Are you sure you want to delete "${player.name}"?`)) {
      try {
        deletePlayer(player.id);
        showNotification('success', 'Player deleted successfully');
      } catch (error) {
        showNotification('error', 'Failed to delete player');
        console.error('Error deleting player:', error);
      }
    }
  };

  // Filter players by active tournament
  const tournamentPlayers = players.filter(player => 
    !activeTournament || player.tournamentId === activeTournament.id
  );

  const filteredPlayers = tournamentPlayers.filter(player => {
    const matchesSearch = player.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         player.nationality.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         player.station.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || player.role === filterRole;
    const matchesCategory = filterCategory === 'all' || player.category === filterCategory;
    const matchesStatus = filterStatus === 'all' || player.status === filterStatus;
    
    return matchesSearch && matchesRole && matchesCategory && matchesStatus;
  });

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

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'batsman': return 'bg-blue-100 text-blue-800';
      case 'bowler': return 'bg-red-100 text-red-800';
      case 'all-rounder': return 'bg-green-100 text-green-800';
      case 'wicket-keeper': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'A+': return 'bg-yellow-100 text-yellow-800';
      case 'A': return 'bg-orange-100 text-orange-800';
      case 'B': return 'bg-indigo-100 text-indigo-800';
      case 'C': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-100 text-green-800';
      case 'sold': return 'bg-blue-100 text-blue-800';
      case 'unsold': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const canEdit = user?.role === 'master';

  return (
    <div className="space-y-6">
      {/* Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg flex items-center space-x-2 ${
          notification.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
        }`}>
          {notification.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
          <span>{notification.message}</span>
        </div>
      )}

      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Player Management</h2>
          <p className="text-gray-600">
            {activeTournament ? `Managing players for ${activeTournament.name}` : 'Select an active tournament to manage players'}
          </p>
        </div>
        {canEdit && activeTournament && (
          <button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="flex items-center space-x-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Player</span>
          </button>
        )}
      </div>

      {!activeTournament && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">Please select an active tournament from the Tournaments tab to manage players.</p>
        </div>
      )}

      {activeTournament && (
        <>
          {/* Filters */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search players..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">All Roles</option>
                <option value="batsman">Batsman</option>
                <option value="bowler">Bowler</option>
                <option value="all-rounder">All-rounder</option>
                <option value="wicket-keeper">Wicket-keeper</option>
              </select>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">All Categories</option>
                <option value="A+">A+</option>
                <option value="A">A</option>
                <option value="B">B</option>
                <option value="C">C</option>
              </select>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">All Status</option>
                <option value="available">Available</option>
                <option value="sold">Sold</option>
                <option value="unsold">Unsold</option>
              </select>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Filter className="w-4 h-4" />
                <span>{filteredPlayers.length} players</span>
              </div>
            </div>
          </div>

          {/* Players Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPlayers.map((player) => (
              <div key={player.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center overflow-hidden">
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
                      <User className={`w-6 h-6 text-white ${player.photo ? 'hidden' : ''}`} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{player.name}</h3>
                      <p className="text-sm text-gray-600">{player.age} years • {player.nationality}</p>
                      {player.station && (
                        <div className="flex items-center space-x-1 text-xs text-gray-500 mt-1">
                          <MapPin className="w-3 h-3" />
                          <span>{player.station}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  {canEdit && (
                    <div className="flex space-x-1">
                      <button 
                        onClick={() => handleEdit(player)}
                        className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(player)}
                        className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(player.role)}`}>
                      {player.role.replace('-', ' ').toUpperCase()}
                    </span>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(player.category)}`}>
                      Category {player.category}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <DollarSign className="w-4 h-4" />
                    <span>{formatCurrency(player.basePrice)} base price</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-gray-600">
                      <span className="font-medium">{player.stats.matches}</span> matches
                    </div>
                    {player.stats.runs !== undefined && (
                      <div className="text-gray-600">
                        <span className="font-medium">{player.stats.runs}</span> runs
                      </div>
                    )}
                    {player.stats.wickets !== undefined && (
                      <div className="text-gray-600">
                        <span className="font-medium">{player.stats.wickets}</span> wickets
                      </div>
                    )}
                    {player.stats.average !== undefined && (
                      <div className="text-gray-600">
                        <span className="font-medium">{player.stats.average}</span> avg
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-gray-100">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Status</span>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(player.status)}`}>
                        {player.status.toUpperCase()}
                      </span>
                    </div>
                    {player.status === 'sold' && player.soldPrice && (
                      <div className="mt-2 text-sm text-gray-600">
                        Sold for {formatCurrency(player.soldPrice)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredPlayers.length === 0 && (
            <div className="text-center py-12">
              <User className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Players Found</h3>
              <p className="text-gray-600 mb-4">
                {searchTerm || filterRole !== 'all' || filterCategory !== 'all' || filterStatus !== 'all'
                  ? 'Try adjusting your filters'
                  : `Add your first player for ${activeTournament.name}`
                }
              </p>
              {canEdit && !searchTerm && filterRole === 'all' && filterCategory === 'all' && filterStatus === 'all' && (
                <button
                  onClick={() => {
                    resetForm();
                    setShowForm(true);
                  }}
                  className="bg-emerald-600 text-white px-6 py-2 rounded-lg hover:bg-emerald-700 transition-colors"
                >
                  Add Player
                </button>
              )}
            </div>
          )}
        </>
      )}

      {/* Add/Edit Player Form */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {editingPlayer ? 'Edit Player' : 'Add New Player'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Player Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Age</label>
                  <input
                    type="number"
                    value={formData.age}
                    onChange={(e) => setFormData({ ...formData, age: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    min="16"
                    max="45"
                    required
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nationality</label>
                  <input
                    type="text"
                    value={formData.nationality}
                    onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Station/Location</label>
                  <input
                    type="text"
                    value={formData.station}
                    onChange={(e) => setFormData({ ...formData, station: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="e.g., Mumbai, Delhi"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Photo URL</label>
                <div className="relative">
                  <Camera className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="url"
                    value={formData.photo}
                    onChange={(e) => setFormData({ ...formData, photo: e.target.value })}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="https://example.com/player-photo.jpg"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Optional: Enter a URL for the player's photo</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="batsman">Batsman</option>
                    <option value="bowler">Bowler</option>
                    <option value="all-rounder">All-rounder</option>
                    <option value="wicket-keeper">Wicket-keeper</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="A+">A+</option>
                    <option value="A">A</option>
                    <option value="B">B</option>
                    <option value="C">C</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Base Price (₹)</label>
                  <input
                    type="number"
                    value={formData.basePrice}
                    onChange={(e) => setFormData({ ...formData, basePrice: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    min="0"
                    step="100000"
                    placeholder="0"
                  />
                  <p className="text-xs text-gray-500 mt-1">Enter 0 for no minimum price</p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Matches</label>
                  <input
                    type="number"
                    value={formData.matches}
                    onChange={(e) => setFormData({ ...formData, matches: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    min="0"
                  />
                </div>
                {formData.role !== 'bowler' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Runs</label>
                    <input
                      type="number"
                      value={formData.runs}
                      onChange={(e) => setFormData({ ...formData, runs: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      min="0"
                    />
                  </div>
                )}
                {formData.role !== 'batsman' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Wickets</label>
                    <input
                      type="number"
                      value={formData.wickets}
                      onChange={(e) => setFormData({ ...formData, wickets: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      min="0"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Average</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.average}
                    onChange={(e) => setFormData({ ...formData, average: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    min="0"
                  />
                </div>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    resetForm();
                  }}
                  className="flex-1 py-2 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 px-4 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                >
                  {editingPlayer ? 'Update Player' : 'Add Player'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlayerManager;