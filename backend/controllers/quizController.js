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

exports.startExam = async (req, res) => {
    const { examId, studentName, studentClass, studentId } = req.body;
    const userId = req.user.id;
    try {
        const pool = await sql.connect(config);
        
        // 1. Check for existing 'Doing' attempt for this student info and exam
        const existing = await pool.request()
            .input('ExId', sql.Int, examId)
            .input('MS', sql.VarChar, studentId)
            .query(`
                SELECT b.BaiThiId, b.NgayBatDau, d.ThoiGianLamBai, 
                DATEDIFF(SECOND, b.NgayBatDau, GETDATE()) as ElapsedSeconds
                FROM BaiThi b
                JOIN DeThi d ON b.DeThiId = d.DeThiId
                WHERE b.DeThiId = @ExId AND b.MSSV = @MS AND b.TrangThai = N'Đang làm'
            `);

        if (existing.recordset.length > 0) {
            const attempt = existing.recordset[0];
            const elapsedSeconds = attempt.ElapsedSeconds || 0;

            if (elapsedSeconds < attempt.ThoiGianLamBai * 60) {
                // Fetch saved answers for this attempt
                const savedAnswers = await pool.request()
                    .input('BTId', sql.Int, attempt.BaiThiId)
                    .query("SELECT CauHoiId, CauTraLoi FROM ChiTietBaiThi WHERE BaiThiId = @BTId");

                return res.json({ 
                    success: true, 
                    attemptId: attempt.BaiThiId, 
                    resumed: true,
                    savedAnswers: savedAnswers.recordset,
                    elapsedSeconds: elapsedSeconds
                });
            }
        }

        // 2. Fetch Exam info to check deadline
        const examInfoRes = await pool.request()
            .input('ExId', sql.Int, examId)
            .query("SELECT HanNop FROM DeThi WHERE DeThiId = @ExId");

        if (examInfoRes.recordset.length > 0) {
            const hanNop = examInfoRes.recordset[0].HanNop;
            if (hanNop && new Date() > new Date(hanNop)) {
                // Check if there is an extension
                const extRes = await pool.request()
                    .input('ExId', sql.Int, examId)
                    .input('MS', sql.VarChar, studentId)
                    .query("SELECT HanNopMoi FROM GiaHanBaiThi WHERE DeThiId = @ExId AND MSSV = @MS");

                if (extRes.recordset.length === 0 || new Date() > new Date(extRes.recordset[0].HanNopMoi)) {
                    return res.status(403).json({ success: false, message: "Bài kiểm tra đã quá hạn nộp." });
                }
            }
        }

        // 3. No valid resume, create new
        const result = await pool.request()
            .input('DeThiId', sql.Int, examId)
            .input('NguoiDungId', sql.Int, userId)
            .input('HoTen', sql.NVarChar, studentName)
            .input('Lop', sql.NVarChar, studentClass)
            .input('MSSV', sql.VarChar, studentId)
            .query(`INSERT INTO BaiThi (DeThiId, NguoiDungId, NgayBatDau, TrangThai, HoTen, Lop, MSSV) 
                    OUTPUT INSERTED.BaiThiId 
                    VALUES (@DeThiId, @NguoiDungId, GETDATE(), N'Đang làm', @HoTen, @Lop, @MSSV)`);

        const baiThiId = result.recordset[0].BaiThiId;
        res.json({ success: true, attemptId: baiThiId, resumed: false });
    } catch (err) {
        console.error("Lỗi khi bắt đầu bài thi:", err);
        res.status(500).json({ success: false, message: "Lỗi server khi bắt đầu bài thi", error: err.message });
    }
};

