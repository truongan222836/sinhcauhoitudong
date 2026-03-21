const { sql, config } = require('./config/db');

async function getFullSchema() {
    try {
        await sql.connect(config);
        
        // Get Tables and Columns
        const tablesResult = await sql.query`
            SELECT 
                t.name AS TableName,
                c.name AS ColumnName,
                type_name(c.user_type_id) AS Type,
                c.max_length,
                c.is_nullable,
                (SELECT COUNT(*) FROM sys.index_columns ic 
                 JOIN sys.indexes i ON ic.object_id = i.object_id AND ic.index_id = i.index_id
                 WHERE i.is_primary_key = 1 AND ic.object_id = t.object_id AND ic.column_id = c.column_id) AS IsPK
            FROM sys.tables t
            JOIN sys.columns c ON t.object_id = c.object_id
            ORDER BY t.name, c.column_id
        `;
        
        // Get Foreign Keys
        const fkResult = await sql.query`
            SELECT 
                tp.name AS ParentTable,
                cp.name AS ParentColumn,
                tr.name AS ReferencedTable,
                cr.name AS ReferencedColumn
            FROM sys.foreign_keys fk
            JOIN sys.foreign_key_columns fkc ON fk.object_id = fkc.constraint_object_id
            JOIN sys.tables tp ON fkc.parent_object_id = tp.object_id
            JOIN sys.columns cp ON fkc.parent_object_id = cp.object_id AND fkc.parent_column_id = cp.column_id
            JOIN sys.tables tr ON fkc.referenced_object_id = tr.object_id
            JOIN sys.columns cr ON fkc.referenced_object_id = cr.object_id AND fkc.referenced_column_id = cr.column_id
        `;
        
        const schema = {
            tables: {},
            relationships: fkResult.recordset
        };
        
        tablesResult.recordset.forEach(row => {
            if (!schema.tables[row.TableName]) schema.tables[row.TableName] = [];
            schema.tables[row.TableName].push({
                column: row.ColumnName,
                type: row.Type,
                maxLength: row.max_length,
                nullable: row.is_nullable,
                isPK: row.IsPK > 0
            });
        });
        
        console.log(JSON.stringify(schema, null, 2));
    } catch (err) {
        console.error('Error fetching schema:', err);
    } finally {
        await sql.close();
    }
}

getFullSchema();
