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
    const { title, questions, duration } = req.body;
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
            .query(`INSERT INTO DeThi (TieuDe, MaDeThi, NguoiTaoId, ThoiGianLamBai) 
                    OUTPUT INSERTED.DeThiId 
                    VALUES (@Title, @MaDeThi, @CreatedBy, @Duration)`);

        const quizId = quizResult.recordset[0].DeThiId;

        // 2. Lặp qua từng câu hỏi và lưu vào DB
        let order = 1;
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
                .query(`INSERT INTO CauHoi (NoiDung, LoaiId, LoaiCauHoiId, NguoiTaoId) 
                        OUTPUT INSERTED.CauHoiId 
                        VALUES (@Content, @TypeId, @TypeId, @CreatedBy_Q)`);

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
        const lecturerId = req.user.id; // 🔥 FIX: Di chuyển vào trong try...catch
        const pool = await sql.connect(config);
        const request = pool.request();
        const result = await request
            .input('LecturerId', sql.Int, lecturerId)
            .query(`SELECT DeThiId, TieuDe, MaDeThi, NgayTao, DaXuatBan, ThoiGianLamBai
                    FROM DeThi 
                    WHERE NguoiTaoId = @LecturerId ORDER BY NgayTao DESC`);
        res.json({ success: true, data: result.recordset });

    } catch (err) {
        console.error("Lỗi khi lấy danh sách đề thi:", err);
        res.status(500).json({ message: "Lỗi server khi lấy danh sách đề thi", error: err.message });
    }
};

