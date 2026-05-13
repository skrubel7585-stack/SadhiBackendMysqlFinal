const mysql = require('mysql2');

// Hardcode credentials for testing (remove after testing)
const config = {
    host: '193.203.184.67',
    user: 'u951360235_mainsite_1',
    password: 'V3$GsAS9u',
    database: 'u951360235_mainsite_1',
    port: 3306
};

console.log('Testing connection with:', {
    host: config.host,
    user: config.user,
    database: config.database,
    port: config.port,
    password: '***hidden***'
});

const connection = mysql.createConnection(config);

connection.connect((err) => {
    if (err) {
        console.error('❌ Connection failed:', err.message);
        console.error('Error code:', err.code);
        
        if (err.code === 'ER_ACCESS_DENIED_ERROR') {
            console.log('\n🔍 Possible issues:');
            console.log('1. Wrong username or password');
            console.log('2. Database user does not have remote access permission');
            console.log('3. Password contains special characters - try resetting password without special characters');
        }
        return;
    }
    
    console.log('✅ Connected successfully!');
    
    connection.query('SELECT DATABASE() as db_name, NOW() as server_time', (err, results) => {
        if (err) {
            console.error('Query error:', err);
        } else {
            console.log('Database info:', results[0]);
        }
        connection.end();
    });
});