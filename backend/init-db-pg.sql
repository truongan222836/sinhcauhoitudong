-- PostgreSQL Schema for AQG System

-- 1. VaiTro
CREATE TABLE IF NOT EXISTS "VaiTro" (
    "VaiTroId" SERIAL PRIMARY KEY,
    "TenVaiTro" VARCHAR(50) NOT NULL
);

INSERT INTO "VaiTro" ("VaiTroId", "TenVaiTro") VALUES 
(1, 'Admin'), 
(2, 'Giảng viên'), 
(3, 'Sinh viên')
ON CONFLICT ("VaiTroId") DO NOTHING;

-- 2. NguoiDung
CREATE TABLE IF NOT EXISTS "NguoiDung" (
    "NguoiDungId" SERIAL PRIMARY KEY,
    "HoTen" VARCHAR(255) NOT NULL,
    "Email" VARCHAR(255) UNIQUE NOT NULL,
    "MatKhauHash" VARCHAR(255) NOT NULL,
    "VaiTroId" INTEGER REFERENCES "VaiTro"("VaiTroId")
);

-- 3. LoaiCauHoi
CREATE TABLE IF NOT EXISTS "LoaiCauHoi" (
    "LoaiId" SERIAL PRIMARY KEY,
    "TenLoai" VARCHAR(50) NOT NULL
);

INSERT INTO "LoaiCauHoi" ("LoaiId", "TenLoai") VALUES 
(1, 'Trắc nghiệm'), 
(2, 'Tự luận'), 
(3, 'Điền khuyết')
ON CONFLICT ("LoaiId") DO NOTHING;

-- 4. ChuDe
CREATE TABLE IF NOT EXISTS "ChuDe" (
    "ChuDeId" SERIAL PRIMARY KEY,
    "TenChuDe" VARCHAR(255) NOT NULL,
    "MoTa" TEXT
);

-- 5. CauHoi
CREATE TABLE IF NOT EXISTS "CauHoi" (
    "CauHoiId" SERIAL PRIMARY KEY,
    "NoiDung" TEXT NOT NULL,
    "LoaiId" INTEGER REFERENCES "LoaiCauHoi"("LoaiId"),
    "LoaiCauHoiId" INTEGER, -- Legacy field from some controllers
    "NguoiTaoId" INTEGER REFERENCES "NguoiDung"("NguoiDungId"),
    "ChuDeId" INTEGER REFERENCES "ChuDe"("ChuDeId"),
    "NgayTao" TIMESTAMP DEFAULT NOW()
);

-- 6. DapAn
CREATE TABLE IF NOT EXISTS "DapAn" (
    "DapAnId" SERIAL PRIMARY KEY,
    "CauHoiId" INTEGER REFERENCES "CauHoi"("CauHoiId") ON DELETE CASCADE,
    "NoiDung" TEXT NOT NULL,
    "LaDapAnDung" BOOLEAN DEFAULT FALSE
);

-- 7. DeThi
CREATE TABLE IF NOT EXISTS "DeThi" (
    "DeThiId" SERIAL PRIMARY KEY,
    "TieuDe" VARCHAR(255) NOT NULL,
    "MaDeThi" VARCHAR(20) UNIQUE NOT NULL,
    "NguoiTaoId" INTEGER REFERENCES "NguoiDung"("NguoiDungId"),
    "NgayTao" TIMESTAMP DEFAULT NOW(),
    "DaXuatBan" BOOLEAN DEFAULT FALSE,
    "ThoiGianLamBai" INTEGER NOT NULL,
    "MoTa" TEXT,
    "HanNop" TIMESTAMP,
    "ChuDeId" INTEGER REFERENCES "ChuDe"("ChuDeId")
);

-- 8. ChiTietDeThi
CREATE TABLE IF NOT EXISTS "ChiTietDeThi" (
    "ChiTietId" SERIAL PRIMARY KEY,
    "DeThiId" INTEGER REFERENCES "DeThi"("DeThiId") ON DELETE CASCADE,
    "CauHoiId" INTEGER REFERENCES "CauHoi"("CauHoiId"),
    "ThuTu" INTEGER
);

-- 9. BaiThi
CREATE TABLE IF NOT EXISTS "BaiThi" (
    "BaiThiId" SERIAL PRIMARY KEY,
    "DeThiId" INTEGER REFERENCES "DeThi"("DeThiId") ON DELETE CASCADE,
    "NguoiDungId" INTEGER REFERENCES "NguoiDung"("NguoiDungId"),
    "NgayBatDau" TIMESTAMP DEFAULT NOW(),
    "NgayNop" TIMESTAMP,
    "Diem" FLOAT DEFAULT 0,
    "score" FLOAT DEFAULT 0, -- Some controllers use score
    "TrangThai" VARCHAR(50) DEFAULT 'Đang làm',
    "status" VARCHAR(50), -- Some controllers use status
    "HoTen" VARCHAR(255),
    "Lop" VARCHAR(255),
    "MSSV" VARCHAR(50)
);

-- 10. ChiTietBaiThi
CREATE TABLE IF NOT EXISTS "ChiTietBaiThi" (
    "ChiTietBaiThiId" SERIAL PRIMARY KEY,
    "BaiThiId" INTEGER REFERENCES "BaiThi"("BaiThiId") ON DELETE CASCADE,
    "CauHoiId" INTEGER REFERENCES "CauHoi"("CauHoiId"),
    "CauTraLoi" TEXT,
    "Diem" FLOAT DEFAULT 0,
    UNIQUE("BaiThiId", "CauHoiId")
);

-- 11. PasswordResetTokens
CREATE TABLE IF NOT EXISTS "PasswordResetTokens" (
    "token_id" SERIAL PRIMARY KEY,
    "user_id" INTEGER REFERENCES "NguoiDung"("NguoiDungId") ON DELETE CASCADE,
    "reset_token" VARCHAR(255) NOT NULL,
    "expires_at" TIMESTAMP NOT NULL,
    "used" BOOLEAN DEFAULT FALSE
);

-- 12. Notifications
CREATE TABLE IF NOT EXISTS "Notifications" (
    "notification_id" SERIAL PRIMARY KEY,
    "user_id" INTEGER REFERENCES "NguoiDung"("NguoiDungId") ON DELETE CASCADE,
    "title" VARCHAR(255) NOT NULL,
    "message" TEXT,
    "link" VARCHAR(255),
    "is_read" BOOLEAN DEFAULT FALSE,
    "created_at" TIMESTAMP DEFAULT NOW()
);

-- 13. SupportRequests
CREATE TABLE IF NOT EXISTS "SupportRequests" (
    "support_id" SERIAL PRIMARY KEY,
    "user_id" INTEGER REFERENCES "NguoiDung"("NguoiDungId") ON DELETE CASCADE,
    "title" VARCHAR(255) NOT NULL,
    "message" TEXT,
    "status" VARCHAR(50) DEFAULT 'Chờ xử lý',
    "created_at" TIMESTAMP DEFAULT NOW()
);

-- 14. GiaHanBaiThi (Extension)
CREATE TABLE IF NOT EXISTS "GiaHanBaiThi" (
    "GiaHanId" SERIAL PRIMARY KEY,
    "DeThiId" INTEGER REFERENCES "DeThi"("DeThiId") ON DELETE CASCADE,
    "MSSV" VARCHAR(50) NOT NULL,
    "HanNopMoi" TIMESTAMP NOT NULL,
    UNIQUE("DeThiId", "MSSV")
);
