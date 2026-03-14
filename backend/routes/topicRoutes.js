const express = require('express');
const router = express.Router();
const topicController = require('../controllers/topicController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/', protect, topicController.getAllTopics);
router.get('/trending', protect, topicController.getTrendingTopics);
router.post('/', protect, authorize(1), topicController.createTopic);

module.exports = router;
