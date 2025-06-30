const jwt = require('jsonwebtoken');
const User = require('../models/user');
const Tournament = require('../models/tournament');

module.exports = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        // Fetch the complete user object including email
        const user = await User.findById(decoded.userId).select('-password');
        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }

        req.user = {
            userId: user._id,
            role: user.role,
            email: user.email
        };

        // For auctioneers, find their assigned tournament
        if (user.role === 'auctioneer') {
            const tournament = await Tournament.findOne({
                auctioneerEmail: { $regex: new RegExp('^' + user.email + '$', 'i') }
            });
            if (tournament) {
                req.user.tournamentId = tournament._id;
            }
        }

        // Add debug log
        console.log('authMiddleware:', {
            user: req.user,
            path: req.path,
            method: req.method
        });
        next();
    } catch (err) {
        res.status(401).json({ error: 'Invalid token' });
    }
}; 