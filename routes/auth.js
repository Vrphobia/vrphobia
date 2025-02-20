const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const TOKEN_EXPIRES_IN = '24h';

// Test endpoint
router.get('/test', (req, res) => {
    console.log('Test endpoint called');
    res.json({ message: 'Auth route is working' });
});

// Login endpoint
router.post('/login', async (req, res) => {
    try {
        console.log('Login attempt received');
        console.log('Request body:', req.body);
        
        const { email, password } = req.body;
        
        if (!email || !password) {
            console.log('Missing email or password');
            return res.status(400).json({ error: 'Email and password are required' });
        }

        console.log('Email:', email);

        // Veritabanı bağlantısını kontrol et
        if (!req.db) {
            console.error('No database connection');
            return res.status(500).json({ error: 'Database connection error' });
        }

        // Kullanıcıyı bul
        const [rows] = await req.db.execute(
            'SELECT id, name, email, password, role, is_active FROM users WHERE email = ?', 
            [email]
        );

        console.log('Database query result:', rows);

        if (rows.length === 0) {
            console.log('User not found');
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const user = rows[0];

        // Hesap aktif mi kontrol et
        if (!user.is_active) {
            console.log('Account is not active');
            return res.status(401).json({ error: 'Account is not active' });
        }

        // Şifre kontrolü
        console.log('Comparing passwords...');
        const isValid = await bcrypt.compare(password, user.password);
        console.log('Password comparison result:', isValid);

        if (!isValid) {
            console.log('Invalid password');
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Token oluştur
        const token = jwt.sign(
            { 
                userId: user.id, 
                email: user.email, 
                role: user.role 
            },
            JWT_SECRET,
            { expiresIn: TOKEN_EXPIRES_IN }
        );

        // Session'a kullanıcı bilgilerini kaydet
        req.session.userId = user.id;
        req.session.userRole = user.role;

        console.log('Login successful');
        res.json({
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ 
            error: 'Server error',
            details: error.message 
        });
    }
});

// Token doğrulama
router.get('/verify', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ 
                error: 'Token bulunamadı' 
            });
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        
        // Kullanıcıyı kontrol et
        const [rows] = await req.db.execute(
            'SELECT id, name, email, role, avatar, is_active FROM users WHERE id = ?',
            [decoded.userId]
        );

        if (rows.length === 0 || !rows[0].is_active) {
            return res.status(401).json({ 
                error: 'Geçersiz token' 
            });
        }

        res.json({ 
            user: rows[0],
            message: 'Token geçerli' 
        });

    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ 
                error: 'Geçersiz token' 
            });
        }
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ 
                error: 'Token süresi doldu' 
            });
        }
        
        console.error('Token verification error:', error);
        res.status(500).json({ 
            error: 'Sunucu hatası oluştu' 
        });
    }
});

// Çıkış işlemi
router.post('/logout', (req, res) => {
    res.json({ 
        message: 'Çıkış başarılı' 
    });
});

module.exports = router;
