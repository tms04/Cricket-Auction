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

        // Only select needed fields for the list view, use lean() for better performance
        const teams = await Team.find(filter)
            .skip(skip)
            .limit(limit)
            .select('name budget remainingBudget players tournamentId color logo owner')
            .lean(); // Use lean() for read-only queries

        // Calculate maxBid for each team if tournamentId is provided
        if (req.query.tournamentId && teams.length > 0) {
            // Fetch tournament details once for all teams
            const tournament = await Tournament.findById(req.query.tournamentId)
                .select('minTeamSize categories')
                .lean();
            
            if (tournament) {
                const minTeamSize = tournament.minTeamSize || 0;
                
                // Calculate minimum base price from tournament categories (minBalance)
                const minBasePriceInTournament = tournament.categories && tournament.categories.length > 0
                    ? Math.min(...tournament.categories
                        .map(cat => cat.minBalance || 0)
                        .filter(v => v > 0))
                    : 0;

                // Calculate maxBid for each team
                teams.forEach(team => {
                    const remainingBudget = Number(team.remainingBudget) || 0;
                    // Count unique players to handle any duplicates in the array
                    const uniquePlayerIds = Array.isArray(team.players) 
                        ? new Set(team.players.map(p => String(p))).size 
                        : 0;
                    const playersTaken = uniquePlayerIds;
                    
                    let maxBid = null;
                    if (minTeamSize > 0 && minBasePriceInTournament > 0) {
                        const remainingMandatorySlots = Math.max(minTeamSize - playersTaken - 1, 0);
                        maxBid = remainingBudget - remainingMandatorySlots * minBasePriceInTournament;
                        if (maxBid < 0) maxBid = 0;
                    }
                    
                    team.maxBid = maxBid;
                });
            }
        }

        const total = await Team.countDocuments(filter);
        res.json({ teams, total });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getTeam = async (req, res) => {
    try {
        // Optimize: Only populate player names and basic info, not full player objects, use lean()
        const team = await Team.findById(req.params.id)
            .populate('players', 'name photo age role') // Only get essential player fields
            .lean(); // Use lean() for read-only queries
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
        
        // Ensure logo is a URL, not base64
        if (req.body.logo && req.body.logo.startsWith('data:')) {
            return res.status(400).json({ error: 'Base64 images are not supported. Please upload images to Cloudinary.' });
        }
        
        const newTeam = new Team(req.body);
        const savedTeam = await newTeam.save();
        // Remove unnecessary refetch - just return the saved team
        // Socket.io will handle broadcasting updates if needed
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
        
        // Ensure logo is a URL, not base64
        if (req.body.logo && req.body.logo.startsWith('data:')) {
            return res.status(400).json({ error: 'Base64 images are not supported. Please upload images to Cloudinary.' });
        }
        
        // Optimize: Only populate player names if needed, use lean() for response
        const updatedTeam = await Team.findByIdAndUpdate(req.params.id, req.body, { new: true })
            .populate('players', 'name photo age role') // Only get essential player fields
            .lean(); // Use lean() for better performance
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