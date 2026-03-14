const { sql, config } = require("./config/db");

async function sync() {
    try {
        await sql.connect(config);
        console.log("Connected to database.");

        // 1. Add MaDeThi to DeThi
        try {
            await sql.query(`ALTER TABLE DeThi ADD MaDeThi VARCHAR(10)`);
            console.log("Added MaDeThi to DeThi.");
        } catch (e) {
            console.log("MaDeThi already exists or could not be added.");
        }

        // 2. Add ThoiGianLamBai to DeThi
        try {
            await sql.query(`ALTER TABLE DeThi ADD ThoiGianLamBai INT DEFAULT 60`);
            console.log("Added ThoiGianLamBai to DeThi.");
            // Copy data from ThoiLuongPhut if exists
            try {
                await sql.query(`UPDATE DeThi SET ThoiGianLamBai = ThoiLuongPhut WHERE ThoiLuongPhut IS NOT NULL`);
            } catch (e2) { }
        } catch (e) {
            console.log("ThoiGianLamBai already exists or could not be added.");
        }

        // 3. Add LoaiId to CauHoi
        try {
            await sql.query(`ALTER TABLE CauHoi ADD LoaiId INT`);
            console.log("Added LoaiId to CauHoi.");
            // Copy data from LoaiCauHoiId
            try {
                await sql.query(`UPDATE CauHoi SET LoaiId = LoaiCauHoiId WHERE LoaiCauHoiId IS NOT NULL`);
            } catch (e2) { }
        } catch (e) {
            console.log("LoaiId already exists or could not be added.");
        }

        // 4. Add LoaiId to LoaiCauHoi
        try {
            await sql.query(`ALTER TABLE LoaiCauHoi ADD LoaiId INT`);
            console.log("Added LoaiId to LoaiCauHoi.");
            // Copy data from LoaiCauHoiId
            try {
                await sql.query(`UPDATE LoaiCauHoi SET LoaiId = LoaiCauHoiId WHERE LoaiCauHoiId IS NOT NULL`);
            } catch (e2) { }
        } catch (e) {
            console.log("LoaiId to LoaiCauHoi already exists or could not be added.");
        }

        // 5. Rename table DeThiCauHoi to ChiTietDeThi
        try {
            const check = await sql.query(`SELECT 1 FROM sysobjects WHERE name='ChiTietDeThi' AND xtype='U'`);
            if (check.recordset.length === 0) {
                await sql.query(`EXEC sp_rename 'DeThiCauHoi', 'ChiTietDeThi'`);
                console.log("Renamed DeThiCauHoi to ChiTietDeThi.");
            } else {
                console.log("ChiTietDeThi already exists.");
            }
        } catch (e) {
            console.log("Could not rename DeThiCauHoi: " + e.message);
        }

        // 6. Add ThuTu to ChiTietDeThi
        try {
            await sql.query(`ALTER TABLE ChiTietDeThi ADD ThuTu INT`);
            console.log("Added ThuTu to ChiTietDeThi.");
        } catch (e) {
            console.log("ThuTu already exists or could not be added.");
        }

        console.log("Database synchronization complete.");
        process.exit(0);
    } catch (err) {
        console.error("Database sync failed:", err);
        process.exit(1);
    }
}

sync();
