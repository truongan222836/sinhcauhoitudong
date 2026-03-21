const { pool } = require("../config/db");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const nodemailer = require("nodemailer");

// Cấu hình nodemailer (Sử dụng Gmail hoặc dịch vụ mail khác)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER || 'your.email@gmail.com',
        pass: process.env.EMAIL_PASS || 'your.app.password'
    }
});

exports.forgotPassword = async (req, res) => {
    console.log("Forgot Password Request received:", req.body);
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({ message: "Vui lòng cung cấp email" });
        }

        const userResult = await pool.query("SELECT \"NguoiDungId\", \"HoTen\" FROM \"NguoiDung\" WHERE \"Email\" = $1", [email]);
        const user = userResult.rows[0];

        if (!user) {
            return res.status(400).json({ message: "Email không tồn tại trong hệ thống" });
        }

        // Tạo reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 phút

        await pool.query(`
            INSERT INTO "PasswordResetTokens" (user_id, reset_token, expires_at, used) 
            VALUES ($1, $2, $3, false)
        `, [user.NguoiDungId, resetToken, expiresAt]);

        // Gửi email chứa link
        const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
        
        try {
            await transporter.sendMail({
                from: process.env.EMAIL_USER || '"Hệ Thống Sinh Câu Hỏi" <noreply@aqg.com>',
                to: email,
                subject: "Khôi Phục Mật Khẩu - Hệ Thống AQG",
                html: `
                    <h3>Chào ${user.HoTen},</h3>
                    <p>Bạn đã yêu cầu khôi phục mật khẩu.</p>
                    <p>Vui lòng click vào đường dẫn dưới đây để đặt lại mật khẩu mới:</p>
                    <a href="${resetUrl}" style="padding: 10px 15px; background: #007BFF; color: white; text-decoration: none; border-radius: 5px;">Đặt lại mật khẩu</a>
                    <p>Lưu ý: Đường dẫn này sẽ hết hạn sau 15 phút và chỉ được sử dụng một lần.</p>
                    <p>Nếu bạn không yêu cầu khôi phục mật khẩu, vui lòng bỏ qua email này.</p>
                `
            });
            console.log("Email khôi phục đã gửi: ", resetUrl);
        } catch (mailError) {
            console.error("Lỗi gửi email:", mailError);
            console.log("Reset URL in case email fails to send in dev:", resetUrl);
        }

        res.status(200).json({ message: "Đã gửi email khôi phục mật khẩu" });

    } catch (err) {
        console.error("Lỗi forgotPassword:", err);
        res.status(500).json({ message: "Lỗi server", error: err.message });
    }
};

exports.resetPassword = async (req, res) => {
    const client = await pool.connect();
    try {
        const { newPassword } = req.body;
        const tokenRecord = req.resetTokenData;

        if (!newPassword) {
            return res.status(400).json({ message: "Thiếu mật khẩu mới" });
        }

        // Hash mật khẩu mới
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        await client.query('BEGIN');

        try {
            await client.query(`
                UPDATE "NguoiDung" 
                SET "MatKhauHash" = $1 
                WHERE "NguoiDungId" = $2
            `, [hashedPassword, tokenRecord.user_id]);

            await client.query(`
                UPDATE "PasswordResetTokens" 
                SET used = true 
                WHERE token_id = $1
            `, [tokenRecord.token_id]);

            await client.query('COMMIT');
            res.status(200).json({ message: "Đổi mật khẩu thành công" });
        } catch (txError) {
            await client.query('ROLLBACK');
            throw txError;
        }

    } catch (err) {
        console.error("Lỗi resetPassword:", err);
        res.status(500).json({ message: "Lỗi server", error: err.message });
    } finally {
        client.release();
    }
};
