const mongoose = require('mongoose');

const AuthLogSchema = new mongoose.Schema({
    result: { type: String, enum: ['Success', 'Failed'], required: true },
    event: { type: String, required: true },
    userEmail: { type: String, required: true },
    ipAddress: { type: String, required: true },
    location: { type: String, required: true },
    sessionToken: { type: String },
    userAgent: { type: String, required: true },
    failureReason: { type: String },
    timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('AuthLog', AuthLogSchema);
