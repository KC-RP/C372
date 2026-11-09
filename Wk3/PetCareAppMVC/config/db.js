const mysql = require('mysql2');

// MySQL Connection
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '#T52525252jo',
  database: 'petcare'
});

module.exports = connection;
