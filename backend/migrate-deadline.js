const { sql, config } = require('./config/db');

async function migrate() {
    try {
        await sql.connect(config);
        console.log("Connected to DB");

        await sql.query(`
            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('DeThi') AND name = 'HanNop')
            ALTER TABLE DeThi ADD HanNop DATETIME;
            
            IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'GiaHanBaiThi')
            CREATE TABLE GiaHanBaiThi (
                GiaHanId INT PRIMARY KEY IDENTITY,
                DeThiId INT,
                MSSV NVARCHAR(50),
                HanNopMoi DATETIME
            );
        `);
        console.log("Migration successful");
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
migrate();
