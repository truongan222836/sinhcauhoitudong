const express = require("express");
const router = express.Router();
const quizController = require("../controllers/quizController");
const { protect, authorize } = require('../middleware/authMiddleware');

router.post("/create-from-generated", protect, authorize(1, 2), quizController.createQuizFromGenerated);
router.get("/my-quizzes", protect, authorize(1, 2), quizController.getQuizzesByLecturer);

module.exports = router;