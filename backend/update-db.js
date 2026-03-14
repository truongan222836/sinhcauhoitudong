const { sql, config } = require('./config/db');

async function updateDb() {
    try {
        const pool = await sql.connect(config);
        
        // Check if ChuDe exists
        const checkTable = await pool.request().query(`
            SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'ChuDe'
        `);

        if (checkTable.recordset.length === 0) {
            console.log("Tạo bảng ChuDe...");
            await pool.request().query(`
                CREATE TABLE ChuDe (
                    ChuDeId INT IDENTITY(1,1) PRIMARY KEY,
                    TenChuDe NVARCHAR(255) NOT NULL,
                    MoTa NVARCHAR(MAX),
                    NgayTao DATETIME DEFAULT GETDATE()
                );
            `);

            console.log("Thêm ChuDeId vào DeThi...");
            await pool.request().query(`
                ALTER TABLE DeThi ADD ChuDeId INT FOREIGN KEY REFERENCES ChuDe(ChuDeId);
            `);

            console.log("Thêm dữ liệu ChuDe...");
            await pool.request().query(`
                INSERT INTO ChuDe (TenChuDe, MoTa) VALUES 
                (N'Lịch sử Việt Nam', N'Các câu hỏi về lịch sử Việt Nam'),
                (N'Toán Cao Cấp', N'Toán học đại cương cho sinh viên'),
                (N'Triết học', N'Triết học Mác - Lênin'),
                (N'Tiếng Anh', N'Ngữ pháp và từ vựng cơ bản'),
                (N'Vật lý', N'Vật lý đại cương'),
                (N'Hóa học', N'Hóa học đại cương'),
                (N'Lập trình Web', N'Web programming NodeJS, ReactJS');
            `);
            console.log("Cập nhật Database thành công!");
        } else {
            console.log("Bảng ChuDe đã tồn tại.");
        }
        process.exit(0);
    } catch (err) {
        console.error("Lỗi:", err);
        process.exit(1);
    }
}

updateDb();
