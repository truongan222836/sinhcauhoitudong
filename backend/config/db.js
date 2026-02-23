const sql = require("mssql/msnodesqlv8");

const config = {
  server: "TruongAn\\SQLEXPRESS02",   // 🔥 QUAN TRỌNG
  database: "HETHONGSINHCAUHOITUDONG",
  driver: "msnodesqlv8",
  options: {
    trustedConnection: true,
    encrypt: false,
    trustServerCertificate: true
  }
};

module.exports = { sql, config };