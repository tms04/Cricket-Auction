const Tournament = require('../models/tournament');
const User = require('../models/user');
const Team = require('../models/team');
const Player = require('../models/player');
const bcrypt = require('bcryptjs');

exports.getAllTournaments = async (req, res) => {
    try {
        const tournaments = await Tournament.find().populate('teams');
        console.log('User email:', `"${req.user?.email}"`);
        tournaments.forEach(t => {
            console.log('Tournament auctioneerEmail:', `"${t.auctioneerEmail}"`);
            console.log('Tournament categories:', t.categories);
            console.log('Tournament auctionType:', t.auctionType);
        });
        res.json(tournaments);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getTournament = async (req, res) => {
    try {
        const tournament = await Tournament.findById(req.params.id).populate('teams');
        if (!tournament) return res.status(404).json({ error: 'Tournament not found' });
        res.json(tournament);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.createTournament = async (req, res) => {
    try {
        const { auctioneerEmail, auctioneerPassword, ...tournamentData } = req.body;
        console.log('Creating tournament with data:', tournamentData);
        console.log('Categories:', tournamentData.categories);
        console.log('Auction type:', tournamentData.auctionType);
        // Ensure maxTeams and budget are numbers
        const newTournament = new Tournament({
            auctioneerEmail, ...tournamentData,
            maxTeams: Number(tournamentData.maxTeams),
            budget: Number(tournamentData.budget)
        });
        console.log('Tournament object before save:', newTournament);
        const savedTournament = await newTournament.save();
        console.log('Tournament saved:', savedTournament);
        let auctioneer = null;
        if (auctioneerEmail && auctioneerPassword) {
            // Check if auctioneer already exists
            const existing = await User.findOne({ email: auctioneerEmail });
            if (existing) {
                return res.status(400).json({ error: 'Auctioneer email already exists' });
            }
            const hashedPassword = await bcrypt.hash(auctioneerPassword, 10);
            auctioneer = new User({
                username: auctioneerEmail.split('@')[0],
                email: auctioneerEmail,
                password: hashedPassword,
                role: 'auctioneer',
                tournament: savedTournament._id
            });
            await auctioneer.save();
        }
        res.status(201).json({ tournament: savedTournament, auctioneer });
    } catch (err) {
        console.error('Error in createTournament:', err);
        res.status(400).json({ error: err.message });
    }
};

exports.updateTournament = async (req, res) => {
    try {
        const updatedTournament = await Tournament.findByIdAndUpdate(req.params.id, req.body, { new: true }).populate('teams');
        if (!updatedTournament) return res.status(404).json({ error: 'Tournament not found' });
        res.json(updatedTournament);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

exports.deleteTournament = async (req, res) => {
    try {
        console.log('Deleting tournament:', req.params.id);
        if (!req.params.id || req.params.id === 'undefined') {
            return res.status(400).json({ error: 'Tournament ID is required' });
        }
        // Delete all teams associated with this tournament
        const teams = await Team.find({ tournamentId: req.params.id });
        for (const team of teams) {
            await team.deleteOne();
        }
        // Delete all players associated with this tournament
        const players = await Player.find({ tournamentId: req.params.id });
        for (const player of players) {
            await player.deleteOne();
        }
        // Delete all auctioneers assigned to this tournament
        const auctioneers = await User.find({ role: 'auctioneer', tournament: req.params.id });
        for (const auctioneer of auctioneers) {
            await auctioneer.deleteOne();
        }
        // Delete the tournament itself
        const deletedTournament = await Tournament.findByIdAndDelete(req.params.id);
        if (!deletedTournament) return res.status(404).json({ error: 'Tournament not found' });
        res.json({ message: 'Tournament and all related data deleted' });
    } catch (err) {
        console.error('Error in deleteTournament:', err);
        res.status(500).json({ error: err.message });
    }
};

// console.log("Auctioneer:", req.user.email, "Assigned tournament:", myTournament?._id, "Submitted tournamentId:", req.body.tournamentId); 