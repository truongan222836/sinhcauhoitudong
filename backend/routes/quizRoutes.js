const express = require("express");
const router = express.Router();
const quizController = require("../controllers/quizController");
const { protect, authorize } = require('../middleware/authMiddleware');

router.post("/start", protect, authorize(3), quizController.startExam);
router.post("/create-from-generated", protect, authorize(1, 2), quizController.createQuizFromGenerated);
router.get("/my-quizzes", protect, authorize(1, 2), quizController.getQuizzesByLecturer);
router.put("/:quizId/publish", protect, authorize(1, 2), quizController.publishQuiz);
router.get("/code/:code", protect, authorize(1, 2, 3), quizController.getQuizByCode);
router.get("/available", protect, authorize(3), quizController.getAvailableQuizzes);
router.get("/:id", protect, authorize(1, 2, 3), quizController.getQuizById);
router.post("/:id/submit", protect, authorize(3), quizController.submitQuiz);
router.post("/save-answer", protect, authorize(3), quizController.saveAnswer);
router.get("/:id/ranking", protect, quizController.getRanking);
router.get("/:id/stats", protect, authorize(1, 2), quizController.getExamStats);
router.get("/:id/question-stats", protect, authorize(1, 2), quizController.getQuestionStats);
router.get("/topic/:name", protect, quizController.getQuizzesByTopic);
router.delete("/:id", protect, authorize(1, 2), quizController.deleteQuiz);
router.put("/:id", protect, authorize(1, 2), quizController.updateQuiz);

module.exports = router;