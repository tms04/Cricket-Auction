const mongoose = require('mongoose');
const Auction = require('../models/auction');
const Tournament = require('../models/tournament');
const Team = require('../models/team');
const Player = require('../models/player');
const PlayerTournament = require('../models/playerTournament');

// Helper to get auctioneer's tournament
async function getAuctioneerTournament(email) {
    if (!email) return null;
    return await Tournament.findOne({ auctioneerEmail: { $regex: new RegExp('^' + email + '$', 'i') } });
}

exports.getAllAuctions = async (req, res) => {
    try {
        // Optimize: Select only needed fields and limit populate fields, use lean()
        const auctions = await Auction.find()
            .populate('player', 'name photo') // Only get name and photo from player
            .populate('team', 'name logo') // Only get name and logo from team
            .populate('currentBidder', 'name') // Only get name from currentBidder
            .populate('winner', 'name') // Only get name from winner
            .populate('bids.team', 'name') // Only get name from bid teams
            .lean(); // Use lean() for better performance
        const mappedAuctions = auctions.map(a => {
            a.playerId = a.player ? String(a.player._id || a.player) : undefined;
            // Keep player name and photo but remove full object
            if (a.player && typeof a.player === 'object') {
                a.playerName = a.player.name;
                a.playerPhoto = a.player.photo;
            }
            delete a.player;
            return a;
        });
        res.json(mappedAuctions);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getAuction = async (req, res) => {
    try {
        // Optimize: Select only needed fields and limit populate fields, use lean()
        const auction = await Auction.findById(req.params.id)
            .populate('player', 'name photo') // Only get name and photo from player
            .populate('team', 'name logo') // Only get name and logo from team
            .populate('currentBidder', 'name') // Only get name from currentBidder
            .populate('winner', 'name') // Only get name from winner
            .populate('bids.team', 'name') // Only get name from bid teams
            .lean(); // Use lean() for better performance
        if (!auction) return res.status(404).json({ error: 'Auction not found' });
        auction.playerId = auction.player ? String(auction.player._id || auction.player) : undefined;
        // Keep player name and photo but remove full object
        if (auction.player && typeof auction.player === 'object') {
            auction.playerName = auction.player.name;
            auction.playerPhoto = auction.player.photo;
        }
        delete auction.player;
        res.json(auction);
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
        // Optimize: Populate minimal fields for response and socket emission
        const io = req.app.get('io');
        const populatedAuction = await Auction.findById(savedAuction._id)
            .populate('player', 'name photo')
            .populate('currentBidder', 'name')
            .lean();
        if (io && savedAuction.tournamentId) {
            io.emit(`auction_update_${savedAuction.tournamentId}`, populatedAuction);
        }
        populatedAuction.playerId = populatedAuction.player ? String(populatedAuction.player._id || populatedAuction.player) : undefined;
        if (populatedAuction.player && typeof populatedAuction.player === 'object') {
            populatedAuction.playerName = populatedAuction.player.name;
            populatedAuction.playerPhoto = populatedAuction.player.photo;
        }
        delete populatedAuction.player;
        res.status(201).json(populatedAuction);
    } catch (err) {
        console.error('Error in createAuction:', err);
        res.status(400).json({ error: err.message });
    }
};

exports.placeBid = async (req, res) => {
    try {
        const { auctionId, teamId, amount } = req.body;

        // Cannot use lean() here because we need to save the auction
        const auction = await Auction.findById(auctionId);
        if (!auction) {
            return res.status(404).json({ error: 'Auction not found' });
        }

        if (auction.status !== 'active') {
            return res.status(400).json({ error: 'Auction is not active for bidding' });
        }

        // Optimize: Only select needed fields for read-only check, use lean()
        const team = await Team.findById(teamId).select('name remainingBudget').lean();
        if (!team) {
            return res.status(404).json({ error: 'Team not found' });
        }

        // Check if team has enough budget
        if (team.remainingBudget < amount) {
            return res.status(400).json({ error: 'Insufficient budget' });
        }

        // Check if bid is higher than current bid or at least base price for first bid
        // Optimize: Only select basePrice field for read-only check, use lean()
        let participation = await PlayerTournament.findOne({
            player: auction.player,
            tournamentId: auction.tournamentId
        }).select('basePrice').lean();
        let player = null;
        if (!participation) {
            // Optimize: Only select basePrice field for read-only check, use lean()
            player = await Player.findById(auction.player).select('basePrice').lean();
            if (!player) {
                return res.status(404).json({ error: 'Player not found' });
            }
        }
        if (auction.bids.length === 0) {
            // First bid: must be at least base price
            const basePrice = participation ? participation.basePrice : (player?.basePrice || 0);
            if (amount < (basePrice || 0)) {
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
            teamName: team.name, // Store team name
            amount: amount,
            timestamp: new Date()
        });

        // Update current bid
        auction.bidAmount = amount;
        auction.currentBidder = teamId; // <--- Ensure this is always set
        auction.currentBidderName = team.name; // Store current bidder's team name

        await auction.save();

        // Emit socket event for bid update
        const io = req.app.get('io');
        if (io && auction.tournamentId) {
            // Populate minimal fields for socket emission
            const populatedAuction = await Auction.findById(auction._id)
                .populate('player', 'name photo')
                .populate('currentBidder', 'name')
                .lean();
            io.emit(`auction_update_${auction.tournamentId}`, populatedAuction);
        }

        // Optimize: Fetch minimal populated data for response
        const auctionObj = await Auction.findById(auction._id)
            .populate('player', 'name photo')
            .populate('currentBidder', 'name')
            .lean();
        auctionObj.playerId = auctionObj.player ? String(auctionObj.player._id || auctionObj.player) : undefined;
        if (auctionObj.player && typeof auctionObj.player === 'object') {
            auctionObj.playerName = auctionObj.player.name;
            auctionObj.playerPhoto = auctionObj.player.photo;
        }
        delete auctionObj.player;
        auctionObj.currentBidder = auctionObj.currentBidder ? String(auctionObj.currentBidder._id || auctionObj.currentBidder) : null;
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

        // Validate auctionId to avoid CastError
        if (!auctionId || !mongoose.Types.ObjectId.isValid(auctionId)) {
            return res.status(400).json({ error: 'Invalid auction id' });
        }

        console.time("findAuction");
        // Cannot use lean() here because we need to save the auction
        const auction = await Auction.findById(auctionId);
        console.timeEnd("findAuction");
        if (!auction) return res.status(404).json({ error: 'Auction not found' });

        if (auction.status !== 'active') return res.status(400).json({ error: 'Auction is already completed' });

        let teamPromise = null;
        let updatedTeam = null;
        // Optimize: Only select needed fields, but cannot use lean() because we may need to save
        let participation = await PlayerTournament.findOne({
            player: auction.player,
            tournamentId: auction.tournamentId
        });
        if (!participation) {
            participation = new PlayerTournament({
                player: auction.player,
                tournamentId: auction.tournamentId
            });
        }
        if (winnerId) {
            const saleAmount = finalAmount || auction.bidAmount;

            // Use MongoDB $addToSet and $inc for atomic update
            // $addToSet prevents duplicates automatically at database level (more efficient)
            // $inc updates budget atomically (prevents race conditions)
            // This eliminates the need for manual duplicate checking
            updatedTeam = await Team.findByIdAndUpdate(
                winnerId,
                {
                    $inc: { remainingBudget: -saleAmount },
                    $addToSet: { players: auction.player }
                },
                { new: true } // Return updated document
            );
            
            if (!updatedTeam) return res.status(404).json({ error: 'Winning team not found' });
            teamPromise = Promise.resolve(); // Already saved above

            // Prepare player update
            participation.status = 'sold';
            participation.team = winnerId;
            participation.price = saleAmount;
            participation.isSold = true;

            // Update auction
            auction.status = 'sold';
            auction.winner = winnerId;
            auction.winnerName = updatedTeam.name; // Store winner's team name
            auction.finalAmount = saleAmount;
            auction.bidAmount = saleAmount;
        } else {
            // Player went unsold
            // First time unsold: available -> unsold
            // Second time unsold (already unsold) -> unsold1 bucket
            const currentStatus = participation.status;
            if (currentStatus === 'unsold') {
                participation.status = 'unsold1';
            } else if (currentStatus === 'unsold1') {
                participation.status = 'unsold1';
            } else {
                participation.status = 'unsold';
            }
            participation.isSold = false;
            participation.team = undefined;
            participation.price = undefined;
            auction.status = 'unsold';
        }

        console.time("saveAuction");
        const auctionPromise = auction.save();
        // Save participation and auction (team already saved with $addToSet)
        await Promise.all([teamPromise, participation.save(), auctionPromise].filter(Boolean));
        console.timeEnd("saveAuction");

        // Emit socket event for auction completion
        const io = req.app.get('io');
        // Optimize: Populate minimal fields for response and socket emission
        const populatedAuction = await Auction.findById(auction._id)
            .populate('player', 'name photo')
            .populate('team', 'name logo')
            .populate('currentBidder', 'name')
            .populate('winner', 'name')
            .lean();
        if (io && auction.tournamentId) {
            io.emit(`auction_update_${auction.tournamentId}`, populatedAuction);
            // Emit a lightweight result event so viewers can react deterministically
            io.emit(`auction_result_${auction.tournamentId}`, {
                playerId: populatedAuction.player ? String(populatedAuction.player._id || populatedAuction.player) : undefined,
                status: populatedAuction.status,
                winnerName: populatedAuction.winnerName,
                finalAmount: populatedAuction.finalAmount ?? populatedAuction.bidAmount
            });
        }

        populatedAuction.playerId = populatedAuction.player ? String(populatedAuction.player._id || populatedAuction.player) : undefined;
        if (populatedAuction.player && typeof populatedAuction.player === 'object') {
            populatedAuction.playerName = populatedAuction.player.name;
            populatedAuction.playerPhoto = populatedAuction.player.photo;
        }
        delete populatedAuction.player;
        console.timeEnd("completeAuction_total");
        res.json(populatedAuction);
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
        // Optimize: Select only needed fields and limit populate fields, use lean() for response
        const updatedAuction = await Auction.findByIdAndUpdate(req.params.id, req.body, { new: true })
            .populate('player', 'name photo')
            .populate('team', 'name logo')
            .populate('currentBidder', 'name')
            .populate('winner', 'name')
            .populate('bids.team', 'name')
            .lean();
        if (!updatedAuction) return res.status(404).json({ error: 'Auction not found' });
        updatedAuction.playerId = updatedAuction.player ? String(updatedAuction.player._id || updatedAuction.player) : undefined;
        if (updatedAuction.player && typeof updatedAuction.player === 'object') {
            updatedAuction.playerName = updatedAuction.player.name;
            updatedAuction.playerPhoto = updatedAuction.player.photo;
        }
        delete updatedAuction.player;
        res.json(updatedAuction);
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
        // Remove unnecessary refetch - just return success message
        // Socket.io will handle broadcasting updates if needed
        res.json({ message: 'Auction deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.deleteAllAuctions = async (req, res) => {
    try {
        await require('../models/auction').deleteMany({});
        res.json({ message: 'All auctions deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.resetAuctions = async (req, res) => {
    try {
        const { tournamentId } = req.params;
        await Auction.deleteMany({ tournamentId });
        // Reset all players efficiently
        await PlayerTournament.updateMany(
            { tournamentId },
            { $set: { status: 'available', team: null, price: null, isSold: false } }
        );
        // Reset all teams
        const teams = await Team.find({ tournamentId });
        for (const team of teams) {
            team.players = [];
            team.remainingBudget = team.budget;
            await team.save();
        }
        // Remove unnecessary refetch
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
        // Optimize: Select only needed fields and limit populate fields, use lean()
        const auction = await Auction.findOne({ tournamentId, status: 'active' })
            .populate('player', 'name photo')
            .populate('team', 'name logo')
            .populate('currentBidder', 'name')
            .populate('winner', 'name')
            .populate('bids.team', 'name')
            .lean();
        if (!auction) return res.json(null);
        // Ensure playerId is always a string
        if (auction.player && typeof auction.player === 'object' && auction.player._id) {
            auction.playerId = String(auction.player._id);
            auction.playerName = auction.player.name;
            auction.playerPhoto = auction.player.photo;
        } else if (auction.player) {
            auction.playerId = String(auction.player);
        } else {
            auction.playerId = undefined;
        }
        delete auction.player;
        // Ensure currentBidder is always a string
        if (auction.currentBidder && typeof auction.currentBidder === 'object' && auction.currentBidder._id) {
            auction.currentBidder = String(auction.currentBidder._id);
        } else if (auction.currentBidder) {
            auction.currentBidder = String(auction.currentBidder);
        } else {
            auction.currentBidder = null;
        }
        res.json(auction);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}; 