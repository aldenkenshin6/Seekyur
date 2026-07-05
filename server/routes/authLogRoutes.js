const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { getAuthLogs } = require('../controllers/authLogController');

router.get('/', protect, getAuthLogs);

module.exports = router;
