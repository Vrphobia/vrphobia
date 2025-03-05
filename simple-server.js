require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const User = require('./models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const cors = require('cors');

const app = express();

// Basic middleware
app.use(express.json());
app.use(cors());
app.use(express.static('public'));

// MongoDB connection
mongoose.connect('mongodb://127.0.0.1:27017/esp-portal', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('✅ MongoDB connected');
}).catch(err => {
    console.error('❌ MongoDB connection error:', err);
});

// E-posta gönderme ayarları
const transporter = nodemailer.createTransport({
    host: 'mail.vrphobia.net',
    port: 465,
    secure: true,
    auth: {
        user: 'kurumsal@vrphobia.net',
        pass: process.env.EMAIL_PASSWORD
    }
});

// Simple login endpoint
app.post('/api/auth/login', async (req, res) => {
    try {
        console.log('👤 Login attempt:', req.body.email);
        const user = await User.findOne({ email: req.body.email });
        
        if (!user) {
            console.log('❌ User not found');
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const validPassword = await bcrypt.compare(req.body.password, user.password);
        if (!validPassword) {
            console.log('❌ Invalid password');
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { userId: user._id, role: user.role },
            'secret-key',
            { expiresIn: '1h' }
        );

        console.log('✅ Login successful');
        res.json({ token, user: { 
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role
        }});
    } catch (err) {
        console.error('❌ Login error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// İletişim formu endpoint'i
app.post('/api/contact', async (req, res) => {
    const { name, email, phone, company, message } = req.body;

    try {
        // E-posta içeriği
        const mailOptions = {
            from: 'kurumsal@vrphobia.net',
            to: 'kurumsal@vrphobia.net',
            subject: 'Yeni İletişim Formu Mesajı',
            html: `
                <h3>Yeni İletişim Formu Mesajı</h3>
                <p><strong>İsim:</strong> ${name}</p>
                <p><strong>E-posta:</strong> ${email}</p>
                <p><strong>Telefon:</strong> ${phone}</p>
                <p><strong>Şirket:</strong> ${company}</p>
                <p><strong>Mesaj:</strong></p>
                <p>${message}</p>
            `
        };

        // E-postayı gönder
        await transporter.sendMail(mailOptions);
        
        res.json({ success: true, message: 'Mesajınız başarıyla gönderildi.' });
    } catch (error) {
        console.error('E-posta gönderme hatası:', error);
        res.status(500).json({ success: false, message: 'Mesaj gönderilirken bir hata oluştu.' });
    }
});

// Serve HTML files
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));
app.get('/dashboard', (req, res) => res.sendFile(path.join(__dirname, 'public', 'dashboard', 'index.html')));

// Start server on port 3000
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`
🚀 Server running on http://localhost:${PORT}
📝 Try these routes:
   - http://localhost:${PORT}/login
   - http://localhost:${PORT}/dashboard
   
💡 Login with:
   - Email: admin@esp.com
   - Password: Admin123!
`);
});
