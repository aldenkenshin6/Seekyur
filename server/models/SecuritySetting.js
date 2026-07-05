const mongoose = require('mongoose');

const SecuritySettingSchema = new mongoose.Schema({
    maxAttempts: { type: Number, default: 3 },
    lockoutDuration: { type: Number, default: 30 } // base duration in seconds
}, { timestamps: true });

module.exports = mongoose.model('SecuritySetting', SecuritySettingSchema);
