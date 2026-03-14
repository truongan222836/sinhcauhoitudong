const { sql, config } = require("./config/db");
const fs = require("fs");

async function initDatabase() {
    try {
        console.log("Connecting to database...");
        await sql.connect(config);

        console.log("Reading SQL file...");
        const sqlContent = fs.readFileSync("./init-db.sql", "utf8");

        console.log("Executing SQL script...");
        const queries = sqlContent.split("GO").filter(q => q.trim());

        for (const query of queries) {
            if (query.trim()) {
                console.log("Executing:", query.substring(0, 50) + "...");
                await new sql.Request().query(query);
            }
        }

        console.log("Database initialized successfully!");
        process.exit(0);
    } catch (err) {
        console.error("Database initialization failed:", err);
        process.exit(1);
    }
}

initDatabase();