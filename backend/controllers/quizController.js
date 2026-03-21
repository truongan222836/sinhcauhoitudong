const { pool } = require("../config/db");

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
        // 1. Check for existing 'Doing' attempt
        const existing = await pool.query(`
            SELECT b."BaiThiId", b."NgayBatDau", d."ThoiGianLamBai", 
            EXTRACT(EPOCH FROM (NOW() - b."NgayBatDau")) as "ElapsedSeconds"
            FROM "BaiThi" b
            JOIN "DeThi" d ON b."DeThiId" = d."DeThiId"
            WHERE b."DeThiId" = $1 AND b."MSSV" = $2 AND b."TrangThai" = 'Đang làm'
        `, [examId, studentId]);

        if (existing.rows.length > 0) {
            const attempt = existing.rows[0];
            const elapsedSeconds = parseFloat(attempt.ElapsedSeconds) || 0;

            if (elapsedSeconds < attempt.ThoiGianLamBai * 60) {
                const savedAnswers = await pool.query(
                    "SELECT \"CauHoiId\", \"CauTraLoi\" FROM \"ChiTietBaiThi\" WHERE \"BaiThiId\" = $1",
                    [attempt.BaiThiId]
                );

                return res.json({ 
                    success: true, 
                    attemptId: attempt.BaiThiId, 
                    resumed: true,
                    savedAnswers: savedAnswers.rows,
                    elapsedSeconds: elapsedSeconds
                });
            }
        }

        // 2. Check deadline
        const examInfoRes = await pool.query("SELECT \"HanNop\" FROM \"DeThi\" WHERE \"DeThiId\" = $1", [examId]);
        if (examInfoRes.rows.length > 0) {
            const hanNop = examInfoRes.rows[0].HanNop;
            if (hanNop && new Date() > new Date(hanNop)) {
                const extRes = await pool.query(
                    "SELECT \"HanNopMoi\" FROM \"GiaHanBaiThi\" WHERE \"DeThiId\" = $1 AND \"MSSV\" = $2",
                    [examId, studentId]
                );
                if (extRes.rows.length === 0 || new Date() > new Date(extRes.rows[0].HanNopMoi)) {
                    return res.status(403).json({ success: false, message: "Bài kiểm tra đã quá hạn nộp." });
                }
            }
        }

        // 3. Create new attempt
        const result = await pool.query(`
            INSERT INTO "BaiThi" ("DeThiId", "NguoiDungId", "NgayBatDau", "TrangThai", "HoTen", "Lop", "MSSV") 
            VALUES ($1, $2, NOW(), 'Đang làm', $3, $4, $5)
            RETURNING "BaiThiId"
        `, [examId, userId, studentName, studentClass, studentId]);

        res.json({ success: true, attemptId: result.rows[0].BaiThiId, resumed: false });
    } catch (err) {
        console.error("Lỗi khi bắt đầu bài thi:", err);
        res.status(500).json({ success: false, message: "Lỗi server khi bắt đầu bài thi", error: err.message });
    }
};

