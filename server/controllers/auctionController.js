const Auction = require('../models/auction');
const Tournament = require('../models/tournament');
const Team = require('../models/team');
const Player = require('../models/player');

// Helper to get auctioneer's tournament
async function getAuctioneerTournament(email) {
    if (!email) return null;
    return await Tournament.findOne({ auctioneerEmail: { $regex: new RegExp('^' + email + '$', 'i') } });
}

exports.getAllAuctions = async (req, res) => {
    try {
        const auctions = await Auction.find().populate('player team currentBidder winner bids.team');
        const mappedAuctions = auctions.map(a => {
            const obj = a.toObject ? a.toObject() : a;
            obj.playerId = obj.player ? String(obj.player) : undefined;
            delete obj.player;
            return obj;
        });
        res.json(mappedAuctions);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getAuction = async (req, res) => {
    try {
        const auction = await Auction.findById(req.params.id).populate('player team currentBidder winner bids.team');
        if (!auction) return res.status(404).json({ error: 'Auction not found' });
        const auctionObj = auction.toObject ? auction.toObject() : auction;
        auctionObj.playerId = auctionObj.player ? String(auctionObj.player) : undefined;
        delete auctionObj.player;
        res.json(auctionObj);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.createAuction = async (req, res) => {
    try {
        console.log('createAuction received data:', req.body);
        console.log('User:', req.user);

        if (req.user && req.user.role === 'auctioneer') {
            const myTournament = await getAuctioneerTournament(req.user.email);
            console.log('Auctioneer tournament:', myTournament);
            if (!myTournament || String(req.body.tournamentId) !== String(myTournament._id)) {
                console.log('Tournament mismatch:', {
                    submitted: req.body.tournamentId,
                    assigned: myTournament?._id
                });
                return res.status(403).json({ error: 'Forbidden: You can only create auctions for your assigned tournament.' });
            }
        }

        const newAuction = new Auction(req.body);
        console.log('New auction object:', newAuction);
        const savedAuction = await newAuction.save();
        console.log('Auction saved successfully:', savedAuction);
        const auctions = await Auction.find().populate('player team currentBidder winner bids.team');
        res.status(201).json(savedAuction.toObject ? savedAuction.toObject() : savedAuction);
    } catch (err) {
        console.error('Error in createAuction:', err);
        res.status(400).json({ error: err.message });
    }
};

exports.placeBid = async (req, res) => {
    try {
        const { auctionId, teamId, amount } = req.body;

        const auction = await Auction.findById(auctionId);
        if (!auction) {
            return res.status(404).json({ error: 'Auction not found' });
        }

        if (auction.status !== 'active') {
            return res.status(400).json({ error: 'Auction is not active for bidding' });
        }

        const team = await Team.findById(teamId);
        if (!team) {
            return res.status(404).json({ error: 'Team not found' });
        }

        // Check if team has enough budget
        if (team.remainingBudget < amount) {
            return res.status(400).json({ error: 'Insufficient budget' });
        }

        // Check if bid is higher than current bid or at least base price for first bid
        const player = await Player.findById(auction.player);
        if (!player) {
            return res.status(404).json({ error: 'Player not found' });
        }
        if (auction.bids.length === 0) {
            // First bid: must be at least base price
            if (amount < (player.basePrice || 0)) {
                return res.status(400).json({ error: 'Bid must be at least the base price' });
            }
        } else {
            // Subsequent bids: must be higher than current bid
            if (amount <= auction.bidAmount) {
                return res.status(400).json({ error: 'Bid must be higher than current bid' });
            }
        }

        // Add bid to history
        auction.bids.push({
            team: teamId,
            amount: amount,
            timestamp: new Date()
        });

        // Update current bid
        auction.bidAmount = amount;
        auction.currentBidder = teamId; // <--- Ensure this is always set

        await auction.save();

        const auctionObj = auction.toObject ? auction.toObject() : auction;
        auctionObj.playerId = auctionObj.player ? String(auctionObj.player) : undefined;
        delete auctionObj.player;
        auctionObj.currentBidder = auctionObj.currentBidder ? String(auctionObj.currentBidder) : null; // <--- Always return as string
        res.json(auctionObj);
    } catch (err) {
        console.error('Error in placeBid:', err);
        res.status(400).json({ error: err.message });
    }
};

exports.completeAuction = async (req, res) => {
    try {
        console.time("completeAuction_total");
        const { auctionId, winnerId, finalAmount } = req.body;

        console.time("findAuction");
        const auction = await Auction.findById(auctionId);
        console.timeEnd("findAuction");
        if (!auction) return res.status(404).json({ error: 'Auction not found' });

        if (auction.status !== 'active') return res.status(400).json({ error: 'Auction is already completed' });

        let teamPromise = null;
        let playerPromise = null;
        let updatedTeam = null;
        let player = null;
        if (winnerId) {
            console.time("findTeam");
            const team = await Team.findById(winnerId);
            console.timeEnd("findTeam");
            if (!team) return res.status(404).json({ error: 'Winning team not found' });

            const saleAmount = finalAmount || auction.bidAmount;

            // Prepare team update
            team.remainingBudget -= saleAmount;
            team.players.push(auction.player);
            teamPromise = team.save();
            updatedTeam = team;

            // Prepare player update
            console.time("findPlayer");
            player = await Player.findById(auction.player);
            console.timeEnd("findPlayer");
            if (player) {
                player.status = 'sold';
                player.team = winnerId;
                player.price = saleAmount;
                playerPromise = player.save();
            }

            // Update auction
            auction.status = 'sold';
            auction.winner = winnerId;
            auction.finalAmount = saleAmount;
            auction.bidAmount = saleAmount;
        } else {
            // Player went unsold
            player = await Player.findById(auction.player);
            if (player) {
                player.status = 'unsold';
                playerPromise = player.save();
            }
            auction.status = 'unsold';
        }

        console.time("saveAuction");
        const auctionPromise = auction.save();
        // Save all in parallel
        await Promise.all([teamPromise, playerPromise, auctionPromise].filter(Boolean));
        console.timeEnd("saveAuction");

        const auctionObj = auction.toObject ? auction.toObject() : auction;
        auctionObj.playerId = auctionObj.player ? String(auctionObj.player) : undefined;
        delete auctionObj.player;
        console.timeEnd("completeAuction_total");
        res.json(auctionObj);
    } catch (err) {
        console.error('Error in completeAuction:', err);
        res.status(400).json({ error: err.message });
    }
};

exports.updateAuction = async (req, res) => {
    try {
        if (req.user && req.user.role === 'auctioneer') {
            const myTournament = await getAuctioneerTournament(req.user.email);
            if (!myTournament || String(req.body.tournamentId) !== String(myTournament._id)) {
                return res.status(403).json({ error: 'Forbidden: You can only update auctions for your assigned tournament.' });
            }
        }
        const updatedAuction = await Auction.findByIdAndUpdate(req.params.id, req.body, { new: true }).populate('player team currentBidder winner bids.team');
        if (!updatedAuction) return res.status(404).json({ error: 'Auction not found' });
        const auctionObj = updatedAuction.toObject ? updatedAuction.toObject() : updatedAuction;
        auctionObj.playerId = auctionObj.player ? String(auctionObj.player) : undefined;
        delete auctionObj.player;
        res.json(auctionObj);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

exports.deleteAuction = async (req, res) => {
    try {
        if (req.user && req.user.role === 'auctioneer') {
            const myTournament = await getAuctioneerTournament(req.user.email);
            const auction = await Auction.findById(req.params.id);
            if (!myTournament || !auction || String(auction.tournamentId) !== String(myTournament._id)) {
                return res.status(403).json({ error: 'Forbidden: You can only delete auctions for your assigned tournament.' });
            }
        }
        const deletedAuction = await Auction.findByIdAndDelete(req.params.id);
        if (!deletedAuction) return res.status(404).json({ error: 'Auction not found' });
        const auctions = await Auction.find().populate('player team currentBidder winner bids.team');
        res.json({ message: 'Auction deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.resetAuctions = async (req, res) => {
    try {
        const { tournamentId } = req.params;
        await Auction.deleteMany({ tournamentId });
        // Reset all players efficiently
        await Player.updateMany(
            { tournamentId },
            { $set: { status: 'available', team: null, price: null } }
        );
        // Reset all teams
        const teams = await Team.find({ tournamentId });
        for (const team of teams) {
            team.players = [];
            team.remainingBudget = team.budget;
            await team.save();
        }
        const auctions = await Auction.find();
        res.json({ message: 'Auction, players, and teams reset for tournament.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Get the current active auction for a tournament
exports.getCurrentAuction = async (req, res) => {
    try {
        const { tournamentId } = req.query;
        if (!tournamentId) return res.status(400).json({ error: 'tournamentId required' });
        const auction = await Auction.findOne({ tournamentId, status: 'active' })
            .populate('player team currentBidder winner bids.team');
        if (!auction) return res.json(null);
        const auctionObj = auction.toObject ? auction.toObject() : auction;
        // Ensure playerId is always a string
        if (auctionObj.player && typeof auctionObj.player === 'object' && auctionObj.player._id) {
            auctionObj.playerId = String(auctionObj.player._id);
        } else if (auctionObj.player) {
            auctionObj.playerId = String(auctionObj.player);
        } else {
            auctionObj.playerId = undefined;
        }
        delete auctionObj.player;
        // Ensure currentBidder is always a string
        if (auctionObj.currentBidder && typeof auctionObj.currentBidder === 'object' && auctionObj.currentBidder._id) {
            auctionObj.currentBidder = String(auctionObj.currentBidder._id);
        } else if (auctionObj.currentBidder) {
            auctionObj.currentBidder = String(auctionObj.currentBidder);
        } else {
            auctionObj.currentBidder = null;
        }
        res.json(auctionObj);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}; 