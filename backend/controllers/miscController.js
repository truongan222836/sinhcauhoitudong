const { sql, config } = require("../config/db");

exports.getNotifications = async (req, res) => {
    try {
        const pool = await sql.connect(config);
        const result = await pool.request()
            .input('UserId', sql.Int, req.user.id)
            .query(`SELECT notification_id as id, title, message, link, is_read as isRead, created_at as time 
                    FROM Notifications 
                    WHERE user_id = @UserId 
                    ORDER BY created_at DESC`);
        res.json({ success: true, data: result.recordset });
    } catch (err) {
        console.error("Lỗi khi lấy thông báo:", err);
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.markRead = async (req, res) => {
    const id = parseInt(req.params.id);
    try {
        const pool = await sql.connect(config);
        await pool.request()
            .input('Id', sql.Int, id)
            .input('UserId', sql.Int, req.user.id)
            .query("UPDATE Notifications SET is_read = 1 WHERE notification_id = @Id AND user_id = @UserId");
        res.json({ success: true, message: "Đã đánh dấu đọc" });
    } catch (err) {
        console.error("Lỗi khi đánh dấu đọc thông báo:", err);
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.sendSupport = async (req, res) => {
    const { title, message } = req.body;
    try {
        const pool = await sql.connect(config);
        
        // 1. Save Support Request
        const supportRes = await pool.request()
            .input('UserId', sql.Int, req.user.id)
            .input('Title', sql.NVarChar, title)
            .input('Msg', sql.NVarChar, message)
            .query(`INSERT INTO SupportRequests (user_id, title, message) 
                    OUTPUT INSERTED.support_id
                    VALUES (@UserId, @Title, @Msg)`);
        
        // 2. Create Notification for Admin (role_id = 1)
        // Find admins
        const adminsRes = await pool.request().query("SELECT NguoiDungId FROM NguoiDung WHERE VaiTroId = 1");
        
        const admins = adminsRes.recordset;
        for (const admin of admins) {
            await pool.request()
                .input('AdminId', sql.Int, admin.NguoiDungId)
                .input('TitleNotif', sql.NVarChar, "Yêu cầu hỗ trợ mới")
                .input('MsgNotif', sql.NVarChar, `Người dùng ${req.user.fullname} đã gửi một yêu cầu hỗ trợ mới: "${title}"`)
                .input('Link', sql.NVarChar, "/admin/support")
                .query(`INSERT INTO Notifications (user_id, title, message, link) 
                        VALUES (@AdminId, @TitleNotif, @MsgNotif, @Link)`);
        }

        res.json({ success: true, message: "Đã gửi yêu cầu hỗ trợ thành công. Admin sẽ sớm xử lý yêu cầu của bạn." });
    } catch (err) {
        console.error("Lỗi khi gửi yêu cầu hỗ trợ:", err);
        res.status(500).json({ success: false, message: err.message });
    }
};
