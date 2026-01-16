const mongoose = require('mongoose');
const Player = require('../models/player');
const PlayerTournament = require('../models/playerTournament');
const Tournament = require('../models/tournament');
const Team = require('../models/team');

const PLAYER_FIELDS = new Set([
    'name',
    'photo',
    'station',
    'age',
    'primaryRole',
    'battingStyle',
    'bowlingStyle',
    'role'
]);

const PARTICIPATION_FIELDS = new Set([
    'team',
    'price',
    'basePrice',
    'isSold',
    'previousYearTeam',
    'tournamentId',
    'status',
    'category'
]);

const escapeRegex = (value = '') => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const normalizeNameValue = (value = '') => value.trim().replace(/\s+/g, ' ');
const buildNameMatchRegex = (value = '') => new RegExp(`^${escapeRegex(normalizeNameValue(value))}$`, 'i');

const splitPayload = (payload = {}) => {
    const playerData = {};
    const participationData = {};

    Object.entries(payload).forEach(([key, value]) => {
        if (PLAYER_FIELDS.has(key)) {
            playerData[key] = value;
        }
        if (PARTICIPATION_FIELDS.has(key)) {
            participationData[key] = value;
        }
    });

    return { playerData, participationData };
};

const hydrateParticipation = (doc) => {
    if (!doc) return null;
    // Handle both Mongoose documents and lean objects
    const participation = doc.toObject ? doc.toObject() : doc;
    const playerDoc = participation.player && typeof participation.player === 'object' && participation.player.toObject
        ? participation.player.toObject()
        : participation.player;
    const teamDoc = participation.team && typeof participation.team === 'object' && participation.team.toObject
        ? participation.team.toObject()
        : participation.team;

    const combined = {
        ...(playerDoc || {}),
        ...participation,
        playerDetails: playerDoc || null,
        participationDetails: {
            ...participation,
            team: teamDoc || participation.team
        }
    };

    delete combined.participationDetails.player;

    combined.participationId = participation._id;
    combined.playerId = playerDoc?._id || participation.player;
    combined.id = playerDoc?._id || participation.player;
    combined._id = playerDoc?._id || participation.player;

    if (teamDoc && teamDoc._id) {
        combined.team = teamDoc._id;
        combined.teamDetails = teamDoc;
        combined.teamName = teamDoc.name || combined.teamName;
    } else {
        combined.team = participation.team;
    }

    return combined;
};

// Optimized populate function - only selects needed fields
const populateParticipation = (query) =>
    query.populate([
        { path: 'player', select: 'name photo age role station primaryRole battingStyle bowlingStyle' },
        { path: 'team', select: 'name logo color owner' }
    ]);

// Helper to get auctioneer's tournament
async function getAuctioneerTournament(email) {
    if (!email) return null;
    return await Tournament.findOne({ auctioneerEmail: { $regex: new RegExp('^' + email + '$', 'i') } });
}

