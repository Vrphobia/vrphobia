const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { validatePassword } = require('../middleware/security');
const { require2FA, initialize2FA } = require('../middleware/twoFactor');

// Login - Step 1: Password Authentication
router.post('/login', validatePassword, async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log('Login attempt:', { email });

        const [users] = await req.db.execute(
            'SELECT * FROM users WHERE email = ? AND is_active = 1',
            [email]
        );

        if (users.length === 0) {
            console.log('User not found:', email);
            return res.status(401).json({ error: 'Geçersiz email adresi veya şifre' });
        }

        const user = users[0];
        const validPassword = await bcrypt.compare(password, user.password);

        if (!validPassword) {
            console.log('Invalid password for user:', email);
            return res.status(401).json({ error: 'Geçersiz email adresi veya şifre' });
        }

        // Store user in session for 2FA
        req.user = {
            id: user.id,
            email: user.email,
            phone: user.phone
        };

        // Initialize 2FA
        await initialize2FA(req, res);

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Login - Step 2: 2FA Verification
router.post('/verify-2fa', require2FA, async (req, res) => {
    try {
        const user = req.user;
        
        const token = jwt.sign(
            { 
                userId: user.id,
                email: user.email,
                role: user.role
            },
            'your-secret-key',
            { expiresIn: '24h' }
        );

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 24 * 60 * 60 * 1000 // 24 hours
        });

        res.json({
            message: 'Login successful',
            user: {
                id: user.id,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error('2FA verification error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/logout', (req, res) => {
    res.clearCookie('token');
    res.json({ message: 'Logout successful' });
});

module.exports = router;
