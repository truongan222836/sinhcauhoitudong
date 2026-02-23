const { sql, config } = require("../config/db");

// Hàm tạo mã đề thi ngẫu nhiên
const generateQuizCode = (length = 6) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};

exports.createQuizFromGenerated = async (req, res) => {
    const { title, questions } = req.body;
    let transaction;
    try {
        const createdBy = req.user.id; // Lấy từ middleware 'protect'
        const pool = await sql.connect(config);
        transaction = new sql.Transaction();
        await transaction.begin();

        // 1. Tạo một DeThi mới
        const quizCode = generateQuizCode();
        const quizResult = await new sql.Request(transaction)
            .input('Title', sql.NVarChar, title)
            .input('QuizCode', sql.VarChar, quizCode)
            .input('CreatedBy', sql.Int, createdBy)
            .query(`INSERT INTO DeThi (TieuDe, MaDeThi, NguoiTaoId) 
                    OUTPUT INSERTED.DeThiId 
                    VALUES (@Title, @QuizCode, @CreatedBy)`);
        
        const quizId = quizResult.recordset[0].DeThiId;

        // 2. Lặp qua từng câu hỏi và lưu vào DB
        for (const q of questions) {
            let typeId = 1; // Mặc định là Trắc nghiệm
            if (q.type === 'Tự luận') typeId = 2;
            if (q.type === 'Điền khuyết') typeId = 3;

            // Lưu câu hỏi vào bảng CauHoi
            // 🔥 FIX: Tạo request mới trong mỗi vòng lặp để tránh lỗi trùng tham số
            const questionRequest = new sql.Request(transaction);
            const questionResult = await questionRequest
                .input('Content', sql.NVarChar, q.question)
                .input('TypeId', sql.Int, typeId)
                .input('CreatedBy_Q', sql.Int, createdBy)
                .query(`INSERT INTO CauHoi (NoiDung, LoaiId, NguoiTaoId) 
                        OUTPUT INSERTED.CauHoiId 
                        VALUES (@Content, @TypeId, @CreatedBy_Q)`);
            
            const questionId = questionResult.recordset[0].CauHoiId;

            // Liên kết câu hỏi với đề thi
            await new sql.Request(transaction)
                .input('QuizId_Link', sql.Int, quizId)
                .input('QuestionId_Link', sql.Int, questionId)
                .query('INSERT INTO DeThi_CauHoi (DeThiId, CauHoiId) VALUES (@QuizId_Link, @QuestionId_Link)');

            // Lưu các đáp án nếu là câu trắc nghiệm
            if (q.type === 'Trắc nghiệm' && q.options) {
                for (const option of q.options) {
                    await new sql.Request(transaction)
                        .input('AnswerContent', sql.NVarChar, option)
                        .input('QuestionId_Ans', sql.Int, questionId)
                        .input('IsCorrect', sql.Bit, option === q.correctAnswer ? 1 : 0)
                        .query('INSERT INTO DapAn (NoiDung, CauHoiId, LaDapAnDung) VALUES (@AnswerContent, @QuestionId_Ans, @IsCorrect)');
                }
            }
        }
        
        await transaction.commit();
        res.status(201).json({ success: true, message: "Đã tạo đề thi thành công!", quizCode: quizCode });
    } catch (err) {
        if (transaction && !transaction.rolledBack) {
            await transaction.rollback();
        }
        console.error("Lỗi khi tạo đề thi:", err);
        res.status(500).json({ message: "Lỗi server khi tạo đề thi", error: err.message });
    }
};

exports.getQuizzesByLecturer = async (req, res) => {
    try {
        const lecturerId = req.user.id; // 🔥 FIX: Di chuyển vào trong try...catch
        const pool = await sql.connect(config);
        const request = pool.request();
        const result = await request
            .input('LecturerId', sql.Int, lecturerId)
            .query(`SELECT DeThiId, TieuDe, MaDeThi, NgayTao, DaXuatBan 
                    FROM DeThi 
                    WHERE NguoiTaoId = @LecturerId ORDER BY NgayTao DESC`);
        res.json({ success: true, data: result.recordset });
    } catch (err) {
        console.error("Lỗi khi lấy danh sách đề thi:", err);
        res.status(500).json({ message: "Lỗi server khi lấy danh sách đề thi", error: err.message });
    }
};