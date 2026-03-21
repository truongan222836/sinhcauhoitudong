const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Chỉ Admin mới được truy cập các route này
router.use(protect, authorize(1));

router.get('/users', adminController.getAllUsers);
router.post('/users', adminController.createUser);
router.put('/users/:id', adminController.updateUser);
router.delete('/users/:id', adminController.deleteUser);

router.get('/stats', adminController.getSystemStats);
router.get('/support', adminController.getSupportRequests);
router.patch('/support/:id', adminController.updateSupportStatus);

module.exports = router;
