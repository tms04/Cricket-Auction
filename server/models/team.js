const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema({
    name: { type: String, required: true },
    owner: { type: String, required: true },
    players: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Player' }],
    tournamentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tournament', required: true },
    totalBudget: { type: Number, default: 0 },
    budget: { type: Number, default: 0 },
    remainingBudget: { type: Number, default: 0 },
    color: { type: String, default: '#10B981' },
    logo: { type: String, default: '' }
});

module.exports = mongoose.model('Team', teamSchema); 