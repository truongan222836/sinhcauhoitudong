const { sql, config } = require('./config/db');

async function updateSchema() {
    try {
        await sql.connect(config);
        console.log("Connected to DB");

        // Update BaiThi (ExamAttempts)
        await sql.query(`
            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('BaiThi') AND name = 'HoTen')
            ALTER TABLE BaiThi ADD HoTen NVARCHAR(255);
            
            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('BaiThi') AND name = 'Lop')
            ALTER TABLE BaiThi ADD Lop NVARCHAR(50);
            
            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('BaiThi') AND name = 'MSSV')
            ALTER TABLE BaiThi ADD MSSV NVARCHAR(50);
            
            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('BaiThi') AND name = 'TrangThai')
            ALTER TABLE BaiThi ADD TrangThai NVARCHAR(50) DEFAULT N'Đang làm';
            
            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('BaiThi') AND name = 'NgayBatDau')
            ALTER TABLE BaiThi ADD NgayBatDau DATETIME DEFAULT GETDATE();
        `);

        // Update ChiTietBaiThi (ExamAnswers)
        await sql.query(`
            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('ChiTietBaiThi') AND name = 'Diem')
            ALTER TABLE ChiTietBaiThi ADD Diem FLOAT;
            
            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('ChiTietBaiThi') AND name = 'CauTraLoi')
            ALTER TABLE ChiTietBaiThi ADD CauTraLoi NVARCHAR(MAX);
        `);

        console.log("Schema updated successfully");
        process.exit(0);
    } catch (err) {
        console.error("Schema update failed:", err);
        process.exit(1);
    }
}

updateSchema();
