const Alert = require('../models/Alert');

const getAlerts = async (req, res) => {
    try {
        const alerts = await Alert.find().sort({ createdAt: -1 }).limit(25);
        res.json(alerts);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const createAlert = async (req, res) => {
    const { title, description, severity, source } = req.body;
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    try {
        const alert = await Alert.create({
            title,
            description,
            severity,
            source: source || 'Python Detection Engine',
            sourceIp: ipAddress,
            isRead: false
        });

        const io = req.app.get('io');
        if (io) {
            io.emit('receiveAlert', alert);
        }

        res.status(201).json(alert);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const markAlertsAsRead = async (req, res) => {
    try {
        await Alert.updateMany({ isRead: false }, { isRead: true });
        res.json({ message: 'All alerts marked as read' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getAlerts, createAlert, markAlertsAsRead };