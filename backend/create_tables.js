const { sql, config } = require("./config/db");

(async function(){
    try{
        await sql.connect(config);
        await sql.query(`IF OBJECT_ID('BaiThi','U') IS NULL
            CREATE TABLE BaiThi (
                BaiThiId INT IDENTITY(1,1) PRIMARY KEY,
                DeThiId INT FOREIGN KEY REFERENCES DeThi(DeThiId),
                NguoiDungId INT FOREIGN KEY REFERENCES NguoiDung(NguoiDungId),
                NgayBatDau DATETIME DEFAULT GETDATE(),
                NgayNop DATETIME,
                Diem FLOAT,
                TrangThai NVARCHAR(20) DEFAULT 'Đang làm'
            )`);
        await sql.query(`IF OBJECT_ID('ChiTietBaiThi','U') IS NULL
            CREATE TABLE ChiTietBaiThi (
                ChiTietBaiThiId INT IDENTITY(1,1) PRIMARY KEY,
                BaiThiId INT FOREIGN KEY REFERENCES BaiThi(BaiThiId),
                CauHoiId INT FOREIGN KEY REFERENCES CauHoi(CauHoiId),
                CauTraLoi NVARCHAR(MAX),
                Diem FLOAT
            )`);
        console.log('tables ensured');
        process.exit(0);
    } catch(err){
        console.error('error creating tables', err);
        process.exit(1);
    }
})();