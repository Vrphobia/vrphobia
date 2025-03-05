require('dotenv').config();
const mysql = require('mysql2');

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: 3306,
    user: process.env.DB_USER || 'vrphobia',
    password: process.env.DB_PASSWORD || 'vrphobia123',
    database: 'employee_support_portal',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
}).promise();

async function testConnection() {
    try {
        console.log('MySQL Bağlantı Bilgileri:', {
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD ? '***' : 'undefined'
        });

        const [rows] = await pool.query('SELECT 1');
        console.log('Bağlantı başarılı!', rows);
    } catch (error) {
        console.error('Bağlantı hatası:', error);
    } finally {
        process.exit();
    }
}

testConnection();