exports.saveAnswer = async (req, res) => {
    const { attemptId, questionId, selectedAnswer } = req.body;
    try {
        const answerText = typeof selectedAnswer === 'object' ? JSON.stringify(selectedAnswer) : String(selectedAnswer);
        await pool.query(`
            INSERT INTO "ChiTietBaiThi" ("BaiThiId", "CauHoiId", "CauTraLoi")
            VALUES ($1, $2, $3)
            ON CONFLICT ("BaiThiId", "CauHoiId")
            DO UPDATE SET "CauTraLoi" = EXCLUDED."CauTraLoi"
        `, [attemptId, questionId, answerText]);
        res.json({ success: true });
    } catch (err) {
        console.error("Lỗi khi lưu câu trả lời:", err);
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.createQuizFromGenerated = async (req, res) => {
    const { title, questions, duration, topicId, deadline } = req.body;
    const client = await pool.connect();
    try {
        const createdBy = req.user.id;
        const quizCode = generateQuizCode();
        
        await client.query('BEGIN');

        const quizResult = await client.query(`
            INSERT INTO "DeThi" ("TieuDe", "MaDeThi", "NguoiTaoId", "ThoiGianLamBai", "ChuDeId", "HanNop") 
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING "DeThiId"
        `, [title, quizCode, createdBy, duration || 60, topicId || null, deadline ? new Date(deadline) : null]);

        const quizId = quizResult.rows[0].DeThiId;

        let order = 1;
        for (const q of questions) {
            let typeId = 1;
            if (q.type === 'Tự luận') typeId = 2;
            if (q.type === 'Điền khuyết') typeId = 3;

            const questionResult = await client.query(`
                INSERT INTO "CauHoi" ("NoiDung", "LoaiId", "LoaiCauHoiId", "NguoiTaoId", "ChuDeId") 
                VALUES ($1, $2, $3, $4, $5)
                RETURNING "CauHoiId"
            `, [q.question, typeId, typeId, createdBy, topicId || null]);

            const questionId = questionResult.rows[0].CauHoiId;

            await client.query(
                'INSERT INTO "ChiTietDeThi" ("DeThiId", "CauHoiId", "ThuTu") VALUES ($1, $2, $3)',
                [quizId, questionId, order++]
            );

            if (q.type === 'Trắc nghiệm' && q.options) {
                const normalizedCorrect = q.correctAnswer ? q.correctAnswer.replace(/^[A-H]\. /, '') : '';
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
            } else if (q.type === 'Điền khuyết' && q.blanks && q.blanks.length > 0) {
                 for (const blank of q.blanks) {
                    await client.query(
                        'INSERT INTO "DapAn" ("NoiDung", "CauHoiId", "LaDapAnDung") VALUES ($1, $2, $3)',
                        [blank, questionId, true]
                    );
                 }
            }
        }

        await client.query('COMMIT');
        res.status(201).json({ success: true, message: "Đã tạo đề thi thành công!", quizCode: quizCode });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Lỗi khi tạo đề thi:", err);
        res.status(500).json({ message: "Lỗi server khi tạo đề thi", error: err.message });
    } finally {
        client.release();
    }
};

exports.getQuizzesByLecturer = async (req, res) => {
    try {
        const lecturerId = req.user.id;
        const limit = req.query.limit ? parseInt(req.query.limit) : 1000;
        const result = await pool.query(`
            SELECT d."DeThiId", d."TieuDe", d."MaDeThi", d."NgayTao", d."DaXuatBan", d."ThoiGianLamBai", d."MoTa", d."HanNop",
                   (SELECT COUNT(*) FROM "BaiThi" b WHERE b."DeThiId" = d."DeThiId") as "usageCount",
                   COALESCE((SELECT AVG("Diem") FROM "BaiThi" b WHERE b."DeThiId" = d."DeThiId" AND b."TrangThai" = 'Đã nộp'), 0) as "averageRating"
            FROM "DeThi" d 
            WHERE d."NguoiTaoId" = $1 ORDER BY d."NgayTao" DESC LIMIT $2
        `, [lecturerId, limit]);
        res.json({ success: true, data: result.rows });
    } catch (err) {
        console.error("Lỗi khi lấy danh sách đề thi:", err);
        res.status(500).json({ message: "Lỗi server khi lấy danh sách đề thi", error: err.message });
    }
};

exports.getAvailableQuizzes = async (req, res) => {
    try {
        const limit = req.query.limit ? parseInt(req.query.limit) : 1000;
        const result = await pool.query(`
            SELECT d."DeThiId", d."TieuDe", d."MaDeThi", d."MoTa", d."ThoiGianLamBai", d."NgayTao", d."HanNop",
                   (SELECT COUNT(*) FROM "BaiThi" b WHERE b."DeThiId" = d."DeThiId") as "usageCount",
                   COALESCE((SELECT AVG("Diem") FROM "BaiThi" b WHERE b."DeThiId" = d."DeThiId" AND b."TrangThai" = 'Đã nộp'), 0) as "averageRating"
            FROM "DeThi" d 
            WHERE d."DaXuatBan" = true 
            ORDER BY d."NgayTao" DESC LIMIT $1
        `, [limit]);
        res.json({ success: true, data: result.rows });
    } catch (err) {
        console.error("Lỗi khi lấy danh sách đề thi có sẵn:", err);
        res.status(500).json({ message: "Lỗi server khi lấy danh sách đề thi có sẵn", error: err.message });
    }
};

exports.publishQuiz = async (req, res) => {
    try {
        const { quizId } = req.params;
        const lecturerId = req.user.id;

        const ownershipCheck = await pool.query(
            "SELECT \"DeThiId\" FROM \"DeThi\" WHERE \"DeThiId\" = $1 AND \"NguoiTaoId\" = $2",
            [quizId, lecturerId]
        );

        if (ownershipCheck.rows.length === 0) {
            return res.status(403).json({ message: "Bạn không có quyền xuất bản đề thi này" });
        }

        await pool.query("UPDATE \"DeThi\" SET \"DaXuatBan\" = true WHERE \"DeThiId\" = $1", [quizId]);
        res.json({ success: true, message: "Đã xuất bản đề thi thành công!" });
    } catch (err) {
        console.error("Lỗi khi xuất bản đề thi:", err);
        res.status(500).json({ message: "Lỗi server khi xuất bản đề thi", error: err.message });
    }
};

exports.getQuizByCode = async (req, res) => {
    try {
        const { code } = req.params;
        const result = await pool.query(
            "SELECT \"DeThiId\", \"TieuDe\", \"DaXuatBan\" FROM \"DeThi\" WHERE \"MaDeThi\" = $1",
            [code]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: "Không tìm thấy đề thi với mã này" });
        }
        res.json({ success: true, data: result.rows[0] });
    } catch (err) {
        console.error("Lỗi khi lấy thông tin đề thi:", err);
        res.status(500).json({ message: "Lỗi server khi lấy thông tin đề thi", error: err.message });
    }
};

