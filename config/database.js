const mysql = require('mysql2');
const dotenv = require('dotenv');

dotenv.config();

// Create connection pool for Hostinger MySQL
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: parseInt(process.env.DB_PORT) || 3306,
    waitForConnections: true,
    connectionLimit: 20,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
    connectTimeout: 60000,
    // Remove invalid options: acquireTimeout and timeout
    // For SSL if needed:
    ssl: false
});

// Handle connection errors
pool.on('connection', (connection) => {
    console.log('New MySQL connection established');
});

pool.on('error', (err) => {
    console.error('MySQL pool error:', err);
    if (err.code === 'PROTOCOL_CONNECTION_LOST') {
        console.log('Database connection lost, attempting to reconnect...');
    } else if (err.code === 'ER_ACCESS_DENIED_ERROR') {
        console.error('Access denied - check username and password');
    }
});

const promisePool = pool.promise();

// Test database connection
const testConnection = async () => {
    try {
        const [rows] = await promisePool.query('SELECT 1 + 1 AS result');
        console.log('✅ Database connected successfully');
        return true;
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        console.error('Error code:', error.code);
        return false;
    }
};

module.exports = { pool, promisePool, testConnection };