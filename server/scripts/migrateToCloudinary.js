const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Cloudinary configuration
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('MongoDB connected for migration'))
    .catch(err => console.error('MongoDB connection error:', err));

// Import models
const Player = require('../models/player');
const Tournament = require('../models/tournament');
const Team = require('../models/team');
const User = require('../models/user');

// Function to upload base64 to Cloudinary
async function uploadBase64ToCloudinary(base64String, folder = 'auction-system') {
    try {
        const result = await cloudinary.uploader.upload(base64String, {
            folder: folder,
            resource_type: 'image'
        });
        return result.secure_url;
    } catch (error) {
        console.error('Error uploading to Cloudinary:', error);
        return null;
    }
}

// Migration function for Players
async function migratePlayers() {
    console.log('Starting Player migration...');
    const players = await Player.find({ photo: { $regex: /^data:image/ } });
    console.log(`Found ${players.length} players with base64 photos`);

    for (const player of players) {
        if (player.photo && player.photo.startsWith('data:')) {
            console.log(`Migrating player: ${player.name}`);
            const cloudinaryUrl = await uploadBase64ToCloudinary(player.photo, 'auction-system/players');
            if (cloudinaryUrl) {
                player.photo = cloudinaryUrl;
                await player.save();
                console.log(`✓ Migrated ${player.name}`);
            } else {
                console.log(`✗ Failed to migrate ${player.name}`);
            }
        }
    }
    console.log('Player migration completed');
}

// Migration function for Tournaments
async function migrateTournaments() {
    console.log('Starting Tournament migration...');
    const tournaments = await Tournament.find({ logo: { $regex: /^data:image/ } });
    console.log(`Found ${tournaments.length} tournaments with base64 logos`);

    for (const tournament of tournaments) {
        if (tournament.logo && tournament.logo.startsWith('data:')) {
            console.log(`Migrating tournament: ${tournament.name}`);
            const cloudinaryUrl = await uploadBase64ToCloudinary(tournament.logo, 'auction-system/tournaments');
            if (cloudinaryUrl) {
                tournament.logo = cloudinaryUrl;
                await tournament.save();
                console.log(`✓ Migrated ${tournament.name}`);
            } else {
                console.log(`✗ Failed to migrate ${tournament.name}`);
            }
        }
    }
    console.log('Tournament migration completed');
}

// Migration function for Teams
async function migrateTeams() {
    console.log('Starting Team migration...');
    const teams = await Team.find({ logo: { $regex: /^data:image/ } });
    console.log(`Found ${teams.length} teams with base64 logos`);

    for (const team of teams) {
        if (team.logo && team.logo.startsWith('data:')) {
            console.log(`Migrating team: ${team.name}`);
            const cloudinaryUrl = await uploadBase64ToCloudinary(team.logo, 'auction-system/teams');
            if (cloudinaryUrl) {
                team.logo = cloudinaryUrl;
                await team.save();
                console.log(`✓ Migrated ${team.name}`);
            } else {
                console.log(`✗ Failed to migrate ${team.name}`);
            }
        }
    }
    console.log('Team migration completed');
}

// Migration function for Users
async function migrateUsers() {
    console.log('Starting User migration...');
    const users = await User.find({ photo: { $regex: /^data:image/ } });
    console.log(`Found ${users.length} users with base64 photos`);

    for (const user of users) {
        if (user.photo && user.photo.startsWith('data:')) {
            console.log(`Migrating user: ${user.username}`);
            const cloudinaryUrl = await uploadBase64ToCloudinary(user.photo, 'auction-system/users');
            if (cloudinaryUrl) {
                user.photo = cloudinaryUrl;
                await user.save();
                console.log(`✓ Migrated ${user.username}`);
            } else {
                console.log(`✗ Failed to migrate ${user.username}`);
            }
        }
    }
    console.log('User migration completed');
}

// Main migration function
async function runMigration() {
    try {
        console.log('Starting Cloudinary migration...');

        await migratePlayers();
        await migrateTournaments();
        await migrateTeams();
        await migrateUsers();

        console.log('Migration completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

// Run migration if this script is executed directly
if (require.main === module) {
    runMigration();
}

module.exports = { runMigration };
