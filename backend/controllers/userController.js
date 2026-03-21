const { pool } = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const SECRET_KEY = process.env.JWT_SECRET || "AQG_SECRET_KEY_123";

exports.register = async (req, res) => {
    try {
        const { fullname, email, password, role } = req.body;

        // Hash mật khẩu
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Lấy RoleId dựa trên role string
        let roleId = 3;
        if (role === 'lecturer') roleId = 2;
        if (role === 'admin') roleId = 1;

        await pool.query(
            "INSERT INTO \"NguoiDung\" (\"HoTen\", \"Email\", \"MatKhauHash\", \"VaiTroId\") VALUES ($1, $2, $3, $4)",
            [fullname, email, hashedPassword, roleId]
        );

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

        const result = await pool.query("SELECT * FROM \"NguoiDung\" WHERE \"Email\" = $1", [email]);
        const user = result.rows[0];

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
        const result = await pool.query(
            "SELECT \"NguoiDungId\", \"HoTen\", \"Email\", \"VaiTroId\" FROM \"NguoiDung\" WHERE \"NguoiDungId\" = $1",
            [req.user.id]
        );
        const user = result.rows[0];

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
        let query = "UPDATE \"NguoiDung\" SET \"HoTen\" = $1";
        let params = [fullname];

        if (password) {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);
            params.push(hashedPassword);
            query += ", \"MatKhauHash\" = $" + params.length;
        }

        params.push(req.user.id);
        query += " WHERE \"NguoiDungId\" = $" + params.length;

        await pool.query(query, params);

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

        const userResult = await pool.query("SELECT \"VaiTroId\" FROM \"NguoiDung\" WHERE \"NguoiDungId\" = $1", [userId]);
        const roleId = userResult.rows[0]?.VaiTroId || 3;

        if (roleId === 3) {
            // === STATS CHO SINH VIÊN ===
            const quizzesRes = await pool.query(`
                SELECT b."BaiThiId", b."Diem", 
                       (SELECT COUNT(*) FROM "ChiTietBaiThi" cbt WHERE cbt."BaiThiId" = b."BaiThiId") as "totalQuestions"
                FROM "BaiThi" b
                WHERE b."NguoiDungId" = $1 AND b."TrangThai" = 'Đã nộp'
            `, [userId]);

            const exams = quizzesRes.rows;
            let totalScore = 0;
            let passCount = 0;
            
            exams.forEach(exam => {
                const score = parseFloat(exam.Diem) || 0;
                const questions = parseInt(exam.totalQuestions) || 0;
                totalScore += score;
                if (questions > 0 && (score / questions) >= 0.5) {
                    passCount++;
                }
            });

            const examCount = exams.length;
            const avgScore = examCount > 0 ? (totalScore / examCount).toFixed(2) : 0;
            const passRate = examCount > 0 ? ((passCount / examCount) * 100).toFixed(1) : 0;

            res.json({
                isStudent: true,
                totalExams: examCount,
                totalScore: totalScore.toFixed(2),
                averageScore: avgScore,
                passRate: passRate,
                passCount: passCount,
                failCount: examCount - passCount
            });
        } else {
            // === STATS CHO GIÁO VIÊN/ADMIN ===
            const questionsRes = await pool.query("SELECT COUNT(*) as \"totalQuestions\" FROM \"CauHoi\" WHERE \"NguoiTaoId\" = $1", [userId]);
            const quizzesRes = await pool.query("SELECT COUNT(*) as \"totalQuizzes\" FROM \"DeThi\" WHERE \"NguoiTaoId\" = $1", [userId]);
            
            let usageCount = 0;
            try {
                const usageRes = await pool.query(
                    "SELECT COUNT(*) as \"usageCount\" FROM \"BaiThi\" WHERE \"NguoiDungId\" = $1 AND \"TrangThai\" = 'Đã nộp'",
                    [userId]
                );
                usageCount = usageRes.rows[0].usageCount;
            } catch (e) {
                console.warn("[Stats API] Cannot query BaiThi:", e.message);
            }

            res.json({
                isStudent: false,
                totalQuestions: parseInt(questionsRes.rows[0].totalQuestions),
                totalQuizzes: parseInt(quizzesRes.rows[0].totalQuizzes),
                usageCount: parseInt(usageCount)
            });
        }
    } catch (err) {
        console.error("[Stats API] Error:", err);
        res.status(500).json({ message: "Lỗi khi lấy thống kê", error: err.message });
    }
};