exports.getAvailableQuizzes = async (req, res) => {
    try {
        const pool = await sql.connect(config);
        const request = pool.request();
        const result = await request
            .query(`SELECT DeThiId, TieuDe, MaDeThi, MoTa, ThoiGianLamBai, NgayTao
                    FROM DeThi 
                    WHERE DaXuatBan = 1 
                    ORDER BY NgayTao DESC`);

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
    const { answers } = req.body;
    const userId = req.user.id;
    let transaction;

    try {
        const pool = await sql.connect(config);
        transaction = new sql.Transaction();
        await transaction.begin();

        // 1. Tạo bản ghi Bài Thi
        const baiThiResult = await new sql.Request(transaction)
            .input('QuizId', sql.Int, quizId)
            .input('UserId', sql.Int, userId)
            .query(`INSERT INTO BaiThi (DeThiId, NguoiDungId, NgayNop, TrangThai) 
                    OUTPUT INSERTED.BaiThiId 
                    VALUES (@QuizId, @UserId, GETDATE(), N'Đã nộp')`);

        const baiThiId = baiThiResult.recordset[0].BaiThiId;

        // 2. Lấy đáp án đúng để chấm điểm (chỉ trắc nghiệm)
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
            const userAnswer = answers[q.CauHoiId] || '';
            let diem = 0;

            if (q.TenLoai === 'Trắc nghiệm') {
                const correctAnswerResult = await new sql.Request(transaction)
                    .input('QId', sql.Int, q.CauHoiId)
                    .query('SELECT NoiDung FROM DapAn WHERE CauHoiId = @QId AND LaDapAnDung = 1');

                const correctAnswerRaw = correctAnswerResult.recordset[0]?.NoiDung || '';

                // Chuẩn hóa để so sánh: loại bỏ "A. " nếu có
                const normalizedCorrect = correctAnswerRaw.replace(/^[A-D]\. /, '');
                const normalizedUser = userAnswer.replace(/^[A-D]\. /, '');

                if (normalizedUser === normalizedCorrect) {
                    diem = 1;
                    correctCount++;
                }
            } else if (q.TenLoai === 'Điền khuyết') {
                const correctAnswerResult = await new sql.Request(transaction)
                    .input('QId', sql.Int, q.CauHoiId)
                    .query('SELECT NoiDung FROM DapAn WHERE CauHoiId = @QId AND LaDapAnDung = 1');
                
                const blanks = correctAnswerResult.recordset.map(r => r.NoiDung.toLowerCase().trim());
                // userAnswer ở frontend có thể là mảng các từ điền vào
                let userAnswersArray = [];
                if (Array.isArray(userAnswer)) {
                    userAnswersArray = userAnswer.map(a => (a || '').toLowerCase().trim());
                } else if (typeof userAnswer === 'string') {
                    userAnswersArray = userAnswer.split(',').map(a => a.toLowerCase().trim());
                } else if (typeof userAnswer === 'object' && userAnswer !== null) {
                    // Nếu frontend gửi lên object { 0: 'a', 1: 'b' }
                    userAnswersArray = Object.values(userAnswer).map(a => (a || '').toLowerCase().trim());
                }

                let correctBlanks = 0;
                for (let i = 0; i < blanks.length; i++) {
                    const userAns = userAnswersArray[i] || '';
                    const correctAns = blanks[i];
                    
                    // Chấm tương đối: 
                    // 1. Nếu giống hệt → 1 điểm
                    // 2. Nếu chứa từ khóa chính (bỏ dấu và ký tự đặc biệt) → 0.7 điểm
                    // 3. Nếu viết không quá sai → 0.3 điểm
                    
                    if (userAns === correctAns) {
                        correctBlanks += 1;
                    } else {
                        // Bỏ dấu và ký tự đặc biệt để so sánh
                        const normalizedCorrect = correctAns.replace(/[àáạảãăằắặẳẵâầấậẩẫèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỡđ]/g, function(char){
                            const map = {'à':'a', 'á':'a', 'ạ':'a', 'ả':'a', 'ã':'a', 'ă':'a', 'ằ':'a', 'ắ':'a', 'ặ':'a', 'ẳ':'a', 'ẵ':'a', 'â':'a', 'ầ':'a', 'ấ':'a', 'ậ':'a', 'ẩ':'a', 'ẫ':'a', 'è':'e', 'é':'e', 'ẹ':'e', 'ẻ':'e', 'ẽ':'e', 'ê':'e', 'ề':'e', 'ế':'e', 'ệ':'e', 'ể':'e', 'ễ':'e', 'ì':'i', 'í':'i', 'ị':'i', 'ỉ':'i', 'ĩ':'i', 'ò':'o', 'ó':'o', 'ọ':'o', 'ỏ':'o', 'õ':'o', 'ô':'o', 'ồ':'o', 'ố':'o', 'ộ':'o', 'ổ':'o', '�':'o', 'ơ':'o', 'ờ':'o', 'ớ':'o', 'ợ':'o', 'ở':'o', 'ỡ':'o', 'ù':'u', 'ú':'u', 'ụ':'u', 'ủ':'u', 'ũ':'u', 'ư':'u', 'ừ':'u', 'ứ':'u', 'ự':'u', 'ử':'u', 'ữ':'u', 'ỳ':'y', 'ý':'y', 'ỵ':'y', 'ỷ':'y', 'ỡ':'y', 'đ':'d'};
                            return map[char] || char;
                        }).replace(/[^\w\s]/g, '');
                        const normalizedUser = userAns.replace(/[àáạảãăằắặẳẵâầấậẩẫèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỡđ]/g, function(char){
                            const map = {'à':'a', 'á':'a', 'ạ':'a', 'ả':'a', 'ã':'a', 'ă':'a', 'ằ':'a', 'ắ':'a', 'ặ':'a', 'ẳ':'a', 'ẵ':'a', 'â':'a', 'ầ':'a', 'ấ':'a', 'ậ':'a', 'ẩ':'a', 'ẫ':'a', 'è':'e', 'é':'e', 'ẹ':'e', 'ẻ':'e', 'ẽ':'e', 'ê':'e', 'ề':'e', 'ế':'e', 'ệ':'e', 'ể':'e', 'ễ':'e', 'ì':'i', 'í':'i', 'ị':'i', 'ỉ':'i', 'ĩ':'i', 'ò':'o', 'ó':'o', 'ọ':'o', 'ỏ':'o', 'õ':'o', 'ô':'o', 'ồ':'o', 'ố':'o', 'ộ':'o', 'ổ':'o', '�':'o', 'ơ':'o', 'ờ':'o', 'ớ':'o', 'ợ':'o', 'ở':'o', 'ỡ':'o', 'ù':'u', 'ú':'u', 'ụ':'u', 'ủ':'u', 'ũ':'u', 'ư':'u', 'ừ':'u', 'ứ':'u', 'ự':'u', 'ử':'u', 'ữ':'u', 'ỳ':'y', 'ý':'y', 'ỵ':'y', 'ỷ':'y', 'ỡ':'y', 'đ':'d'};
                            return map[char] || char;
                        }).replace(/[^\w\s]/g, '');
                        
                        if (normalizedUser === normalizedCorrect) {
                            correctBlanks += 0.8; // Chấp nhận phiên bản bỏ dấu
                        } else if (normalizedCorrect.includes(normalizedUser) || normalizedUser.includes(normalizedCorrect)) {
                            correctBlanks += 0.5; // Chứa một phần
                        } else if (userAns.length > 0) {
                            correctBlanks += 0.2; // Có nỗ lực trả lời
                        }
                    }
                }
                
                // Điểm theo tỉ lệ số ô điền đúng
                if (blanks.length > 0) {
                     diem = correctBlanks / blanks.length;
                     correctCount += diem;
                }
            } else if (q.TenLoai === 'Tự luận') {
                const correctAnswerResult = await new sql.Request(transaction)
                    .input('QId', sql.Int, q.CauHoiId)
                    .query('SELECT NoiDung FROM DapAn WHERE CauHoiId = @QId AND LaDapAnDung = 1');
                
                const answerGuide = correctAnswerResult.recordset[0]?.NoiDung || '';
                
                // Chấm tương đối: xây dựng heuristic từ gợi ý đáp án
                if (answerGuide && typeof userAnswer === 'string' && userAnswer.trim().length > 0) {
                    // Loại bỏ dấu + ký tự đặc biệt, lọc từ khóa dài hơn 2 ký tự
                    const removeDiacritics = (str) => {
                        return str
                            .replace(/[àáạảãăằắặẳẵâầấậẩẫèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỡđ]/g, function(char){
                                const map = {'à':'a', 'á':'a', 'ạ':'a', 'ả':'a', 'ã':'a', 'ă':'a', 'ằ':'a', 'ắ':'a', 'ặ':'a', 'ẳ':'a', 'ẵ':'a', 'â':'a', 'ầ':'a', 'ấ':'a', 'ậ':'a', 'ẩ':'a', 'ẫ':'a', 'è':'e', 'é':'e', 'ẹ':'e', 'ẻ':'e', 'ẽ':'e', 'ê':'e', 'ề':'e', 'ế':'e', 'ệ':'e', 'ể':'e', 'ễ':'e', 'ì':'i', 'í':'i', 'ị':'i', 'ỉ':'i', 'ĩ':'i', 'ò':'o', 'ó':'o', 'ọ':'o', 'ỏ':'o', 'õ':'o', 'ô':'o', 'ồ':'o', 'ố':'o', 'ộ':'o', 'ổ':'o', '':'o', 'ơ':'o', 'ờ':'o', 'ớ':'o', 'ợ':'o', 'ở':'o', 'ỡ':'o', 'ù':'u', 'ú':'u', 'ụ':'u', 'ủ':'u', 'ũ':'u', 'ư':'u', 'ừ':'u', 'ứ':'u', 'ự':'u', 'ử':'u', 'ữ':'u', 'ỳ':'y', 'ý':'y', 'ỵ':'y', 'ỷ':'y', 'ỡ':'y', 'đ':'d'};
                                return map[char] || char;
                            })
                            .replace(/[^\w\s]/g, "");
                    };
                    
                    const normalizedGuide = removeDiacritics(answerGuide).toLowerCase();
                    const normalizedUser = removeDiacritics(userAnswer).toLowerCase();
                    const keywordsGuide = normalizedGuide.split(/\s+/).filter(w => w.length > 2);
                    const wordsUser = normalizedUser.split(/\s+/);
                    
                    if (keywordsGuide.length > 0) {
                        // Đếm từ khóa khớp
                        let matchCount = 0;
                        for (const kw of keywordsGuide) {
                            if (normalizedUser.includes(kw)) {
                                matchCount++;
                            }
                        }
                        
                        const matchRatio = matchCount / keywordsGuide.length;
                        
                        if (matchRatio >= 0.8) {
                            diem = 1.0; // Khớp 80% từ khóa → điểm tối đa
                        } else if (matchRatio >= 0.6) {
                            diem = 0.9; // Khớp 60% → 0.9
                        } else if (matchRatio >= 0.4) {
                            diem = 0.7; // Khớp 40% → 0.7
                        } else if (matchRatio > 0 && wordsUser.length > 5) {
                            diem = 0.5; // Khớp ít từ nhưng viết khá dài → 0.5
                        } else if (wordsUser.length > 8) {
                            diem = 0.3; // Viết dài nhưng ít khớp → 0.3
                        } else {
                            diem = 0.1; // Nỗ lực nhưng không khớp nhiều
                        }
                        
                        correctCount += diem;
                    } else {
                        // Gợi ý không có từ khóa → chấp nhận nếu viết dài
                        if (userAnswer.trim().length > 30) {
                            diem = 0.5;
                        } else if (userAnswer.trim().length > 15) {
                            diem = 0.3;
                        }
                        correctCount += diem;
                    }
                }
            }

            // Lưu chi tiết
            await new sql.Request(transaction)
                .input('BTId', sql.Int, baiThiId)
                .input('QId', sql.Int, q.CauHoiId)
                .input('AnswerText', sql.NVarChar, Array.isArray(userAnswer) ? userAnswer.join(', ') : userAnswer)
                .input('Diem', sql.Float, diem)
                .query('INSERT INTO ChiTietBaiThi (BaiThiId, CauHoiId, CauTraLoi, Diem) VALUES (@BTId, @QId, @AnswerText, @Diem)');
        }

        // 3. Cập nhật tổng điểm
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
            .input('Topic', sql.NVarChar, `%${name}%`)
            .query(`SELECT DeThiId, TieuDe, MaDeThi, MoTa, ThoiGianLamBai, NgayTao
                    FROM DeThi 
                    WHERE DaXuatBan = 1 AND (TieuDe LIKE @Topic OR MoTa LIKE @Topic)
                    ORDER BY NgayTao DESC`);

        res.json({ success: true, data: result.recordset });
    } catch (err) {
        console.error("Lỗi khi lấy đề thi theo chủ đề:", err);
        res.status(500).json({ message: "Lỗi khi lấy đề thi theo chủ đề", error: err.message });
    }
};