exports.getAllPlayers = async (req, res) => {
    res.set('Cache-Control', 'no-store');
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = req.query.limit ? parseInt(req.query.limit) : 0; // 0 means no limit
        const skip = (page - 1) * limit;

        // Build filter from query
        const filter = {};
        if (req.query.status) {
            // When requesting 'unsold', include both 'unsold' and 'unsold1' players
            if (req.query.status === 'unsold') {
                filter.status = { $in: ['unsold', 'unsold1'] };
            } else {
                filter.status = req.query.status;
            }
        }
        if (req.query.team) filter.team = req.query.team;

        if (req.query.tournamentId) {
            filter.tournamentId = req.query.tournamentId;
        }

        if (req.user && req.user.role === 'auctioneer') {
            const myTournament = await getAuctioneerTournament(req.user.email);
            if (!myTournament) {
                return res.status(403).json({ error: 'Forbidden: No tournament assigned to this auctioneer.' });
            }

            if (req.query.tournamentId && String(req.query.tournamentId) !== String(myTournament._id)) {
                return res.status(403).json({ error: 'Forbidden: You can only fetch players for your tournament.' });
            }

            filter.tournamentId = myTournament._id;
        }

        // Only allow fetching players for one team at a time
        if (req.query.team) {
            if (Array.isArray(req.query.team) || (typeof req.query.team === 'string' && req.query.team.includes(','))) {
                return res.status(400).json({ error: 'You can only fetch players for one team at a time.' });
            }
        }

        // Select only needed fields from PlayerTournament
        const participationQuery = PlayerTournament.find(filter)
            .select('player tournamentId team price basePrice status isSold category previousYearTeam')
            .skip(skip)
            .limit(limit)
            .lean(); // Use lean() for better performance

        const participations = await populateParticipation(participationQuery);

        let playersWithTeamName;
        let total;

        if (participations.length === 0) {
            // Fallback to legacy player data if participation entries do not exist yet
            let projection = 'name age team status price basePrice previousTeam location tournamentId photo';
            const players = await Player.find(filter)
                .skip(skip)
                .limit(limit)
                .select(projection)
                .populate('team', 'name')
                .lean(); // Use lean() for better performance

            playersWithTeamName = players.map(player => {
                if (player.status === 'sold' && player.team && player.team.name) {
                    player.teamName = player.team.name;
                }
                return player;
            });
            total = await Player.countDocuments(filter);
        } else {
            playersWithTeamName = participations.map(participation => {
                const combined = hydrateParticipation(participation);
                if (combined.status === 'sold' && combined.teamDetails?.name) {
                    combined.teamName = combined.teamDetails.name;
                }
                return combined;
            });
            total = await PlayerTournament.countDocuments(filter);
        }

        res.json({ players: playersWithTeamName, total });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getPlayer = async (req, res) => {
    res.set('Cache-Control', 'no-store');
    try {
        let { tournamentId } = req.query;

        if (req.user && req.user.role === 'auctioneer') {
            const myTournament = await getAuctioneerTournament(req.user.email);
            if (!myTournament) {
                return res.status(403).json({ error: 'Forbidden: No tournament assigned to this auctioneer.' });
            }
            if (tournamentId && String(tournamentId) !== String(myTournament._id)) {
                return res.status(403).json({ error: 'Forbidden: You can only view players for your tournament.' });
            }
            tournamentId = myTournament._id;
        }

        let participationQuery = null;

        if (tournamentId) {
            participationQuery = PlayerTournament.findOne({
                player: req.params.id,
                tournamentId
            });
        } else {
            participationQuery = PlayerTournament.findOne({ player: req.params.id }).sort({ updatedAt: -1 });
        }

        const participation = await populateParticipation(participationQuery).lean();
        if (participation) {
            return res.json(hydrateParticipation(participation));
        }

        const player = await Player.findById(req.params.id).lean();
        if (!player) return res.status(404).json({ error: 'Player not found' });
        res.json(player);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.createPlayer = async (req, res) => {
    try {
        console.log('Backend - Creating player with data:', req.body);
        console.log('Backend - Photo URL received:', req.body.photo);

        const { playerData, participationData } = splitPayload(req.body);
        if (playerData.name) {
            playerData.name = normalizeNameValue(playerData.name);
        }
        const tournamentId = participationData.tournamentId;

        if (!tournamentId) {
            return res.status(400).json({ error: 'tournamentId is required to create a player entry.' });
        }

        if (req.user && req.user.role === 'auctioneer') {
            const myTournament = await getAuctioneerTournament(req.user.email);
            if (!myTournament || String(req.body.tournamentId) !== String(myTournament._id)) {
                return res.status(403).json({ error: 'Forbidden: You can only create players for your assigned tournament.' });
            }
        }

        // Ensure photo is a URL, not base64
        if (playerData.photo && playerData.photo.startsWith('data:')) {
            return res.status(400).json({ error: 'Base64 images are not supported. Please upload images to Cloudinary.' });
        }

        let player = null;
        if (req.body.playerId) {
            player = await Player.findById(req.body.playerId);
            if (!player) {
                return res.status(404).json({ error: 'Existing player not found' });
            }
        } else if (playerData.name) {
            player = await Player.findOne({ name: { $regex: buildNameMatchRegex(playerData.name) } });
        }

        if (!player) {
            player = new Player(playerData);
        } else if (Object.keys(playerData).length) {
            Object.assign(player, playerData);
        }

        await player.save();

        try {
            let participation = new PlayerTournament({
                ...participationData,
                player: player._id
            });
            participation = await participation.save();
            const populated = await populateParticipation(PlayerTournament.findById(participation._id));
            const response = hydrateParticipation(populated);
            console.log('Backend - Player participation saved:', response);
            res.status(201).json(response);
        } catch (err) {
            if (err.code === 11000) {
                const existing = await PlayerTournament.findOne({
                    player: player._id,
                    tournamentId
                });
                const populated = existing
                    ? await populateParticipation(PlayerTournament.findById(existing._id))
                    : null;
                return res.status(409).json({
                    error: 'Player already exists in this tournament.',
                    existing: populated ? hydrateParticipation(populated) : null
                });
            }
            throw err;
        }
    } catch (err) {
        console.error('Backend - Error creating player:', err);
        res.status(400).json({ error: err.message });
    }
};

exports.updatePlayer = async (req, res) => {
    try {
        if (req.user && req.user.role === 'auctioneer') {
            const myTournament = await getAuctioneerTournament(req.user.email);
            if (!myTournament || String(req.body.tournamentId) !== String(myTournament._id)) {
                return res.status(403).json({ error: 'Forbidden: You can only update players for your assigned tournament.' });
            }
        }

        // Ensure photo is a URL, not base64
        if (req.body.photo && req.body.photo.startsWith('data:')) {
            return res.status(400).json({ error: 'Base64 images are not supported. Please upload images to Cloudinary.' });
        }

        const { playerData, participationData } = splitPayload(req.body);
        const player = await Player.findById(req.params.id);
        if (!player) return res.status(404).json({ error: 'Player not found' });

        if (Object.keys(playerData).length) {
            Object.assign(player, playerData);
            await player.save();
        }

        let participation = null;
        const { tournamentId } = participationData;
        if (!tournamentId) {
            return res.status(400).json({ error: 'tournamentId is required to update tournament-specific fields.' });
        }

        participation = await PlayerTournament.findOne({ player: player._id, tournamentId });
        if (!participation) {
            participation = new PlayerTournament({ player: player._id, tournamentId });
        }

        Object.assign(participation, participationData);
        await participation.save();

        const populated = await populateParticipation(PlayerTournament.findById(participation._id));
        res.json(hydrateParticipation(populated));
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

exports.deletePlayer = async (req, res) => {
    try {
        if (req.user && req.user.role === 'auctioneer') {
            const myTournament = await getAuctioneerTournament(req.user.email);
            const participation = myTournament
                ? await PlayerTournament.findOne({ player: req.params.id, tournamentId: myTournament._id })
                : null;
            if (!myTournament || !participation) {
                return res.status(403).json({ error: 'Forbidden: You can only delete players for your assigned tournament.' });
            }
        }
        const { tournamentId } = req.query;
        if (tournamentId) {
            const participation = await PlayerTournament.findOneAndDelete({
                player: req.params.id,
                tournamentId
            });
            if (!participation) {
                return res.status(404).json({ error: 'Player participation not found for this tournament.' });
            }
            const remaining = await PlayerTournament.countDocuments({ player: req.params.id });
            if (remaining === 0) {
                await Player.findByIdAndDelete(req.params.id);
            }
            return res.json({ message: 'Player removed from tournament', participationId: participation._id });
        }

        const deletedPlayer = await Player.findByIdAndDelete(req.params.id);
        if (!deletedPlayer) return res.status(404).json({ error: 'Player not found' });
        await PlayerTournament.deleteMany({ player: req.params.id });
        res.json({ message: 'Player deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.markUnsold = async (req, res) => {
    try {
        console.log('markUnsold request received:', req.body);
        const { playerId } = req.body;
        console.log('Player ID to mark unsold:', playerId);
        const filter = { player: playerId };
        if (req.body.tournamentId) {
            filter.tournamentId = req.body.tournamentId;
        } else if (req.user && req.user.role === 'auctioneer') {
            const myTournament = await getAuctioneerTournament(req.user.email);
            if (myTournament) {
                filter.tournamentId = myTournament._id;
            }
        }

        let participation = await PlayerTournament.findOne(filter).sort({ updatedAt: -1 });
        if (!participation) {
            console.log('Participation entry not found for player:', playerId, 'with filter:', filter);
            return res.status(404).json({ error: 'Player participation not found' });
        }

        console.log('Found participation entry for player:', playerId, 'Current status:', participation.status, 'Current team:', participation.team);

        let updatedTeam = null;
        if (participation.team && participation.price) {
            const team = await Team.findById(participation.team);
            if (team) {
                console.log('Removing player from team:', team.name);
                // Remove player from team
                team.players = team.players.filter(pId => String(pId) !== String(playerId));
                // Refund budget
                team.remainingBudget += participation.price;
                await team.save();
                updatedTeam = team;
                console.log('Team updated, new budget:', team.remainingBudget);
            }
        }

        participation.status = 'available';
        participation.team = undefined;
        participation.price = undefined;
        participation.isSold = false;
        await participation.save();

        console.log('Player marked as unsold successfully');

        // Emit updates for both players and teams
        const populated = await populateParticipation(PlayerTournament.findById(participation._id));
        const players = await PlayerTournament.countDocuments();
        const teams = await Team.countDocuments();
        console.log('Emitting playerUpdate with', players, 'participation entries');
        console.log('Emitting teamUpdate with', teams, 'teams');
        res.json({ player: hydrateParticipation(populated), team: updatedTeam });
    } catch (err) {
        console.error('Error in markUnsold:', err);
        res.status(500).json({ error: err.message });
    }
};

// Bulk revert all UNSOLD players of a category to AVAILABLE within a tournament
exports.revertUnsoldCategoryToAvailable = async (req, res) => {
    try {
        const { category, tournamentId } = req.body;
        if (!category) {
            return res.status(400).json({ error: 'category is required' });
        }

        const filter = {
            status: 'unsold',
            category
        };

        if (tournamentId) {
            filter.tournamentId = tournamentId;
        } else if (req.user && req.user.role === 'auctioneer') {
            const myTournament = await getAuctioneerTournament(req.user.email);
            if (!myTournament) {
                return res.status(403).json({ error: 'Forbidden: No tournament assigned to this auctioneer.' });
            }
            filter.tournamentId = myTournament._id;
        } else {
            return res.status(400).json({ error: 'tournamentId is required' });
        }

        const result = await PlayerTournament.updateMany(filter, {
            status: 'available',
            team: undefined,
            price: undefined,
            isSold: false
        });

        res.json({
            matched: result.matchedCount ?? result.nMatched ?? result.n,
            modified: result.modifiedCount ?? result.nModified ?? result.n
        });
    } catch (err) {
        console.error('Error in revertUnsoldCategoryToAvailable:', err);
        res.status(500).json({ error: err.message });
    }
};

// Move all UNSOLD1 players of a category back to UNSOLD within a tournament
exports.revertUnsold1CategoryToUnsold = async (req, res) => {
    try {
        const { category, tournamentId } = req.body;
        if (!category) {
            return res.status(400).json({ error: 'category is required' });
        }

        const filter = {
            status: 'unsold1',
            category
        };

        if (tournamentId) {
            filter.tournamentId = tournamentId;
        } else if (req.user && req.user.role === 'auctioneer') {
            const myTournament = await getAuctioneerTournament(req.user.email);
            if (!myTournament) {
                return res.status(403).json({ error: 'Forbidden: No tournament assigned to this auctioneer.' });
            }
            filter.tournamentId = myTournament._id;
        } else {
            return res.status(400).json({ error: 'tournamentId is required' });
        }

        const result = await PlayerTournament.updateMany(filter, {
            status: 'unsold',
            team: undefined,
            price: undefined,
            isSold: false
        });

        res.json({
            matched: result.matchedCount ?? result.nMatched ?? result.n,
            modified: result.modifiedCount ?? result.nModified ?? result.n
        });
    } catch (err) {
        console.error('Error in revertUnsold1CategoryToUnsold:', err);
        res.status(500).json({ error: err.message });
    }
};

// Lightweight: only name, id, basePrice, team, status, tournamentId
exports.getPlayerSummaries = async (req, res) => {
    try {
        const filter = {};
        if (req.query.tournamentId) {
            filter.tournamentId = req.query.tournamentId;
        }

        if (req.user && req.user.role === 'auctioneer') {
            const myTournament = await getAuctioneerTournament(req.user.email);
            if (!myTournament) {
                return res.status(403).json({ error: 'Forbidden: No tournament assigned to this auctioneer.' });
            }
            if (filter.tournamentId && String(filter.tournamentId) !== String(myTournament._id)) {
                return res.status(403).json({ error: 'Forbidden: You can only fetch players for your tournament.' });
            }
            filter.tournamentId = myTournament._id;
        }

        // Already optimized with select and lean, but ensure populate only selects name
        const participations = await PlayerTournament.find(filter)
            .select('player tournamentId status basePrice price team category isSold')
            .populate({ path: 'player', select: 'name' })
            .sort({ createdAt: 1 })
            .lean(); // Already using lean - good!

        if (!participations.length) {
            return res.json([]);
        }

        const summaries = participations.map(participation => ({
            _id: participation.player?._id || participation.player,
            id: participation.player?._id || participation.player,
            playerId: participation.player?._id || participation.player,
            participationId: participation._id,
            name: participation.player?.name || 'Unnamed Player',
            tournamentId: participation.tournamentId,
            status: participation.status,
            team: participation.team,
            price: participation.price,
            basePrice: participation.basePrice,
            category: participation.category,
            isSold: participation.isSold
        }));
        res.json(summaries);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
};

// Public: fetch only display-safe fields for a tournament
exports.getPublicPlayersByTournament = async (req, res) => {
    res.set('Cache-Control', 'no-store');
    try {
        const { tournamentId } = req.params;
        if (!tournamentId || !mongoose.Types.ObjectId.isValid(tournamentId)) {
            return res.status(400).json({ error: 'Invalid tournamentId' });
        }

        const participationQuery = PlayerTournament.find({ tournamentId })
            .select('player category basePrice')
            .populate({ path: 'player', select: 'name photo age station primaryRole battingStyle bowlingStyle role basePrice' })
            .sort({ createdAt: 1 })
            .lean();

        const participations = await participationQuery;

        if (!participations.length) {
            // Legacy fallback if participation entries do not exist yet
            const players = await Player.find({ tournamentId })
                .select('name photo age station primaryRole battingStyle bowlingStyle role category basePrice')
                .sort({ createdAt: 1 })
                .lean();
            return res.json(players.map(player => ({
                id: player._id,
                playerId: player._id,
                name: player.name,
                photo: player.photo,
                age: player.age,
                category: player.category,
                station: player.station,
                primaryRole: player.primaryRole,
                battingStyle: player.battingStyle,
                bowlingStyle: player.bowlingStyle,
                role: player.role,
                basePrice: player.basePrice
            })));
        }

        const safePlayers = participations.map(participation => {
            const player = participation.player || {};
            return {
                id: player._id || participation.player,
                playerId: player._id || participation.player,
                name: player.name || 'Unnamed Player',
                photo: player.photo,
                age: player.age,
                category: participation.category,
                station: player.station,
                primaryRole: player.primaryRole,
                battingStyle: player.battingStyle,
                bowlingStyle: player.bowlingStyle,
                role: player.role,
                basePrice: participation.basePrice ?? player.basePrice
            };
        });

        res.json(safePlayers);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.checkDuplicatePlayerName = async (req, res) => {
    try {
        const rawName = (req.query.name || '').trim();
        if (!rawName) {
            return res.status(400).json({ error: 'name query parameter is required' });
        }
        const regex = buildNameMatchRegex(rawName);

        // Already optimized with select and lean - good!
        const players = await Player.find({ name: regex })
            .select('name photo station age primaryRole battingStyle bowlingStyle')
            .lean(); // Already using lean - good!

        res.json(players);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
};
