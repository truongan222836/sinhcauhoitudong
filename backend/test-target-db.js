const msnodesql = require('msnodesqlv8');

const connectionString = "Driver={ODBC Driver 17 for SQL Server};Server=.\\SQLEXPRESS;Database=HETHONGSINHCAUHOITUDONG;Trusted_Connection=yes;";

console.log('Connecting to HETHONGSINHCAUHOITUDONG...');
msnodesql.query(connectionString, "SELECT TOP 1 Email FROM NguoiDung", (err, rows) => {
    if (err) {
        console.error('Connection failed:', err);
        process.exit(1);
    }
    console.log('Connected! First user:', rows[0] ? rows[0].Email : 'No users found');
    process.exit(0);
});
