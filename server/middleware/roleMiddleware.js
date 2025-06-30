module.exports = function (requiredRole) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(403).json({ error: 'Forbidden: insufficient role' });
        }

        // Handle both single role and array of roles
        const allowedRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Forbidden: insufficient role' });
        }
        next();
    };
}; 