exports.saveAnswer = async (req, res) => {
    const { attemptId, questionId, selectedAnswer } = req.body;
    try {
        const pool = await sql.connect(config);
        
        // Convert array/object answer to string for DB
        const answerText = typeof selectedAnswer === 'object' ? JSON.stringify(selectedAnswer) : String(selectedAnswer);

        // Check if record exists
        const check = await pool.request()
            .input('BTId', sql.Int, attemptId)
            .input('QId', sql.Int, questionId)
            .query("SELECT ChiTietBaiThiId FROM ChiTietBaiThi WHERE BaiThiId = @BTId AND CauHoiId = @QId");

        if (check.recordset.length > 0) {
            // Update
            await pool.request()
                .input('BTId', sql.Int, attemptId)
                .input('QId', sql.Int, questionId)
                .input('Txt', sql.NVarChar, answerText)
                .query("UPDATE ChiTietBaiThi SET CauTraLoi = @Txt WHERE BaiThiId = @BTId AND CauHoiId = @QId");
        } else {
            // Insert
            await pool.request()
                .input('BTId', sql.Int, attemptId)
                .input('QId', sql.Int, questionId)
                .input('Txt', sql.NVarChar, answerText)
                .query("INSERT INTO ChiTietBaiThi (BaiThiId, CauHoiId, CauTraLoi) VALUES (@BTId, @QId, @Txt)");
        }

        res.json({ success: true });
    } catch (err) {
        console.error("Lỗi khi lưu câu trả lời:", err);
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.createQuizFromGenerated = async (req, res) => {
    const { title, questions, duration, topicId, deadline } = req.body;
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
            .input('MaDeThi', sql.VarChar, quizCode)
            .input('CreatedBy', sql.Int, createdBy)
            .input('Duration', sql.Int, duration || 60)
            .input('TopicId', sql.Int, topicId || null)
            .input('Deadline', sql.DateTime, deadline ? new Date(deadline) : null)
            .query(`INSERT INTO DeThi (TieuDe, MaDeThi, NguoiTaoId, ThoiGianLamBai, ChuDeId, HanNop) 
                    OUTPUT INSERTED.DeThiId 
                    VALUES (@Title, @MaDeThi, @CreatedBy, @Duration, @TopicId, @Deadline)`);

        const quizId = quizResult.recordset[0].DeThiId;

        // 2. Lặp qua từng câu hỏi và lưu vào DB
        let order = 1;
        for (const q of questions) {

            let typeId = 1; // Mặc định là Trắc nghiệm
            if (q.type === 'Tự luận') typeId = 2;
            if (q.type === 'Điền khuyết') typeId = 3;

            // Lưu câu hỏi vào bảng CauHoi
            // 🔥 FIX: Tạo request mới trong mỗi vòng lặp để tránh lỗi trùng tham số
            // Lưu câu hỏi vào bảng CauHoi
            const questionRequest = new sql.Request(transaction);
            const questionResult = await questionRequest
                .input('Content', sql.NVarChar, q.question)
                .input('TypeId', sql.Int, typeId)
                .input('CreatedBy_Q', sql.Int, createdBy)
                .input('TopicId_Q', sql.Int, topicId || null)
                .query(`INSERT INTO CauHoi (NoiDung, LoaiId, LoaiCauHoiId, NguoiTaoId, ChuDeId) 
                        OUTPUT INSERTED.CauHoiId 
                        VALUES (@Content, @TypeId, @TypeId, @CreatedBy_Q, @TopicId_Q)`);

            const questionId = questionResult.recordset[0].CauHoiId;

            // Liên kết câu hỏi với đề thi
            await new sql.Request(transaction)
                .input('QuizId_Link', sql.Int, quizId)
                .input('QuestionId_Link', sql.Int, questionId)
                .input('ThuTu', sql.Int, order++)
                .query('INSERT INTO ChiTietDeThi (DeThiId, CauHoiId, ThuTu) VALUES (@QuizId_Link, @QuestionId_Link, @ThuTu)');


            // Lưu các đáp án theo loại
            if (q.type === 'Trắc nghiệm' && q.options) {
                // Chuẩn hóa câu trả lời đúng (bỏ A. B. C. D. nếu có)
                const normalizedCorrect = q.correctAnswer ? q.correctAnswer.replace(/^[A-H]\. /, '') : '';

                for (const option of q.options) {
                    // Chuẩn hóa nội dung đáp án (bỏ A. B. C. D. nếu có)
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
            } else if (q.type === 'Điền khuyết' && q.blanks && q.blanks.length > 0) {
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
        const lecturerId = req.user.id;
        const limit = req.query.limit ? parseInt(req.query.limit) : 1000;
        const pool = await sql.connect(config);
        const result = await pool.request()
            .input('LecturerId', sql.Int, lecturerId)
            .query(`SELECT TOP ${limit} d.DeThiId, d.TieuDe, d.MaDeThi, d.NgayTao, d.DaXuatBan, d.ThoiGianLamBai, d.MoTa, d.HanNop,
                           (SELECT COUNT(*) FROM BaiThi b WHERE b.DeThiId = d.DeThiId) as usageCount,
                           ISNULL((SELECT AVG(Diem) FROM BaiThi b WHERE b.DeThiId = d.DeThiId AND b.TrangThai = N'Đã nộp'), 0) as averageRating
                    FROM DeThi d 
                    WHERE d.NguoiTaoId = @LecturerId ORDER BY d.NgayTao DESC`);
        res.json({ success: true, data: result.recordset });

    } catch (err) {
        console.error("Lỗi khi lấy danh sách đề thi:", err);
        res.status(500).json({ message: "Lỗi server khi lấy danh sách đề thi", error: err.message });
    }
};

exports.getAvailableQuizzes = async (req, res) => {
    try {
        const limit = req.query.limit ? parseInt(req.query.limit) : 1000;
        const pool = await sql.connect(config);
        const request = pool.request();
        const result = await request
            .query(`SELECT TOP ${limit} d.DeThiId, d.TieuDe, d.MaDeThi, d.MoTa, d.ThoiGianLamBai, d.NgayTao, d.HanNop,
                           (SELECT COUNT(*) FROM BaiThi b WHERE b.DeThiId = d.DeThiId) as usageCount,
                           ISNULL((SELECT AVG(Diem) FROM BaiThi b WHERE b.DeThiId = d.DeThiId AND b.TrangThai = N'Đã nộp'), 0) as averageRating
                    FROM DeThi d 
                    WHERE d.DaXuatBan = 1 
                    ORDER BY d.NgayTao DESC`);

        res.json({ success: true, data: result.recordset });
    } catch (err) {
        console.error("Lỗi khi lấy danh sách đề thi có sẵn:", err);
        res.status(500).json({ message: "Lỗi server khi lấy danh sách đề thi có sẵn", error: err.message });
    }
};

exports.publishQuiz = async (req, res) => {
    try {
        const { quizId } = req.params;
        const lecturerId = req.user.id;

        const pool = await sql.connect(config);
        const request = pool.request();

        // Kiểm tra quyền sở hữu đề thi
        const ownershipCheck = await request
            .input('QuizId', sql.Int, quizId)
            .input('LecturerId', sql.Int, lecturerId)
            .query('SELECT DeThiId FROM DeThi WHERE DeThiId = @QuizId AND NguoiTaoId = @LecturerId');

        if (ownershipCheck.recordset.length === 0) {
            return res.status(403).json({ message: "Bạn không có quyền xuất bản đề thi này" });
        }

        // Xuất bản đề thi
        await request
            .input('QuizId_Update', sql.Int, quizId)
            .query('UPDATE DeThi SET DaXuatBan = 1 WHERE DeThiId = @QuizId_Update');

        res.json({ success: true, message: "Đã xuất bản đề thi thành công!" });
    } catch (err) {
        console.error("Lỗi khi xuất bản đề thi:", err);
        res.status(500).json({ message: "Lỗi server khi xuất bản đề thi", error: err.message });
    }
};

exports.getQuizByCode = async (req, res) => {
    try {
        const { code } = req.params;
        const pool = await sql.connect(config);
        const request = pool.request();
        const result = await request
            .input('Code', sql.VarChar, code)
            .query('SELECT DeThiId, TieuDe, DaXuatBan FROM DeThi WHERE MaDeThi = @Code');


        if (result.recordset.length === 0) {
            return res.status(404).json({ success: false, message: "Không tìm thấy đề thi với mã này" });
        }

        res.json({ success: true, data: result.recordset[0] });
    } catch (err) {
        console.error("Lỗi khi lấy thông tin đề thi:", err);
        res.status(500).json({ message: "Lỗi server khi lấy thông tin đề thi", error: err.message });
    }
};

exports.getQuizById = async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await sql.connect(config);

        // 1. Lấy thông tin đề thi
        const quizResult = await pool.request()
            .input('Id', sql.Int, id)
            .query(`SELECT DeThiId, TieuDe, MoTa, ThoiGianLamBai as ThoiGianLamBai
                    FROM DeThi 
                    WHERE DeThiId = @Id`);

        if (quizResult.recordset.length === 0) {
            return res.status(404).json({ success: false, message: "Không tìm thấy đề thi" });
        }

        const quiz = quizResult.recordset[0];

        // 2. Lấy danh sách câu hỏi
        const questionsResult = await pool.request()
            .input('Id', sql.Int, id)
            .query(`
                SELECT q.CauHoiId as id, q.NoiDung as question, l.TenLoai as type
                FROM CauHoi q
                JOIN ChiTietDeThi c ON q.CauHoiId = c.CauHoiId
                JOIN LoaiCauHoi l ON q.LoaiId = l.LoaiId
                WHERE c.DeThiId = @Id
                ORDER BY c.ThuTu
            `);

        const questions = questionsResult.recordset;

        // 3. Lấy đáp án cho mỗi câu hỏi
        for (let q of questions) {
            if (q.type === 'Trắc nghiệm') {
                const answersResult = await pool.request()
                    .input('QId', sql.Int, q.id)
                    .query('SELECT NoiDung FROM DapAn WHERE CauHoiId = @QId');

                // Loại bỏ tiền tố "A. ", "B. ", ... nếu có
                q.options = answersResult.recordset.map(r => {
                    let text = r.NoiDung;
                    if (text.match(/^[A-D]\. /)) {
                        return text.substring(3);
                    }
                    return text;
                });
            } else if (q.type === 'Điền khuyết') {
                const answersResult = await pool.request()
                    .input('QId', sql.Int, q.id)
                    .query('SELECT NoiDung FROM DapAn WHERE CauHoiId = @QId');

                // Danh sách các từ cần điền
                q.blanks = answersResult.recordset.map(r => r.NoiDung);
            }
        }

        quiz.questions = questions;
        res.json({ success: true, data: quiz });
    } catch (err) {
        console.error("Lỗi khi lấy chi tiết đề thi:", err);
        res.status(500).json({ message: "Lỗi server", error: err.message });
    }
};

exports.submitQuiz = async (req, res) => {
    const { id: quizId } = req.params;
    const { answers, attemptId } = req.body;
    const userId = req.user.id;
    let transaction;

    try {
        const pool = await sql.connect(config);
        transaction = new sql.Transaction();
        await transaction.begin();

        let baiThiId = attemptId;

        if (baiThiId) {
            // Update existing attempt
            await new sql.Request(transaction)
                .input('BTId', sql.Int, baiThiId)
                .query(`UPDATE BaiThi SET NgayNop = GETDATE(), TrangThai = N'Đã nộp' WHERE BaiThiId = @BTId`);
            
            // If answers provided in body, merge/update them in DB
            if (answers && Object.keys(answers).length > 0) {
                for (const qId in answers) {
                    const ans = answers[qId];
                    const answerText = typeof ans === 'object' ? JSON.stringify(ans) : String(ans);
                    await new sql.Request(transaction)
                        .input('BTId', sql.Int, baiThiId)
                        .input('QId', sql.Int, qId)
                        .input('Txt', sql.NVarChar, answerText)
                        .query(`
                            IF EXISTS (SELECT 1 FROM ChiTietBaiThi WHERE BaiThiId = @BTId AND CauHoiId = @QId)
                                UPDATE ChiTietBaiThi SET CauTraLoi = @Txt WHERE BaiThiId = @BTId AND CauHoiId = @QId
                            ELSE
                                INSERT INTO ChiTietBaiThi (BaiThiId, CauHoiId, CauTraLoi) VALUES (@BTId, @QId, @Txt)
                        `);
                }
            }
        } else {
            // 1. Tạo bản ghi Bài Thi mới (hành vi cũ nếu không có attemptId)
            const baiThiResult = await new sql.Request(transaction)
                .input('QuizId', sql.Int, quizId)
                .input('UserId', sql.Int, userId)
                .query(`INSERT INTO BaiThi (DeThiId, NguoiDungId, NgayNop, TrangThai) 
                        OUTPUT INSERTED.BaiThiId 
                        VALUES (@QuizId, @UserId, GETDATE(), N'Đã nộp')`);

            baiThiId = baiThiResult.recordset[0].BaiThiId;
        }

        // 2. Lấy đáp án đúng và câu trả lời đã lưu để chấm điểm
        const savedAnswersRes = await new sql.Request(transaction)
            .input('BTId', sql.Int, baiThiId)
            .query('SELECT CauHoiId, CauTraLoi FROM ChiTietBaiThi WHERE BaiThiId = @BTId');
        
        const dbAnswers = {};
        savedAnswersRes.recordset.forEach(row => {
            dbAnswers[row.CauHoiId] = row.CauTraLoi;
        });

        const questionsResult = await new sql.Request(transaction)
            .input('QuizId', sql.Int, quizId)
            .query(`
                SELECT q.CauHoiId, l.TenLoai
                FROM CauHoi q
                JOIN ChiTietDeThi c ON q.CauHoiId = c.CauHoiId
                JOIN LoaiCauHoi l ON q.LoaiId = l.LoaiId
                WHERE c.DeThiId = @QuizId
            `);

        const totalQuestions = questionsResult.recordset.length;
        let correctCount = 0;

        for (const q of questionsResult.recordset) {
            let userAnswer = dbAnswers[q.CauHoiId] || '';
            if (typeof userAnswer === 'string' && (userAnswer.startsWith('[') || userAnswer.startsWith('{'))) {
                try { userAnswer = JSON.parse(userAnswer); } catch(e) {}
            }

            let diem = 0;

            if (q.TenLoai === 'Trắc nghiệm') {
                const correctAnswerResult = await new sql.Request(transaction)
                    .input('QId', sql.Int, q.CauHoiId)
                    .query('SELECT NoiDung FROM DapAn WHERE CauHoiId = @QId AND LaDapAnDung = 1');

                const correctAnswerRaw = correctAnswerResult.recordset[0]?.NoiDung || '';
                const normalizedCorrect = correctAnswerRaw.replace(/^[A-D]\. /, '').trim().toLowerCase();
                const normalizedUser = (typeof userAnswer === 'string' ? userAnswer : '').replace(/^[A-D]\. /, '').trim().toLowerCase();

                if (normalizedUser === normalizedCorrect && normalizedUser !== '') {
                    diem = 1;
                    correctCount++;
                }
            } else if (q.TenLoai === 'Điền khuyết') {
                const correctAnswerResult = await new sql.Request(transaction)
                    .input('QId', sql.Int, q.CauHoiId)
                    .query('SELECT NoiDung FROM DapAn WHERE CauHoiId = @QId AND LaDapAnDung = 1');
                const blanks = correctAnswerResult.recordset.map(r => r.NoiDung.toLowerCase().trim());
                
                let userAnswersArray = [];
                if (Array.isArray(userAnswer)) {
                    userAnswersArray = userAnswer.map(a => (a || '').toLowerCase().trim());
                } else if (typeof userAnswer === 'string') {
                    userAnswersArray = userAnswer.split(',').map(a => a.toLowerCase().trim());
                }

                let correctBlanks = 0;
                for (let i = 0; i < blanks.length; i++) {
                    if (userAnswersArray[i] === blanks[i] && userAnswersArray[i]) correctBlanks++;
                }
                
                if (blanks.length > 0) {
                     diem = correctBlanks / blanks.length;
                     correctCount += diem;
                }
            } else if (q.TenLoai === 'Tự luận') {
                diem = (userAnswer && userAnswer.length > 20) ? 0.5 : 0;
                correctCount += diem;
            }

            await new sql.Request(transaction)
                .input('BTId', sql.Int, baiThiId)
                .input('QId', sql.Int, q.CauHoiId)
                .input('Diem', sql.Float, diem)
                .query('UPDATE ChiTietBaiThi SET Diem = @Diem WHERE BaiThiId = @BTId AND CauHoiId = @QId');
        }

        await new sql.Request(transaction)
            .input('Score', sql.Float, correctCount)
            .input('BTId', sql.Int, baiThiId)
            .query('UPDATE BaiThi SET Diem = @Score WHERE BaiThiId = @BTId');

        await transaction.commit();
        res.json({ success: true, score: correctCount, message: "Đã nộp bài thành công!" });

    } catch (err) {
        if (transaction && !transaction.rolledBack) await transaction.rollback();
        console.error("Lỗi khi nộp bài:", err);
        res.status(500).json({ message: "Lỗi khi nộp bài", error: err.message });
    }
};

exports.getRanking = async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await sql.connect(config);
        
        // Optimize: Use ROW_NUMBER() and take TOP 50 for performance
        const result = await pool.request()
            .input('Id', sql.Int, id)
            .query(`
                SELECT TOP 50
                    ROW_NUMBER() OVER (ORDER BY Diem DESC, NgayNop ASC) as [rank],
                    HoTen as studentName, 
                    Lop as studentClass, 
                    MSSV as studentId, 
                    Diem as score, 
                    NgayNop as completedAt
                FROM BaiThi
                WHERE DeThiId = @Id AND TrangThai = N'Đã nộp'
                ORDER BY Diem DESC, NgayNop ASC
            `);
        res.json({ success: true, data: result.recordset });
    } catch (err) {
        console.error("Lỗi getRanking:", err);
        res.status(500).json({ success: false, message: "Lỗi khi lấy bảng xếp hạng" });
    }
};

