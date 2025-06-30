const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['master', 'auctioneer'], required: true },
    tournament: { type: mongoose.Schema.Types.ObjectId, ref: 'Tournament' },
    photo: { type: String },
});

module.exports = mongoose.model('User', userSchema); 