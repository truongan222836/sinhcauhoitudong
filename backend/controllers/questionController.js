const { pool } = require("../config/db");
const { generateQuestions: generateAIQuestions } = require("../services/aiService");
const { v4: uuidv4 } = require('uuid');

const generateJobs = new Map();

exports.generateQuestions = async (req, res) => {
    try {
        const { text, type, quantity, difficulty } = req.body;
        
        if (!text || !text.trim()) {
            return res.status(400).json({ message: "Vui lòng cung cấp văn bản để sinh câu hỏi." });
        }

        if (!['Trắc nghiệm', 'Tự luận', 'Điền khuyết'].includes(type)) {
            return res.status(400).json({ message: "Loại câu hỏi không hợp lệ." });
        }

        if (quantity < 1 || quantity > 100) {
            return res.status(400).json({ message: "Số lượng câu hỏi phải từ 1 đến 100." });
        }

        let processedText = text;
        const MAX_CHARS = 15000;
        let warning = null;
        if (text.length > MAX_CHARS) {
            processedText = text.slice(0, MAX_CHARS);
            warning = `Văn bản quá dài (${text.length} ký tự); đã cắt bớt còn ${MAX_CHARS} ký tự để tối ưu xử lý.`;
        }

        const jobId = uuidv4();
        generateJobs.set(jobId, { status: 'Pending', progress: 0 });

        // Run background worker
        (async () => {
            try {
                generateJobs.get(jobId).status = 'Processing';
                const questions = await generateAIQuestions(processedText, type, quantity, difficulty, (progress) => {
                    if (generateJobs.has(jobId)) {
                        generateJobs.get(jobId).progress = progress;
                    }
                });

                if (generateJobs.has(jobId)) {
                    generateJobs.set(jobId, { status: 'Completed', progress: 100, data: questions, warning });
                }
            } catch (err) {
                console.error('Job failed:', err);
                if (generateJobs.has(jobId)) {
                    const isRateLimit = err.message && err.message.startsWith('API_RATE_LIMIT');
                    generateJobs.set(jobId, { 
                        status: 'Failed', 
                        error: isRateLimit ? '⏳ API Gemini AI đã đạt giới hạn sử dụng hoặc quá tải. Hãy thử lại.' : err.message 
                    });
                }
            }
        })();

        res.json({ success: true, jobId, message: "Hệ thống đang xử lý sinh câu hỏi, vui lòng đợi..." });
    } catch (err) {
        console.error('Lỗi trong generateQuestions:', err);
        res.status(500).json({ success: false, message: 'Lỗi khởi tạo job: ' + err.message });
    }
};

exports.getJobStatus = (req, res) => {
    const { jobId } = req.params;
    const job = generateJobs.get(jobId);
    if (!job) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy tiến trình xử lý.' });
    }
    
    res.json({ success: true, job });
    if (job.status === 'Completed' || job.status === 'Failed') {
        setTimeout(() => generateJobs.delete(jobId), 5 * 60 * 1000);
    }
};

exports.regenerateQuestion = async (req, res) => {
    try {
        const { text, type, difficulty } = req.body;
        const questions = await generateAIQuestions(text, type, 1, difficulty);
        if (!questions || questions.length === 0) {
            throw new Error('Không tạo được câu hỏi mới');
        }
        res.json({ success: true, data: questions[0] });
    } catch (err) {
        res.status(500).json({ message: "Lỗi khi tạo lại câu hỏi", error: err.message });
    }
};

