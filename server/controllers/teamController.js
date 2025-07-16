const Team = require('../models/team');
const Tournament = require('../models/tournament');

// Helper to get auctioneer's tournament
async function getAuctioneerTournament(email) {
    if (!email) return null;
    return await Tournament.findOne({ auctioneerEmail: { $regex: new RegExp('^' + email + '$', 'i') } });
}

exports.getAllTeams = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        // Add tournamentId filter if provided
        const filter = {};
        if (req.query.tournamentId) {
            filter.tournamentId = req.query.tournamentId;
        }

        // Only select needed fields for the list view
        const teams = await Team.find(filter)
            .skip(skip)
            .limit(limit)
            .select('name budget remainingBudget players tournamentId color logo owner');

        const total = await Team.countDocuments(filter);
        res.json({ teams, total });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getTeam = async (req, res) => {
    try {
        const team = await Team.findById(req.params.id).populate('players');
        if (!team) return res.status(404).json({ error: 'Team not found' });
        res.json(team);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.createTeam = async (req, res) => {
    try {
        if (req.user && req.user.role === 'auctioneer') {
            const myTournament = await getAuctioneerTournament(req.user.email);
            if (!myTournament || String(req.body.tournamentId) !== String(myTournament._id)) {
                return res.status(403).json({ error: 'Forbidden: You can only create teams for your assigned tournament.' });
            }
        }
        const newTeam = new Team(req.body);
        const savedTeam = await newTeam.save();
        const teams = await Team.find().populate('players');
        res.status(201).json(savedTeam);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

exports.updateTeam = async (req, res) => {
    try {
        if (req.user && req.user.role === 'auctioneer') {
            const myTournament = await getAuctioneerTournament(req.user.email);
            if (!myTournament || String(req.body.tournamentId) !== String(myTournament._id)) {
                return res.status(403).json({ error: 'Forbidden: You can only update teams for your assigned tournament.' });
            }
        }
        const updatedTeam = await Team.findByIdAndUpdate(req.params.id, req.body, { new: true }).populate('players');
        if (!updatedTeam) return res.status(404).json({ error: 'Team not found' });
        res.json(updatedTeam);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

exports.deleteTeam = async (req, res) => {
    try {
        if (req.user && req.user.role === 'auctioneer') {
            const myTournament = await getAuctioneerTournament(req.user.email);
            const team = await Team.findById(req.params.id);
            if (!myTournament || !team || String(team.tournamentId) !== String(myTournament._id)) {
                return res.status(403).json({ error: 'Forbidden: You can only delete teams for your assigned tournament.' });
            }
        }
        const deletedTeam = await Team.findByIdAndDelete(req.params.id);
        if (!deletedTeam) return res.status(404).json({ error: 'Team not found' });
        res.json({ message: 'Team deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}; 