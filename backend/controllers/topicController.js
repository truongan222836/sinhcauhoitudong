const { sql, config } = require('../config/db');

exports.getAllTopics = async (req, res) => {
    try {
        const pool = await sql.connect(config);
        const result = await pool.request().query("SELECT ChuDeId as id, TenChuDe as name, MoTa as description FROM ChuDe");
        res.json({ success: true, data: result.recordset });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getTrendingTopics = async (req, res) => {
    try {
        const pool = await sql.connect(config);
        //Trending logic = sum of questions created and times exams were taken
        const result = await pool.request().query(`
            SELECT TOP 5 
                c.ChuDeId as id, 
                TRIM(c.TenChuDe) as name, 
                (
                    ISNULL(q_count.cnt, 0) + ISNULL(b_count.cnt, 0)
                ) as questionCount
            FROM ChuDe c
            LEFT JOIN (
                SELECT ChuDeId, COUNT(*) as cnt 
                FROM CauHoi 
                GROUP BY ChuDeId
            ) q_count ON c.ChuDeId = q_count.ChuDeId
            LEFT JOIN (
                SELECT d.ChuDeId, COUNT(*) as cnt 
                FROM BaiThi b
                JOIN DeThi d ON b.DeThiId = d.DeThiId
                GROUP BY d.ChuDeId
            ) b_count ON c.ChuDeId = b_count.ChuDeId
            ORDER BY questionCount DESC
        `);
        res.json({ success: true, data: result.recordset });
    } catch (err) {
        console.error("Lỗi getTrendingTopics:", err);
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.createTopic = async (req, res) => {
    const { name, description } = req.body;
    try {
        const pool = await sql.connect(config);
        await pool.request()
            .input('name', sql.NVarChar, name)
            .input('desc', sql.NVarChar, description)
            .query("INSERT INTO ChuDe (TenChuDe, MoTa) VALUES (@name, @desc)");
        res.status(201).json({ success: true, message: "Tạo chủ đề thành công" });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
