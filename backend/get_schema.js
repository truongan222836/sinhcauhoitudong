const { sql, config } = require('./config/db');

async function getTables() {
    try {
        await sql.connect(config);
        const result = await sql.query`
            SELECT 
                t.name AS TableName,
                c.name AS ColumnName,
                type_name(c.user_type_id) AS Type,
                c.max_length,
                c.is_nullable
            FROM sys.tables t
            JOIN sys.columns c ON t.object_id = c.object_id
            ORDER BY t.name, c.column_id
        `;
        
        const tables = {};
        result.recordset.forEach(row => {
            if (!tables[row.TableName]) tables[row.TableName] = [];
            tables[row.TableName].push({
                column: row.ColumnName,
                type: row.Type,
                maxLength: row.max_length,
                nullable: row.is_nullable
            });
        });
        
        console.log(JSON.stringify(tables, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        await sql.close();
    }
}

getTables();