exports.getExamStats = async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await sql.connect(config);
        
        // Lấy thống kê tổng quan và phân bổ điểm
        const statsResult = await pool.request()
            .input('Id', sql.Int, id)
            .query(`
                SELECT 
                    COUNT(*) as totalAttempts,
                    ROUND(AVG(Diem), 2) as averageScore,
                    MAX(Diem) as highestScore,
                    MIN(Diem) as lowestScore,
                    STDEV(Diem) as standardDeviation
                FROM BaiThi
                WHERE DeThiId = @Id AND TrangThai = N'Đã nộp';

                -- Score distribution
                SELECT 
                    FLOOR(Diem) as scoreRange,
                    COUNT(*) as count
                FROM BaiThi
                WHERE DeThiId = @Id AND TrangThai = N'Đã nộp'
                GROUP BY FLOOR(Diem)
                ORDER BY scoreRange;
            `);

        const stats = statsResult.recordsets[0][0];
        const distribution = statsResult.recordsets[1];

        res.json({ 
            success: true, 
            data: { 
                ...stats, 
                scoreDistribution: distribution 
            } 
        });
    } catch (err) {
        console.error("Lỗi getExamStats:", err);
        res.status(500).json({ success: false, message: "Lỗi khi lấy thống kê bài thi" });
    }
};

