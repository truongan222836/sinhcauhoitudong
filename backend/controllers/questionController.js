const { sql, config } = require("../config/db");
const { generateQuestions: generateAIQuestions } = require("../services/aiService");
const { v4: uuidv4 } = require('uuid');

const generateJobs = new Map();

exports.generateQuestions = async (req, res) => {
    try {
        const { text, type, quantity, difficulty } = req.body;
        console.log('Request body:', req.body);

        if (!text || !text.trim()) {
            return res.status(400).json({ message: "Vui lòng cung cấp văn bản để sinh câu hỏi." });
        }

        if (!['Trắc nghiệm', 'Tự luận', 'Điền khuyết'].includes(type)) {
            console.log('Invalid type:', type);
            return res.status(400).json({ message: "Loại câu hỏi không hợp lệ." });
        }

        if (quantity < 1 || quantity > 100) {
            return res.status(400).json({ message: "Số lượng câu hỏi phải từ 1 đến 100." });
        }

        // mở rộng giới hạn văn bản đầu vào
        let processedText = text;
        const MAX_CHARS = 15000;
        let warning = null;
        if (text.length > MAX_CHARS) {
            processedText = text.slice(0, MAX_CHARS);
            warning = `Văn bản quá dài (${text.length} ký tự); đã cắt bớt còn ${MAX_CHARS} ký tự để tối ưu xử lý.`;
            console.warn('[generateQuestions] ' + warning);
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
        // Tự dọn dẹp job sau 5 phút để tránh rò rỉ bộ nhớ
        setTimeout(() => generateJobs.delete(jobId), 5 * 60 * 1000);
    }
};


exports.regenerateQuestion = async (req, res) => {
    try {
        const { text, type, difficulty } = req.body;

        if (!text || !text.trim()) {
            return res.status(400).json({ message: "Vui lòng cung cấp văn bản để sinh lại câu hỏi." });
        }

        if (!['Trắc nghiệm', 'Tự luận', 'Điền khuyết'].includes(type)) {
            return res.status(400).json({ message: "Loại câu hỏi không hợp lệ." });
        }

        // sinh một câu hỏi mới
        const questions = await generateAIQuestions(text, type, 1, difficulty);
        if (!questions || questions.length === 0) {
            throw new Error('Không tạo được câu hỏi mới');
        }

        // trả về câu đầu tiên
        res.json({ success: true, data: questions[0] });
    } catch (err) {
        console.error('Lỗi trong regenerateQuestion:', err);
        res.status(500).json({ message: "Lỗi khi tạo lại câu hỏi", error: err.message });
    }
};


exports.saveQuestions = async (req, res) => {
    let transaction;
    try {
        const { questions } = req.body;
        const userId = req.user.id;
        
        if (!questions || !Array.isArray(questions)) {
             return res.status(400).json({message: "Danh sách câu hỏi không hợp lệ."});
        }

        const pool = await sql.connect(config);
        transaction = new sql.Transaction(pool);
        await transaction.begin();

        for (const q of questions) {
            let typeId = 1;
            if (q.type === 'Tự luận') typeId = 2;
            if (q.type === 'Điền khuyết') typeId = 3;

            const questionRequest = new sql.Request(transaction);
            const questionResult = await questionRequest
                .input('Content', sql.NVarChar, q.question)
                .input('TypeId', sql.Int, typeId)
                .input('CreatedBy_Q', sql.Int, userId)
                .query(`INSERT INTO CauHoi (NoiDung, LoaiId, LoaiCauHoiId, NguoiTaoId) 
                        OUTPUT INSERTED.CauHoiId 
                        VALUES (@Content, @TypeId, @TypeId, @CreatedBy_Q)`);

            const questionId = questionResult.recordset[0].CauHoiId;

            const normalizedCorrect = q.correctAnswer ? q.correctAnswer.replace(/^[A-H]\. /, '') : '';
            if (q.type === 'Trắc nghiệm' && q.options) {
                for (const option of q.options) {
                    const normalizedOption = option.replace(/^[A-H]\. /, '');
                    await new sql.Request(transaction)
                        .input('AnswerContent', sql.NVarChar, normalizedOption)
                        .input('QuestionId_Ans', sql.Int, questionId)
                        .input('IsCorrect', sql.Bit, normalizedOption === normalizedCorrect ? 1 : 0)
                        .query('INSERT INTO DapAn (NoiDung, CauHoiId, LaDapAnDung) VALUES (@AnswerContent, @QuestionId_Ans, @IsCorrect)');
                }
            } else if (q.type === 'Tự luận' && q.answer) {
                 await new sql.Request(transaction)
                        .input('AnswerContent', sql.NVarChar, q.answer)
                        .input('QuestionId_Ans', sql.Int, questionId)
                        .input('IsCorrect', sql.Bit, 1)
                        .query('INSERT INTO DapAn (NoiDung, CauHoiId, LaDapAnDung) VALUES (@AnswerContent, @QuestionId_Ans, @IsCorrect)');
            } else if (q.type === 'Điền khuyết' && q.blanks) {
                 for (const blank of q.blanks) {
                      await new sql.Request(transaction)
                        .input('AnswerContent', sql.NVarChar, blank)
                        .input('QuestionId_Ans', sql.Int, questionId)
                        .input('IsCorrect', sql.Bit, 1)
                        .query('INSERT INTO DapAn (NoiDung, CauHoiId, LaDapAnDung) VALUES (@AnswerContent, @QuestionId_Ans, @IsCorrect)');
                 }
            }
        }
        await transaction.commit();
        res.json({ success: true, message: "Đã lưu bộ câu hỏi thành công!" });
    } catch (err) {
        if (transaction && !transaction.rolledBack) await transaction.rollback();
        console.error("Lỗi khi lưu câu hỏi:", err);
        res.status(500).json({ message: "Lỗi khi lưu", error: err.message });
    }
};

exports.getAllQuestions = async (req, res) => {
    try {
        const pool = await sql.connect(config);
        const result = await pool.request().query(`
            SELECT 
                q.CauHoiId as id,
                q.NoiDung as question,
                l.TenLoai as type,
                q.NguoiTaoId,
                q.NgayTao as createdAt
            FROM CauHoi q
            JOIN LoaiCauHoi l ON q.LoaiId = l.LoaiId
            ORDER BY q.NgayTao DESC
        `);
        
        const questions = result.recordset;

        for (let q of questions) {
            const dapAnResult = await pool.request()
                .input("QId", sql.Int, q.id)
                .query("SELECT NoiDung, LaDapAnDung FROM DapAn WHERE CauHoiId = @QId");
            
            if (q.type === 'Trắc nghiệm') {
                q.options = dapAnResult.recordset.map(d => d.NoiDung);
                const correct = dapAnResult.recordset.find(d => d.LaDapAnDung);
                if (correct) q.correctAnswer = correct.NoiDung;
            } else if (q.type === 'Tự luận' || q.type === 'Điền khuyết') {
                 if (dapAnResult.recordset.length > 0) {
                     if (q.type === 'Tự luận') {
                         q.answer = dapAnResult.recordset[0].NoiDung;
                     } else {
                         q.blanks = dapAnResult.recordset.map(d => d.NoiDung);
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

        const pool = await sql.connect(config);
        const request = pool.request();
        const result = await request
            .input("NguoiTaoId", sql.Int, userId)
            .query(`
                SELECT 
                    q.CauHoiId as id,
                    q.NoiDung as question,
                    l.TenLoai as type,
                    q.NgayTao as createdAt,
                    (
                        SELECT STRING_AGG(dt.MaDeThi, ', ') 
                        FROM ChiTietDeThi ct 
                        JOIN DeThi dt ON ct.DeThiId = dt.DeThiId 
                        WHERE ct.CauHoiId = q.CauHoiId
                    ) as maDeThi
                FROM CauHoi q
                JOIN LoaiCauHoi l ON q.LoaiId = l.LoaiId
                WHERE q.NguoiTaoId = @NguoiTaoId
                ORDER BY q.NgayTao DESC
            `);
        
        const questions = result.recordset;

        for (let q of questions) {
            const dapAnResult = await pool.request()
                .input("QId", sql.Int, q.id)
                .query("SELECT NoiDung, LaDapAnDung FROM DapAn WHERE CauHoiId = @QId");
            
            if (q.type === 'Trắc nghiệm') {
                q.options = dapAnResult.recordset.map(d => d.NoiDung);
                const correct = dapAnResult.recordset.find(d => d.LaDapAnDung);
                if (correct) q.correctAnswer = correct.NoiDung;
            } else if (q.type === 'Tự luận' || q.type === 'Điền khuyết') {
                 if (dapAnResult.recordset.length > 0) {
                     if (q.type === 'Tự luận') {
                         q.answer = dapAnResult.recordset[0].NoiDung;
                     } else {
                         q.blanks = dapAnResult.recordset.map(d => d.NoiDung);
                     }
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
    let transaction;
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const { question, type, options, answer, blanks } = req.body;

        const pool = await sql.connect(config);

        const check = await pool.request().input("Id", sql.Int, id).input("UserId", sql.Int, userId).query("SELECT * FROM CauHoi WHERE CauHoiId = @Id AND NguoiTaoId = @UserId");
        if (check.recordset.length === 0) {
            if (req.user.roleId !== 1) {
                return res.status(403).json({ message: "Không có quyền cập nhật câu hỏi này." });
            }
        }

        let typeId = 1;
        if (type === 'Tự luận') typeId = 2;
        if (type === 'Điền khuyết') typeId = 3;

        transaction = new sql.Transaction(pool);
        await transaction.begin();

        await new sql.Request(transaction)
            .input("Content", sql.NVarChar, question)
            .input("TypeId", sql.Int, typeId)
            .input("Id", sql.Int, id)
            .query("UPDATE CauHoi SET NoiDung = @Content, LoaiId = @TypeId WHERE CauHoiId = @Id");

        await new sql.Request(transaction)
            .input("Id", sql.Int, id)
            .query("DELETE FROM DapAn WHERE CauHoiId = @Id");

        const normalizedCorrect = answer ? answer.replace(/^[A-H]\. /, '') : '';
        if (type === 'Trắc nghiệm' && options) {
            for (const option of options) {
                const normalizedOption = option.replace(/^[A-H]\. /, '');
                await new sql.Request(transaction)
                    .input('AnswerContent', sql.NVarChar, normalizedOption)
                    .input('QuestionId', sql.Int, id)
                    .input('IsCorrect', sql.Bit, normalizedOption === normalizedCorrect ? 1 : 0)
                    .query('INSERT INTO DapAn (NoiDung, CauHoiId, LaDapAnDung) VALUES (@AnswerContent, @QuestionId, @IsCorrect)');
            }
        } else if (type === 'Tự luận' && answer) {
            await new sql.Request(transaction)
                    .input('AnswerContent', sql.NVarChar, answer)
                    .input('QuestionId', sql.Int, id)
                    .input('IsCorrect', sql.Bit, 1)
                    .query('INSERT INTO DapAn (NoiDung, CauHoiId, LaDapAnDung) VALUES (@AnswerContent, @QuestionId, @IsCorrect)');
        } else if (type === 'Điền khuyết' && blanks && blanks.length > 0) {
            for (const blank of blanks) {
                await new sql.Request(transaction)
                    .input('AnswerContent', sql.NVarChar, blank)
                    .input('QuestionId', sql.Int, id)
                    .input('IsCorrect', sql.Bit, 1)
                    .query('INSERT INTO DapAn (NoiDung, CauHoiId, LaDapAnDung) VALUES (@AnswerContent, @QuestionId, @IsCorrect)');
            }
        }

        await transaction.commit();
        res.json({ success: true, message: "Đã cập nhật câu hỏi thành công." });
    } catch (err) {
        if (transaction && !transaction.rolledBack) await transaction.rollback();
        console.error("Lỗi khi update câu hỏi:", err);
        res.status(500).json({ message: "Lỗi kết nối CSDL", error: err.message });
    }
}

exports.deleteQuestion = async (req, res) => {
    let transaction;
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const pool = await sql.connect(config);
        
        const checkRequest = pool.request()
            .input("Id", sql.Int, id)
            .input("UserId", sql.Int, userId);
        const checkResult = await checkRequest.query("SELECT * FROM CauHoi WHERE CauHoiId = @Id AND NguoiTaoId = @UserId");
        if (checkResult.recordset.length === 0) {
            if (req.user.roleId !== 1) {
                return res.status(403).json({ message: "Không có quyền xóa câu hỏi này." });
            }
        }

        // Kiem tra thu Cau Hoi co nam trong bai thi da nop
        const checkBaiThi = await pool.request()
            .input("QId", sql.Int, id)
            .query("SELECT TOP 1 * FROM ChiTietBaiThi WHERE CauHoiId = @QId");
        if (checkBaiThi.recordset.length > 0) {
            return res.status(400).json({ message: "Không thể xóa câu hỏi đã có sinh viên làm bài." });
        }

        transaction = new sql.Transaction(pool);
        await transaction.begin();

        await new sql.Request(transaction)
            .input("QId", sql.Int, id)
            .query("DELETE FROM ChiTietDeThi WHERE CauHoiId = @QId");

        await new sql.Request(transaction)
            .input("QId", sql.Int, id)
            .query("DELETE FROM DapAn WHERE CauHoiId = @QId");

        await new sql.Request(transaction)
            .input("QId", sql.Int, id)
            .query("DELETE FROM CauHoi WHERE CauHoiId = @QId");

        await transaction.commit();
        res.json({ success: true, message: "Đã xóa câu hỏi thành công." });
    } catch (err) {
        if (transaction && !transaction.rolledBack) await transaction.rollback();
        console.error("Lỗi khi xóa câu hỏi:", err);
        res.status(500).json({ message: "Lỗi kết nối", error: err.message });
    }
}