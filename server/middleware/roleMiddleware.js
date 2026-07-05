const authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
        return res.status(403).json({ message: 'Not authorized for this role' });
        }
        next();
    };
};

module.exports = { authorize };