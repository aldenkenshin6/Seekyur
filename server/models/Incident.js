const mongoose = require('mongoose');

const IncidentSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    severity: {
        type: String,
        enum: ['Low', 'Medium', 'High', 'Critical'],
        required: true
    },
    status: {
        type: String,
        enum: ['Collect', 'Analyze', 'Respond', 'Close'],
        default: 'Collect'
    },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    resolutionNotes: { type: String, default: '' },
    category: { type: String, default: '' },
    affectedSystem: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('Incident', IncidentSchema);