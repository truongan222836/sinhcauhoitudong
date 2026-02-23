const express = require("express");
const router = express.Router();
const questionController = require("../controllers/questionController");
const { protect, authorize } = require('../middleware/authMiddleware');

router.post("/generate", protect, authorize(1, 2), questionController.generateQuestions);
router.post("/save", protect, authorize(1, 2), questionController.saveQuestions);
router.get("/", protect, questionController.getAllQuestions);

module.exports = router;