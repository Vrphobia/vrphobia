require('dotenv').config();
const mysql = require('mysql2/promise');

async function setupDatabase() {
    // İlk bağlantı (veritabanı oluşturmak için)
    let pool = await mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASS || '',
        waitForConnections: true,
        connectionLimit: 1,
        queueLimit: 0
    });

    try {
        // Veritabanını oluştur
        await pool.query('DROP DATABASE IF EXISTS employee_support_portal');
        await pool.query('CREATE DATABASE employee_support_portal');
        await pool.end();

        // Yeni veritabanına bağlan
        pool = await mysql.createPool({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASS || '',
            database: 'employee_support_portal',
            waitForConnections: true,
            connectionLimit: 1,
            queueLimit: 0
        });

        // Employees tablosunu oluştur
        await pool.query(`
            CREATE TABLE employees (
                id INT AUTO_INCREMENT PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                first_name VARCHAR(100) NOT NULL,
                last_name VARCHAR(100) NOT NULL,
                role ENUM('admin', 'user') NOT NULL DEFAULT 'user',
                reset_token VARCHAR(255),
                reset_token_expires DATETIME,
                login_attempts INT DEFAULT 0,
                locked_until DATETIME,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);

        // Password reset tokens tablosunu oluştur
        await pool.query(`
            CREATE TABLE password_reset_tokens (
                id INT AUTO_INCREMENT PRIMARY KEY,
                employee_id INT NOT NULL,
                token VARCHAR(255) NOT NULL,
                expires_at DATETIME NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
            )
        `);

        console.log('Veritabanı ve tablolar başarıyla oluşturuldu!');

    } catch (error) {
        console.error('Hata:', error);
    } finally {
        if (pool) await pool.end();
    }
}

setupDatabase();
