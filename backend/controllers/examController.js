const { pool } = require('../config/db');

exports.submitExam = async (req, res) => {
    const { attemptId, answers } = req.body;
    const client = await pool.connect();
    
    if (!attemptId) {
        return res.status(400).json({ success: false, message: "Thiếu attemptId." });
    }

    try {
        // Find DeThiId from BaiThi to grade properly
        const getQuizIdRes = await pool.query('SELECT "DeThiId" FROM "BaiThi" WHERE "BaiThiId" = $1', [attemptId]);
            
        if (getQuizIdRes.rows.length === 0) {
            return res.status(404).json({ success: false, message: "Không tìm thấy Bài thi." });
        }
        
        const examId = getQuizIdRes.rows[0].DeThiId;

        await client.query('BEGIN');

        // 1. UPDATE BaiThi status
        await client.query(
            "UPDATE \"BaiThi\" SET status = 'completed', \"TrangThai\" = 'Đã nộp', \"NgayNop\" = NOW() WHERE \"BaiThiId\" = $1",
            [attemptId]
        );

        // 2. Compute Score
        const savedAnswersRes = await client.query(
            'SELECT "CauHoiId", "CauTraLoi" FROM "ChiTietBaiThi" WHERE "BaiThiId" = $1',
            [attemptId]
        );
        
        const dbAnswers = {};
        if (answers) {
            for(let k in answers) dbAnswers[k] = answers[k];
        }
        savedAnswersRes.rows.forEach(row => {
            if(!dbAnswers[row.CauHoiId]) dbAnswers[row.CauHoiId] = row.CauTraLoi;
        });

        const questionsResult = await client.query(`
            SELECT q."CauHoiId", l."TenLoai"
            FROM "CauHoi" q
            JOIN "ChiTietDeThi" c ON q."CauHoiId" = c."CauHoiId"
            JOIN "LoaiCauHoi" l ON q."LoaiId" = l."LoaiId"
            WHERE c."DeThiId" = $1
        `, [examId]);

        let score = 0;

        for (const q of questionsResult.rows) {
            let userAnswer = dbAnswers[q.CauHoiId] || '';
            if (typeof userAnswer === 'string' && (userAnswer.startsWith('[') || userAnswer.startsWith('{'))) {
                try { userAnswer = JSON.parse(userAnswer); } catch(e) {}
            }
            let qScore = 0;

            if (q.TenLoai === 'Trắc nghiệm') {
                const correctAnswerResult = await client.query(
                    'SELECT "NoiDung" FROM "DapAn" WHERE "CauHoiId" = $1 AND "LaDapAnDung" = true',
                    [q.CauHoiId]
                );

                const correctAnswerRaw = correctAnswerResult.rows[0]?.NoiDung || '';
                const normalizedCorrect = correctAnswerRaw.replace(/^[A-D]\. /, '').trim().toLowerCase();
                const normalizedUser = (typeof userAnswer === 'string' ? userAnswer : '').replace(/^[A-D]\. /, '').trim().toLowerCase();

                if (normalizedUser === normalizedCorrect && normalizedUser !== '') {
                    qScore = 1;
                }
            } else if (q.TenLoai === 'Điền khuyết') {
                const correctAnswerResult = await client.query(
                    'SELECT "NoiDung" FROM "DapAn" WHERE "CauHoiId" = $1 AND "LaDapAnDung" = true',
                    [q.CauHoiId]
                );
                const blanks = correctAnswerResult.rows.map(r => r.NoiDung.toLowerCase().trim());
                
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

            // Upsert ChiTietBaiThi
            const finalAnswer = typeof userAnswer === 'object' ? JSON.stringify(userAnswer) : String(userAnswer);
            await client.query(`
                INSERT INTO "ChiTietBaiThi" ("BaiThiId", "CauHoiId", "Diem", "CauTraLoi")
                VALUES ($1, $2, $3, $4)
                ON CONFLICT ("BaiThiId", "CauHoiId") 
                DO UPDATE SET "Diem" = EXCLUDED."Diem", "CauTraLoi" = EXCLUDED."CauTraLoi"
            `, [attemptId, q.CauHoiId, qScore, finalAnswer]);
        }

        await client.query('UPDATE "BaiThi" SET score = $1, "Diem" = $1 WHERE "BaiThiId" = $2', [score, attemptId]);

        await client.query('COMMIT');
        res.json({ success: true, score: score, message: "Đã nộp bài thành công!" });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Lỗi khi nộp bài:", err);
        res.status(500).json({ message: "Lỗi khi nộp bài", error: err.message });
    } finally {
        client.release();
    }
};

exports.getRanking = async (req, res) => {
    try {
        const { examId } = req.params;
        const result = await pool.query(`
            SELECT "HoTen" as student_name, "Lop" as student_class, "Diem" as score
            FROM "BaiThi"
            WHERE "DeThiId" = $1 AND "TrangThai" = 'Đã nộp'
            ORDER BY "Diem" DESC
        `, [examId]);
        res.json({ success: true, data: result.rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getStats = async (req, res) => {
    try {
        const { examId } = req.params;
        const result = await pool.query(`
            SELECT 
                COUNT(*) AS total_attempts,
                AVG("Diem") AS average_score,
                MAX("Diem") AS highest_score,
                MIN("Diem") AS lowest_score
            FROM "BaiThi"
            WHERE "DeThiId" = $1 AND "TrangThai" = 'Đã nộp'
        `, [examId]);
        res.json({ success: true, data: result.rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getQuestionStats = async (req, res) => {
    try {
        const { examId } = req.params;
        const result = await pool.query(`
            SELECT q."CauHoiId" as question_id, q."NoiDung" as question_text, COUNT(ct."ChiTietBaiThiId") as wrong_count
            FROM "CauHoi" q
            JOIN "ChiTietDeThi" cdt ON q."CauHoiId" = cdt."CauHoiId"
            JOIN "ChiTietBaiThi" ct ON q."CauHoiId" = ct."CauHoiId"
            WHERE cdt."DeThiId" = $1 AND ct."Diem" < 1
            GROUP BY q."CauHoiId", q."NoiDung"
            ORDER BY wrong_count DESC
        `, [examId]);
        res.json({ success: true, data: result.rows });
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

        if (studentCode === 'ALL') {
            await pool.query(
                "UPDATE \"DeThi\" SET \"HanNop\" = $1 WHERE \"DeThiId\" = $2",
                [new Date(newDeadline), examId]
            );
        } else {
            await pool.query(`
                INSERT INTO "GiaHanBaiThi" ("DeThiId", "MSSV", "HanNopMoi")
                VALUES ($1, $2, $3)
                ON CONFLICT ("DeThiId", "MSSV") 
                DO UPDATE SET "HanNopMoi" = EXCLUDED."HanNopMoi"
            `, [examId, studentCode, new Date(newDeadline)]);
        }
            
        res.json({ success: true, message: "Đã gia hạn thành công." });
    } catch (err) {
        console.error("Lỗi khi gia hạn:", err);
        res.status(500).json({ success: false, message: err.message });
    }
};
