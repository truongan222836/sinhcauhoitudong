-- Tạo database nếu chưa có
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'HETHONGSINHCAUHOITUDONG')
BEGIN
    CREATE DATABASE HETHONGSINHCAUHOITUDONG;
END
GO

USE HETHONGSINHCAUHOITUDONG;
GO

-- Tạo bảng VaiTro nếu chưa có
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='VaiTro' AND xtype='U')
BEGIN
    CREATE TABLE VaiTro (
        VaiTroId INT PRIMARY KEY,
        TenVaiTro NVARCHAR(50)
    );
END
GO

-- Insert dữ liệu VaiTro nếu chưa có
IF NOT EXISTS (SELECT * FROM VaiTro)
BEGIN
    SET IDENTITY_INSERT VaiTro ON;
    INSERT INTO VaiTro (VaiTroId, TenVaiTro) VALUES (1, 'Admin'), (2, 'Giảng viên'), (3, 'Sinh viên');
    SET IDENTITY_INSERT VaiTro OFF;
END
GO

-- Tạo bảng NguoiDung nếu chưa có
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='NguoiDung' AND xtype='U')
BEGIN
    CREATE TABLE NguoiDung (
        NguoiDungId INT IDENTITY(1,1) PRIMARY KEY,
        HoTen NVARCHAR(255) NOT NULL,
        Email VARCHAR(255) UNIQUE NOT NULL,
        MatKhauHash VARCHAR(255) NOT NULL,
        VaiTroId INT FOREIGN KEY REFERENCES VaiTro(VaiTroId)
    );
END
GO

-- Thêm dữ liệu mẫu NguoiDung nếu chưa có
IF NOT EXISTS (SELECT * FROM NguoiDung WHERE Email = 'admin@example.com')
BEGIN
    SET IDENTITY_INSERT NguoiDung ON;
    INSERT INTO NguoiDung (NguoiDungId, HoTen, Email, MatKhauHash, VaiTroId)
    VALUES (1, 'Admin', 'admin@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 1);
    SET IDENTITY_INSERT NguoiDung OFF;
END
GO

IF NOT EXISTS (SELECT * FROM NguoiDung WHERE Email = 'lecturer@example.com')
BEGIN
    INSERT INTO NguoiDung (HoTen, Email, MatKhauHash, VaiTroId)
    VALUES ('Giảng viên A', 'lecturer@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 2);
END
GO

IF NOT EXISTS (SELECT * FROM NguoiDung WHERE Email = 'student@example.com')
BEGIN
    INSERT INTO NguoiDung (HoTen, Email, MatKhauHash, VaiTroId)
    VALUES ('Sinh viên A', 'student@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 3);
END
GO

-- Tạo bảng LoaiCauHoi nếu chưa có
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='LoaiCauHoi' AND xtype='U')
BEGIN
    CREATE TABLE LoaiCauHoi (
        LoaiId INT PRIMARY KEY,
        TenLoai NVARCHAR(50)
    );
END
GO

-- Insert dữ liệu LoaiCauHoi nếu chưa có
IF NOT EXISTS (SELECT * FROM LoaiCauHoi)
BEGIN
    INSERT INTO LoaiCauHoi (TenLoai, MaLoai, LoaiId) 
    VALUES (N'Trắc nghiệm', 'TN', 1), (N'Tự luận', 'TL', 2), (N'Điền khuyết', 'DK', 3);
END
GO

-- Tạo bảng CauHoi nếu chưa có
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='CauHoi' AND xtype='U')
BEGIN
    CREATE TABLE CauHoi (
        CauHoiId INT IDENTITY(1,1) PRIMARY KEY,
        NoiDung NVARCHAR(MAX) NOT NULL,
        LoaiId INT FOREIGN KEY REFERENCES LoaiCauHoi(LoaiId),
        NguoiTaoId INT FOREIGN KEY REFERENCES NguoiDung(NguoiDungId),
        NgayTao DATETIME DEFAULT GETDATE()
    );
END
GO

-- Tạo bảng DeThi nếu chưa có
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='DeThi' AND xtype='U')
BEGIN
    CREATE TABLE DeThi (
        DeThiId INT IDENTITY(1,1) PRIMARY KEY,
        TieuDe NVARCHAR(255) NOT NULL,
        MaDeThi VARCHAR(10) UNIQUE NOT NULL,
        NguoiTaoId INT FOREIGN KEY REFERENCES NguoiDung(NguoiDungId),
        NgayTao DATETIME DEFAULT GETDATE(),
        DaXuatBan BIT DEFAULT 0,
        ThoiGianLamBai INT DEFAULT 60,
        MoTa NVARCHAR(MAX)
    );
