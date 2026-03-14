const { sql, config } = require("./config/db");

async function test() {
    let transaction;
    try {
        const pool = await sql.connect(config);
        transaction = new sql.Transaction(pool);
        await transaction.begin();

        const quizResult = await new sql.Request(transaction)
            .input('Title', sql.NVarChar, 'Test Quiz')
            .input('MaDeThi', sql.VarChar, 'TEST01')
            .input('CreatedBy', sql.Int, 1)
            .input('Duration', sql.Int, 60)
            .query(`INSERT INTO DeThi (TieuDe, MaDeThi, NguoiTaoId, ThoiGianLamBai) 
                    OUTPUT INSERTED.DeThiId 
                    VALUES (@Title, @MaDeThi, @CreatedBy, @Duration)`);
                    
        console.log("Quiz Result", quizResult.recordset);
        await transaction.commit();
        console.log("Success");
    } catch (e) {
        if (transaction) await transaction.rollback();
        console.error("Error:", e);
    }
}
test();
