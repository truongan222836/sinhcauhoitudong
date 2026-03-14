const { sql, config } = require('../config/db');
const bcrypt = require('bcryptjs');

// --- QUẢN LÝ NGƯỜI DÙNG ---

exports.getAllUsers = async (req, res) => {
    try {
        const pool = await sql.connect(config);
        const result = await pool.request().query("SELECT NguoiDungId as id, HoTen as name, Email as email, VaiTroId as roleId FROM NguoiDung");
        res.json({ success: true, data: result.recordset });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.createUser = async (req, res) => {
    const { name, email, password, roleId } = req.body;
    try {
        const pool = await sql.connect(config);
        const hashedPassword = await bcrypt.hash(password, 10);
        await pool.request()
            .input('name', sql.NVarChar, name)
            .input('email', sql.VarChar, email)
            .input('pass', sql.VarChar, hashedPassword)
            .input('role', sql.Int, roleId)
            .query("INSERT INTO NguoiDung (HoTen, Email, MatKhauHash, VaiTroId) VALUES (@name, @email, @pass, @role)");
        res.status(201).json({ success: true, message: "Tạo người dùng thành công" });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.updateUser = async (req, res) => {
    const { id } = req.params;
    const { name, email, roleId } = req.body;
    try {
        const pool = await sql.connect(config);
        await pool.request()
            .input('id', sql.Int, id)
            .input('name', sql.NVarChar, name)
            .input('email', sql.VarChar, email)
            .input('role', sql.Int, roleId)
            .query("UPDATE NguoiDung SET HoTen = @name, Email = @email, VaiTroId = @role WHERE NguoiDungId = @id");
        res.json({ success: true, message: "Cập nhật thành công" });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.deleteUser = async (req, res) => {
    const { id } = req.params;
    try {
        const pool = await sql.connect(config);
        // Check if user has related records (exams, quizzes)
        const check = await pool.request().input('id', sql.Int, id).query("SELECT TOP 1 BaiThiId FROM BaiThi WHERE NguoiDungId = @id");
        if (check.recordset.length > 0) {
            return res.status(400).json({ success: false, message: "Không thể xóa người dùng đã có dữ liệu thi cử." });
        }
        await pool.request().input('id', sql.Int, id).query("DELETE FROM NguoiDung WHERE NguoiDungId = @id");
        res.json({ success: true, message: "Xóa thành công" });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// --- THỐNG KÊ HỆ THỐNG ---

exports.getSystemStats = async (req, res) => {
    try {
        const pool = await sql.connect(config);
        
        const stats = {};
        
        // Total Users
        const users = await pool.request().query("SELECT COUNT(*) as count FROM NguoiDung");
        stats.totalUsers = users.recordset[0].count;
        
        // Total Exams (DeThi)
        const quizzes = await pool.request().query("SELECT COUNT(*) as count FROM DeThi");
        stats.totalExams = quizzes.recordset[0].count;
        
        // Total Attempts (BaiThi)
        const attempts = await pool.request().query("SELECT COUNT(*) as count FROM BaiThi WHERE TrangThai = N'Đã nộp'");
        stats.totalAttempts = attempts.recordset[0].count;
        
        // Top Teachers
        const teachers = await pool.request().query(`
            SELECT TOP 5 u.HoTen as name, COUNT(d.DeThiId) as examCount 
            FROM NguoiDung u JOIN DeThi d ON u.NguoiDungId = d.NguoiTaoId 
            GROUP BY u.HoTen ORDER BY examCount DESC
        `);
        stats.topTeachers = teachers.recordset;
        
        // Top Students
        const students = await pool.request().query(`
            SELECT TOP 5 u.HoTen as name, SUM(b.Diem) as totalPoints 
            FROM NguoiDung u JOIN BaiThi b ON u.NguoiDungId = b.NguoiDungId 
            WHERE b.TrangThai = N'Đã nộp'
            GROUP BY u.HoTen ORDER BY totalPoints DESC
        `);
        stats.topStudents = students.recordset;

        res.json({ success: true, data: stats });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
