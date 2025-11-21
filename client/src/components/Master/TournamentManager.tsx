import React, { useState } from 'react';
import { Plus, Calendar, Users, DollarSign, Trophy, Edit2, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { Tournament } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { uploadImage, getOptimizedImageUrl } from '../../utils/cloudinary';

const TournamentManager: React.FC = () => {
  const { tournaments, addTournament, updateTournament, deleteTournament, activeTournament, isLoading } = useApp();
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [editingTournament, setEditingTournament] = useState<Tournament | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    startDate: '',
    endDate: '',
    maxTeams: 8,
    budget: 10000000,
    status: 'upcoming',
    logo: '',
    auctioneerEmail: '',
    auctioneerPassword: '',
    maxTeamSize: 11,
    minTeamSize: 7,
    auctionType: 'categories',
    numCategories: 1,
    categories: [{ category: '', numPlayers: 0, minBalance: 0 }]
  });

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      startDate: '',
      endDate: '',
      maxTeams: 8,
      budget: 10000000,
      status: 'upcoming',
      logo: '',
      auctioneerEmail: '',
      auctioneerPassword: '',
      maxTeamSize: 11,
      minTeamSize: 7,
      auctionType: 'categories',
      numCategories: 1,
      categories: [{ category: '', numPlayers: 0, minBalance: 0 }]
    });
    setEditingTournament(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingTournament) {
        // Only include auctioneerEmail and auctioneerPassword if not blank
        const updateData: Partial<typeof formData> = { ...formData };
        if (!updateData.auctioneerEmail) delete updateData.auctioneerEmail;
        if (!updateData.auctioneerPassword) delete updateData.auctioneerPassword;
        await updateTournament(editingTournament.id, { ...updateData, status: formData.status as Tournament['status'], auctionType: formData.auctionType as 'open' | 'categories' });
        showNotification('success', 'Tournament updated successfully');
      } else {
        await addTournament({ ...formData, status: formData.status as Tournament['status'], auctionType: formData.auctionType as 'open' | 'categories' });
        showNotification('success', 'Tournament created successfully');
      }
      resetForm();
      setShowForm(false);
    } catch {
      showNotification('error', 'Failed to save tournament');
    }
  };

  const handleEdit = (tournament: Tournament) => {
    setEditingTournament(tournament);
    setFormData({
      name: tournament.name,
      startDate: tournament.startDate,
      endDate: tournament.endDate,
      maxTeams: tournament.maxTeams,
      budget: tournament.budget,
      status: tournament.status,
      logo: tournament.logo || '',
      auctioneerEmail: '',
      auctioneerPassword: '',
      maxTeamSize: tournament.maxTeamSize || 11,
      minTeamSize: tournament.minTeamSize || 7,
      auctionType: tournament.auctionType || 'categories',
      numCategories: tournament.categories ? tournament.categories.length : 1,
      categories: tournament.categories || [{ category: '', numPlayers: 0, minBalance: 0 }]
    });
    setShowForm(true);
  };

  const handleDelete = async (tournament: Tournament) => {
    if (window.confirm(`Are you sure you want to delete "${tournament.name}"? This will also delete all associated teams.`)) {
      try {
        await deleteTournament(tournament.id);
        showNotification('success', 'Tournament deleted successfully');
      } catch {
        showNotification('error', 'Failed to delete tournament');
      }
    }
  };

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const imageUrl = await uploadImage(file);
      setFormData((prev) => ({ ...prev, logo: imageUrl }));
      showNotification('success', 'Logo uploaded successfully!');
    } catch {
      showNotification('error', 'Failed to upload logo');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'upcoming': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Show loading state while data is being fetched
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading tournaments...</p>
        </div>
      </div>
    );
  }

  if (user?.role === 'auctioneer') {
    // Only show the auctioneer's assigned tournament
    return (
      <div className="space-y-6">
        {activeTournament && (
          <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Trophy className="w-6 h-6" />
                <div>
                  <h3 className="text-lg font-semibold">Your Tournament</h3>
                  <p className="text-emerald-100">{activeTournament.name}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-emerald-100">Budget per team</p>
                <p className="text-lg font-semibold">{formatCurrency(activeTournament.budget)}</p>
              </div>
            </div>
          </div>
        )}
        {!activeTournament && (
          <div className="text-center py-12">
            <Trophy className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Tournament Assigned</h3>
            <p className="text-gray-600 mb-4">You are not assigned to any tournament. Please contact the master/admin.</p>
          </div>
        )}
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
          <h2 className="text-2xl font-bold text-gray-900">Tournament Management</h2>
          <p className="text-gray-600">Create and manage tournaments</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="flex items-center space-x-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>New Tournament</span>
        </button>
      </div>

      {activeTournament && (
        <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Trophy className="w-6 h-6" />
              <div>
                <h3 className="text-lg font-semibold">Active Tournament</h3>
                <p className="text-emerald-100">{activeTournament.name}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-emerald-100">Budget per team</p>
              <p className="text-lg font-semibold">{formatCurrency(activeTournament.budget)}</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tournaments.map((tournament) => (
          <div key={tournament.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center overflow-hidden">
                  {tournament.logo ? (
                    <img src={tournament.logo} alt="Logo" className="w-full h-full object-cover" />
                  ) : (
                    <Trophy className="w-5 h-5 text-emerald-600" />
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{tournament.name}</h3>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(tournament.status)}`}>
                    {tournament.status ? tournament.status.toUpperCase() : ''}
                  </span>
                </div>
              </div>
              <div className="flex space-x-1">
                <button
                  onClick={() => handleEdit(tournament)}
                  className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(tournament)}
                  className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Calendar className="w-4 h-4" />
                <span>{new Date(tournament.startDate).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Users className="w-4 h-4" />
                <span>{tournament.maxTeams} teams max</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <DollarSign className="w-4 h-4" />
                <span>{formatCurrency(tournament.budget)} budget</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {tournaments.length === 0 && (
        <div className="text-center py-12">
          <Trophy className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Tournaments Yet</h3>
          <p className="text-gray-600 mb-4">Create your first tournament to get started</p>
          <button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="bg-emerald-600 text-white px-6 py-2 rounded-lg hover:bg-emerald-700 transition-colors"
          >
            Create Tournament
          </button>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {editingTournament ? 'Edit Tournament' : 'Create New Tournament'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tournament Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="e.g., IPL 2024"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Teams</label>
                  <input
                    type="number"
                    value={formData.maxTeams ?? 0}
                    onChange={(e) => setFormData({ ...formData, maxTeams: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    min="2"
                    max="16"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Budget (₹)</label>
                  <input
                    type="number"
                    value={formData.budget ?? 0}
                    onChange={(e) => setFormData({ ...formData, budget: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as Tournament['status'] })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="upcoming">Upcoming</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
              <div>
                <label className="block text-gray-700 font-medium mb-1">Tournament Logo</label>
                <input type="file" accept="image/*" onChange={handleLogoChange} className="block w-full text-gray-700" />
                {formData.logo && (
                  <img src={getOptimizedImageUrl(formData.logo, { width: 96, height: 96, quality: 80 })} alt="Tournament Logo" className="mt-2 w-24 h-24 object-cover rounded-lg border" />
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Team Size</label>
                  <input
                    type="number"
                    value={formData.maxTeamSize ?? 0}
                    onChange={(e) => setFormData({ ...formData, maxTeamSize: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    min="1"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Min Team Size</label>
                  <input
                    type="number"
                    value={formData.minTeamSize ?? 0}
                    onChange={(e) => setFormData({ ...formData, minTeamSize: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    min="1"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Auction Type</label>
                <input type="hidden" value="categories" name="auctionType" />
                <select
                  value={formData.auctionType}
                  onChange={() => { }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  disabled
                  required
                >
                  <option value="categories">Categories</option>
                </select>
              </div>
              {formData.auctionType === 'categories' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">How many categories?</label>
                    <input
                      type="number"
                      value={formData.numCategories ?? 1}
                      min={1}
                      onChange={(e) => {
                        const num = parseInt(e.target.value) || 1;
                        setFormData(f => ({
                          ...f,
                          numCategories: num,
                          categories: Array.from({ length: num }, (_, i) => f.categories[i] || { category: '', numPlayers: 0, minBalance: 0 })
                        }));
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      required
                    />
                  </div>
                  <div className="overflow-x-auto mt-2">
                    <table className="min-w-full border text-xs">
                      <thead>
                        <tr>
                          <th className="border px-2 py-1">Category</th>
                          <th className="border px-2 py-1">Number of Players</th>
                          <th className="border px-2 py-1">Minimum Balance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {formData.categories.map((cat, idx) => (
                          <tr key={idx}>
                            <td className="border px-2 py-1">
                              <input
                                type="text"
                                value={cat.category}
                                onChange={(e) => {
                                  const categories = [...formData.categories];
                                  categories[idx].category = e.target.value;
                                  setFormData(f => ({ ...f, categories }));
                                }}
                                className="w-full px-2 py-1 border border-gray-300 rounded"
                                required
                              />
                            </td>
                            <td className="border px-2 py-1">
                              <input
                                type="number"
                                value={cat.numPlayers ?? 0}
                                min={0}
                                onChange={(e) => {
                                  const categories = [...formData.categories];
                                  categories[idx].numPlayers = parseInt(e.target.value) || 0;
                                  setFormData(f => ({ ...f, categories }));
                                }}
                                className="w-full px-2 py-1 border border-gray-300 rounded"
                                required
                              />
                            </td>
                            <td className="border px-2 py-1">
                              <input
                                type="number"
                                value={cat.minBalance ?? 0}
                                min={0}
                                onChange={(e) => {
                                  const categories = [...formData.categories];
                                  categories[idx].minBalance = parseInt(e.target.value) || 0;
                                  setFormData(f => ({ ...f, categories }));
                                }}
                                className="w-full px-2 py-1 border border-gray-300 rounded"
                                required
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
              {!editingTournament && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Auctioneer Email</label>
                    <input
                      type="email"
                      value={formData.auctioneerEmail}
                      onChange={(e) => setFormData({ ...formData, auctioneerEmail: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="auctioneer@auction.com"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Auctioneer Password</label>
                    <input
                      type="password"
                      value={formData.auctioneerPassword}
                      onChange={(e) => setFormData({ ...formData, auctioneerPassword: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="Enter password"
                      required
                    />
                  </div>
                </div>
              )}
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
                  {editingTournament ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TournamentManager;