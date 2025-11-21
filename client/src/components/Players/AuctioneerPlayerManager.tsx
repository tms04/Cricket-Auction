import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { useAuth } from '../../contexts/AuthContext';
import { Player } from '../../types';
import { fetchPlayerById, fetchPlayerSummaries, checkDuplicatePlayerName } from '../../api';
import * as XLSX from 'xlsx';
import { uploadImage, getOptimizedImageUrl } from '../../utils/cloudinary';
import { useDuplicatePlayerPrompt } from '../../hooks/useDuplicatePlayerPrompt';

type PlayerFormPayload = Omit<Player, 'id'> & { playerId?: string };
type ExcelRow = Record<string, string | number | undefined>;

const AuctioneerPlayerManager: React.FC = () => {
    const { addPlayer, updatePlayer, deletePlayer, myTournament } = useApp();
    const { user } = useAuth();
    const [players, setPlayers] = useState<Player[]>([]);
    const [loadingPlayers, setLoadingPlayers] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
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
    const [showExcelUpload, setShowExcelUpload] = useState(false);
    const [excelData, setExcelData] = useState<ExcelRow[]>([]);
    const [uploading, setUploading] = useState(false);
    const { requestDecision: requestDuplicateDecision, prompt: duplicatePrompt } = useDuplicatePlayerPrompt();

    const loadPlayerSummaries = React.useCallback(async () => {
        if (!myTournament?.id) {
            setPlayers([]);
            return;
        }
        setLoadingPlayers(true);
        try {
            const summaries = await fetchPlayerSummaries(myTournament.id);
            setPlayers(summaries);
        } finally {
            setLoadingPlayers(false);
        }
    }, [myTournament?.id]);

    useEffect(() => {
        loadPlayerSummaries();
    }, [loadPlayerSummaries]);

    const filteredPlayers = user?.role === 'auctioneer' && myTournament
        ? players.filter((p) => p.tournamentId === myTournament.id)
        : players;

    const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
        setNotification({ type: type === 'info' ? 'error' : type, message });
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

    const normalizeNameValue = (value: string) => value.trim().toLowerCase().replace(/\s+/g, ' ');
    const findDuplicatePlayerByName = React.useCallback(
        async (name: string, localPool: Player[] = players) => {
            if (!name) return null;
            const normalizedIncoming = normalizeNameValue(name);
            const localMatch = (localPool || []).find(
                (p) => normalizeNameValue(p.name) === normalizedIncoming
            );
            if (localMatch) {
                return localMatch;
            }
            try {
                const matches = await checkDuplicatePlayerName(name);
                return matches.find((p) => normalizeNameValue(p.name) === normalizedIncoming) || null;
            } catch (err) {
                console.error('Failed to search duplicate players', err);
                return null;
            }
        },
        [players]
    );

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (user?.role === 'auctioneer' && !myTournament) {
            showNotification('error', 'No tournament assigned. Please contact the master/admin.');
            return;
        }
        const payload = {
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
            tournamentId: myTournament!.id,
            status: formData.isSold ? 'sold' : 'available'
        };
        try {
            if (editingPlayer && editingPlayer.id) {
                await updatePlayer(editingPlayer.id, payload);
                showNotification('success', 'Player updated successfully');
            } else {
                const playerPayload: PlayerFormPayload = { ...payload };
                const duplicate = await findDuplicatePlayerByName(payload.name);
                if (duplicate) {
                    const decision = await requestDuplicateDecision(duplicate, payload, 'manual');
                    if (decision === 'cancel') {
                        showNotification('info', 'Player creation cancelled');
                        return;
                    }
                    if (decision === 'existing') {
                        playerPayload.playerId = duplicate.playerId || duplicate.id;
                    }
                }
                await addPlayer(playerPayload);
                showNotification('success', 'Player added successfully');
                await loadPlayerSummaries();
            }
            resetForm();
            setShowForm(false);
        } catch {
            showNotification('error', 'Failed to save player');
        }
    };

    const handleEdit = async (player: Player) => {
        const playerId = player.id || (player as { _id?: string })._id;
        if (!playerId) {
            showNotification('error', 'Invalid player ID. Cannot edit this player.');
            return;
        }
        try {
            const fullPlayer = await fetchPlayerById(playerId, myTournament?.id);
            setEditingPlayer(fullPlayer);
            setFormData({
                name: fullPlayer.name || '',
                basePrice: fullPlayer.basePrice || 0,
                isSold: fullPlayer.isSold || false,
                previousYearTeam: fullPlayer.previousYearTeam || '',
                station: fullPlayer.station || '',
                photo: fullPlayer.photo || '',
                age: fullPlayer.age || 0,
                category: fullPlayer.category || '',
                primaryRole: fullPlayer.primaryRole || '',
                battingStyle: fullPlayer.battingStyle || '',
                bowlingStyle: fullPlayer.bowlingStyle || ''
            });
            setShowForm(true);
        } catch {
            showNotification('error', 'Failed to load player details');
        }
    };

    const handleDelete = async (player: Player) => {
        if (window.confirm(`Are you sure you want to delete "${player.name}"?`)) {
            try {
                const playerId = player.id || (player as { _id?: string })._id;
                if (!playerId) {
                    showNotification('error', 'Invalid player ID');
                    return;
                }
                await deletePlayer(playerId, myTournament?.id);
                showNotification('success', 'Player deleted successfully');
                await loadPlayerSummaries();
            } catch {
                showNotification('error', 'Failed to delete player');
            }
        }
    };

    const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const workbook = XLSX.read(event.target?.result, { type: 'binary' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const data = XLSX.utils.sheet_to_json(worksheet) as ExcelRow[];
                setExcelData(data);
                setShowExcelUpload(true);
            } catch {
                showNotification('error', 'Error reading Excel file. Please check the format.');
            }
        };
        reader.readAsBinaryString(file);
    };

    const processExcelData = async () => {
        if (!excelData.length) return;
        setUploading(true);
        try {
            const processedPlayers = excelData.map((row) => ({
                name: String(row.Name || row.name || ''),
                basePrice: parseInt(String(row['Base Price'] || row.basePrice || row['BasePrice'] || '0'), 10) || 0,
                previousYearTeam: String(row['Previous Team'] || row.previousTeam || row['PreviousTeam'] || ''),
                station: String(row.Station || row.station || ''),
                age: parseInt(String(row.Age || row.age || '0'), 10) || 0,
                category: String(row.Category || row.category || ''),
                primaryRole: String(row.PrimaryRole || row.primaryRole || ''),
                battingStyle: String(row.BattingStyle || row.battingStyle || ''),
                bowlingStyle: String(row.BowlingStyle || row.bowlingStyle || ''),
                tournamentId: myTournament!.id,
                status: 'available' as const
            })).filter(player => player.name.trim() !== '');
            let workingPlayers = [...players];
            for (const player of processedPlayers) {
                const playerPayload: PlayerFormPayload = { ...player };
                const localDuplicate = workingPlayers.find(
                    (p) => normalizeNameValue(p.name) === normalizeNameValue(player.name)
                );
                const duplicate = localDuplicate || await findDuplicatePlayerByName(player.name, workingPlayers);
                if (duplicate) {
                    const decision = await requestDuplicateDecision(duplicate, player, 'excel');
                    if (decision === 'cancel') {
                        showNotification('info', 'Excel import cancelled');
                        setUploading(false);
                        return;
                    }
                    if (decision === 'existing') {
                        playerPayload.playerId = duplicate.playerId || duplicate.id;
                    }
                }
                const created = await addPlayer(playerPayload);
                if (created) {
                    workingPlayers = [
                        ...workingPlayers,
                        {
                            ...created,
                            id: created.id || created.playerId || ''
                        }
                    ];
                }
            }
            showNotification('success', `Successfully imported ${processedPlayers.length} players`);
            setShowExcelUpload(false);
            setExcelData([]);
            await loadPlayerSummaries();
        } catch {
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
    if (user?.role === 'auctioneer' && !myTournament) {
        return (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-yellow-800">No tournament assigned. Please contact the master/admin.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {duplicatePrompt}
            {/* Notification */}
            {notification && (
                <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg flex items-center space-x-2 ${notification.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                    {notification.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                    <span>{notification.message}</span>
                </div>
            )}

            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Player Registration</h2>
                    <p className="text-gray-600">
                        {myTournament ? `Register players for ${myTournament.name}` : 'Select an active tournament to register players'}
                    </p>
                </div>
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
                        <span>Download Sample</span>
                    </button>
                    <label className="flex items-center space-x-2 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors cursor-pointer">
                        <span>Import Excel</span>
                        <input
                            type="file"
                            accept=".xlsx,.xls"
                            onChange={handleExcelUpload}
                            className="hidden"
                        />
                    </label>
                </div>
            </div>

            {loadingPlayers && (
                <div className="text-sm text-gray-500">Loading players...</div>
            )}

            {/* Players Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredPlayers.map(player => {
                    return (
                        <div key={player.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center space-x-3">
                                    <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center overflow-hidden">
                                        <span className="w-6 h-6 text-white font-bold text-lg">{player.name[0]}</span>
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-900">{player.name}</h3>
                                    </div>
                                </div>
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
                            </div>
                        </div>
                    );
                })}
            </div>

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
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Previous Year Team</label>
                                    <input
                                        type="text"
                                        value={formData.previousYearTeam}
                                        onChange={(e) => setFormData({ ...formData, previousYearTeam: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                        placeholder="e.g., Mumbai Indians"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Station</label>
                                    <input
                                        type="text"
                                        value={formData.station}
                                        onChange={e => setFormData({ ...formData, station: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                        placeholder="Enter station/location"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Age</label>
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
                                    <input
                                        type="text"
                                        value={formData.category}
                                        onChange={e => setFormData({ ...formData, category: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                        placeholder="Enter category"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Primary Role</label>
                                    <input
                                        type="text"
                                        value={formData.primaryRole}
                                        onChange={e => setFormData({ ...formData, primaryRole: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                        placeholder="Enter primary role"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Batting Style</label>
                                    <input
                                        type="text"
                                        value={formData.battingStyle}
                                        onChange={e => setFormData({ ...formData, battingStyle: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                        placeholder="Enter batting style"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Bowling Style</label>
                                    <input
                                        type="text"
                                        value={formData.bowlingStyle}
                                        onChange={e => setFormData({ ...formData, bowlingStyle: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                        placeholder="Enter bowling style"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Photo</label>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={async (e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                try {
                                                    const imageUrl = await uploadImage(file);
                                                    setFormData((prev) => ({ ...prev, photo: imageUrl }));
                                                    showNotification('success', 'Image uploaded successfully!');
                                                } catch {
                                                    showNotification('error', 'Failed to upload image. Please try again.');
                                                }
                                            }
                                        }}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    />
                                    {formData.photo && (
                                        <img src={getOptimizedImageUrl(formData.photo, { width: 96, height: 96, quality: 80 })} alt="Preview" className="mt-2 w-24 h-24 object-cover rounded-lg border" />
                                    )}
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
                                    <strong>Optional:</strong> Photo (Cloudinary URL)
                                </p>
                            </div>
                        </div>
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
                                {(excelData || []).slice(0, 10).map((row, index: number) => (
                                    <tr key={index} className="hover:bg-gray-50">
                                        <td className="border px-3 py-2 text-sm">{String(row.Name || row.name || '-')}</td>
                                        <td className="border px-3 py-2 text-sm">{String(row['Base Price'] || row.basePrice || row['BasePrice'] || '-')}</td>
                                        <td className="border px-3 py-2 text-sm">{String(row['Previous Team'] || row.previousTeam || row['PreviousTeam'] || '-')}</td>
                                        <td className="border px-3 py-2 text-sm">{String(row.Station || row.station || '-')}</td>
                                        <td className="border px-3 py-2 text-sm">{String(row.Age || row.age || '-')}</td>
                                        <td className="border px-3 py-2 text-sm">{String(row.Category || row.category || '-')}</td>
                                        <td className="border px-3 py-2 text-sm">{String(row.PrimaryRole || row.primaryRole || '-')}</td>
                                        <td className="border px-3 py-2 text-sm">{String(row.BattingStyle || row.battingStyle || '-')}</td>
                                        <td className="border px-3 py-2 text-sm">{String(row.BowlingStyle || row.bowlingStyle || '-')}</td>
                                    </tr>
                                ))}
                                {(excelData || []).length > 10 && (
                                    <tr>
                                        <td colSpan={9} className="border px-3 py-2 text-sm text-gray-500 text-center">
                                            ... and {(excelData || []).length - 10} more players
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
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
                                {uploading ? 'Importing...' : `Import ${(excelData || []).length} Players`}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AuctioneerPlayerManager; 