const sql = require("mssql/msnodesqlv8");

const config = {
  connectionString: "Driver={ODBC Driver 17 for SQL Server};Server=.\\SQLEXPRESS;Database=HETHONGSINHCAUHOITUDONG;Trusted_Connection=yes;",
  driver: "msnodesqlv8"
};

module.exports = { sql, config };