exports.getQuestionStats = async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await sql.connect(config);
        
        // Lấy top 10 câu hỏi sai nhiều nhất
        const result = await pool.request()
            .input('Id', sql.Int, id)
            .query(`
                SELECT TOP 10
                    q.CauHoiId as id, 
                    q.NoiDung as text, 
                    COUNT(ct.ChiTietBaiThiId) as wrongCount,
                    (SELECT COUNT(*) FROM ChiTietBaiThi WHERE CauHoiId = q.CauHoiId) as totalResponses
                FROM CauHoi q
                JOIN ChiTietDeThi cdt ON q.CauHoiId = cdt.CauHoiId
                LEFT JOIN ChiTietBaiThi ct ON q.CauHoiId = ct.CauHoiId AND ct.Diem < 1
                WHERE cdt.DeThiId = @Id
                GROUP BY q.CauHoiId, q.NoiDung
                ORDER BY wrongCount DESC
            `);
        res.json({ success: true, data: result.recordset });
    } catch (err) {
        console.error("Lỗi getQuestionStats:", err);
        res.status(500).json({ success: false, message: "Lỗi khi lấy thống kê câu hỏi" });
    }
};

exports.deleteQuiz = async (req, res) => {
    let transaction;
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const pool = await sql.connect(config);

        // Kiểm tra quyền sở hữu
        const ownershipCheck = await pool.request()
            .input('DeThiId', sql.Int, id)
            .input('NguoiTaoId', sql.Int, userId)
            .query('SELECT DeThiId FROM DeThi WHERE DeThiId = @DeThiId AND NguoiTaoId = @NguoiTaoId');

        if (ownershipCheck.recordset.length === 0) {
            return res.status(403).json({ message: "Bạn không có quyền xóa đề thi này." });
        }

        // Kiểm tra xe đề thi đã có ai làm chưa, nếu có thì chặn không cho xoá hoặc sẽ lỗi khoá ngoại
        const checkBaiThi = await pool.request()
            .input('DeThiId', sql.Int, id)
            .query('SELECT TOP 1 BaiThiId FROM BaiThi WHERE DeThiId = @DeThiId');
            
        if (checkBaiThi.recordset.length > 0) {
            return res.status(400).json({ message: "Không thể xóa đề thi đã có sinh viên làm bài." });
        }

        transaction = new sql.Transaction(pool);
        await transaction.begin();

        // Xóa ChiTietDeThi (các liên kết với câu hỏi)
        await new sql.Request(transaction)
            .input('DeThiId', sql.Int, id)
            .query('DELETE FROM ChiTietDeThi WHERE DeThiId = @DeThiId');

        // Xóa DeThi chính
        await new sql.Request(transaction)
            .input('DeThiId', sql.Int, id)
            .query('DELETE FROM DeThi WHERE DeThiId = @DeThiId');

        await transaction.commit();
        res.json({ success: true, message: "Xóa đề thi thành công!" });

    } catch (err) {
        if (transaction && !transaction.rolledBack) await transaction.rollback();
        console.error("Lỗi khi xóa đề thi:", err);
        res.status(500).json({ message: "Lỗi server khi xóa đề thi", error: err.message });
    }
};