exports.getQuizById = async (req, res) => {
    try {
        const { id } = req.params;
        const quizRes = await pool.query(
            "SELECT \"DeThiId\", \"TieuDe\", \"MoTa\", \"ThoiGianLamBai\" FROM \"DeThi\" WHERE \"DeThiId\" = $1",
            [id]
        );
        if (quizRes.rows.length === 0) {
            return res.status(404).json({ success: false, message: "Không tìm thấy đề thi" });
        }

        const quiz = quizRes.rows[0];
        const questionsRes = await pool.query(`
            SELECT q."CauHoiId" as id, q."NoiDung" as question, l."TenLoai" as type
            FROM "CauHoi" q
            JOIN "ChiTietDeThi" c ON q."CauHoiId" = c."CauHoiId"
            JOIN "LoaiCauHoi" l ON q."LoaiId" = l."LoaiId"
            WHERE c."DeThiId" = $1
            ORDER BY c."ThuTu"
        `, [id]);

        const questions = questionsRes.rows;
        for (let q of questions) {
            if (q.type === 'Trắc nghiệm') {
                const answersRes = await pool.query(
                    "SELECT \"NoiDung\" FROM \"DapAn\" WHERE \"CauHoiId\" = $1",
                    [q.id]
                );
                q.options = answersRes.rows.map(r => {
                    let text = r.NoiDung;
                    return text.match(/^[A-D]\. /) ? text.substring(3) : text;
                });
            } else if (q.type === 'Điền khuyết') {
                const answersRes = await pool.query(
                    "SELECT \"NoiDung\" FROM \"DapAn\" WHERE \"CauHoiId\" = $1",
                    [q.id]
                );
                q.blanks = answersRes.rows.map(r => r.NoiDung);
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
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        let baiThiId = attemptId;
        if (baiThiId) {
            await client.query(
                "UPDATE \"BaiThi\" SET \"NgayNop\" = NOW(), \"TrangThai\" = 'Đã nộp' WHERE \"BaiThiId\" = $1",
                [baiThiId]
            );
            if (answers && Object.keys(answers).length > 0) {
                for (const qId in answers) {
                    const ans = answers[qId];
                    const answerText = typeof ans === 'object' ? JSON.stringify(ans) : String(ans);
                    await client.query(`
                        INSERT INTO "ChiTietBaiThi" ("BaiThiId", "CauHoiId", "CauTraLoi")
                        VALUES ($1, $2, $3)
                        ON CONFLICT ("BaiThiId", "CauHoiId")
                        DO UPDATE SET "CauTraLoi" = EXCLUDED."CauTraLoi"
                    `, [baiThiId, qId, answerText]);
                }
            }
        } else {
            const btRes = await client.query(`
                INSERT INTO "BaiThi" ("DeThiId", "NguoiDungId", "NgayNop", "TrangThai") 
                VALUES ($1, $2, NOW(), 'Đã nộp')
                RETURNING "BaiThiId"
            `, [quizId, userId]);
            baiThiId = btRes.rows[0].BaiThiId;
        }

        const savedRes = await client.query(
            "SELECT \"CauHoiId\", \"CauTraLoi\" FROM \"ChiTietBaiThi\" WHERE \"BaiThiId\" = $1",
            [baiThiId]
        );
        const dbAnswers = {};
        savedRes.rows.forEach(row => { dbAnswers[row.CauHoiId] = row.CauTraLoi; });

        const qRes = await client.query(`
            SELECT q."CauHoiId", l."TenLoai"
            FROM "CauHoi" q
            JOIN "ChiTietDeThi" c ON q."CauHoiId" = c."CauHoiId"
            JOIN "LoaiCauHoi" l ON q."LoaiId" = l."LoaiId"
            WHERE c."DeThiId" = $1
        `, [quizId]);

        let correctCount = 0;
        for (const q of qRes.rows) {
            let userAnswer = dbAnswers[q.CauHoiId] || '';
            if (typeof userAnswer === 'string' && (userAnswer.startsWith('[') || userAnswer.startsWith('{'))) {
                try { userAnswer = JSON.parse(userAnswer); } catch(e) {}
            }

            let diem = 0;
            if (q.TenLoai === 'Trắc nghiệm') {
                const ansRes = await client.query(
                    "SELECT \"NoiDung\" FROM \"DapAn\" WHERE \"CauHoiId\" = $1 AND \"LaDapAnDung\" = true",
                    [q.CauHoiId]
                );
                const correct = ansRes.rows[0]?.NoiDung.replace(/^[A-D]\. /, '').trim().toLowerCase() || '';
                const user = (typeof userAnswer === 'string' ? userAnswer : '').replace(/^[A-D]\. /, '').trim().toLowerCase();
                if (user === correct && user !== '') { diem = 1; correctCount++; }
            } else if (q.TenLoai === 'Điền khuyết') {
                const ansRes = await client.query(
                    "SELECT \"NoiDung\" FROM \"DapAn\" WHERE \"CauHoiId\" = $1 AND \"LaDapAnDung\" = true",
                    [q.CauHoiId]
                );
                const blanks = ansRes.rows.map(r => r.NoiDung.toLowerCase().trim());
                let userArr = Array.isArray(userAnswer) ? userAnswer : (typeof userAnswer === 'string' ? userAnswer.split(',') : []);
                userArr = userArr.map(a => (a || '').toLowerCase().trim());
                let correctBlanks = 0;
                for (let i = 0; i < blanks.length; i++) { if (userArr[i] === blanks[i] && userArr[i]) correctBlanks++; }
                if (blanks.length > 0) { diem = correctBlanks / blanks.length; correctCount += diem; }
            } else if (q.TenLoai === 'Tự luận') {
                diem = (userAnswer && userAnswer.length > 20) ? 0.5 : 0;
                correctCount += diem;
            }

            await client.query("UPDATE \"ChiTietBaiThi\" SET \"Diem\" = $1 WHERE \"BaiThiId\" = $2 AND \"CauHoiId\" = $3", [diem, baiThiId, q.CauHoiId]);
        }

        await client.query("UPDATE \"BaiThi\" SET \"Diem\" = $1 WHERE \"BaiThiId\" = $2", [correctCount, baiThiId]);
        await client.query('COMMIT');
        res.json({ success: true, score: correctCount, message: "Đã nộp bài thành công!" });
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
        const { id } = req.params;
        const result = await pool.query(`
            SELECT 
                ROW_NUMBER() OVER (ORDER BY "Diem" DESC, "NgayNop" ASC) as rank,
                "HoTen" as "studentName", "Lop" as "studentClass", "MSSV" as "studentId", "Diem" as score, "NgayNop" as "completedAt"
            FROM "BaiThi"
            WHERE "DeThiId" = $1 AND "TrangThai" = 'Đã nộp'
            ORDER BY "Diem" DESC, "NgayNop" ASC LIMIT 50
        `, [id]);
        res.json({ success: true, data: result.rows });
    } catch (err) {
        console.error("Lỗi getRanking:", err);
        res.status(500).json({ success: false, message: "Lỗi khi lấy bảng xếp hạng" });
    }
};

exports.getExamStats = async (req, res) => {
    try {
        const { id } = req.params;
        const statsRes = await pool.query(`
            SELECT 
                COUNT(*) as "totalAttempts",
                ROUND(AVG("Diem")::numeric, 2) as "averageScore",
                MAX("Diem") as "highestScore",
                MIN("Diem") as "lowestScore",
                stddev("Diem") as "standardDeviation"
            FROM "BaiThi"
            WHERE "DeThiId" = $1 AND "TrangThai" = 'Đã nộp'
        `, [id]);

        const distRes = await pool.query(`
            SELECT FLOOR("Diem") as "scoreRange", COUNT(*) as count
            FROM "BaiThi"
            WHERE "DeThiId" = $1 AND "TrangThai" = 'Đã nộp'
            GROUP BY FLOOR("Diem")
            ORDER BY "scoreRange"
        `, [id]);

        res.json({ success: true, data: { ...statsRes.rows[0], scoreDistribution: distRes.rows } });
    } catch (err) {
        console.error("Lỗi getExamStats:", err);
        res.status(500).json({ success: false, message: "Lỗi khi lấy thống kê bài thi" });
    }
};

exports.getQuestionStats = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(`
            SELECT q."CauHoiId" as id, q."NoiDung" as text, COUNT(ct."ChiTietBaiThiId") as "wrongCount",
                (SELECT COUNT(*) FROM "ChiTietBaiThi" WHERE "CauHoiId" = q."CauHoiId") as "totalResponses"
            FROM "CauHoi" q
            JOIN "ChiTietDeThi" cdt ON q."CauHoiId" = cdt."CauHoiId"
            LEFT JOIN "ChiTietBaiThi" ct ON q."CauHoiId" = ct."CauHoiId" AND ct."Diem" < 1
            WHERE cdt."DeThiId" = $1
            GROUP BY q."CauHoiId", q."NoiDung"
            ORDER BY "wrongCount" DESC LIMIT 10
        `, [id]);
        res.json({ success: true, data: result.rows });
    } catch (err) {
        console.error("Lỗi getQuestionStats:", err);
        res.status(500).json({ success: false, message: "Lỗi khi lấy thống kê câu hỏi" });
    }
};

