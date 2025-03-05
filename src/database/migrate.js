const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');

async function migrate() {
    try {
        // Önce veritabanı olmadan bağlan
        const connection = await mysql.createConnection({
            host: 'localhost',
            port: 3306,
            user: 'root',
            password: 'Vrphobia123*',
            multipleStatements: true
        });

        console.log('MySQL sunucusuna bağlanıldı');

        // Veritabanını oluştur
        await connection.query('CREATE DATABASE IF NOT EXISTS vrphobia');
        console.log('Veritabanı oluşturuldu veya zaten var');

        // Veritabanını seç
        await connection.query('USE vrphobia');
        console.log('Veritabanı seçildi');

        // SQL dosyasını oku
        const sqlPath = path.join(__dirname, 'init.sql');
        const sqlContent = await fs.readFile(sqlPath, 'utf8');

        // SQL komutlarını çalıştır
        await connection.query(sqlContent);
        console.log('Tablolar başarıyla oluşturuldu');

        // Bağlantıyı kapat
        await connection.end();
        console.log('Veritabanı bağlantısı kapatıldı');

    } catch (error) {
        console.error('Hata:', error);
        process.exit(1);
    }
}

migrate();