exports.saveQuestions = async (req, res) => {
    const client = await pool.connect();
    try {
        const { questions } = req.body;
        const userId = req.user.id;
        
        if (!questions || !Array.isArray(questions)) {
             return res.status(400).json({message: "Danh sách câu hỏi không hợp lệ."});
        }

        await client.query('BEGIN');

        for (const q of questions) {
            let typeId = 1;
            if (q.type === 'Tự luận') typeId = 2;
            if (q.type === 'Điền khuyết') typeId = 3;

            const questionResult = await client.query(
                `INSERT INTO "CauHoi" ("NoiDung", "LoaiId", "LoaiCauHoiId", "NguoiTaoId") 
                 VALUES ($1, $2, $3, $4)
                 RETURNING "CauHoiId"`,
                [q.question, typeId, typeId, userId]
            );

            const questionId = questionResult.rows[0].CauHoiId;
            const normalizedCorrect = q.correctAnswer ? q.correctAnswer.replace(/^[A-H]\. /, '') : '';

            if (q.type === 'Trắc nghiệm' && q.options) {
                for (const option of q.options) {
                    const normalizedOption = option.replace(/^[A-H]\. /, '');
                    await client.query(
                        'INSERT INTO "DapAn" ("NoiDung", "CauHoiId", "LaDapAnDung") VALUES ($1, $2, $3)',
                        [normalizedOption, questionId, normalizedOption === normalizedCorrect]
                    );
                }
            } else if (q.type === 'Tự luận' && q.answer) {
                 await client.query(
                    'INSERT INTO "DapAn" ("NoiDung", "CauHoiId", "LaDapAnDung") VALUES ($1, $2, $3)',
                    [q.answer, questionId, true]
                 );
            } else if (q.type === 'Điền khuyết' && q.blanks) {
                 for (const blank of q.blanks) {
                      await client.query(
                        'INSERT INTO "DapAn" ("NoiDung", "CauHoiId", "LaDapAnDung") VALUES ($1, $2, $3)',
                        [blank, questionId, true]
                      );
                 }
            }
        }
        await client.query('COMMIT');
        res.json({ success: true, message: "Đã lưu bộ câu hỏi thành công!" });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Lỗi khi lưu câu hỏi:", err);
        res.status(500).json({ message: "Lỗi khi lưu", error: err.message });
    } finally {
        client.release();
    }
};

