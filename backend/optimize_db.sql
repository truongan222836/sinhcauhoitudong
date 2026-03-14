-- Tối ưu hóa Database cho hệ thống AQG

-- 1. Thêm Index cho bảng BaiThi để tăng tốc Ranking và Thống kê
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_BaiThi_DeThi_Diem' AND object_id = OBJECT_ID('BaiThi'))
BEGIN
    CREATE INDEX IX_BaiThi_DeThi_Diem ON BaiThi(DeThiId, Diem, TrangThai) INCLUDE (NgayNop, HoTen, MSSV);
END

-- 2. Thêm Index cho bảng ChiTietBaiThi để tăng tốc truy vấn thống kê câu hỏi
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_ChiTietBaiThi_CauHoi' AND object_id = OBJECT_ID('ChiTietBaiThi'))
BEGIN
    CREATE INDEX IX_ChiTietBaiThi_CauHoi ON ChiTietBaiThi(CauHoiId, Diem);
END

-- 3. Thêm Index cho bảng DeThi
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_DeThi_MaDeThi' AND object_id = OBJECT_ID('DeThi'))
BEGIN
    CREATE INDEX IX_DeThi_MaDeThi ON DeThi(MaDeThi);
END

-- 4. Thêm Index cho PasswordResetTokens
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_PasswordResetTokens_Token' AND object_id = OBJECT_ID('PasswordResetTokens'))
BEGIN
    CREATE INDEX IX_PasswordResetTokens_Token ON PasswordResetTokens(reset_token, used, expires_at);
END
GO
