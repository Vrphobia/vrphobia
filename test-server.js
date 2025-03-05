const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bcrypt = require('bcrypt');
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// MySQL bağlantısı
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'Vrphobia123*',
    database: 'employee_support_portal'
});

// Login endpoint
app.post('/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log('Login attempt:', { email });

        const [users] = await pool.execute('SELECT * FROM users WHERE email = ?', [email]);
        console.log('Found users:', users);
        
        if (users.length === 0) {
            return res.status(401).json({ error: 'Kullanıcı bulunamadı' });
        }

        const user = users[0];
        const isValid = await bcrypt.compare(password, user.password);
        console.log('Password check:', { isValid });

        if (!isValid) {
            return res.status(401).json({ error: 'Geçersiz şifre' });
        }

        res.json({
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                surname: user.surname,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// Test endpoint
app.get('/test', (req, res) => {
    res.json({ message: 'Test başarılı!' });
});

// Sunucuyu başlat
const port = 3002;
app.listen(port, () => {
    console.log(`Test sunucusu çalışıyor: http://localhost:${port}`);
});
