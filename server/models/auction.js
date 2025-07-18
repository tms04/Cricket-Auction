const mongoose = require('mongoose');

const bidSchema = new mongoose.Schema({
    team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true },
    teamName: { type: String }, // Add team name for easier access
    amount: { type: Number, required: true },
    timestamp: { type: Date, default: Date.now }
});

const auctionSchema = new mongoose.Schema({
    player: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', required: true },
    team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: false },
    bidAmount: { type: Number, required: true },
    currentBidder: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
    currentBidderName: { type: String }, // Add current bidder's team name
    status: { type: String, enum: ['open', 'active', 'closed', 'sold', 'unsold'], default: 'open' },
    tournamentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tournament', required: true },
    timestamp: { type: Date, default: Date.now },
    bids: [bidSchema],
    winner: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
    winnerName: { type: String }, // Add winner's team name
    finalAmount: { type: Number }
});

module.exports = mongoose.model('Auction', auctionSchema); 