exports.getAllQuestions = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                q."CauHoiId" as id,
                q."NoiDung" as question,
                l."TenLoai" as type,
                q."NguoiTaoId",
                q."NgayTao" as "createdAt"
            FROM "CauHoi" q
            JOIN "LoaiCauHoi" l ON q."LoaiId" = l."LoaiId"
            ORDER BY q."NgayTao" DESC
        `);
        
        const questions = result.rows;
        for (let q of questions) {
            const dapAnResult = await pool.query(
                "SELECT \"NoiDung\", \"LaDapAnDung\" FROM \"DapAn\" WHERE \"CauHoiId\" = $1",
                [q.id]
            );
            
            if (q.type === 'Trắc nghiệm') {
                q.options = dapAnResult.rows.map(d => d.NoiDung);
                const correct = dapAnResult.rows.find(d => d.LaDapAnDung);
                if (correct) q.correctAnswer = correct.NoiDung;
            } else if (q.type === 'Tự luận' || q.type === 'Điền khuyết') {
                 if (dapAnResult.rows.length > 0) {
                     if (q.type === 'Tự luận') {
                         q.answer = dapAnResult.rows[0].NoiDung;
                     } else {
                         q.blanks = dapAnResult.rows.map(d => d.NoiDung);
                     }
                 }
            }
        }
        res.json({ success: true, data: questions });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Lỗi khi lấy danh sách toàn bộ câu hỏi", error: err.message });
    }
};

exports.getMyQuestions = async (req, res) => {
    try {
        const userId = req.user.id; 
        const result = await pool.query(`
            SELECT 
                q."CauHoiId" as id,
                q."NoiDung" as question,
                l."TenLoai" as type,
                q."NgayTao" as "createdAt",
                (
                    SELECT STRING_AGG(dt."MaDeThi", ', ') 
                    FROM "ChiTietDeThi" ct 
                    JOIN "DeThi" dt ON ct."DeThiId" = dt."DeThiId" 
                    WHERE ct."CauHoiId" = q."CauHoiId"
                ) as "maDeThi"
            FROM "CauHoi" q
            JOIN "LoaiCauHoi" l ON q."LoaiId" = l."LoaiId"
            WHERE q."NguoiTaoId" = $1
            ORDER BY q."NgayTao" DESC
        `, [userId]);
        
        const questions = result.rows;
        for (let q of questions) {
            const dapAnRes = await pool.query(
                "SELECT \"NoiDung\", \"LaDapAnDung\" FROM \"DapAn\" WHERE \"CauHoiId\" = $1",
                [q.id]
            );
            if (q.type === 'Trắc nghiệm') {
                q.options = dapAnRes.rows.map(d => d.NoiDung);
                const correct = dapAnRes.rows.find(d => d.LaDapAnDung);
                if (correct) q.correctAnswer = correct.NoiDung;
            } else if (q.type === 'Tự luận' || q.type === 'Điền khuyết') {
                 if (dapAnRes.rows.length > 0) {
                     if (q.type === 'Tự luận') q.answer = dapAnRes.rows[0].NoiDung;
                     else q.blanks = dapAnRes.rows.map(d => d.NoiDung);
                 }
            }
        }
        res.json({ success: true, data: questions });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Lỗi khi lấy danh sách câu hỏi", error: err.message });
    }
};

exports.updateQuestion = async (req, res) => {
    const client = await pool.connect();
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const { question, type, options, answer, blanks } = req.body;

        const checkRes = await pool.query(
            "SELECT * FROM \"CauHoi\" WHERE \"CauHoiId\" = $1 AND \"NguoiTaoId\" = $2",
            [id, userId]
        );
        if (checkRes.rows.length === 0 && req.user.roleId !== 1) {
            return res.status(403).json({ message: "Không có quyền cập nhật câu hỏi này." });
        }

        let typeId = 1;
        if (type === 'Tự luận') typeId = 2;
        if (type === 'Điền khuyết') typeId = 3;

        await client.query('BEGIN');
        await client.query(
            "UPDATE \"CauHoi\" SET \"NoiDung\" = $1, \"LoaiId\" = $2 WHERE \"CauHoiId\" = $3",
            [question, typeId, id]
        );
        await client.query("DELETE FROM \"DapAn\" WHERE \"CauHoiId\" = $1", [id]);

        const normalizedCorrect = answer ? answer.replace(/^[A-H]\. /, '') : '';
        if (type === 'Trắc nghiệm' && options) {
            for (const option of options) {
                const normalizedOption = option.replace(/^[A-H]\. /, '');
                await client.query(
                    'INSERT INTO "DapAn" ("NoiDung", "CauHoiId", "LaDapAnDung") VALUES ($1, $2, $3)',
                    [normalizedOption, id, normalizedOption === normalizedCorrect]
                );
            }
        } else if (type === 'Tự luận' && answer) {
            await client.query(
                'INSERT INTO "DapAn" ("NoiDung", "CauHoiId", "LaDapAnDung") VALUES ($1, $2, $3)',
                [answer, id, true]
            );
        } else if (type === 'Điền khuyết' && blanks && blanks.length > 0) {
            for (const blank of blanks) {
                await client.query(
                    'INSERT INTO "DapAn" ("NoiDung", "CauHoiId", "LaDapAnDung") VALUES ($1, $2, $3)',
                    [blank, id, true]
                );
            }
        }
        await client.query('COMMIT');
        res.json({ success: true, message: "Đã cập nhật câu hỏi thành công." });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Lỗi khi update câu hỏi:", err);
        res.status(500).json({ message: "Lỗi kết nối CSDL", error: err.message });
    } finally {
        client.release();
    }
}

exports.deleteQuestion = async (req, res) => {
    const client = await pool.connect();
    try {
        const { id } = req.params;
        const userId = req.user.id;
        
        const checkRes = await pool.query(
            "SELECT * FROM \"CauHoi\" WHERE \"CauHoiId\" = $1 AND \"NguoiTaoId\" = $2",
            [id, userId]
        );
        if (checkRes.rows.length === 0 && req.user.roleId !== 1) {
            return res.status(403).json({ message: "Không có quyền xóa câu hỏi này." });
        }

        const checkBaiThi = await pool.query(
            "SELECT \"ChiTietBaiThiId\" FROM \"ChiTietBaiThi\" WHERE \"CauHoiId\" = $1 LIMIT 1",
            [id]
        );
        if (checkBaiThi.rows.length > 0) {
            return res.status(400).json({ message: "Không thể xóa câu hỏi đã có sinh viên làm bài." });
        }

        await client.query('BEGIN');
        await client.query("DELETE FROM \"ChiTietDeThi\" WHERE \"CauHoiId\" = $1", [id]);
        await client.query("DELETE FROM \"DapAn\" WHERE \"CauHoiId\" = $1", [id]);
        await client.query("DELETE FROM \"CauHoi\" WHERE \"CauHoiId\" = $1", [id]);
        await client.query('COMMIT');
        res.json({ success: true, message: "Đã xóa câu hỏi thành công." });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Lỗi khi xóa câu hỏi:", err);
        res.status(500).json({ message: "Lỗi kết nối", error: err.message });
    } finally {
        client.release();
    }
}