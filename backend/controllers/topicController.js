const { pool } = require('../config/db');

exports.getAllTopics = async (req, res) => {
    try {
        const result = await pool.query("SELECT \"ChuDeId\" as id, \"TenChuDe\" as name, \"MoTa\" as description FROM \"ChuDe\"");
        res.json({ success: true, data: result.rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getTrendingTopics = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                c."ChuDeId" as id, 
                TRIM(c."TenChuDe") as name, 
                (
                    COALESCE(q_count.cnt, 0) + COALESCE(b_count.cnt, 0)
                ) as "questionCount"
            FROM "ChuDe" c
            LEFT JOIN (
                SELECT "ChuDeId", COUNT(*) as cnt 
                FROM "CauHoi" 
                GROUP BY "ChuDeId"
            ) q_count ON c."ChuDeId" = q_count."ChuDeId"
            LEFT JOIN (
                SELECT d."ChuDeId", COUNT(*) as cnt 
                FROM "BaiThi" b
                JOIN "DeThi" d ON b."DeThiId" = d."DeThiId"
                GROUP BY d."ChuDeId"
            ) b_count ON c."ChuDeId" = b_count."ChuDeId"
            ORDER BY "questionCount" DESC
            LIMIT 5
        `);
        res.json({ success: true, data: result.rows });
    } catch (err) {
        console.error("Lỗi getTrendingTopics:", err);
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.createTopic = async (req, res) => {
    const { name, description } = req.body;
    try {
        await pool.query(
            "INSERT INTO \"ChuDe\" (\"TenChuDe\", \"MoTa\") VALUES ($1, $2)",
            [name, description]
        );
        res.status(201).json({ success: true, message: "Tạo chủ đề thành công" });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