exports.deleteQuiz = async (req, res) => {
    const client = await pool.connect();
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const checkOwn = await pool.query("SELECT \"DeThiId\" FROM \"DeThi\" WHERE \"DeThiId\" = $1 AND \"NguoiTaoId\" = $2", [id, userId]);
        if (checkOwn.rows.length === 0) return res.status(403).json({ message: "Bạn không có quyền xóa đề thi này." });

        const checkBT = await pool.query("SELECT \"BaiThiId\" FROM \"BaiThi\" WHERE \"DeThiId\" = $1 LIMIT 1", [id]);
        if (checkBT.rows.length > 0) return res.status(400).json({ message: "Không thể xóa đề thi đã có sinh viên làm bài." });

        await client.query('BEGIN');
        await client.query("DELETE FROM \"ChiTietDeThi\" WHERE \"DeThiId\" = $1", [id]);
        await client.query("DELETE FROM \"DeThi\" WHERE \"DeThiId\" = $1", [id]);
        await client.query('COMMIT');
        res.json({ success: true, message: "Xóa đề thi thành công!" });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ message: "Lỗi server khi xóa đề thi", error: err.message });
    } finally {
        client.release();
    }
};

exports.updateQuiz = async (req, res) => {
    try {
        const { id } = req.params;
        const { TieuDe, ThoiGianLamBai, MoTa } = req.body;
        const userId = req.user.id;
        const checkOwn = await pool.query("SELECT \"DeThiId\" FROM \"DeThi\" WHERE \"DeThiId\" = $1 AND \"NguoiTaoId\" = $2", [id, userId]);
        if (checkOwn.rows.length === 0) return res.status(403).json({ message: "Bạn không có quyền sửa đề thi này." });

        await pool.query(
            "UPDATE \"DeThi\" SET \"TieuDe\" = $1, \"ThoiGianLamBai\" = $2, \"MoTa\" = $3 WHERE \"DeThiId\" = $4",
            [TieuDe, ThoiGianLamBai, MoTa || null, id]
        );
        res.json({ success: true, message: "Cập nhật thông tin đề thi thành công!" });
    } catch(err) {
        res.status(500).json({ message: "Lỗi khi cập nhật đề thi", error: err.message });
    }
};

exports.getQuizzesByTopic = async (req, res) => {
    try {
        const { name } = req.params;
        const result = await pool.query(`
            SELECT d."DeThiId", d."TieuDe", d."MaDeThi", d."MoTa", d."ThoiGianLamBai", d."NgayTao"
            FROM "DeThi" d JOIN "ChuDe" c ON d."ChuDeId" = c."ChuDeId"
            WHERE d."DaXuatBan" = true AND c."TenChuDe" = $1 ORDER BY d."NgayTao" DESC
        `, [name]);
        res.json({ success: true, data: result.rows });
    } catch (err) {
        res.status(500).json({ message: "Lỗi khi lấy đề thi theo chủ đề", error: err.message });
    }
};