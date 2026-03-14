const express = require("express");
const router = express.Router();
const examController = require("../controllers/examController");
const { protect, authorize } = require('../middleware/authMiddleware');

// The exact endpoints requested by the user
router.post("/submit", protect, authorize(3), examController.submitExam);
router.post("/extend", protect, authorize(1, 2), examController.extendDeadline);
router.get("/:examId/ranking", protect, authorize(1, 2), examController.getRanking);
router.get("/:examId/stats", protect, authorize(1, 2), examController.getStats);
router.get("/:examId/question-stats", protect, authorize(1, 2), examController.getQuestionStats);

module.exports = router;