exports.updateQuiz = async (req, res) => {
    try {
        const { id } = req.params;
        const { TieuDe, ThoiGianLamBai, MoTa } = req.body;
        const userId = req.user.id;

        const pool = await sql.connect(config);
        
        // Cấp quyền
        const ownershipCheck = await pool.request()
            .input('DeThiId', sql.Int, id)
            .input('NguoiTaoId', sql.Int, userId)
            .query('SELECT DeThiId FROM DeThi WHERE DeThiId = @DeThiId AND NguoiTaoId = @NguoiTaoId');

        if (ownershipCheck.recordset.length === 0) {
            return res.status(403).json({ message: "Bạn không có quyền sửa đề thi này." });
        }

        await pool.request()
            .input('DeThiId', sql.Int, id)
            .input('TieuDe', sql.NVarChar, TieuDe)
            .input('ThoiGianLamBai', sql.Int, ThoiGianLamBai)
            .input('MoTa', sql.NVarChar, MoTa || null)
            .query('UPDATE DeThi SET TieuDe = @TieuDe, ThoiGianLamBai = @ThoiGianLamBai, MoTa = @MoTa WHERE DeThiId = @DeThiId');

        res.json({ success: true, message: "Cập nhật thông tin đề thi thành công!" });
    } catch(err) {
        console.error("Lỗi cập nhật đề thi:", err);
        res.status(500).json({ message: "Lỗi khi cập nhật đề thi", error: err.message });
    }
};

exports.getQuizzesByTopic = async (req, res) => {
    try {
        const { name } = req.params;
        const pool = await sql.connect(config);
        
        // Search by topic implicitly inside title or description
        // In real app, we should have a Tag or Topic table
        const result = await pool.request()
            .input('TopicName', sql.NVarChar, name)
            .query(`SELECT d.DeThiId, d.TieuDe, d.MaDeThi, d.MoTa, d.ThoiGianLamBai, d.NgayTao
                    FROM DeThi d
                    JOIN ChuDe c ON d.ChuDeId = c.ChuDeId
                    WHERE d.DaXuatBan = 1 AND c.TenChuDe = @TopicName
                    ORDER BY d.NgayTao DESC`);

        res.json({ success: true, data: result.recordset });
    } catch (err) {
        console.error("Lỗi khi lấy đề thi theo chủ đề:", err);
        res.status(500).json({ message: "Lỗi khi lấy đề thi theo chủ đề", error: err.message });
    }
};