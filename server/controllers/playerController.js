const Player = require('../models/player');
const Tournament = require('../models/tournament');
const Team = require('../models/team');

// Helper to get auctioneer's tournament
async function getAuctioneerTournament(email) {
    if (!email) return null;
    return await Tournament.findOne({ auctioneerEmail: { $regex: new RegExp('^' + email + '$', 'i') } });
}

exports.getAllPlayers = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = req.query.limit ? parseInt(req.query.limit) : 0; // 0 means no limit
        const skip = (page - 1) * limit;

        // Build filter from query
        const filter = {};
        if (req.query.status) filter.status = req.query.status;
        if (req.query.tournamentId) filter.tournamentId = req.query.tournamentId;
        if (req.query.team) filter.team = req.query.team;

        // Only allow fetching players for one team at a time
        if (req.query.team) {
            if (Array.isArray(req.query.team) || (typeof req.query.team === 'string' && req.query.team.includes(','))) {
                return res.status(400).json({ error: 'You can only fetch players for one team at a time.' });
            }
        }

        // Only select needed fields for the list view
        let projection = 'name age team status price basePrice previousTeam location tournamentId';
        if (req.query.team) {
            projection += ' photo';
        }
        const players = await Player.find(filter)
            .skip(skip)
            .limit(limit)
            .select(projection)
            .populate('team', 'name');

        // Add teamName property for sold players
        const playersWithTeamName = players.map(player => {
            const obj = player.toObject();
            if (obj.status === 'sold' && obj.team && obj.team.name) {
                obj.teamName = obj.team.name;
            }
            return obj;
        });

        const total = await Player.countDocuments(filter);
        res.json({ players: playersWithTeamName, total });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getPlayer = async (req, res) => {
    try {
        const player = await Player.findById(req.params.id);
        if (!player) return res.status(404).json({ error: 'Player not found' });
        res.json(player);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.createPlayer = async (req, res) => {
    try {
        if (req.user && req.user.role === 'auctioneer') {
            const myTournament = await getAuctioneerTournament(req.user.email);
            if (!myTournament || String(req.body.tournamentId) !== String(myTournament._id)) {
                return res.status(403).json({ error: 'Forbidden: You can only create players for your assigned tournament.' });
            }
        }
        const newPlayer = new Player(req.body);
        const savedPlayer = await newPlayer.save();
        res.status(201).json(savedPlayer);
    } catch (err) {
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
        const updatedPlayer = await Player.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!updatedPlayer) return res.status(404).json({ error: 'Player not found' });
        res.json(updatedPlayer);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

exports.deletePlayer = async (req, res) => {
    try {
        if (req.user && req.user.role === 'auctioneer') {
            const myTournament = await getAuctioneerTournament(req.user.email);
            const player = await Player.findById(req.params.id);
            if (!myTournament || !player || String(player.tournamentId) !== String(myTournament._id)) {
                return res.status(403).json({ error: 'Forbidden: You can only delete players for your assigned tournament.' });
            }
        }
        const deletedPlayer = await Player.findByIdAndDelete(req.params.id);
        if (!deletedPlayer) return res.status(404).json({ error: 'Player not found' });
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

        const player = await Player.findById(playerId);
        if (!player) {
            console.log('Player not found:', playerId);
            return res.status(404).json({ error: 'Player not found' });
        }

        console.log('Found player:', player.name, 'Current status:', player.status, 'Current team:', player.team);

        let updatedTeam = null;
        if (player.team && player.price) {
            const team = await Team.findById(player.team);
            if (team) {
                console.log('Removing player from team:', team.name);
                // Remove player from team
                team.players = team.players.filter(pId => String(pId) !== String(player._id));
                // Refund budget
                team.remainingBudget += player.price;
                await team.save();
                updatedTeam = team;
                console.log('Team updated, new budget:', team.remainingBudget);
            }
        }

        player.status = 'available';
        player.team = undefined;
        player.price = undefined;
        await player.save();
        console.log('Player marked as unsold successfully');

        // Emit updates for both players and teams
        const players = await Player.find();
        const teams = await Team.find();
        console.log('Emitting playerUpdate with', players.length, 'players');
        console.log('Emitting teamUpdate with', teams.length, 'teams');
        res.json({ player, team: updatedTeam });
    } catch (err) {
        console.error('Error in markUnsold:', err);
        res.status(500).json({ error: err.message });
    }
};

// Lightweight: only name, id, basePrice, team, status, tournamentId
exports.getPlayerSummaries = async (req, res) => {
    try {
        const { tournamentId } = req.query;
        const filter = tournamentId ? { tournamentId } : {};
        // Add price to the projection
        const players = await Player.find(filter, '_id name basePrice price team status tournamentId');
        res.json(players);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
}; 
