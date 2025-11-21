const jwt = require('jsonwebtoken');
const User = require('../models/user');
const Tournament = require('../models/tournament');

module.exports = async (req, res, next) => {
    req.user = null;
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return next();
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId).select('-password');
        if (!user) {
            return next();
        }

        req.user = {
            userId: user._id,
            role: user.role,
            email: user.email
        };

        if (user.role === 'auctioneer') {
            const tournament = await Tournament.findOne({
                auctioneerEmail: { $regex: new RegExp('^' + user.email + '$', 'i') }
            });
            if (tournament) {
                req.user.tournamentId = tournament._id;
            }
        }

        next();
    } catch (err) {
        console.warn('optionalAuth: invalid token provided:', err.message);
        // Proceed without user context for optional routes
        req.user = null;
        next();
    }
};

