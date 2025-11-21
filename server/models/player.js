const mongoose = require('mongoose');

const playerSchema = new mongoose.Schema({
    name: { type: String, required: true },
    photo: { type: String },
    role: { type: String },
    station: { type: String },
    age: { type: Number },
    // New fields for cricket roles and styles
    primaryRole: { type: String, enum: ['Batsman', 'Bowler', 'All-rounder'] },
    battingStyle: { type: String, enum: ['Right hand batsman', 'Left hand batsman'] },
    bowlingStyle: { type: String, enum: ['Right hand bowler', 'Left hand bowler', 'Dont bowl'] },
    // categories: [{
    //     category: String,
    //     numPlayers: Number,
    //     minBalance: Number
    // }]
});

module.exports = mongoose.model('Player', playerSchema); 