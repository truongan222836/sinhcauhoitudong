const { pool } = require('../config/db');
const bcrypt = require('bcryptjs');

// --- QUẢN LÝ NGƯỜI DÙNG ---

exports.getAllUsers = async (req, res) => {
    try {
        const result = await pool.query("SELECT \"NguoiDungId\" as id, \"HoTen\" as name, \"Email\" as email, \"VaiTroId\" as \"roleId\" FROM \"NguoiDung\"");
        res.json({ success: true, data: result.rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.createUser = async (req, res) => {
    const { name, email, password, roleId } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await pool.query(
            "INSERT INTO \"NguoiDung\" (\"HoTen\", \"Email\", \"MatKhauHash\", \"VaiTroId\") VALUES ($1, $2, $3, $4)",
            [name, email, hashedPassword, roleId]
        );
        res.status(201).json({ success: true, message: "Tạo người dùng thành công" });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.updateUser = async (req, res) => {
    const { id } = req.params;
    const { name, email, roleId } = req.body;
    try {
        await pool.query(
            "UPDATE \"NguoiDung\" SET \"HoTen\" = $1, \"Email\" = $2, \"VaiTroId\" = $3 WHERE \"NguoiDungId\" = $4",
            [name, email, roleId, id]
        );
        res.json({ success: true, message: "Cập nhật thành công" });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.deleteUser = async (req, res) => {
    const { id } = req.params;
    try {
        // Check if user has related records (exams, quizzes)
        const check = await pool.query("SELECT \"BaiThiId\" FROM \"BaiThi\" WHERE \"NguoiDungId\" = $1 LIMIT 1", [id]);
        if (check.rows.length > 0) {
            return res.status(400).json({ success: false, message: "Không thể xóa người dùng đã có dữ liệu thi cử." });
        }
        await pool.query("DELETE FROM \"NguoiDung\" WHERE \"NguoiDungId\" = $1", [id]);
        res.json({ success: true, message: "Xóa thành công" });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// --- THỐNG KÊ HỆ THỐNG ---

exports.getSystemStats = async (req, res) => {
    try {
        const stats = {};
        
        // Total Users
        const users = await pool.query("SELECT COUNT(*) as count FROM \"NguoiDung\"");
        stats.totalUsers = parseInt(users.rows[0].count);
        
        // Total Exams (DeThi)
        const quizzes = await pool.query("SELECT COUNT(*) as count FROM \"DeThi\"");
        stats.totalExams = parseInt(quizzes.rows[0].count);
        
        // Total Attempts (BaiThi)
        const attempts = await pool.query("SELECT COUNT(*) as count FROM \"BaiThi\" WHERE \"TrangThai\" = 'Đã nộp'");
        stats.totalAttempts = parseInt(attempts.rows[0].count);
        
        // Top Teachers
        const teachers = await pool.query(`
            SELECT u."HoTen" as name, COUNT(d."DeThiId") as "examCount" 
            FROM "NguoiDung" u JOIN "DeThi" d ON u."NguoiDungId" = d."NguoiTaoId" 
            GROUP BY u."HoTen" ORDER BY "examCount" DESC LIMIT 5
        `);
        stats.topTeachers = teachers.rows;
        
        // Top Students
        const students = await pool.query(`
            SELECT u."HoTen" as name, SUM(b."Diem") as "totalPoints" 
            FROM "NguoiDung" u JOIN "BaiThi" b ON u."NguoiDungId" = b."NguoiDungId" 
            WHERE b."TrangThai" = 'Đã nộp'
            GROUP BY u."HoTen" ORDER BY "totalPoints" DESC LIMIT 5
        `);
        stats.topStudents = students.rows;

        res.json({ success: true, data: stats });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// --- QUẢN LÝ HỖ TRỢ ---

exports.getSupportRequests = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT s.*, u."HoTen" as fullname, u."Email" as email 
            FROM "SupportRequests" s 
            JOIN "NguoiDung" u ON s.user_id = u."NguoiDungId" 
            ORDER BY s.created_at DESC
        `);
        res.json({ success: true, data: result.rows });
    } catch (err) {
        console.error("Lỗi khi lấy yêu cầu hỗ trợ:", err);
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.updateSupportStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    try {
        await pool.query("UPDATE \"SupportRequests\" SET status = $1 WHERE support_id = $2", [status, id]);
        res.json({ success: true, message: "Cập nhật trạng thái thành công" });
    } catch (err) {
        console.error("Lỗi khi cập nhật trạng thái hỗ trợ:", err);
        res.status(500).json({ success: false, message: err.message });
    }
};
