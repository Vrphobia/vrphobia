require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

async function checkPassword() {
    try {
        // MySQL bağlantısı
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASS,
            database: process.env.DB_NAME
        });

        // Yeni şifre hash'i oluştur
        const password = '123456';
        const hashedPassword = await bcrypt.hash(password, 10);
        console.log('New password hash:', hashedPassword);

        // Mevcut admin kullanıcılarını kontrol et
        const [users] = await connection.execute('SELECT * FROM users WHERE role = "admin"');
        console.log('\nCurrent admin users:', users.map(u => ({
            email: u.email,
            password: u.password,
            role: u.role,
            is_active: u.is_active
        })));

        // Test şifre kontrolü
        for (const user of users) {
            const isValid = await bcrypt.compare(password, user.password);
            console.log(`\nPassword check for ${user.email}:`, {
                provided: password,
                stored: user.password,
                isValid: isValid
            });
        }

        // Şifreleri güncelle
        await connection.execute('UPDATE users SET password = ? WHERE role = "admin"', [hashedPassword]);
        console.log('\nPasswords updated for admin users');

        // Bağlantıyı kapat
        await connection.end();
    } catch (error) {
        console.error('Error:', error);
    }
}

checkPassword();
