const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const { protect } = require('../middleware/authMiddleware');

router.post("/register", userController.register);
router.post("/login", userController.login);

// Lấy và cập nhật thông tin cá nhân
router.route("/profile").get(protect, userController.getUserProfile).put(protect, userController.updateUserProfile);

// Lấy thống kê người dùng
router.get("/stats", protect, userController.getUserStats);

// Lấy lịch sử làm bài
router.get("/history", protect, userController.getUserHistory);

// Lấy bảng xếp hạng
router.get("/leaderboard", protect, userController.getLeaderboard);

// Lấy hoạt động gần đây
router.get("/recent-activity", protect, userController.getRecentActivity);
// Lấy thông tin public profile
router.get("/:id/public-profile", protect, userController.getPublicProfile);

module.exports = router;