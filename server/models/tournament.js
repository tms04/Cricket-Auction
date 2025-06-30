const mongoose = require('mongoose');

const tournamentSchema = new mongoose.Schema({
    name: { type: String, required: true },
    teams: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Team' }],
    startDate: { type: Date },
    endDate: { type: Date },
    status: { type: String, enum: ['upcoming', 'ongoing', 'completed'], default: 'upcoming' },
    logo: { type: String, default: '' },
    maxTeams: { type: Number, required: true },
    budget: { type: Number, required: true },
    auctioneerEmail: { type: String, required: false, default: '' },
    maxTeamSize: { type: Number },
    minTeamSize: { type: Number },
    auctionType: { type: String, enum: ['open', 'categories'] },
    categories: [{
        category: { type: String, required: true },
        numPlayers: { type: Number, required: true },
        minBalance: { type: Number, required: true }
    }]
});

module.exports = mongoose.model('Tournament', tournamentSchema); 