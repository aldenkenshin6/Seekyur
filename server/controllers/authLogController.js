const AuthLog = require('../models/AuthLog');

const getAuthLogs = async (req, res) => {
    try {
        const logs = await AuthLog.find().sort({ timestamp: -1 }).limit(100);
        res.json(logs);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getAuthLogs };
