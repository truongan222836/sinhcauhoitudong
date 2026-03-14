const { sql, config } = require('./config/db');
async function test() {
    try {
        const pool = await sql.connect(config);
        const result = await pool.request().query(`
            SELECT TOP 1
                q.CauHoiId as id,
                (
                    SELECT STRING_AGG(dt.MaDeThi, ', ') 
                    FROM ChiTietDeThi ct 
                    JOIN DeThi dt ON ct.DeThiId = dt.DeThiId 
                    WHERE ct.CauHoiId = q.CauHoiId
                ) as maDeThi
            FROM CauHoi q
        `);
        console.log('Result:', result.recordset);
    } catch(err) {
        console.error(err);
    } finally {
        process.exit(0);
    }
}
test();
