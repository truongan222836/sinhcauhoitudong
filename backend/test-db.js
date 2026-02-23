const { sql, config } = require("./config/db");

async function testConnection() {
    try {
        console.log("Connecting to database with config:", { ...config, password: "***" });
        await sql.connect(config);
        console.log("Connected to database successfully!");
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
