const jwt = require('jsonwebtoken');
const SECRET_KEY = "AQG_SECRET_KEY_123"; // Phải giống với key trong userController

const protect = (req, res, next) => {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // Lấy token từ header
            token = req.headers.authorization.split(' ')[1];

            // Xác thực token
            const decoded = jwt.verify(token, SECRET_KEY);

            // Gắn thông tin user vào request để các xử lý sau có thể dùng
            req.user = decoded; // decoded sẽ chứa { id, roleId }
            next();
        } catch (error) {
            res.status(401).json({ message: 'Token không hợp lệ hoặc đã hết hạn' });
        }
    }

    if (!token) {
        res.status(401).json({ message: 'Không có quyền truy cập, vui lòng đăng nhập' });
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

module.exports = { protect, authorize };
