const mongoose = require('mongoose');

const playerSchema = new mongoose.Schema({
    name: { type: String, required: true },
    team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
    price: { type: Number },
    basePrice: { type: Number },
    isSold: { type: Boolean },
    previousYearTeam: { type: String },
    tournamentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tournament' },
    status: { type: String },
    photo: { type: String },
    category: { type: String },
    role: { type: String },
    station: { type: String },
    age: { type: Number },
    // New fields for cricket roles and styles
    primaryRole: { type: String, enum: ['Batsman', 'Bowler', 'All-rounder'] },
    battingStyle: { type: String, enum: ['Right hand batsman', 'Left hand batsman'] },
    bowlingStyle: { type: String, enum: ['Right hand bowler', 'Left hand bowler', 'Dont bowl'] },
    maxTeamSize: { type: Number },
    minTeamSize: { type: Number },
    auctionType: { type: String, enum: ['open', 'categories'] },
    // categories: [{
    //     category: String,
    //     numPlayers: Number,
    //     minBalance: Number
    // }]
});

module.exports = mongoose.model('Player', playerSchema); 