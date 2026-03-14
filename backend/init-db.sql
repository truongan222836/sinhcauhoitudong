CREATE DATABASE HETHONGSINHCAUHOITUDONG;
GO

USE HETHONGSINHCAUHOITUDONG;
GO

CREATE TABLE VaiTro (
    VaiTroId INT PRIMARY KEY,
    TenVaiTro NVARCHAR(50)
);

INSERT INTO VaiTro (VaiTroId, TenVaiTro) VALUES (1, 'Admin'), (2, 'Giảng viên'), (3, 'Sinh viên');

CREATE TABLE NguoiDung (
    NguoiDungId INT IDENTITY(1,1) PRIMARY KEY,
    HoTen NVARCHAR(255) NOT NULL,
    Email VARCHAR(255) UNIQUE NOT NULL,
    MatKhauHash VARCHAR(255) NOT NULL,
    VaiTroId INT FOREIGN KEY REFERENCES VaiTro(VaiTroId)
);
GO

-- Thêm dữ liệu mẫu
INSERT INTO NguoiDung (HoTen, Email, MatKhauHash, VaiTroId) 
VALUES 
('Admin', 'admin@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 1), -- password: password
('Giảng viên A', 'lecturer@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 2), -- password: password
('Sinh viên A', 'student@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 3); -- password: password

-- Tạo bảng LoaiCauHoi nếu chưa có
CREATE TABLE LoaiCauHoi (
    LoaiId INT PRIMARY KEY,
    TenLoai NVARCHAR(50)
);

INSERT INTO LoaiCauHoi (LoaiId, TenLoai) VALUES (1, 'Trắc nghiệm'), (2, 'Tự luận'), (3, 'Điền khuyết');

-- Tạo bảng CauHoi
CREATE TABLE CauHoi (
    CauHoiId INT IDENTITY(1,1) PRIMARY KEY,
    NoiDung NVARCHAR(MAX) NOT NULL,
    LoaiId INT FOREIGN KEY REFERENCES LoaiCauHoi(LoaiId),
    NguoiTaoId INT FOREIGN KEY REFERENCES NguoiDung(NguoiDungId),
    NgayTao DATETIME DEFAULT GETDATE()
);

-- Tạo bảng DeThi
CREATE TABLE DeThi (
    DeThiId INT IDENTITY(1,1) PRIMARY KEY,
    TieuDe NVARCHAR(255) NOT NULL,
    MaDeThi VARCHAR(10) UNIQUE NOT NULL,
    NguoiTaoId INT FOREIGN KEY REFERENCES NguoiDung(NguoiDungId),
    NgayTao DATETIME DEFAULT GETDATE(),
    DaXuatBan BIT DEFAULT 0,
    ThoiGianLamBai INT DEFAULT 60, -- phút
    MoTa NVARCHAR(MAX)
);

-- Tạo bảng ChiTietDeThi
CREATE TABLE ChiTietDeThi (
    ChiTietId INT IDENTITY(1,1) PRIMARY KEY,
    DeThiId INT FOREIGN KEY REFERENCES DeThi(DeThiId),
    CauHoiId INT FOREIGN KEY REFERENCES CauHoi(CauHoiId),
    ThuTu INT
);

-- Tạo bảng BaiThi
CREATE TABLE BaiThi (
    BaiThiId INT IDENTITY(1,1) PRIMARY KEY,
    DeThiId INT FOREIGN KEY REFERENCES DeThi(DeThiId),
    NguoiDungId INT FOREIGN KEY REFERENCES NguoiDung(NguoiDungId),
    NgayBatDau DATETIME DEFAULT GETDATE(),
    NgayNop DATETIME,
    Diem FLOAT,
    TrangThai NVARCHAR(20) DEFAULT 'Đang làm' -- 'Đang làm', 'Đã nộp', 'Hết thời gian'
);

-- Tạo bảng ChiTietBaiThi
CREATE TABLE ChiTietBaiThi (
    ChiTietBaiThiId INT IDENTITY(1,1) PRIMARY KEY,
    BaiThiId INT FOREIGN KEY REFERENCES BaiThi(BaiThiId),
    CauHoiId INT FOREIGN KEY REFERENCES CauHoi(CauHoiId),
    CauTraLoi NVARCHAR(MAX),
    Diem FLOAT
);
-- Tạo bảng DapAn (Chứa các lựa chọn cho câu hỏi trắc nghiệm)
CREATE TABLE DapAn (
    DapAnId INT IDENTITY(1,1) PRIMARY KEY,
    CauHoiId INT FOREIGN KEY REFERENCES CauHoi(CauHoiId),
    NoiDung NVARCHAR(MAX) NOT NULL,
    LaDapAnDung BIT DEFAULT 0
);
GO
