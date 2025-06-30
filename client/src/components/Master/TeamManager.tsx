import React, { useState } from 'react';
import { Plus, Users, DollarSign, Edit2, Trash2, User, CheckCircle, XCircle } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { Team } from '../../types';
import { useAuth } from '../../contexts/AuthContext';

const TeamManager: React.FC = () => {
  const { teams, addTeam, updateTeam, deleteTeam, players, myTournament, tournaments } = useApp();
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    owner: '',
    color: '#10B981',
    logo: ''
  });

  const teamColors = [
    '#10B981', '#3B82F6', '#EF4444', '#F59E0B', '#8B5CF6',
    '#EC4899', '#14B8A6', '#F97316', '#6366F1', '#84CC16',
    '#06B6D4', '#8B5A2B', '#DC2626', '#7C3AED', '#059669',
    '#1D4ED8', '#B45309', '#BE185D', '#0D9488', '#7F1D1D'
  ];

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  const resetForm = () => {
    setFormData({ name: '', owner: '', color: '#10B981', logo: '' });
    setEditingTeam(null);
  };

  // For auctioneers, always use myTournament
  const isAuctioneer = user?.role === 'auctioneer';
  const tournamentId = isAuctioneer && myTournament ? myTournament.id : undefined;
  const tournamentName = isAuctioneer && myTournament ? myTournament.name : undefined;
  const tournamentBudget = isAuctioneer && myTournament ? myTournament.budget : undefined;

  const filteredTeams = isAuctioneer && myTournament
    ? teams.filter(team => team.tournamentId === myTournament.id)
    : teams;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isAuctioneer && !myTournament) {
      showNotification('error', 'No tournament assigned. Please contact the master/admin.');
      return;
    }
    try {
      if (editingTeam) {
        // Always include tournamentId for auctioneer
        const updateData = isAuctioneer ? { ...formData, tournamentId: myTournament!.id } : formData;
        updateTeam(editingTeam.id, updateData);
        showNotification('success', 'Team updated successfully');
      } else {
        const newTeam = addTeam({
          ...formData,
          tournamentId: isAuctioneer ? myTournament!.id : '',
          budget: isAuctioneer ? myTournament!.budget : 0,
          remainingBudget: isAuctioneer ? myTournament!.budget : 0,
          players: []
        });
        showNotification('success', 'Team created successfully');
      }
      resetForm();
      setShowForm(false);
    } catch (error) {
      showNotification('error', 'Failed to save team');
      console.error('Error saving team:', error);
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target?.result as string;
      setFormData((prev) => ({ ...prev, logo: base64 }));
    };
    reader.readAsDataURL(file);
  };

  const handleEdit = (team: Team) => {
    setEditingTeam(team);
    setFormData({
      name: team.name || '',
      owner: team.owner || '',
      color: team.color || '#10B981',
      logo: team.logo || ''
    });
    setShowForm(true);
  };

  const handleDelete = (team: Team) => {
    if (!team.id) {
      showNotification('error', 'Invalid team ID');
      return;
    }
    if (window.confirm(`Are you sure you want to delete "${team.name}"?`)) {
      try {
        deleteTeam(team.id);
        showNotification('success', 'Team deleted successfully');
      } catch (error) {
        showNotification('error', 'Failed to delete team');
        console.error('Error deleting team:', error);
      }
    }
  };

  const formatCurrency = (amount: number) => {
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

  const getTeamPlayers = (teamId: string) => {
    // Show all players whose player.team matches this team
    return players.filter(p => String(p.team) === String(teamId));
  };

  // Show message if no tournament assigned for auctioneer
  if (isAuctioneer && !myTournament) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-yellow-800">No tournament assigned. Please contact the master/admin.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg flex items-center space-x-2 ${notification.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
          }`}>
          {notification.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
          <span>{notification.message}</span>
        </div>
      )}

      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Team Management</h2>
          <p className="text-gray-600">
            {isAuctioneer ? (myTournament ? `Managing teams for ${myTournament.name}` : 'No tournament assigned') : 'Manage teams for all tournaments'}
          </p>
        </div>
        {(isAuctioneer ? myTournament : tournaments.length > 0) && (
          <button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="flex items-center space-x-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Team</span>
          </button>
        )}
      </div>

      {!isAuctioneer && tournaments.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">No tournaments available.</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTeams.map((team) => {
          const teamPlayers = getTeamPlayers(team.id);
          const budget = Number(team.budget) || 0;
          const remainingBudget = Number(team.remainingBudget) || 0;
          const budgetUsed = budget - remainingBudget;
          const budgetPercentage = budget > 0 ? ((budgetUsed / budget) * 100) : 0;

          return (
            <div key={team.id} className="bg-white rounded-xl shadow-sm border-2 p-6 hover:shadow-md transition-all duration-300"
              style={{ borderColor: team.color + '40' }}>
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center overflow-hidden shadow-sm"
                    style={{ backgroundColor: team.color + '20', border: `2px solid ${team.color + '40'}` }}>
                    {team.logo ? (
                      <img src={team.logo} alt="Logo" className="w-full h-full object-cover" />
                    ) : (
                      <Users className="w-6 h-6" style={{ color: team.color }} />
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg" style={{ color: team.color }}>{team.name}</h3>
                    <p className="text-sm text-gray-600">{team.owner}</p>
                  </div>
                </div>
                <div className="flex space-x-1">
                  <button
                    onClick={() => handleEdit(team)}
                    className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(team)}
                    className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium" style={{ color: team.color }}>Budget Used</span>
                    <span className="text-sm font-medium text-gray-900">
                      {isNaN(budgetUsed) ? '₹0' : formatCurrency(budgetUsed)}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="h-3 rounded-full transition-all duration-300 shadow-sm"
                      style={{
                        width: `${isNaN(budgetPercentage) ? 0 : budgetPercentage}%`,
                        backgroundColor: team.color
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-2">
                    <span>{isNaN(remainingBudget) ? '₹0' : formatCurrency(remainingBudget)} remaining</span>
                    <span className="font-medium" style={{ color: team.color }}>
                      {isNaN(budgetPercentage) ? '0%' : `${budgetPercentage.toFixed(1)}%`}
                    </span>
                  </div>
                </div>

                <div className="pt-4 border-t" style={{ borderColor: team.color + '20' }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <User className="w-4 h-4" style={{ color: team.color }} />
                      <span className="text-sm font-medium" style={{ color: team.color }}>Players</span>
                    </div>
                    <span className="text-sm font-bold text-gray-900 bg-gray-100 px-2 py-1 rounded-full">
                      {teamPlayers.length}
                    </span>
                  </div>

                  {teamPlayers.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {teamPlayers.slice(0, 3).map((player) => (
                        <div key={player.id} className="text-xs bg-gray-50 p-2 rounded-lg flex justify-between items-center">
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: team.color }}></div>
                            <span className="font-medium text-gray-700">{player.name}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-gray-500 text-xs">({player.role})</span>
                            <span className="font-semibold" style={{ color: team.color }}>
                              {formatCurrency(player.price || 0)}
                            </span>
                          </div>
                        </div>
                      ))}
                      {teamPlayers.length > 3 && (
                        <div className="text-xs text-gray-500 text-center py-1 bg-gray-50 rounded-lg">
                          +{teamPlayers.length - 3} more players
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredTeams.length === 0 && isAuctioneer && myTournament && (
        <div className="text-center py-12">
          <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Teams Yet</h3>
          <p className="text-gray-600 mb-4">Create your first team for {myTournament.name}</p>
          <button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="bg-emerald-600 text-white px-6 py-2 rounded-lg hover:bg-emerald-700 transition-colors"
          >
            Add Team
          </button>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl w-full max-w-md max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingTeam ? 'Edit Team' : 'Add New Team'}
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Team Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="e.g., Mumbai Warriors"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Owner Name</label>
                  <input
                    type="text"
                    value={formData.owner}
                    onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="Team owner name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Team Color</label>
                  <div className="grid grid-cols-5 gap-2">
                    {teamColors.filter(color => {
                      // Get all colors used by other teams in the same tournament
                      const usedColors = filteredTeams
                        .filter(team => !editingTeam || team.id !== editingTeam.id)
                        .map(team => team.color);
                      // Only show color if not used, or if it's the current team's color
                      return !usedColors.includes(color) || formData.color === color;
                    }).map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setFormData({ ...formData, color })}
                        className={`w-10 h-10 rounded-lg border-2 transition-all duration-200 hover:scale-110 ${formData.color === color
                          ? 'border-gray-800 scale-110 shadow-lg'
                          : 'border-gray-200 hover:border-gray-400'
                          }`}
                        style={{ backgroundColor: color }}
                        title={`Color: ${color}`}
                      />
                    ))}
                  </div>
                  <div className="mt-2 flex items-center space-x-2">
                    <div className="w-4 h-4 rounded border border-gray-300" style={{ backgroundColor: formData.color }}></div>
                    <span className="text-xs text-gray-600">Selected: {formData.color}</span>
                  </div>
                </div>
                <div>
                  <label className="block text-gray-700 font-medium mb-1">Team Logo</label>
                  <input type="file" accept="image/*" onChange={handleLogoChange} className="block w-full text-gray-700" />
                  {formData.logo && (
                    <img src={formData.logo} alt="Team Logo" className="mt-2 w-24 h-24 object-cover rounded-lg border" />
                  )}
                </div>
              </form>
            </div>
            <div className="p-6 border-t border-gray-200 bg-gray-50 rounded-b-xl">
              <div className="flex space-x-3">
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
                  onClick={handleSubmit}
                  className="flex-1 py-2 px-4 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                >
                  {editingTeam ? 'Update' : 'Add Team'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamManager;