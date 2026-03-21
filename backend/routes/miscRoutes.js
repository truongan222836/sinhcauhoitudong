const express = require('express');
const router = express.Router();
const miscController = require('../controllers/miscController');
const { protect } = require('../middleware/authMiddleware');

router.get('/notifications', protect, miscController.getNotifications);
router.patch('/notifications/:id/read', protect, miscController.markRead);
router.post('/notifications/read/:id', protect, miscController.markRead);
router.post('/support', protect, miscController.sendSupport);

module.exports = router;
