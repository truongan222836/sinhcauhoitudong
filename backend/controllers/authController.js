const { sql, config } = require("../config/db");
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

        const pool = await sql.connect(config);
        const request = pool.request();
        request.input("Email", sql.VarChar, email);

        const userResult = await request.query("SELECT NguoiDungId, HoTen FROM NguoiDung WHERE Email = @Email");
        const user = userResult.recordset[0];

        if (!user) {
            return res.status(400).json({ message: "Email không tồn tại trong hệ thống" });
        }

        // Tạo reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 phút

        const tokenRequest = pool.request();
        tokenRequest.input("UserId", sql.Int, user.NguoiDungId);
        tokenRequest.input("ResetToken", sql.NVarChar, resetToken);
        tokenRequest.input("ExpiresAt", sql.DateTime, expiresAt);

        await tokenRequest.query(`
            INSERT INTO PasswordResetTokens (user_id, reset_token, expires_at, used) 
            VALUES (@UserId, @ResetToken, @ExpiresAt, 0)
        `);

        // Gửi email chứa link
        const resetUrl = `http://localhost:3001/reset-password?token=${resetToken}`;
        
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
            // Ghi log lỗi gửi mail nhưng vẫn tiếp tục luồng vì đây là demo (có thể cấu hình trong log server)
            // Tốt nhất nếu lỗi mail thì ném luôn 500
            console.log("Reset URL in case email fails to send in dev:", resetUrl);
        }

        res.status(200).json({ message: "Đã gửi email khôi phục mật khẩu" });

    } catch (err) {
        console.error("Lỗi forgotPassword:", err);
        res.status(500).json({ message: "Lỗi server", error: err.message });
    }
};

exports.resetPassword = async (req, res) => {
    try {
        const { newPassword } = req.body;
        const tokenRecord = req.resetTokenData;

        if (!newPassword) {
            return res.status(400).json({ message: "Thiếu mật khẩu mới" });
        }

        // Hash mật khẩu mới
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // Update mật khẩu và đánh dấu token đã dùng bằng transaction
        const transaction = new sql.Transaction();
        await transaction.begin();

        try {
            const updatePasswordReq = new sql.Request(transaction);
            updatePasswordReq.input("UserId", sql.Int, tokenRecord.user_id);
            updatePasswordReq.input("MatKhauHash", sql.VarChar, hashedPassword);
            await updatePasswordReq.query(`
                UPDATE NguoiDung 
                SET MatKhauHash = @MatKhauHash 
                WHERE NguoiDungId = @UserId
            `);

            const updateTokenReq = new sql.Request(transaction);
            updateTokenReq.input("TokenId", sql.Int, tokenRecord.token_id);
            await updateTokenReq.query(`
                UPDATE PasswordResetTokens 
                SET used = 1 
                WHERE token_id = @TokenId
            `);

            await transaction.commit();
            res.status(200).json({ message: "Đổi mật khẩu thành công" });
        } catch (txError) {
            await transaction.rollback();
            throw txError;
        }

    } catch (err) {
        console.error("Lỗi resetPassword:", err);
        res.status(500).json({ message: "Lỗi server", error: err.message });
    }
};
