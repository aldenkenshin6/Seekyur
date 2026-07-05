const mongoose = require('mongoose');

const AlertSchema = new mongoose.Schema({
    title: { type: String, required: true },
    type: { type: String },
    description: { type: String },
    severity: {
        type: String,
        enum: ['Low', 'Medium', 'High', 'Critical'],
        required: true
    },
    source: { type: String, default: 'System' },
    sourceIp: { type: String },
    isRead: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Alert', AlertSchema);