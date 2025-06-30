const User = require('../models/user');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Seed master account if not present
async function seedMaster() {
    const master = await User.findOne({ role: 'master' });
    if (!master) {
        const hashedPassword = await bcrypt.hash('master@2025', 10);
        await User.create({
            username: 'master',
            email: 'master@auction.com',
            password: hashedPassword,
            role: 'master',
        });
        console.log('Master account seeded');
    }
}
seedMaster();

exports.register = async (req, res) => {
    try {
        const { username, email, password, role, tournament, photo } = req.body;
        // Only master can create auctioneers
        if (role === 'auctioneer') {
            if (!req.user || req.user.role !== 'master') {
                return res.status(403).json({ error: 'Only master can create auctioneers' });
            }
            if (!tournament) {
                return res.status(400).json({ error: 'Auctioneer must be assigned a tournament' });
            }
        }
        // Only one master allowed
        if (role === 'master') {
            const masterExists = await User.findOne({ role: 'master' });
            if (masterExists) {
                return res.status(400).json({ error: 'Master already exists' });
            }
        }
        const existingUser = await User.findOne({ $or: [{ email }, { username }] });
        if (existingUser) return res.status(400).json({ error: 'User already exists' });
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ username, email, password: hashedPassword, role, tournament, photo });
        await newUser.save();
        res.status(201).json({ message: 'User registered successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ error: 'Invalid credentials' });
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ error: 'Invalid credentials' });
        // Set JWT token expiration to 24 hours
        const token = jwt.sign({ userId: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '24h' });
        res.json({ token, user: { id: user._id, username: user.username, email: user.email, role: user.role, tournament: user.tournament } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user.userId).select('-password');
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.updateProfile = async (req, res) => {
    try {
        const { photo } = req.body;
        // Limit base64 string size (e.g., 100KB)
        if (photo && Buffer.byteLength(photo, 'base64') > 100 * 1024) {
            return res.status(400).json({ error: 'Profile picture is too large. Please compress the image.' });
        }
        const user = await User.findByIdAndUpdate(
            req.user.userId,
            { photo },
            { new: true }
        ).select('-password');
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}; 