END
GO

-- Tạo bảng ChiTietDeThi nếu chưa có
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='ChiTietDeThi' AND xtype='U')
BEGIN
    CREATE TABLE ChiTietDeThi (
        ChiTietId INT IDENTITY(1,1) PRIMARY KEY,
        DeThiId INT FOREIGN KEY REFERENCES DeThi(DeThiId),
        CauHoiId INT FOREIGN KEY REFERENCES CauHoi(CauHoiId),
        ThuTu INT
    );
END
GO

-- Tạo bảng BaiThi nếu chưa có
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='BaiThi' AND xtype='U')
BEGIN
    CREATE TABLE BaiThi (
        BaiThiId INT IDENTITY(1,1) PRIMARY KEY,
        DeThiId INT FOREIGN KEY REFERENCES DeThi(DeThiId),
        NguoiDungId INT FOREIGN KEY REFERENCES NguoiDung(NguoiDungId),
        NgayBatDau DATETIME DEFAULT GETDATE(),
        NgayNop DATETIME,
        Diem FLOAT,
        TrangThai NVARCHAR(20) DEFAULT N'Đang làm'
    );
END
GO

-- Tạo bảng ChiTietBaiThi nếu chưa có
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='ChiTietBaiThi' AND xtype='U')
BEGIN
    CREATE TABLE ChiTietBaiThi (
        ChiTietBaiThiId INT IDENTITY(1,1) PRIMARY KEY,
        BaiThiId INT FOREIGN KEY REFERENCES BaiThi(BaiThiId),
        CauHoiId INT FOREIGN KEY REFERENCES CauHoi(CauHoiId),
        CauTraLoi NVARCHAR(MAX),
        Diem FLOAT
    );
END
GO

-- Tạo bảng PasswordResetTokens nếu chưa có
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='PasswordResetTokens' AND xtype='U')
BEGIN
    CREATE TABLE PasswordResetTokens (
        token_id INT PRIMARY KEY IDENTITY,
        user_id INT FOREIGN KEY REFERENCES NguoiDung(NguoiDungId),
        reset_token NVARCHAR(255),
        expires_at DATETIME,
        used BIT DEFAULT 0
    );
END
GO

-- Tạo bảng Notifications nếu chưa có
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Notifications' AND xtype='U')
BEGIN
    CREATE TABLE Notifications (
        notification_id INT PRIMARY KEY IDENTITY(1,1),
        user_id INT FOREIGN KEY REFERENCES NguoiDung(NguoiDungId),
        title NVARCHAR(255) NOT NULL,
        message NVARCHAR(MAX) NOT NULL,
        link NVARCHAR(255),
        is_read BIT DEFAULT 0,
        created_at DATETIME DEFAULT GETDATE()
    );
END
GO

-- Tạo bảng SupportRequests nếu chưa có
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='SupportRequests' AND xtype='U')
BEGIN
    CREATE TABLE SupportRequests (
        support_id INT PRIMARY KEY IDENTITY(1,1),
        user_id INT FOREIGN KEY REFERENCES NguoiDung(NguoiDungId),
        title NVARCHAR(255) NOT NULL,
        message NVARCHAR(MAX) NOT NULL,
        status NVARCHAR(50) DEFAULT N'Chờ xử lý',
        created_at DATETIME DEFAULT GETDATE()
    );
END
GO