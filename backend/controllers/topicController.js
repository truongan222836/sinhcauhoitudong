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
        //Trending logic = most attempts
        const result = await pool.request().query(`
            SELECT TOP 5 c.ChuDeId as id, TRIM(c.TenChuDe) as name, COUNT(q.CauHoiId) as questionCount
            FROM ChuDe c 
            LEFT JOIN CauHoi q ON c.ChuDeId = q.ChuDeId 
            GROUP BY c.ChuDeId, c.TenChuDe 
            ORDER BY questionCount DESC
        `);
        res.json({ success: true, data: result.recordset });
    } catch (err) {
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
