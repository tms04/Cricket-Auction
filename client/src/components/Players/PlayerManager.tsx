import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, User, Award, Flag, DollarSign, Edit2, Trash2, CheckCircle, XCircle, MapPin, Camera, Upload, Download } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { useAuth } from '../../contexts/AuthContext';
import { Player } from '../../types';
import * as XLSX from 'xlsx';
import * as api from '../../api';

const PlayerManager: React.FC = () => {
  const { players: contextPlayers, addPlayer, updatePlayer, deletePlayer, myTournament, tournaments } = useApp();
  const { user } = useAuth();
  const [players, setPlayers] = useState<Player[]>(contextPlayers);
  const [showForm, setShowForm] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    basePrice: 0,
    isSold: false,
    previousYearTeam: '',
    station: '',
    photo: '',
    age: 0,
    category: '',
    primaryRole: '',
    battingStyle: '',
    bowlingStyle: ''
  });
  const [imageLoading, setImageLoading] = useState(false);
  const [showExcelUpload, setShowExcelUpload] = useState(false);
  const [excelData, setExcelData] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);

  const isAuctioneer = user?.role === 'auctioneer';

  useEffect(() => {
    const fetchPlayers = async () => {
      if (user?.role === 'auctioneer' && myTournament) {
        const data = await api.fetchPlayers(myTournament.id);
        setPlayers(data);
      } else {
        const data = await api.fetchPlayers();
        setPlayers(data);
      }
    };
    fetchPlayers();
  }, [user, myTournament]);

  // Show only players for the current tournament if auctioneer
  const filteredPlayers = user?.role === 'auctioneer' && myTournament
    ? players.filter(p => p.tournamentId === myTournament.id)
    : players;

  // Temporary fallback for testing
  const testCategories = [
    { category: 'A+', numPlayers: 5, minBalance: 5000000 },
    { category: 'A', numPlayers: 10, minBalance: 3000000 },
    { category: 'B', numPlayers: 15, minBalance: 2000000 },
    { category: 'C', numPlayers: 20, minBalance: 1000000 }
  ];

  const categoriesToUse = myTournament?.categories || testCategories;

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      basePrice: 0,
      isSold: false,
      previousYearTeam: '',
      station: '',
      photo: '',
      age: 0,
      category: '',
      primaryRole: '',
      battingStyle: '',
      bowlingStyle: ''
    });
    setEditingPlayer(null);
  };

  // Add normalization helper for primaryRole
  const normalizePrimaryRole = (role: string) => {
    if (!role) return '';
    const r = role.trim().toLowerCase();
    if (r === 'batsman') return 'Batsman';
    if (r === 'bowler') return 'Bowler';
    if (r === 'all-rounder' || r === 'allrounder') return 'All-rounder';
    return role;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (imageLoading) {
      alert('Please wait for the image to finish loading.');
      return;
    }
    if (isAuctioneer && !myTournament) {
      showNotification('error', 'No tournament assigned. Please contact the master/admin.');
      return;
    }
    try {
      if (editingPlayer) {
        await updatePlayer(editingPlayer.id, {
          name: formData.name,
          basePrice: formData.basePrice,
          isSold: formData.isSold,
          previousYearTeam: formData.previousYearTeam,
          station: formData.station,
          photo: formData.photo,
          age: formData.age,
          category: formData.category,
          primaryRole: formData.primaryRole,
          battingStyle: formData.battingStyle,
          bowlingStyle: formData.bowlingStyle,
          tournamentId: isAuctioneer ? myTournament!.id : editingPlayer.tournamentId
        });
        showNotification('success', 'Player updated successfully');
      } else {
        const newPlayer = {
          name: formData.name,
          basePrice: formData.basePrice,
          isSold: formData.isSold,
          previousYearTeam: formData.previousYearTeam,
          station: formData.station,
          photo: formData.photo,
          age: formData.age,
          category: formData.category,
          primaryRole: formData.primaryRole,
          battingStyle: formData.battingStyle,
          bowlingStyle: formData.bowlingStyle,
          tournamentId: isAuctioneer ? myTournament!.id : '',
          status: 'available'
        };
        await addPlayer(newPlayer);
        showNotification('success', 'Player added successfully');
        // Refetch players after adding
        if (user?.role === 'auctioneer' && myTournament) {
          const data = await api.fetchPlayers(myTournament.id);
          setPlayers(data);
        } else {
          const data = await api.fetchPlayers();
          setPlayers(data);
        }
      }
      resetForm();
      setShowForm(false);
    } catch (error) {
      showNotification('error', 'Failed to save player');
    }
  };

  const handleEdit = (player: Player) => {
    setEditingPlayer(player);
    setFormData({
      name: player.name,
      basePrice: player.basePrice || 0,
      isSold: player.isSold || false,
      previousYearTeam: player.previousYearTeam || '',
      station: player.station || '',
      photo: player.photo || '',
      age: player.age || 0,
      category: player.category || '',
      primaryRole: normalizePrimaryRole(player.primaryRole || ''),
      battingStyle: player.battingStyle || '',
      bowlingStyle: player.bowlingStyle || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (player: Player) => {
    if (window.confirm(`Are you sure you want to delete "${player.name}"?`)) {
      try {
        await api.deletePlayer(player.id);
        showNotification('success', 'Player deleted successfully');
        // Refetch players after delete
        if (user?.role === 'auctioneer' && myTournament) {
          const data = await api.fetchPlayers(myTournament.id);
          setPlayers(data);
        } else {
          const data = await api.fetchPlayers();
          setPlayers(data);
        }
      } catch (error: any) {
        const errorMessage = error.response?.data?.error || error.message || 'Failed to delete player';
        showNotification('error', errorMessage);
      }
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

  const canEdit = user?.role === 'master' || (user?.role === 'auctioneer' && myTournament);

  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const workbook = XLSX.read(event.target?.result, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet);

        setExcelData(data);
        setShowExcelUpload(true);
      } catch (error) {
        showNotification('error', 'Error reading Excel file. Please check the format.');
      }
    };
    reader.readAsBinaryString(file);
  };

  const processExcelData = async () => {
    if (!excelData.length) return;

    setUploading(true);
    try {
      const processedPlayers = excelData.map((row: any) => ({
        name: row.Name || row.name || '',
        basePrice: parseInt(row['Base Price'] || row.basePrice || row['BasePrice'] || '0') || 0,
        previousYearTeam: row['Previous Team'] || row.previousTeam || row['PreviousTeam'] || '',
        station: row.Station || row.station || '',
        age: parseInt(row.Age || row.age || '0') || 0,
        category: row.Category || row.category || '',
        primaryRole: row.PrimaryRole || row.primaryRole || '',
        battingStyle: row.BattingStyle || row.battingStyle || '',
        bowlingStyle: row.BowlingStyle || row.bowlingStyle || '',
        tournamentId: isAuctioneer ? myTournament!.id : '',
        status: 'available'
      })).filter(player => player.name.trim() !== '');

      // Add players one by one
      for (const player of processedPlayers) {
        await addPlayer(player);
      }

      showNotification('success', `Successfully imported ${processedPlayers.length} players`);
      setShowExcelUpload(false);
      setExcelData([]);
    } catch (error) {
      showNotification('error', 'Error importing players. Please check the data format.');
    } finally {
      setUploading(false);
    }
  };

  const downloadSampleExcel = () => {
    const sampleData = [
      {
        name: 'Virat Kohli',
        basePrice: 2000000,
        isSold: false,
        'Previous Team': 'RCB',
        station: 'Delhi',
        photo: '',
        age: 34,
        category: 'A+',
        primaryRole: 'Batsman',
        battingStyle: 'Right hand batsman',
        bowlingStyle: 'Dont bowl'
      },
      {
        name: 'Ravindra Jadeja',
        basePrice: 1800000,
        isSold: false,
        'Previous Team': 'CSK',
        station: 'Saurashtra',
        photo: '',
        age: 33,
        category: 'A',
        primaryRole: 'All-rounder',
        battingStyle: 'Left hand batsman',
        bowlingStyle: 'Left hand bowler'
      }
    ];
    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Players');
    XLSX.writeFile(wb, 'sample_players.xlsx');
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
          <h2 className="text-2xl font-bold text-gray-900">Player Management</h2>
          <p className="text-gray-600">
            {myTournament ? `Managing players for ${myTournament.name}` : 'Select an active tournament to manage players'}
          </p>
        </div>
        {canEdit && myTournament && (
          <div className="flex space-x-2">
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
            <button
              onClick={downloadSampleExcel}
              className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Download Sample</span>
            </button>
            <label className="flex items-center space-x-2 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors cursor-pointer">
              <Upload className="w-4 h-4" />
              <span>Import Excel</span>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleExcelUpload}
                className="hidden"
              />
            </label>
          </div>
        )}
      </div>

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
            {categoriesToUse.map((cat, idx) => (
              <option key={idx} value={cat.category}>{cat.category}</option>
            ))}
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
                  <span className="w-6 h-6 text-white font-bold text-lg">{player.name[0]}</span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{player.name}</h3>
                  {/* role is not guaranteed in summary, so skip or check existence */}
                  {player.team && (
                    <p className="text-sm text-gray-600">{player.team}</p>
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
              {/* Removed status display block as player.status does not exist */}
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
              : `Add your first player for ${myTournament?.name}`
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
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Base Price (₹)</label>
                  <input
                    type="number"
                    value={formData.basePrice}
                    onChange={(e) => setFormData({ ...formData, basePrice: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    min="0"
                  />
                  <p className="text-xs text-gray-500 mt-1">Enter 0 for no minimum price</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sold</label>
                  <input
                    type="checkbox"
                    checked={formData.isSold}
                    onChange={(e) => setFormData({ ...formData, isSold: e.target.checked })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Previous Year Team</label>
                  <input
                    type="text"
                    value={formData.previousYearTeam}
                    onChange={(e) => setFormData({ ...formData, previousYearTeam: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="e.g., Mumbai Indians"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Station</label>
                <input
                  type="text"
                  value={formData.station}
                  onChange={e => setFormData({ ...formData, station: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Enter station/location"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Photo</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setImageLoading(true);
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setFormData((prev) => ({ ...prev, photo: reader.result as string }));
                        setImageLoading(false);
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                {imageLoading && <div className="text-sm text-blue-600">Loading image...</div>}
                {formData.photo && (
                  <img src={formData.photo} alt="Preview" className="mt-2 w-24 h-24 object-cover rounded-lg border" />
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Age</label>
                <input
                  type="number"
                  value={formData.age}
                  onChange={e => setFormData({ ...formData, age: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Enter age"
                  min={0}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={formData.category}
                  onChange={e => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                >
                  <option value="">Select category</option>
                  {categoriesToUse.map((cat, idx) => (
                    <option key={idx} value={cat.category}>{cat.category}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Primary Role</label>
                  <select
                    value={formData.primaryRole}
                    onChange={e => setFormData({ ...formData, primaryRole: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  >
                    <option value="">Select primary role</option>
                    <option value="Batsman">Batsman</option>
                    <option value="Bowler">Bowler</option>
                    <option value="All-rounder">All-rounder</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Batting Style</label>
                  <select
                    value={formData.battingStyle}
                    onChange={e => setFormData({ ...formData, battingStyle: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  >
                    <option value="">Select batting style</option>
                    <option value="Right hand batsman">Right hand batsman</option>
                    <option value="Left hand batsman">Left hand batsman</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bowling Style</label>
                  <select
                    value={formData.bowlingStyle}
                    onChange={e => setFormData({ ...formData, bowlingStyle: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  >
                    <option value="">Select bowling style</option>
                    <option value="Right hand bowler">Right hand bowler</option>
                    <option value="Left hand bowler">Left hand bowler</option>
                    <option value="Dont bowl">Dont bowl</option>
                  </select>
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

      {/* Excel Upload Preview Modal */}
      {showExcelUpload && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Import Players from Excel
            </h3>

            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                Preview of {excelData.length} players to be imported:
              </p>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xs text-gray-500">
                  <strong>Required columns:</strong> Name, Base Price, Previous Team, Station, Age, Category, Primary Role, Batting Style, Bowling Style
                </p>
                <p className="text-xs text-gray-500">
                  <strong>Optional:</strong> Photo (base64 or URL)
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full border border-gray-200">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border px-3 py-2 text-left text-sm font-medium text-gray-700">Name</th>
                    <th className="border px-3 py-2 text-left text-sm font-medium text-gray-700">Base Price</th>
                    <th className="border px-3 py-2 text-left text-sm font-medium text-gray-700">Previous Team</th>
                    <th className="border px-3 py-2 text-left text-sm font-medium text-gray-700">Station</th>
                    <th className="border px-3 py-2 text-left text-sm font-medium text-gray-700">Age</th>
                    <th className="border px-3 py-2 text-left text-sm font-medium text-gray-700">Category</th>
                    <th className="border px-3 py-2 text-left text-sm font-medium text-gray-700">Primary Role</th>
                    <th className="border px-3 py-2 text-left text-sm font-medium text-gray-700">Batting Style</th>
                    <th className="border px-3 py-2 text-left text-sm font-medium text-gray-700">Bowling Style</th>
                  </tr>
                </thead>
                <tbody>
                  {excelData.slice(0, 10).map((row: any, index: number) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="border px-3 py-2 text-sm">{row.Name || row.name || '-'}</td>
                      <td className="border px-3 py-2 text-sm">{row['Base Price'] || row.basePrice || row['BasePrice'] || '-'}</td>
                      <td className="border px-3 py-2 text-sm">{row['Previous Team'] || row.image.pngpreviousTeam || row['PreviousTeam'] || '-'}</td>
                      <td className="border px-3 py-2 text-sm">{row.Station || row.station || '-'}</td>
                      <td className="border px-3 py-2 text-sm">{row.Age || row.age || '-'}</td>
                      <td className="border px-3 py-2 text-sm">{row.Category || row.category || '-'}</td>
                      <td className="border px-3 py-2 text-sm">{row.PrimaryRole || row.primaryRole || '-'}</td>
                      <td className="border px-3 py-2 text-sm">{row.BattingStyle || row.battingStyle || '-'}</td>
                      <td className="border px-3 py-2 text-sm">{row.BowlingStyle || row.bowlingStyle || '-'}</td>
                    </tr>
                  ))}
                  {excelData.length > 10 && (
                    <tr>
                      <td colSpan={6} className="border px-3 py-2 text-sm text-gray-500 text-center">
                        ... and {excelData.length - 10} more players
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={() => {
                  setShowExcelUpload(false);
                  setExcelData([]);
                }}
                className="flex-1 py-2 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={processExcelData}
                disabled={uploading}
                className="flex-1 py-2 px-4 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
              >
                {uploading ? 'Importing...' : `Import ${excelData.length} Players`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlayerManager;