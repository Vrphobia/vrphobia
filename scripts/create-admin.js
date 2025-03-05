require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// Bcrypt için random fallback ayarla
bcrypt.setRandomFallback((len) => {
    const buf = crypto.randomBytes(len);
    return buf;
});

async function createAdmin() {
    const pool = await mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASS || '',
        database: 'employee_support_portal',
        waitForConnections: true,
        connectionLimit: 1,
        queueLimit: 0
    });

    try {
        // Önce mevcut admin kullanıcısını kontrol et
        const [admins] = await pool.query(
            'SELECT * FROM employees WHERE email = ? AND role = ?',
            ['admin@vrphobia.com', 'admin']
        );

        if (admins.length > 0) {
            console.log('Admin kullanıcısı zaten var!');
            return;
        }

        // Admin şifresini hashle
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('admin123', salt);

        // Kullanıcıyı ekle
        await pool.query(
            'INSERT INTO employees (email, password, role, first_name, last_name) VALUES (?, ?, ?, ?, ?)',
            ['admin@vrphobia.com', hashedPassword, 'admin', 'Admin', 'User']
        );

        console.log('Admin kullanıcısı başarıyla oluşturuldu!');
        console.log('E-posta: admin@vrphobia.com');
        console.log('Şifre: admin123');

    } catch (error) {
        console.error('Hata:', error);
    } finally {
        await pool.end();
    }
}

createAdmin();
