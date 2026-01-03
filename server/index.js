const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const compression = require('compression');
const dotenv = require('dotenv');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');
const cloudinary = require('cloudinary').v2;

// Load environment variables from .env file
dotenv.config();

// Cloudinary configuration
cloudinary.config({
    cloud_name: 'dviulhflk',
    api_key: '899555547873116',
    api_secret: 'zY61vhsE09h1UHtWw5m6Y6O532o'
});

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
// Enable compression - should be early in middleware stack
app.use(compression({
    filter: (req, res) => {
        // Don't compress images or already compressed files
        if (req.headers['x-no-compression']) {
            return false;
        }
        return compression.filter(req, res);
    },
    level: 6 // Balance between compression and CPU usage (1-9, 6 is good default)
}));
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

app.use(express.json({ limit: '10mb' })); // or higher if needed
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Now require routes (after io is exported)
app.use('/api/players', require('./routes/playerRoutes'));
app.use('/api/teams', require('./routes/teamRoutes'));
app.use('/api/tournaments', require('./routes/tournamentRoutes'));
app.use('/api/auctions', require('./routes/auctionRoutes'));
app.use('/api/auth', require('./routes/authRoutes'));

// Import authController to access seedMaster function
const authController = require('./controllers/authController');

// Basic route
app.get('/', (req, res) => {
    res.send('API is running!');
});

// MongoDB connection
const connectDB = async () => {
    try {
        if (!process.env.MONGO_URI) {
            console.error('MONGO_URI environment variable is not set');
            process.exit(1);
        }

        await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 15000, // 15 seconds
            socketTimeoutMS: 45000, // 45 seconds
            maxPoolSize: 10,
            minPoolSize: 1
        });
        console.log('MongoDB connected successfully');

        // Seed master account after successful connection
        await authController.seedMaster();
    } catch (err) {
        console.error('MongoDB connection error:', err);
        process.exit(1);
    }
};

connectDB();

// Create HTTP server and Socket.io
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: '*', // Adjust for production
        methods: ['GET', 'POST']
    }
});

// Make io available to controllers
app.set('io', io);

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`MongoDB URI: ${process.env.MONGO_URI ? 'Set' : 'Not set'}`);
    console.log(`JWT Secret: ${process.env.JWT_SECRET ? 'Set' : 'Not set'}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
    console.error('Unhandled Promise Rejection:', err);
    process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    process.exit(1);
}); 