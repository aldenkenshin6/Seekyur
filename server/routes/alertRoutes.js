const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { getAlerts, createAlert, markAlertsAsRead } = require('../controllers/alertController');

router.route('/')
    .get(protect, getAlerts)
    .post(protect, createAlert);

router.route('/mark-read')
    .put(protect, markAlertsAsRead);

module.exports = router;