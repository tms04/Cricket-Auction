const Auction = require('../models/auction');
const Tournament = require('../models/tournament');
const Team = require('../models/team');
const Player = require('../models/player');
const { io } = require('../index');

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
        io.emit('auctionUpdate', auctions);
        const auctionObj = savedAuction.toObject ? savedAuction.toObject() : savedAuction;
        auctionObj.playerId = auctionObj.player ? String(auctionObj.player) : undefined;
        delete auctionObj.player;
        res.status(201).json(auctionObj);
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
        auction.currentBidder = teamId;

        await auction.save();

        const updatedAuctions = await Auction.find().populate('player team currentBidder winner bids.team');
        io.emit('auctionUpdate', updatedAuctions);

        const auctionObj = auction.toObject ? auction.toObject() : auction;
        auctionObj.playerId = auctionObj.player ? String(auctionObj.player) : undefined;
        delete auctionObj.player;
        res.json(auctionObj);
    } catch (err) {
        console.error('Error in placeBid:', err);
        res.status(400).json({ error: err.message });
    }
};

exports.completeAuction = async (req, res) => {
    try {
        const { auctionId, winnerId, finalAmount } = req.body;

        const auction = await Auction.findById(auctionId);
        if (!auction) {
            return res.status(404).json({ error: 'Auction not found' });
        }

        if (auction.status !== 'active') {
            return res.status(400).json({ error: 'Auction is already completed' });
        }

        if (winnerId) {
            // Player was sold
            const team = await Team.findById(winnerId);
            if (!team) {
                return res.status(404).json({ error: 'Winning team not found' });
            }

            // Use finalAmount if provided, otherwise use auction.bidAmount
            const saleAmount = finalAmount || auction.bidAmount;

            // Update team budget
            team.remainingBudget -= saleAmount;
            team.players.push(auction.player);
            await team.save();

            // Update player status
            const player = await Player.findById(auction.player);
            if (player) {
                player.status = 'sold';
                player.team = winnerId;
                player.price = saleAmount;
                await player.save();
            }

            // Update auction
            auction.status = 'sold';
            auction.winner = winnerId;
            auction.finalAmount = saleAmount;
            auction.bidAmount = saleAmount;
        } else {
            // Player went unsold
            const player = await Player.findById(auction.player);
            if (player) {
                player.status = 'unsold';
                await player.save();
            }

            auction.status = 'unsold';
        }

        await auction.save();

        const updatedAuctions = await Auction.find().populate('player team currentBidder winner bids.team');
        io.emit('auctionUpdate', updatedAuctions);

        const auctionObj = auction.toObject ? auction.toObject() : auction;
        auctionObj.playerId = auctionObj.player ? String(auctionObj.player) : undefined;
        delete auctionObj.player;
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
        io.emit('auctionUpdate', auctions);
        res.json({ message: 'Auction deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.resetAuctions = async (req, res) => {
    try {
        const { tournamentId } = req.params;
        await Auction.deleteMany({ tournamentId });
        // Reset all players
        const players = await Player.find({ tournamentId });
        for (const player of players) {
            player.status = 'available';
            player.team = undefined;
            player.price = undefined;
            await player.save();
        }
        // Reset all teams
        const teams = await Team.find({ tournamentId });
        for (const team of teams) {
            team.players = [];
            team.remainingBudget = team.budget;
            await team.save();
        }
        const auctions = await Auction.find();
        io.emit('auctionUpdate', auctions);
        res.json({ message: 'Auction, players, and teams reset for tournament.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}; 