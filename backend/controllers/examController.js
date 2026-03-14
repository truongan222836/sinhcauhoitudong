const { sql, config } = require('../config/db');

exports.submitExam = async (req, res) => {
    const { attemptId, answers } = req.body;
    let transaction;
    
    if (!attemptId) {
        return res.status(400).json({ success: false, message: "Thiếu attemptId." });
    }

    try {
        const pool = await sql.connect(config);
        
        // Find DeThiId from BaiThi to grade properly
        const getQuizIdRes = await pool.request()
            .input('AttemptId', sql.Int, attemptId)
            .query('SELECT DeThiId FROM BaiThi WHERE BaiThiId = @AttemptId');
            
        if (getQuizIdRes.recordset.length === 0) {
            return res.status(404).json({ success: false, message: "Không tìm thấy Bài thi." });
        }
        
        const examId = getQuizIdRes.recordset[0].DeThiId;

        transaction = new sql.Transaction(pool);
        await transaction.begin();

        // 1. UPDATE ExamAttempts status
        await new sql.Request(transaction)
            .input('AttemptId', sql.Int, attemptId)
            .query("UPDATE BaiThi SET status = 'completed', TrangThai = N'Đã nộp', NgayNop = GETDATE() WHERE BaiThiId = @AttemptId");

        // 2. Compute Score
        const savedAnswersRes = await new sql.Request(transaction)
            .input('AttemptId', sql.Int, attemptId)
            .query('SELECT CauHoiId, CauTraLoi FROM ChiTietBaiThi WHERE BaiThiId = @AttemptId');
        
        const dbAnswers = {};
        if (answers) {
            // merge with provided ones
            for(let k in answers) dbAnswers[k] = answers[k];
        }
        savedAnswersRes.recordset.forEach(row => {
            if(!dbAnswers[row.CauHoiId]) dbAnswers[row.CauHoiId] = row.CauTraLoi;
        });

        const questionsResult = await new sql.Request(transaction)
            .input('ExamId', sql.Int, examId)
            .query(`
                SELECT q.CauHoiId, l.TenLoai
                FROM CauHoi q
                JOIN ChiTietDeThi c ON q.CauHoiId = c.CauHoiId
                JOIN LoaiCauHoi l ON q.LoaiId = l.LoaiId
                WHERE c.DeThiId = @ExamId
            `);

        let score = 0;

        for (const q of questionsResult.recordset) {
            let userAnswer = dbAnswers[q.CauHoiId] || '';
            if (typeof userAnswer === 'string' && (userAnswer.startsWith('[') || userAnswer.startsWith('{'))) {
                try { userAnswer = JSON.parse(userAnswer); } catch(e) {}
            }
            let qScore = 0;

            if (q.TenLoai === 'Trắc nghiệm') {
                const correctAnswerResult = await new sql.Request(transaction)
                    .input('QId', sql.Int, q.CauHoiId)
                    .query('SELECT NoiDung FROM DapAn WHERE CauHoiId = @QId AND LaDapAnDung = 1');

                const correctAnswerRaw = correctAnswerResult.recordset[0]?.NoiDung || '';
                const normalizedCorrect = correctAnswerRaw.replace(/^[A-D]\. /, '').trim().toLowerCase();
                const normalizedUser = (typeof userAnswer === 'string' ? userAnswer : '').replace(/^[A-D]\. /, '').trim().toLowerCase();

                if (normalizedUser === normalizedCorrect && normalizedUser !== '') {
                    qScore = 1;
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
                     qScore = correctBlanks / blanks.length;
                }
            } else if (q.TenLoai === 'Tự luận') {
                qScore = (userAnswer && String(userAnswer).length > 20) ? 0.5 : 0;
            }

            score += qScore;

            // Sync answer/score logic to ChiTietBaiThi back
            await new sql.Request(transaction)
                .input('AttemptId', sql.Int, attemptId)
                .input('QId', sql.Int, q.CauHoiId)
                .input('Score', sql.Float, qScore)
                .input('Answer', sql.NVarChar, typeof userAnswer === 'object' ? JSON.stringify(userAnswer) : String(userAnswer))
                .query(`
                    IF EXISTS (SELECT 1 FROM ChiTietBaiThi WHERE BaiThiId = @AttemptId AND CauHoiId = @QId)
                        UPDATE ChiTietBaiThi SET Diem = @Score, CauTraLoi = @Answer WHERE BaiThiId = @AttemptId AND CauHoiId = @QId
                    ELSE
                        INSERT INTO ChiTietBaiThi (BaiThiId, CauHoiId, Diem, CauTraLoi) VALUES (@AttemptId, @QId, @Score, @Answer)
                `);
        }

        await new sql.Request(transaction)
            .input('Score', sql.Float, score)
            .input('AttemptId', sql.Int, attemptId)
            .query('UPDATE BaiThi SET score = @Score, Diem = @Score WHERE BaiThiId = @AttemptId');

        await transaction.commit();
        res.json({ success: true, score: score, message: "Đã nộp bài thành công!" });

    } catch (err) {
        if (transaction && !transaction.rolledBack) await transaction.rollback();
        console.error("Lỗi khi nộp bài:", err);
        res.status(500).json({ message: "Lỗi khi nộp bài", error: err.message });
    }
};

