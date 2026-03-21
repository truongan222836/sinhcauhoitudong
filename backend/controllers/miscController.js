const { pool } = require("../config/db");

exports.getNotifications = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT notification_id as id, title, message, link, is_read as "isRead", created_at as time 
             FROM "Notifications" 
             WHERE user_id = $1 
             ORDER BY created_at DESC`,
            [req.user.id]
        );
        res.json({ success: true, data: result.rows });
    } catch (err) {
        console.error("Lỗi khi lấy thông báo:", err);
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.markRead = async (req, res) => {
    const id = parseInt(req.params.id);
    try {
        await pool.query(
            "UPDATE \"Notifications\" SET is_read = true WHERE notification_id = $1 AND user_id = $2",
            [id, req.user.id]
        );
        res.json({ success: true, message: "Đã đánh dấu đọc" });
    } catch (err) {
        console.error("Lỗi khi đánh dấu đọc thông báo:", err);
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.sendSupport = async (req, res) => {
    const { title, message } = req.body;
    try {
        // 1. Save Support Request
        const supportRes = await pool.query(
            `INSERT INTO "SupportRequests" (user_id, title, message) 
             VALUES ($1, $2, $3)
             RETURNING support_id`,
            [req.user.id, title, message]
        );
        
        // 2. Create Notification for Admin (role_id = 1)
        const adminsRes = await pool.query("SELECT \"NguoiDungId\" FROM \"NguoiDung\" WHERE \"VaiTroId\" = 1");
        
        for (const admin of adminsRes.rows) {
            await pool.query(
                `INSERT INTO "Notifications" (user_id, title, message, link) 
                 VALUES ($1, $2, $3, $4)`,
                [
                    admin.NguoiDungId, 
                    "Yêu cầu hỗ trợ mới", 
                    `Người dùng ${req.user.fullname} đã gửi một yêu cầu hỗ trợ mới: "${title}"`,
                    "/admin/support"
                ]
            );
        }

        res.json({ success: true, message: "Đã gửi yêu cầu hỗ trợ thành công. Admin sẽ sớm xử lý yêu cầu của bạn." });
    } catch (err) {
        console.error("Lỗi khi gửi yêu cầu hỗ trợ:", err);
        res.status(500).json({ success: false, message: err.message });
    }
};
