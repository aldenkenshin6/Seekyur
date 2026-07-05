const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const { getUsers, createUser, updateUserRole, updateUserStatus, deleteUser, getSecuritySettings, updateSecuritySettings } = require('../controllers/userController');

router.use(protect);
router.get('/', authorize('Admin', 'Viewer'), getUsers);

router.use(authorize('Admin'));
router.get('/settings/security', getSecuritySettings);
router.put('/settings/security', updateSecuritySettings);
router.post('/', createUser);
router.put('/:id/role', updateUserRole);
router.put('/:id/status', updateUserStatus);
router.delete('/:id', deleteUser);

module.exports = router;