const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    username: { type: String },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { 
        type: String, 
        enum: ['Admin', 'SOC Analyst', 'Incident Responder', 'Viewer'],
        default: 'Viewer'
    },
    isActive: { type: Boolean, default: true },
    lastLogin: { type: Date, default: Date.now },
    ipAddress: { type: String },
    macAddress: { type: String },
    loginAttempts: { type: Number, required: true, default: 0 },
    lockoutUntil: { type: Date, default: null },
    lockoutCount: { type: Number, required: true, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);