exports.getRanking = async (req, res) => {
    try {
        const { examId } = req.params;
        const pool = await sql.connect(config);
        const result = await pool.request()
            .input('ExamId', sql.Int, examId)
            .query(`
                SELECT HoTen as student_name, Lop as student_class, Diem as score
                FROM BaiThi
                WHERE DeThiId = @ExamId AND TrangThai = N'Đã nộp'
                ORDER BY Diem DESC
            `);
        res.json({ success: true, data: result.recordset });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getStats = async (req, res) => {
    try {
        const { examId } = req.params;
        const pool = await sql.connect(config);
        const result = await pool.request()
            .input('ExamId', sql.Int, examId)
            .query(`
                SELECT 
                    COUNT(*) AS total_attempts,
                    AVG(Diem) AS average_score,
                    MAX(Diem) AS highest_score,
                    MIN(Diem) AS lowest_score
                FROM BaiThi
                WHERE DeThiId = @ExamId AND TrangThai = N'Đã nộp'
            `);
        res.json({ success: true, data: result.recordset[0] });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getQuestionStats = async (req, res) => {
    try {
        const { examId } = req.params;
        const pool = await sql.connect(config);
        const result = await pool.request()
            .input('ExamId', sql.Int, examId)
            .query(`
                SELECT q.CauHoiId as question_id, q.NoiDung as question_text, COUNT(ct.ChiTietBaiThiId) as wrong_count
                FROM CauHoi q
                JOIN ChiTietDeThi cdt ON q.CauHoiId = cdt.CauHoiId
                JOIN ChiTietBaiThi ct ON q.CauHoiId = ct.CauHoiId
                WHERE cdt.DeThiId = @ExamId AND ct.Diem < 1
                GROUP BY q.CauHoiId, q.NoiDung
                ORDER BY wrong_count DESC
            `);
        res.json({ success: true, data: result.recordset });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.extendDeadline = async (req, res) => {
    try {
        const { examId, studentCode, newDeadline } = req.body;
        if (!examId || !studentCode || !newDeadline) {
            return res.status(400).json({ success: false, message: "Thiếu thông tin gia hạn." });
        }

        const pool = await sql.connect(config);
        
        if (studentCode === 'ALL') {
            await pool.request()
                .input('DeThiId', sql.Int, examId)
                .input('HanNopMoi', sql.DateTime, new Date(newDeadline))
                .query(`UPDATE DeThi SET HanNop = @HanNopMoi WHERE DeThiId = @DeThiId`);
        } else {
            await pool.request()
                .input('DeThiId', sql.Int, examId)
                .input('MSSV', sql.NVarChar, studentCode)
                .input('HanNopMoi', sql.DateTime, new Date(newDeadline))
                .query(`
                    IF EXISTS (SELECT 1 FROM GiaHanBaiThi WHERE DeThiId = @DeThiId AND MSSV = @MSSV)
                        UPDATE GiaHanBaiThi SET HanNopMoi = @HanNopMoi WHERE DeThiId = @DeThiId AND MSSV = @MSSV
                    ELSE
                        INSERT INTO GiaHanBaiThi (DeThiId, MSSV, HanNopMoi) VALUES (@DeThiId, @MSSV, @HanNopMoi)
                `);
        }
            
        res.json({ success: true, message: "Đã gia hạn thành công." });
    } catch (err) {
        console.error("Lỗi khi gia hạn:", err);
        res.status(500).json({ success: false, message: err.message });
    }
};
