const express = require('express');
const cors = require('cors');
const path = require('path');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const session = require('express-session');
const fs = require('fs');
const jwt = require('jsonwebtoken');

const app = express();
const port = 3002;

// MySQL connection pool
const pool = mysql.createPool({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'Vrphobia123*',
    database: 'employee_support_portal',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Basic middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Session middleware
app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000
    }
}));

// Database middleware
app.use((req, res, next) => {
    req.db = pool;
    next();
});

// Authentication middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid token' });
        }
        req.user = user;
        next();
    });
};

// Login endpoint
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log('Login attempt:', { email });

        const [users] = await pool.execute(
            'SELECT * FROM users WHERE email = ?',
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

        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '24h' }
        );

        console.log('Login successful:', { email, role: user.role });
        res.json({ 
            token, 
            user: { 
                id: user.id, 
                email: user.email, 
                role: user.role,
                name: user.name,
                surname: user.surname
            } 
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Test route
app.get('/api/test', (req, res) => {
    res.json({ message: 'API is working' });
});

// API Routes
app.get('/api/therapists', authenticateToken, async (req, res) => {
    try {
        // Önce terapistleri al
        const [therapists] = await pool.execute(`
            SELECT DISTINCT u.id, u.name, u.surname, u.email, u.phone, u.role 
            FROM users u 
            WHERE u.role = 'psychologist' AND u.is_active = true
        `);

        // Her terapist için uzmanlık alanlarını al
        for (let therapist of therapists) {
            const [specialties] = await pool.execute(`
                SELECT tt.id, tt.name, tt.category
                FROM therapy_types tt
                JOIN therapist_specialties ts ON tt.id = ts.therapy_type_id
                WHERE ts.therapist_id = ?
            `, [therapist.id]);
            
            therapist.specialties = specialties;
        }

        res.json(therapists);
    } catch (error) {
        console.error('Error fetching therapists:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/api/therapy-types', authenticateToken, async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT * FROM therapy_types');
        res.json(rows);
    } catch (error) {
        console.error('Error fetching therapy types:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.get('/api/organizations', authenticateToken, async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT * FROM organizations');
        res.json(rows);
    } catch (error) {
        console.error('Error fetching organizations:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/api/organization-clients', authenticateToken, async (req, res) => {
    try {
        const [rows] = await pool.execute(`
            SELECT oc.*, o.name as organization_name, u.name as therapist_name, u.surname as therapist_surname
            FROM organization_clients oc
            LEFT JOIN organizations o ON oc.organization_id = o.id
            LEFT JOIN users u ON oc.assigned_therapist_id = u.id
        `);
        res.json(rows);
    } catch (error) {
        console.error('Error fetching organization clients:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/api/individual-clients', authenticateToken, async (req, res) => {
    try {
        const [rows] = await pool.execute(`
            SELECT 
                ic.*,
                tt.name as therapy_type,
                CONCAT(u.name, ' ', u.surname) as therapist_name
            FROM individual_clients ic
            JOIN therapy_types tt ON ic.therapy_type_id = tt.id
            JOIN users u ON ic.assigned_therapist_id = u.id
        `);
        res.json(rows);
    } catch (error) {
        console.error('Error fetching individual clients:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.get('/api/appointments', authenticateToken, async (req, res) => {
    try {
        const [rows] = await pool.execute(`
            SELECT 
                a.*,
                tt.name as therapy_type,
                CONCAT(u.name, ' ', u.surname) as therapist_name,
                CASE 
                    WHEN a.client_type = 'organization' THEN CONCAT(oc.name, ' ', oc.surname)
                    ELSE CONCAT(ic.name, ' ', ic.surname)
                END as client_name
            FROM appointments a
            JOIN therapy_types tt ON a.therapy_type_id = tt.id
            JOIN users u ON a.psychologist_id = u.id
            LEFT JOIN organization_clients oc ON a.client_type = 'organization' AND a.client_id = oc.id
            LEFT JOIN individual_clients ic ON a.client_type = 'individual' AND a.client_id = ic.id
            ORDER BY a.appointment_time DESC
        `);
        res.json(rows);
    } catch (error) {
        console.error('Error fetching appointments:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Kurumsal danışan ekleme
app.post('/api/organization-clients', authenticateToken, async (req, res) => {
    try {
        const { 
            organization_id,
            name,
            surname,
            phone,
            email,
            client_type,
            assigned_therapist_id
        } = req.body;

        // Organizasyonun kalan hak sayısını kontrol et
        const [orgs] = await pool.execute(
            'SELECT sessions_per_client FROM organizations WHERE id = ?',
            [organization_id]
        );

        if (orgs.length === 0) {
            return res.status(404).json({ error: 'Organizasyon bulunamadı' });
        }

        const remaining_sessions = orgs[0].sessions_per_client;

        // Yeni danışanı ekle
        const [result] = await pool.execute(`
            INSERT INTO organization_clients 
            (organization_id, name, surname, phone, email, client_type, 
             remaining_sessions, assigned_therapist_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            organization_id,
            name,
            surname,
            phone,
            email,
            client_type,
            remaining_sessions,
            assigned_therapist_id
        ]);

        // Eklenen danışanın bilgilerini getir
        const [client] = await pool.execute(
            'SELECT * FROM organization_clients WHERE id = ?',
            [result.insertId]
        );

        res.status(201).json(client[0]);
    } catch (error) {
        console.error('Error adding organization client:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Serve index.html for all other routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Error handling
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ error: 'Server error', message: err.message });
});

// Start server
async function startServer() {
    try {
        // Test database connection
        const connection = await pool.getConnection();
        console.log('Database connection successful');
        connection.release();

        // Start server
        app.listen(port, () => {
            console.log(`Server is running on port ${port}`);
            console.log(`http://localhost:${port}`);
        });
    } catch (error) {
        console.error('Server startup error:', error);
        process.exit(1);
    }
}

startServer();
