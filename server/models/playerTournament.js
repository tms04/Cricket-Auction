const mongoose = require('mongoose');

const playerTournamentSchema = new mongoose.Schema({
    player: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', required: true },
    tournamentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tournament', required: true },
    team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
    price: { type: Number },
    basePrice: { type: Number },
    isSold: { type: Boolean, default: false },
    previousYearTeam: { type: String },
    // status: available -> in pool, sold -> bought, unsold -> first unsold round, unsold1 -> second-round unsold
    status: { type: String, enum: ['available', 'sold', 'unsold', 'unsold1'], default: 'available' },
    category: { type: String },
}, {
    timestamps: true
});

// Indexes for performance - these are the most critical for query speed
playerTournamentSchema.index({ player: 1, tournamentId: 1 }, { unique: true }); // Already exists, kept for uniqueness
playerTournamentSchema.index({ tournamentId: 1, status: 1 }); // Most common query: filter by tournament and status
playerTournamentSchema.index({ tournamentId: 1, team: 1 }); // For team-based queries
playerTournamentSchema.index({ tournamentId: 1, status: 1, category: 1 }); // For category-specific status queries
playerTournamentSchema.index({ status: 1 }); // For status-only queries (less common but still needed)

module.exports = mongoose.model('PlayerTournament', playerTournamentSchema);

