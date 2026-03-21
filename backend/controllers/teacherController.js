const { pool } = require('../config/db');

exports.getTeacherAnalytics = async (req, res) => {
    try {
        const lecturerId = req.user.id;
        const stats = {};
        
        // Total Exams Created
        const exams = await pool.query(
            "SELECT COUNT(*) as count FROM \"DeThi\" WHERE \"NguoiTaoId\" = $1",
            [lecturerId]
        );
        stats.totalExams = parseInt(exams.rows[0].count);
        
        // Total Attempts on their exams
        const attempts = await pool.query(`
            SELECT COUNT(b."BaiThiId") as count 
            FROM "BaiThi" b 
            JOIN "DeThi" d ON b."DeThiId" = d."DeThiId" 
            WHERE d."NguoiTaoId" = $1 AND b."TrangThai" = 'Đã nộp'
        `, [lecturerId]);
        stats.totalAttempts = parseInt(attempts.rows[0].count);
        
        // Average Score
        const avgScore = await pool.query(`
            SELECT AVG(b."Diem") as avg 
            FROM "BaiThi" b 
            JOIN "DeThi" d ON b."DeThiId" = d."DeThiId" 
            WHERE d."NguoiTaoId" = $1 AND b."TrangThai" = 'Đã nộp'
        `, [lecturerId]);
        stats.averageScore = parseFloat(avgScore.rows[0].avg) || 0;
        
        // Most Popular Exam
        const popular = await pool.query(`
            SELECT d."TieuDe", COUNT(b."BaiThiId") as "attemptCount" 
            FROM "DeThi" d 
            LEFT JOIN "BaiThi" b ON d."DeThiId" = b."DeThiId" 
            WHERE d."NguoiTaoId" = $1 
            GROUP BY d."TieuDe" 
            ORDER BY "attemptCount" DESC
            LIMIT 1
        `, [lecturerId]);
        stats.mostPopularExam = popular.rows[0] || { TieuDe: 'Chưa có dữ liệu', attemptCount: 0 };
        
        // Attempts By Date (Last 7 days)
        const byDate = await pool.query(`
            SELECT CAST("NgayNop" AS DATE) as date, COUNT(*) as count 
            FROM "BaiThi" b 
            JOIN "DeThi" d ON b."DeThiId" = d."DeThiId" 
            WHERE d."NguoiTaoId" = $1 AND b."TrangThai" = 'Đã nộp' AND "NgayNop" >= NOW() - INTERVAL '7 days'
            GROUP BY CAST("NgayNop" AS DATE)
            ORDER BY date ASC
        `, [lecturerId]);
            
        // Map over last 7 days exactly
        const last7Days = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            
            // Find if existing in queried data
            const existing = byDate.rows.find(row => {
                const rowDate = new Date(row.date);
                // Adjust for timezone offset to match dateStr
                const offset = rowDate.getTimezoneOffset();
                rowDate.setMinutes(rowDate.getMinutes() - offset);
                return rowDate.toISOString().split('T')[0] === dateStr;
            });
            
            last7Days.push({
                date: dateStr,
                count: existing ? parseInt(existing.count) : 0
            });
        }
        
        stats.attemptsByDate = last7Days;

        res.json({ success: true, data: stats });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
