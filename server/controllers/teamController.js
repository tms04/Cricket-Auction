const Team = require('../models/team');
const Tournament = require('../models/tournament');

// Helper to get auctioneer's tournament
async function getAuctioneerTournament(email) {
    if (!email) return null;
    return await Tournament.findOne({ auctioneerEmail: { $regex: new RegExp('^' + email + '$', 'i') } });
}

function normalizeCategory(value = '') {
    return String(value).trim().toLowerCase();
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
                const categories = Array.isArray(tournament.categories) ? tournament.categories : [];
                const teamIds = teams.map(team => team._id);

                // Count sold players by team and category once, then reuse for all teams.
                const PlayerTournament = require('../models/playerTournament');
                const soldByTeamCategory = await PlayerTournament.aggregate([
                    {
                        $match: {
                            tournamentId: tournament._id,
                            status: 'sold',
                            team: { $in: teamIds }
                        }
                    },
                    {
                        $project: {
                            team: 1,
                            categoryNormalized: { $toLower: { $ifNull: ['$category', ''] } }
                        }
                    },
                    {
                        $group: {
                            _id: { team: '$team', category: '$categoryNormalized' },
                            count: { $sum: 1 }
                        }
                    }
                ]);

                const teamCategoryCountMap = new Map();
                soldByTeamCategory.forEach(item => {
                    const teamId = String(item._id.team);
                    const categoryKey = String(item._id.category || '');
                    if (!teamCategoryCountMap.has(teamId)) {
                        teamCategoryCountMap.set(teamId, new Map());
                    }
                    teamCategoryCountMap.get(teamId).set(categoryKey, Number(item.count) || 0);
                });

                teams.forEach(team => {
                    const remainingBudget = Math.max(Number(team.remainingBudget) || 0, 0);
                    const teamId = String(team._id);
                    const categoryMap = teamCategoryCountMap.get(teamId) || new Map();

                    const categoryStates = categories.map(cat => {
                        const required = Math.max(Number(cat.numPlayers) || 0, 0);
                        const minBasePrice = Math.max(Number(cat.minBalance) || 0, 0);
                        const soldCount = Math.max(Number(categoryMap.get(normalizeCategory(cat.category)) || 0), 0);
                        const playersLeft = Math.max(required - soldCount, 0);
                        return {
                            playersLeft,
                            minBasePrice
                        };
                    });

                    // Max bid is for the NEXT player:
                    // assume the first still-pending category slot is filled by the next purchase.
                    const firstPendingIdx = categoryStates.findIndex(cat => cat.playersLeft > 0);
                    if (firstPendingIdx >= 0) {
                        categoryStates[firstPendingIdx].playersLeft -= 1;
                    }

                    const mandatoryReserve = categoryStates.reduce(
                        (sum, cat) => sum + cat.playersLeft * cat.minBasePrice,
                        0
                    );

                    team.maxBid = Math.max(remainingBudget - mandatoryReserve, 0);
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

exports.updateTeamBudget = async (req, res) => {
    try {
        const { budget } = req.body;
        const parsedBudget = Number(budget);

        if (!Number.isFinite(parsedBudget) || parsedBudget < 0) {
            return res.status(400).json({ error: 'Budget must be a non-negative number' });
        }

        const team = await Team.findById(req.params.id);
        if (!team) return res.status(404).json({ error: 'Team not found' });

        if (req.user && req.user.role === 'auctioneer') {
            const myTournament = await getAuctioneerTournament(req.user.email);
            if (!myTournament || String(team.tournamentId) !== String(myTournament._id)) {
                return res.status(403).json({ error: 'Forbidden: You can only update teams for your assigned tournament.' });
            }
        }

        const currentBudget = Number(team.budget) || 0;
        const currentRemaining = Number(team.remainingBudget) || 0;
        const spentAmount = Math.max(currentBudget - currentRemaining, 0);

        if (parsedBudget < spentAmount) {
            return res.status(400).json({ error: `Budget cannot be lower than amount already spent (${spentAmount})` });
        }

        team.budget = parsedBudget;
        team.totalBudget = parsedBudget;
        team.remainingBudget = parsedBudget - spentAmount;

        const updatedTeam = await team.save();
        const populatedTeam = await Team.findById(updatedTeam._id)
            .populate('players', 'name photo age role')
            .lean();

        res.json(populatedTeam);
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