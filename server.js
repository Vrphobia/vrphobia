require('dotenv').config();

const express = require('express');
const app = express();
const path = require('path');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const mysql = require('mysql2');
const cors = require('cors');
const nodemailer = require('nodemailer');
const { createServer } = require('http');
const { Server } = require('socket.io');

// Import routes
const authRoutes = require('./src/routes/auth');
const adminRoutes = require('./src/routes/admin');
const clientRoutes = require('./src/routes/clients');
const therapistRoutes = require('./src/routes/therapists');
const reportRoutes = require('./src/routes/reports');
const appointmentRoutes = require('./src/routes/appointments');
const progressRoutes = require('./src/routes/progress');
const notificationRoutes = require('./src/routes/notifications');
const fileRoutes = require('./src/routes/files');
const { router: videoRoutes, handleSocket } = require('./src/routes/video');
// const paymentRoutes = require('./src/routes/payments'); // Ödeme sistemini geçici olarak devre dışı bıraktım

const port = 3002;

// MySQL connection pool
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: 3306,
    user: process.env.DB_USER || 'vrphobia',
    password: process.env.DB_PASSWORD || 'vrphobia123',
    database: 'employee_support_portal',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
}).promise();

// Debug için çevre değişkenlerini kontrol et
console.log('MySQL Bağlantı Bilgileri:', {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD ? '***' : 'undefined'
});

// Contact messages tablosunu oluştur
const createTableQuery = `
    CREATE TABLE IF NOT EXISTS contact_messages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100),
        email VARCHAR(100),
        phone VARCHAR(20),
        company VARCHAR(100),
        message TEXT,
        status ENUM('new', 'read', 'replied') DEFAULT 'new',
        ip_address VARCHAR(45),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
`;

pool.query(createTableQuery)
    .then(() => {
        console.log('contact_messages tablosu hazır');
    })
    .catch((err) => {
        console.error('Tablo oluşturma hatası:', err);
    });

const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: process.env.CORS_ORIGIN || '*',
        methods: ['GET', 'POST']
    }
});

// Güvenlik başlıkları
app.use((req, res, next) => {
    res.setHeader('Content-Security-Policy', "default-src 'self' https://formsubmit.co; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; img-src 'self' data:;");
    next();
});

// Security middleware
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

const { authenticateToken } = require('./src/middleware/auth');
const { 
    limiter, 
    sessionConfig, 
    securityHeaders, 
    corsOptions,
    ipFilter,
    sanitizeRequest 
} = require('./src/middleware/security');

// Security middleware
app.use(securityHeaders);
app.use(cors(corsOptions));
app.use(limiter);
app.use(ipFilter);
app.use(sanitizeRequest);

// Basic middleware
app.use(express.json());
app.use(cookieParser());
app.use(express.static('public'));

// Session middleware
app.use((req, res, next) => {
    req.db = pool;
    next();
});

// WebSocket yönetimi
handleSocket(io);

// Routes
app.use('/api', authRoutes);
app.use('/api/admin', authenticateToken, adminRoutes);
app.use('/api', authenticateToken, clientRoutes);
app.use('/api/therapists', authenticateToken, therapistRoutes);
app.use('/api/reports', authenticateToken, reportRoutes);
app.use('/api/appointments', authenticateToken, appointmentRoutes);
app.use('/api/progress', authenticateToken, progressRoutes);
app.use('/api/notifications', authenticateToken, notificationRoutes);
app.use('/api/files', authenticateToken, fileRoutes);
app.use('/api/video', authenticateToken, videoRoutes);
// app.use('/api/payments', paymentRoutes); // Ödeme sistemini geçici olarak devre dışı bıraktım

// Contact form endpoint'i
app.post('/api/contact', async (req, res) => {
    const { name, email, phone, company, message } = req.body;
    const ip = req.ip;

    try {
        // Mesajı veritabanına kaydet
        const insertQuery = `
            INSERT INTO contact_messages (name, email, phone, company, message, ip_address)
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        
        pool.query(insertQuery, [name, email, phone, company, message, ip])
            .then((result) => {
                // E-posta gönder
                const transporter = nodemailer.createTransport({
                    host: 'smtp.gmail.com',
                    port: 587,
                    secure: false,
                    auth: {
                        user: process.env.EMAIL_USER,
                        pass: process.env.EMAIL_PASSWORD
                    }
                });

                const mailOptions = {
                    from: process.env.EMAIL_USER,
                    to: 'kurumsal@vrphobia.net',
                    subject: 'Yeni İletişim Formu Mesajı',
                    text: `
                        Ad Soyad: ${name}
                        E-posta: ${email}
                        Telefon: ${phone}
                        Şirket: ${company}
                        Mesaj: ${message}
                        IP: ${ip}
                    `
                };

                transporter.sendMail(mailOptions)
                    .then(() => {
                        res.json({ success: true, message: 'Mesajınız başarıyla gönderildi' });
                    })
                    .catch((error) => {
                        console.error('E-posta gönderme hatası:', error);
                        res.status(500).json({ error: 'Mesajınız gönderilemedi' });
                    });
            })
            .catch((err) => {
                console.error('Veritabanı kayıt hatası:', err);
                res.status(500).json({ error: 'Mesajınız kaydedilemedi' });
            });
    } catch (error) {
        console.error('E-posta gönderme hatası:', error);
        res.status(500).json({ error: 'Mesaj gönderilirken bir hata oluştu.' });
    }
});

// E-posta gönderme için transporter oluştur
const transporter = nodemailer.createTransport({
    host: 'smtp.office365.com',
    port: 587,
    secure: false, // TLS için false
    auth: {
        user: 'your-email@yourcompany.com', // Kurumsal e-posta adresiniz
        pass: 'your-password' // E-posta şifreniz
    },
    tls: {
        ciphers: 'SSLv3'
    }
});

// İletişim formu endpoint'i
app.post('/api/contact-old', async (req, res) => {
    try {
        const { name, email, phone, company, message } = req.body;

        // E-posta içeriğini oluştur
        const mailOptions = {
            from: 'your-email@yourcompany.com', // Kurumsal e-posta adresiniz
            to: 'target-email@yourcompany.com', // Mesajların gönderileceği e-posta
            subject: `Yeni İletişim Formu: ${company}`,
            html: `
                <h3>Yeni İletişim Formu Mesajı</h3>
                <p><strong>İsim:</strong> ${name}</p>
                <p><strong>E-posta:</strong> ${email}</p>
                <p><strong>Telefon:</strong> ${phone}</p>
                <p><strong>Şirket:</strong> ${company}</p>
                <p><strong>Mesaj:</strong> ${message}</p>
            `
        };

        // E-postayı gönder
        await transporter.sendMail(mailOptions);

        res.status(200).json({ message: 'Mesajınız başarıyla gönderildi.' });
    } catch (error) {
        console.error('E-posta gönderme hatası:', error);
        res.status(500).json({ error: 'Mesaj gönderilirken bir hata oluştu.' });
    }
});

// Serve static files
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin', 'dashboard.html'));
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

async function startServer() {
    try {
        // Test database connection
        await pool.getConnection();
        console.log('Database connection successful');

        // Start the server
        httpServer.listen(port, () => {
            console.log(`Server is running on port ${port}`);
            console.log(`http://localhost:${port}`);
        });
    } catch (error) {
        console.error('Error starting server:', error);
        process.exit(1);
    }
}

startServer();
