const express = require("express");
const router = express.Router();
const questionController = require("../controllers/questionController");
const { protect, authorize } = require('../middleware/authMiddleware');

router.post("/generate", protect, authorize(1, 2), questionController.generateQuestions);
router.post("/regenerate", protect, authorize(1, 2), questionController.regenerateQuestion);
router.post("/save", protect, authorize(1, 2), questionController.saveQuestions);
router.get("/my-questions", protect, authorize(1, 2), questionController.getMyQuestions);
router.get("/", protect, questionController.getAllQuestions);
router.put("/:id", protect, authorize(1, 2), questionController.updateQuestion);
router.delete("/:id", protect, authorize(1, 2), questionController.deleteQuestion);

module.exports = router;