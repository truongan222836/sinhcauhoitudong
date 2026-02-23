const sql = require('mssql/msnodesqlv8');

const config = {
    server: 'localhost',
    database: 'HETHONGSINHCAUHOITUDONG',
    options: {
        trustedConnection: true,
        enableArithAbort: true,
        trustServerCertificate: true
    }
};

async function testConnection() {
    try {
        await sql.connect(config);
        console.log("Connected to database with Windows Authentication!");
        const request = new sql.Request();
        const result = await request.query("SELECT 1 as test");
        console.log("Query result:", result.recordset);
        process.exit(0);
    } catch (err) {
        console.error("Database connection failed:", err);
        process.exit(1);
    }
}

testConnection();
