const mongoose = require('mongoose');

const AuthErrorLogSchema = new mongoose.Schema({
    type: { type: String, required: true },
    userEmail: { type: String, default: 'Anonymous' },
    ipAddress: { type: String, required: true },
    path: { type: String, required: true },
    method: { type: String, required: true },
    message: { type: String, default: '' },
    token: { type: String, default: null },
    timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('AuthErrorLog', AuthErrorLogSchema);
