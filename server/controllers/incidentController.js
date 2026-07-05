const Incident = require('../models/Incident');
const Alert = require('../models/Alert');

const emitAlert = async (req, payload) => {
    const alert = await Alert.create(payload);

    const io = req.app.get('io');
    if (io) {
        io.emit('receiveAlert', alert);
    }

    return alert;
};

const getIncidents = async (req, res) => {
    try {
        const incidents = await Incident.find().populate('assignedTo', 'name email');
        res.json(incidents);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const createIncident = async (req, res) => {
    const { title, description, severity, assignedTo, category, affectedSystem } = req.body;
    try {
        const incidentData = { title, description, severity, category, affectedSystem };
        if (assignedTo && assignedTo.trim() !== '') {
            incidentData.assignedTo = assignedTo;
        }
        const incident = await Incident.create(incidentData);
        await emitAlert(req, {
            title: `Incident created: ${incident.title}`,
            description: incident.description,
            severity: incident.severity,
            source: 'Incident Management'
        });
        res.status(201).json(incident);
    } catch (error) {
        console.error('Error in createIncident:', error);
        res.status(500).json({ message: error.message });
    }
};

const updateIncident = async (req, res) => {
    try {
        const currentIncident = await Incident.findById(req.params.id);
        if (!currentIncident) {
            return res.status(404).json({ message: 'Incident not found' });
        }

        const incident = await Incident.findByIdAndUpdate(req.params.id, req.body, { new: true });

        if (req.body.status && req.body.status !== currentIncident.status) {
            const statusTitle = req.body.status === 'Close'
                ? `Incident closed: ${incident.title}`
                : `Incident moved to ${req.body.status}: ${incident.title}`;

            await emitAlert(req, {
                title: statusTitle,
                description: req.body.resolutionNotes || incident.description,
                severity: incident.severity,
                source: 'Incident Response'
            });
        }

        res.json(incident);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const deleteIncident = async (req, res) => {
    try {
        await Incident.findByIdAndDelete(req.params.id);
        res.json({ message: 'Incident removed' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getIncidents, createIncident, updateIncident, deleteIncident };