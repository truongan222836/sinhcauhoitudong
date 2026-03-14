const { sql, config } = require('./config/db');
async function test() {
    try {
        const pool = await sql.connect(config);
        const result = await pool.request().query("SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'CauHoi'");
        for (let r of result.recordset) {
            console.log("COL:", r.COLUMN_NAME, r.IS_NULLABLE);
        }
    } catch(err) {
        console.error(err);
    }
}
test();
