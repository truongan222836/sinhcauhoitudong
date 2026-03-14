const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { verifyResetToken } = require("../middleware/authMiddleware");

router.post("/forgot-password", authController.forgotPassword);
router.post("/reset-password", verifyResetToken, authController.resetPassword);

// API kiểm tra token có hợp lệ không (để frontend hiển thị form)
router.get("/verify-token", verifyResetToken, (req, res) => {
    res.status(200).json({ message: "Token hợp lệ", valid: true });
});

module.exports = router;
