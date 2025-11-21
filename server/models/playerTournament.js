const mongoose = require('mongoose');

const playerTournamentSchema = new mongoose.Schema({
    player: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', required: true },
    tournamentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tournament', required: true },
    team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
    price: { type: Number },
    basePrice: { type: Number },
    isSold: { type: Boolean, default: false },
    previousYearTeam: { type: String },
    status: { type: String, enum: ['available', 'sold', 'unsold'], default: 'available' },
    category: { type: String },
}, {
    timestamps: true
});

playerTournamentSchema.index({ player: 1, tournamentId: 1 }, { unique: true });

module.exports = mongoose.model('PlayerTournament', playerTournamentSchema);

