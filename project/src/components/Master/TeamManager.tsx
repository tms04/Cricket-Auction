import React, { useState } from 'react';
import { Plus, Users, DollarSign, Edit2, Trash2, User, CheckCircle, XCircle } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { Team } from '../../types';

const TeamManager: React.FC = () => {
  const { teams, addTeam, updateTeam, deleteTeam, activeTournament, players } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    owner: '',
    color: '#10B981'
  });

  const teamColors = [
    '#10B981', '#3B82F6', '#EF4444', '#F59E0B', '#8B5CF6', 
    '#EC4899', '#14B8A6', '#F97316', '#6366F1', '#84CC16'
  ];

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  const resetForm = () => {
    setFormData({ name: '', owner: '', color: '#10B981' });
    setEditingTeam(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTournament) {
      showNotification('error', 'Please select an active tournament first');
      return;
    }
    
    try {
      if (editingTeam) {
        updateTeam(editingTeam.id, formData);
        showNotification('success', 'Team updated successfully');
      } else {
        const newTeam = addTeam({
          ...formData,
          tournamentId: activeTournament.id,
          budget: activeTournament.budget,
          remainingBudget: activeTournament.budget,
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

  const handleEdit = (team: Team) => {
    setEditingTeam(team);
    setFormData({
      name: team.name,
      owner: team.owner,
      color: team.color
    });
    setShowForm(true);
  };

  const handleDelete = (team: Team) => {
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

  const getTeamPlayers = (playerIds: string[]) => {
    return players.filter(p => playerIds.includes(p.id));
  };

  const filteredTeams = teams.filter(team => 
    !activeTournament || team.tournamentId === activeTournament.id
  );

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
          <h2 className="text-2xl font-bold text-gray-900">Team Management</h2>
          <p className="text-gray-600">
            {activeTournament ? `Managing teams for ${activeTournament.name}` : 'Select an active tournament to manage teams'}
          </p>
        </div>
        {activeTournament && (
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

      {!activeTournament && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">Please select an active tournament from the Tournaments tab to manage teams.</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTeams.map((team) => {
          const teamPlayers = getTeamPlayers(team.players);
          const budgetUsed = team.budget - team.remainingBudget;
          const budgetPercentage = (budgetUsed / team.budget) * 100;
          
          return (
            <div key={team.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center space-x-3">
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: team.color + '20' }}
                  >
                    <Users className="w-5 h-5" style={{ color: team.color }} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{team.name}</h3>
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
                    <span className="text-sm text-gray-600">Budget Used</span>
                    <span className="text-sm font-medium text-gray-900">
                      {formatCurrency(budgetUsed)}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="h-2 rounded-full transition-all duration-300"
                      style={{ 
                        width: `${budgetPercentage}%`,
                        backgroundColor: team.color
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>{formatCurrency(team.remainingBudget)} remaining</span>
                    <span>{budgetPercentage.toFixed(1)}%</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <User className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600">Players</span>
                    </div>
                    <span className="text-sm font-medium text-gray-900">
                      {teamPlayers.length}
                    </span>
                  </div>
                  
                  {teamPlayers.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {teamPlayers.slice(0, 3).map((player) => (
                        <div key={player.id} className="text-xs text-gray-600 flex justify-between">
                          <span>{player.name}</span>
                          <span className="text-gray-500">({player.role})</span>
                        </div>
                      ))}
                      {teamPlayers.length > 3 && (
                        <div className="text-xs text-gray-500">
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

      {filteredTeams.length === 0 && activeTournament && (
        <div className="text-center py-12">
          <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Teams Yet</h3>
          <p className="text-gray-600 mb-4">Create your first team for {activeTournament.name}</p>
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
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {editingTeam ? 'Edit Team' : 'Add New Team'}
            </h3>
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
                  {teamColors.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormData({ ...formData, color })}
                      className={`w-10 h-10 rounded-lg border-2 transition-all ${
                        formData.color === color ? 'border-gray-400 scale-110' : 'border-gray-200 hover:border-gray-300'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
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
                  {editingTeam ? 'Update' : 'Add Team'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamManager;