const { sql, config } = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const SECRET_KEY = "AQG_SECRET_KEY_123"; // Nên lưu trong biến môi trường .env

exports.register = async (req, res) => {
    try {
        const { fullname, email, password, role } = req.body;

        // Hash mật khẩu
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        await sql.connect(config);
        const request = new sql.Request();

        // Lấy RoleId dựa trên role string (client gửi 'lecturer' hoặc 'student')
        // Mặc định là Student (3) nếu không khớp
        let roleId = 3;
        if (role === 'lecturer') roleId = 2;
        if (role === 'admin') roleId = 1;

        request.input("HoTen", sql.NVarChar, fullname);
        request.input("Email", sql.VarChar, email);
        request.input("MatKhauHash", sql.VarChar, hashedPassword);
        request.input("VaiTroId", sql.Int, roleId);

        await request.query("INSERT INTO NguoiDung (HoTen, Email, MatKhauHash, VaiTroId) VALUES (@HoTen, @Email, @MatKhauHash, @VaiTroId)");

        res.status(201).json({ message: "Đăng ký thành công!" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Lỗi server", error: err.message });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log(`[Login] Attempt: ${email}`);

        await sql.connect(config);
        const request = new sql.Request();
        request.input("Email", sql.VarChar, email);

        const result = await request.query("SELECT * FROM NguoiDung WHERE Email = @Email");
        const user = result.recordset[0];

        if (!user) {
            return res.status(400).json({ message: "Email không tồn tại" });
        }

        const isMatch = await bcrypt.compare(password, user.MatKhauHash);
        if (!isMatch) {
            return res.status(400).json({ message: "Mật khẩu không đúng" });
        }

        // Tạo token
        const token = jwt.sign({ id: user.NguoiDungId, roleId: user.VaiTroId }, SECRET_KEY, { expiresIn: "1h" });

        console.log(`[Login] Success: ${email}`);
        res.json({
            message: "Đăng nhập thành công",
            token,
            user: { id: user.NguoiDungId, fullname: user.HoTen, roleId: user.VaiTroId }
        });

    } catch (err) {
        console.error(`[Login] Error for ${req.body.email}:`, err);
        res.status(500).json({ message: "Lỗi server", error: err.message });
    }
};

exports.getUserProfile = async (req, res) => {
    try {
        await sql.connect(config);
        const request = new sql.Request();
        request.input("UserId", sql.Int, req.user.id);

        const result = await request.query("SELECT NguoiDungId, HoTen, Email, VaiTroId FROM NguoiDung WHERE NguoiDungId = @UserId");
        const user = result.recordset[0];

        if (user) {
            res.json(user);
        } else {
            res.status(404).json({ message: "Không tìm thấy người dùng" });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Lỗi server" });
    }
};

exports.updateUserProfile = async (req, res) => {
    try {
        const { fullname, password } = req.body;

        await sql.connect(config);
        const request = new sql.Request();
        request.input("UserId", sql.Int, req.user.id);
        request.input("HoTen", sql.NVarChar, fullname);

        let query = "UPDATE NguoiDung SET HoTen = @HoTen";

        if (password) {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);
            request.input("MatKhauHash", sql.VarChar, hashedPassword);
            query += ", MatKhauHash = @MatKhauHash";
        }

        query += " WHERE NguoiDungId = @UserId";

        await request.query(query);

        res.json({ message: "Cập nhật thông tin thành công!" });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Lỗi server" });
    }
};

exports.getUserStats = async (req, res) => {
    try {
        const userId = req.user.id;
        console.log(`[Stats API] Fetching stats for user ${userId}`);

        const pool = await sql.connect(config);

        // Kiểm tra role để trả về stats khác nhau
        const userRequest = new sql.Request(pool);
        userRequest.input("UserId", sql.Int, userId);
        const userResult = await userRequest.query(`
            SELECT VaiTroId FROM NguoiDung WHERE NguoiDungId = @UserId
        `);
        const roleId = userResult.recordset[0]?.VaiTroId || 3;
        console.log(`[Stats API] User role: ${roleId}`);

        if (roleId === 3) {
            // === STATS CHO SINH VIÊN ===
            const examRequest = new sql.Request(pool);
            examRequest.input("UserId", sql.Int, userId);
            const quizzes = await examRequest.query(`
                SELECT b.BaiThiId, b.Diem, 
                       (SELECT COUNT(*) FROM ChiTietBaiThi cbt WHERE cbt.BaiThiId = b.BaiThiId) as totalQuestions
                FROM BaiThi b
                WHERE b.NguoiDungId = @UserId AND b.TrangThai = N'Đã nộp'
            `);

            const exams = quizzes.recordset;
            console.log(`[Stats API] Found ${exams.length} exams for student`);
            
            let totalScore = 0;
            let totalQuestions = 0;
            let passCount = 0;
            
            exams.forEach(exam => {
                const score = exam.Diem || 0;
                const questions = exam.totalQuestions || 0;
                totalScore += score;
                totalQuestions += questions;
                
                // Tính tỉ lệ: nếu score/questions >= 0.5 thì đạt
                if (questions > 0 && (score / questions) >= 0.5) {
                    passCount++;
                }
            });

            const examCount = exams.length;
            const avgScore = examCount > 0 ? (totalScore / examCount).toFixed(2) : 0;
            const passRate = examCount > 0 ? ((passCount / examCount) * 100).toFixed(1) : 0;

            const stats = {
                isStudent: true,
                totalExams: examCount,
                totalScore: totalScore.toFixed(2),
                averageScore: avgScore,
                passRate: passRate,
                passCount: passCount,
                failCount: examCount - passCount
            };
            
            console.log(`[Stats API] Returning student stats:`, stats);
            res.json(stats);
        } else {
            // === STATS CHO GIÁO VIÊN/ADMIN ===
            // Đếm số câu hỏi đã tạo
            const qRequest = new sql.Request(pool);
            qRequest.input("UserId", sql.Int, userId);
            const questionsResult = await qRequest.query(`
                SELECT COUNT(*) as totalQuestions 
                FROM CauHoi 
                WHERE NguoiTaoId = @UserId
            `);

            // Đếm số đề thi đã tạo
            const dRequest = new sql.Request(pool);
            dRequest.input("UserId", sql.Int, userId);
            const quizzesResult = await dRequest.query(`
                SELECT COUNT(*) as totalQuizzes 
                FROM DeThi 
                WHERE NguoiTaoId = @UserId
            `);

            // Đếm số lần sử dụng (bài thi đã nộp)
            let usageCount = 0;
            try {
                const uRequest = new sql.Request(pool);
                uRequest.input("UserId", sql.Int, userId);
                const usageResult = await uRequest.query(`
                    IF OBJECT_ID('BaiThi','U') IS NOT NULL
                    BEGIN
                        SELECT COUNT(*) as usageCount 
                        FROM BaiThi 
                        WHERE NguoiDungId = @UserId AND TrangThai = N'Đã nộp'
                    END
                    ELSE
                        SELECT 0 as usageCount
                `);
                usageCount = usageResult.recordset[0].usageCount;
            } catch (innerErr) {
                console.warn("[Stats API] Cannot query BaiThi:", innerErr.message);
                usageCount = 0;
            }

            const stats = {
                isStudent: false,
                totalQuestions: questionsResult.recordset[0].totalQuestions,
                totalQuizzes: quizzesResult.recordset[0].totalQuizzes,
                usageCount: usageCount
            };
            
            console.log(`[Stats API] Returning lecturer stats:`, stats);
            res.json(stats);
        }

    } catch (err) {
        console.error("[Stats API] Error:", err);
        res.status(500).json({ message: "Lỗi khi lấy thống kê", error: err.message });
    }
};

exports.getUserHistory = async (req, res) => {
    try {
        const userId = req.user.id;

        await sql.connect(config);
        const request = new sql.Request();
        request.input("UserId", sql.Int, userId);

        // nếu không có bảng BaiThi trả về mảng rỗng
        const query = `
            IF OBJECT_ID('BaiThi','U') IS NOT NULL
            BEGIN
                SELECT 
                    b.BaiThiId,
                    d.TieuDe as quizTitle,
                    b.Diem as score,
                    (SELECT COUNT(*) FROM ChiTietBaiThi cbt WHERE cbt.BaiThiId = b.BaiThiId) as totalQuestions,
                    b.NgayNop
                FROM BaiThi b
                JOIN DeThi d ON b.DeThiId = d.DeThiId
                WHERE b.NguoiDungId = @UserId
                ORDER BY b.NgayNop DESC
            END
            ELSE
                SELECT TOP 0 '' as quizTitle, 0 as score, 0 as totalQuestions, GETDATE() as NgayNop
        `;

        const result = await request.query(query);
        console.log(`Lịch sử cho User ${userId}: found ${result.recordset.length} records`);

        const history = result.recordset.map(item => ({
            quizTitle: item.quizTitle,
            score: item.score || 0,
            totalQuestions: item.totalQuestions || 0,
            completedAt: item.NgayNop
        }));
        console.log("Mapped History:", JSON.stringify(history));

        res.json({ success: true, data: history });

    } catch (err) {
        console.error("Lỗi khi lấy lịch sử:", err);
        res.status(500).json({ message: "Lỗi khi lấy lịch sử làm bài", error: err.message });
    }
};

exports.getLeaderboard = async (req, res) => {
    try {
        const pool = await sql.connect(config);
        const result = await pool.request().query(`
            SELECT TOP 5 
                u.NguoiDungId as userId,
                u.HoTen as fullname, 
                CAST(SUM(b.Diem) AS FLOAT) as totalPoints,
                COUNT(b.BaiThiId) as examsCount
            FROM NguoiDung u
            JOIN BaiThi b ON u.NguoiDungId = b.NguoiDungId
            WHERE b.TrangThai = N'Đã nộp'
            GROUP BY u.NguoiDungId, u.HoTen
            ORDER BY totalPoints DESC
        `);
        res.json({ success: true, data: result.recordset });
    } catch (err) {
        console.error("Lỗi khi lấy bảng xếp hạng:", err);
        res.status(500).json({ message: "Lỗi khi lấy bảng xếp hạng", error: err.message });
    }
};

exports.getRecentActivity = async (req, res) => {
    try {
        const pool = await sql.connect(config);
        const result = await pool.request().query(`
            SELECT TOP 5 
                u.NguoiDungId as userId,
                u.HoTen as fullname, 
                d.TieuDe as quizTitle, 
                b.NgayNop as time,
                b.Diem as score
            FROM BaiThi b
            JOIN NguoiDung u ON b.NguoiDungId = u.NguoiDungId
            JOIN DeThi d ON b.DeThiId = d.DeThiId
            WHERE b.TrangThai = N'Đã nộp'
            ORDER BY b.NgayNop DESC
        `);
        res.json({ success: true, data: result.recordset });
    } catch (err) {
        console.error("Lỗi khi lấy hoạt động gần đây:", err);
        res.status(500).json({ message: "Lỗi khi lấy hoạt động gần đây", error: err.message });
    }
};

exports.getPublicProfile = async (req, res) => {
    try {
        const targetUserId = parseInt(req.params.id);
        const pool = await sql.connect(config);
        
        // 1. Get user info
        const userResult = await pool.request()
            .input("UserId", sql.Int, targetUserId)
            .query("SELECT NguoiDungId, HoTen, Email, VaiTroId FROM NguoiDung WHERE NguoiDungId = @UserId");
            
        if (userResult.recordset.length === 0) {
            return res.status(404).json({ message: "User not found" });
        }
        const user = userResult.recordset[0];

        // 2. Get their created quizzes (if lecturer/admin)
        let quizzes = [];
        let totalCreated = 0;
        if (user.VaiTroId === 1 || user.VaiTroId === 2) {
            const qResult = await pool.request()
                .input("UserId", sql.Int, targetUserId)
                .query(`
                    SELECT DeThiId, TieuDe, ThoiGianLamBai, NgayTao 
                    FROM DeThi 
                    WHERE NguoiTaoId = @UserId AND DaXuatBan = 1
                    ORDER BY NgayTao DESC
                `);
            quizzes = qResult.recordset;
            totalCreated = quizzes.length;
        }

        // 3. Get total points & exams done if student (or any)
        const statsResult = await pool.request()
            .input("UserId", sql.Int, targetUserId)
            .query(`
                 SELECT COUNT(b.BaiThiId) as examsCount, SUM(b.Diem) as totalPoints
                 FROM BaiThi b
                 WHERE b.NguoiDungId = @UserId AND b.TrangThai = N'Đã nộp'
            `);
            
        const stats = statsResult.recordset[0];

        res.json({
            success: true,
            data: {
                user: {
                    id: user.NguoiDungId,
                    fullname: user.HoTen,
                    email: user.Email,
                    roleId: user.VaiTroId
                },
                stats: {
                    totalQuizzesCreated: totalCreated,
                    examsCount: stats.examsCount || 0,
                    totalPoints: stats.totalPoints || 0
                },
                quizzes: quizzes
            }
        });
    } catch (err) {
        console.error("Error getPublicProfile:", err);
        res.status(500).json({ message: "Error fetching public profile", error: err.message });
    }
};