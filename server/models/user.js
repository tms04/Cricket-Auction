const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['master', 'auctioneer'], required: true },
    tournament: { type: mongoose.Schema.Types.ObjectId, ref: 'Tournament' },
    photo: { type: String },
});

// Indexes for performance
userSchema.index({ email: 1 }); // Already unique, but explicit index helps
userSchema.index({ role: 1 }); // For filtering by role
userSchema.index({ tournament: 1 }); // For finding users by tournament

module.exports = mongoose.model('User', userSchema); 