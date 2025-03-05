const mysql = require('mysql2/promise');

async function testConnection() {
    try {
        const connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: 'Vrphobia123*',
            database: 'employee_support_portal'
        });

        console.log('MySQL bağlantısı başarılı!');
        
        // Admin kullanıcılarını kontrol et
        const [users] = await connection.execute('SELECT * FROM users WHERE role = "admin"');
        console.log('\nAdmin kullanıcıları:', users.map(u => ({
            email: u.email,
            role: u.role,
            is_active: u.is_active
        })));

        await connection.end();
    } catch (error) {
        console.error('MySQL bağlantı hatası:', error);
    }
}

testConnection();
