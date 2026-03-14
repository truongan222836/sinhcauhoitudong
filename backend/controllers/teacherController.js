const { sql, config } = require('../config/db');

exports.getTeacherAnalytics = async (req, res) => {
    try {
        const lecturerId = req.user.id;
        const pool = await sql.connect(config);
        
        const stats = {};
        
        // Total Exams Created
        const exams = await pool.request()
            .input('id', sql.Int, lecturerId)
            .query("SELECT COUNT(*) as count FROM DeThi WHERE NguoiTaoId = @id");
        stats.totalExams = exams.recordset[0].count;
        
        // Total Attempts on their exams
        const attempts = await pool.request()
            .input('id', sql.Int, lecturerId)
            .query(`
                SELECT COUNT(b.BaiThiId) as count 
                FROM BaiThi b 
                JOIN DeThi d ON b.DeThiId = d.DeThiId 
                WHERE d.NguoiTaoId = @id AND b.TrangThai = N'Đã nộp'
            `);
        stats.totalAttempts = attempts.recordset[0].count;
        
        // Average Score
        const avgScore = await pool.request()
            .input('id', sql.Int, lecturerId)
            .query(`
                SELECT AVG(b.Diem) as avg 
                FROM BaiThi b 
                JOIN DeThi d ON b.DeThiId = d.DeThiId 
                WHERE d.NguoiTaoId = @id AND b.TrangThai = N'Đã nộp'
            `);
        stats.averageScore = avgScore.recordset[0].avg || 0;
        
        // Most Popular Exam
        const popular = await pool.request()
            .input('id', sql.Int, lecturerId)
            .query(`
                SELECT TOP 1 d.TieuDe, COUNT(b.BaiThiId) as attemptCount 
                FROM DeThi d 
                LEFT JOIN BaiThi b ON d.DeThiId = b.DeThiId 
                WHERE d.NguoiTaoId = @id 
                GROUP BY d.TieuDe 
                ORDER BY attemptCount DESC
            `);
        stats.mostPopularExam = popular.recordset[0] || { TieuDe: 'Chưa có dữ liệu', attemptCount: 0 };
        
        // Attempts By Date (Last 7 days)
        const byDate = await pool.request()
            .input('id', sql.Int, lecturerId)
            .query(`
                SELECT CAST(NgayNop AS DATE) as date, COUNT(*) as count 
                FROM BaiThi b 
                JOIN DeThi d ON b.DeThiId = d.DeThiId 
                WHERE d.NguoiTaoId = @id AND b.TrangThai = N'Đã nộp' AND NgayNop >= DATEADD(day, -7, GETDATE())
                GROUP BY CAST(NgayNop AS DATE)
                ORDER BY date ASC
            `);
            
        // Map over last 7 days exactly
        const last7Days = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            
            // Find if existing in queried data
            const existing = byDate.recordset.find(row => {
                const rowDate = new Date(row.date);
                rowDate.setMinutes(rowDate.getMinutes() - rowDate.getTimezoneOffset());
                return rowDate.toISOString().split('T')[0] === dateStr;
            });
            
            last7Days.push({
                date: dateStr,
                count: existing ? existing.count : 0
            });
        }
        
        stats.attemptsByDate = last7Days;

        res.json({ success: true, data: stats });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
