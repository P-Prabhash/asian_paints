
const mysql = require("mysql2/promise");
const env = require("./env");

const pool = mysql.createPool({
    host: env.dbHost,
    port: env.dbPort,
    database: env.dbName,
    user: env.dbUser,
    password: env.dbPassword,

    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,

    enableKeepAlive: true,
    charset: "utf8mb4",

    decimalNumbers: false,
    multipleStatements: false
});

async function checkDatabaseConnection() {
    const connection = await pool.getConnection();

    try {
        await connection.query("SELECT 1");
    } finally {
        connection.release();
    }
}

module.exports = {
    pool,
    checkDatabaseConnection
};
