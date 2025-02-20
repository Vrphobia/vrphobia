require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

async function createAdmin() {
    try {
        // MySQL bağlantısı
        const connection = await mysql.createConnection({
            host: 'localhost',
            port: 3306,
            user: 'root',
            password: 'Vrphobia123*',
            database: 'employee_support_portal'
        });

        // Şifreyi hashle
        const password = '123456';
        const hashedPassword = await bcrypt.hash(password, 10);

        // Önce mevcut admin kullanıcılarını sil
        await connection.execute('DELETE FROM users WHERE role = "admin"');

        // Yeni admin kullanıcılarını ekle
        const [result] = await connection.execute(
            'INSERT INTO users (name, surname, email, phone, password, role, is_active, is_email_verified) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            ['Ozan', 'İmamoğlu', 'ozan@vrphobia.net', '+905342022409', hashedPassword, 'admin', true, true]
        );

        console.log('Admin user created:', {
            id: result.insertId,
            email: 'ozan@vrphobia.net',
            password: password // Şifreyi göster ki giriş yapabilelim
        });

        // İkinci admin kullanıcısını ekle
        const [result2] = await connection.execute(
            'INSERT INTO users (name, surname, email, phone, password, role, is_active, is_email_verified) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            ['VR', 'Phobia', 'kurumsal@vrphobia.net', '+905342022409', hashedPassword, 'admin', true, true]
        );

        console.log('Admin user created:', {
            id: result2.insertId,
            email: 'kurumsal@vrphobia.net',
            password: password
        });

        // Admin kullanıcısını oluşturan kodu ekleyelim
        const hashedPassword2 = await bcrypt.hash('Vrphobia123*', 10);
        const [result3] = await connection.execute(`
            INSERT INTO users (name, surname, email, phone, role, password, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, ['Ozan', 'İlhan', 'ozan2@vrphobia.net', '5551234567', 'admin', hashedPassword2, 1]);

        console.log('Admin user created:', {
            id: result3.insertId,
            name: 'Ozan',
            surname: 'İlhan',
            email: 'ozan2@vrphobia.net',
            role: 'admin'
        });

        // Bağlantıyı kapat
        await connection.end();
    } catch (error) {
        console.error('Error creating admin user:', error);
    }
}

createAdmin();
