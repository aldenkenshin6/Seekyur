const mongoose = require('mongoose');

const RequestLogSchema = new mongoose.Schema({
    userEmail: { type: String, default: 'Anonymous' },
    ipAddress: { type: String, required: true },
    path: { type: String, required: true },
    method: { type: String, required: true },
    token: { type: String, default: null },
    timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('RequestLog', RequestLogSchema);
