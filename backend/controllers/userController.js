const { sql, config } = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const SECRET_KEY = "AQG_SECRET_KEY_123"; // Nên lưu trong biến môi trường .env

exports.register = async (req, res) => {
    try {
        const { fullname, email, password, role } = req.body;
        
        // Hash mật khẩu
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        await sql.connect(config);
        const request = new sql.Request();
        
        // Lấy RoleId dựa trên role string (client gửi 'lecturer' hoặc 'student')
        // Mặc định là Student (3) nếu không khớp
        let roleId = 3; 
        if (role === 'lecturer') roleId = 2;
        if (role === 'admin') roleId = 1;

        request.input("HoTen", sql.NVarChar, fullname);
        request.input("Email", sql.VarChar, email);
        request.input("MatKhauHash", sql.VarChar, hashedPassword);
        request.input("VaiTroId", sql.Int, roleId);

        await request.query("INSERT INTO NguoiDung (HoTen, Email, MatKhauHash, VaiTroId) VALUES (@HoTen, @Email, @MatKhauHash, @VaiTroId)");

        res.status(201).json({ message: "Đăng ký thành công!" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Lỗi server", error: err.message });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        await sql.connect(config);
        const request = new sql.Request();
        request.input("Email", sql.VarChar, email);
        
        const result = await request.query("SELECT * FROM NguoiDung WHERE Email = @Email");
        const user = result.recordset[0];

        if (!user) {
            return res.status(400).json({ message: "Email không tồn tại" });
        }

        const isMatch = await bcrypt.compare(password, user.MatKhauHash);
        if (!isMatch) {
            return res.status(400).json({ message: "Mật khẩu không đúng" });
        }

        // Tạo token
        const token = jwt.sign({ id: user.NguoiDungId, roleId: user.VaiTroId }, SECRET_KEY, { expiresIn: "1h" });

        res.json({ 
            message: "Đăng nhập thành công", 
            token, 
            user: { id: user.NguoiDungId, fullname: user.HoTen, roleId: user.VaiTroId } 
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Lỗi server" });
    }
};

exports.getUserProfile = async (req, res) => {
    try {
        await sql.connect(config);
        const request = new sql.Request();
        request.input("UserId", sql.Int, req.user.id);

        const result = await request.query("SELECT NguoiDungId, HoTen, Email, VaiTroId FROM NguoiDung WHERE NguoiDungId = @UserId");
        const user = result.recordset[0];

        if (user) {
            res.json(user);
        } else {
            res.status(404).json({ message: "Không tìm thấy người dùng" });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Lỗi server" });
    }
};

exports.updateUserProfile = async (req, res) => {
    try {
        const { fullname, password } = req.body;

        await sql.connect(config);
        const request = new sql.Request();
        request.input("UserId", sql.Int, req.user.id);
        request.input("HoTen", sql.NVarChar, fullname);

        let query = "UPDATE NguoiDung SET HoTen = @HoTen";

        if (password) {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);
            request.input("MatKhauHash", sql.VarChar, hashedPassword);
            query += ", MatKhauHash = @MatKhauHash";
        }

        query += " WHERE NguoiDungId = @UserId";

        await request.query(query);

        res.json({ message: "Cập nhật thông tin thành công!" });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Lỗi server" });
    }
};