const express = require('express');
const router = express.Router();
const { getIncidents, createIncident, updateIncident, deleteIncident } = require('../controllers/incidentController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.route('/').get(protect, getIncidents).post(protect, authorize('Admin', 'SOC Analyst', 'Incident Responder'), createIncident);
router.route('/:id').put(protect, authorize('Admin', 'SOC Analyst', 'Incident Responder'), updateIncident).delete(protect, authorize('Admin'), deleteIncident);


module.exports = router;