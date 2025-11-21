const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({
    path: path.resolve(__dirname, '../.env')
});

const Player = require('../models/player');
const PlayerTournament = require('../models/playerTournament');

if (!process.env.MONGO_URI) {
    console.error('MONGO_URI environment variable is not set. Please configure it in your .env file.');
    process.exit(1);
}

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');
    } catch (err) {
        console.error('Failed to connect to MongoDB:', err);
        process.exit(1);
    }
};

const cleanPayload = (payload) => {
    const cleaned = {};
    Object.entries(payload).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
            cleaned[key] = value;
        }
    });
    return cleaned;
};

const migratePlayers = async () => {
    const players = await Player.collection.find({
        tournamentId: { $exists: true, $ne: null }
    }).toArray();

    console.log(`Found ${players.length} players with tournament context to migrate`);

    let created = 0;
    let updated = 0;
    for (const player of players) {
        const payload = cleanPayload({
            player: player._id,
            tournamentId: player.tournamentId,
            team: player.team,
            price: player.price,
            basePrice: player.basePrice,
            isSold: player.isSold,
            previousYearTeam: player.previousYearTeam,
            status: player.status || 'available',
            category: player.category
        });

        if (!payload.tournamentId) {
            continue;
        }

        let participation = await PlayerTournament.findOne({
            player: player._id,
            tournamentId: player.tournamentId
        });

        if (participation) {
            Object.assign(participation, payload);
            await participation.save();
            updated += 1;
        } else if (Object.keys(payload).length > 2) {
            await PlayerTournament.create(payload);
            created += 1;
        }

        await Player.collection.updateOne(
            { _id: player._id },
            {
                $unset: {
                    team: '',
                    price: '',
                    basePrice: '',
                    isSold: '',
                    previousYearTeam: '',
                    tournamentId: '',
                    status: '',
                    category: ''
                }
            }
        );
    }

    console.log(`Migration complete. Created ${created} new participation entries, updated ${updated}.`);
};

const run = async () => {
    await connectDB();
    try {
        await migratePlayers();
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
        process.exit(0);
    }
};

run();