exports.getUserHistory = async (req, res) => {
    try {
        const userId = req.user.id;
        const result = await pool.query(`
            SELECT 
                b."BaiThiId",
                d."TieuDe" as "quizTitle",
                b."Diem" as score,
                (SELECT COUNT(*) FROM "ChiTietBaiThi" cbt WHERE cbt."BaiThiId" = b."BaiThiId") as "totalQuestions",
                b."NgayNop"
            FROM "BaiThi" b
            JOIN "DeThi" d ON b."DeThiId" = d."DeThiId"
            WHERE b."NguoiDungId" = $1
            ORDER BY b."NgayNop" DESC
        `, [userId]);

        const history = result.rows.map(item => ({
            quizTitle: item.quizTitle,
            score: item.score || 0,
            totalQuestions: parseInt(item.totalQuestions) || 0,
            completedAt: item.NgayNop
        }));

        res.json({ success: true, data: history });
    } catch (err) {
        console.error("Lỗi khi lấy lịch sử:", err);
        res.status(500).json({ message: "Lỗi khi lấy lịch sử làm bài", error: err.message });
    }
};

exports.getLeaderboard = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                u."NguoiDungId" as "userId",
                u."HoTen" as fullname, 
                SUM(b."Diem")::FLOAT as "totalPoints",
                COUNT(b."BaiThiId") as "examsCount"
            FROM "NguoiDung" u
            JOIN "BaiThi" b ON u."NguoiDungId" = b."NguoiDungId"
            WHERE b."TrangThai" = 'Đã nộp'
            GROUP BY u."NguoiDungId", u."HoTen"
            ORDER BY "totalPoints" DESC
            LIMIT 5
        `);
        res.json({ success: true, data: result.rows });
    } catch (err) {
        console.error("Lỗi khi lấy bảng xếp hạng:", err);
        res.status(500).json({ message: "Lỗi khi lấy bảng xếp hạng", error: err.message });
    }
};

exports.getRecentActivity = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                u."NguoiDungId" as "userId",
                u."HoTen" as fullname, 
                d."TieuDe" as "quizTitle", 
                b."NgayNop" as time,
                b."Diem" as score
            FROM "BaiThi" b
            JOIN "NguoiDung" u ON b."NguoiDungId" = u."NguoiDungId"
            JOIN "DeThi" d ON b."DeThiId" = d."DeThiId"
            WHERE b."TrangThai" = 'Đã nộp'
            ORDER BY b."NgayNop" DESC
            LIMIT 5
        `);
        res.json({ success: true, data: result.rows });
    } catch (err) {
        console.error("Lỗi khi lấy hoạt động gần đây:", err);
        res.status(500).json({ message: "Lỗi khi lấy hoạt động gần đây", error: err.message });
    }
};

exports.getPublicProfile = async (req, res) => {
    try {
        const targetUserId = parseInt(req.params.id);
        
        const userResult = await pool.query(
            "SELECT \"NguoiDungId\", \"HoTen\", \"Email\", \"VaiTroId\" FROM \"NguoiDung\" WHERE \"NguoiDungId\" = $1",
            [targetUserId]
        );
            
        if (userResult.rows.length === 0) {
            return res.status(404).json({ message: "User not found" });
        }
        const user = userResult.rows[0];

        let quizzes = [];
        if (user.VaiTroId === 1 || user.VaiTroId === 2) {
            const qResult = await pool.query(`
                SELECT "DeThiId", "TieuDe", "ThoiGianLamBai", "NgayTao" 
                FROM "DeThi" 
                WHERE "NguoiTaoId" = $1 AND "DaXuatBan" = true
                ORDER BY "NgayTao" DESC
            `, [targetUserId]);
            quizzes = qResult.rows;
        }

        const statsResult = await pool.query(`
             SELECT COUNT(b."BaiThiId") as "examsCount", SUM(b."Diem") as "totalPoints"
             FROM "BaiThi" b
             WHERE b."NguoiDungId" = $1 AND b."TrangThai" = 'Đã nộp'
        `, [targetUserId]);
            
        const stats = statsResult.rows[0];

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
                    totalQuizzesCreated: quizzes.length,
                    examsCount: parseInt(stats.examsCount) || 0,
                    totalPoints: parseFloat(stats.totalPoints) || 0
                },
                quizzes: quizzes
            }
        });
    } catch (err) {
        console.error("Error getPublicProfile:", err);
        res.status(500).json({ message: "Error fetching public profile", error: err.message });
    }
};