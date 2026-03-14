const jwt = require('jsonwebtoken');
const { sql, config } = require("../config/db");
const SECRET_KEY = "AQG_SECRET_KEY_123";

const protect = (req, res, next) => {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, SECRET_KEY);
            req.user = decoded;
            next();
        } catch (error) {
            return res.status(401).json({ message: 'Token không hợp lệ hoặc đã hết hạn' });
        }
    }

    if (!token) {
        return res.status(401).json({ message: 'Không có quyền truy cập, vui lòng đăng nhập' });
    }
};

const authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.roleId)) {
            return res.status(403).json({ message: `Vai trò của bạn không có quyền thực hiện chức năng này` });
        }
        next();
    };
};

const verifyResetToken = async (req, res, next) => {
    try {
        // Hỗ trợ lấy token từ body, query hoặc params (tránh lỗi req.body undefined trên GET)
        const token = (req.body && req.body.token) || req.query.token || req.params.token;
        
        if (!token) {
            return res.status(400).json({ valid: false, message: "Không tìm thấy token yêu cầu" });
        }

        const pool = await sql.connect(config);
        const request = pool.request();
        request.input("ResetToken", sql.NVarChar, token);
        
        const result = await request.query(`
            SELECT token_id, user_id, expires_at, used
            FROM PasswordResetTokens
            WHERE reset_token = @ResetToken
        `);

        if (!result || !result.recordset) {
            return res.status(500).json({ valid: false, message: "Lỗi truy vấn cơ sở dữ liệu" });
        }

        const tokenRecord = result.recordset[0];

        if (!tokenRecord) {
            return res.status(400).json({ valid: false, message: "Link đặt lại mật khẩu không tồn tại hoặc đã hết hạn (15 phút)." });
        }

        if (tokenRecord.used) {
            return res.status(400).json({ valid: false, message: "Link này đã được sử dụng trước đó. Vui lòng yêu cầu link mới." });
        }

        if (new Date(tokenRecord.expires_at) < new Date()) {
            return res.status(400).json({ valid: false, message: "Link reset mật khẩu đã quá hạn hiệu lực." });
        }

        req.resetTokenData = tokenRecord;
        next();
    } catch (err) {
        console.error("verifyResetToken Error:", err);
        res.status(500).json({ 
            valid: false, 
            message: "Lỗi hệ thống khi xác thực token",
            error: err.message 
        });
    }
};

module.exports = { protect, authorize, verifyResetToken };