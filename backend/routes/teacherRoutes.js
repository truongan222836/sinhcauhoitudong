const express = require('express');
const router = express.Router();
const teacherController = require('../controllers/teacherController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/analytics', protect, authorize(1, 2), teacherController.getTeacherAnalytics);

module.exports = router;
