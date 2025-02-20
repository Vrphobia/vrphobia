const express = require('express');
const router = express.Router();
const mysql = require('mysql2/promise');
const fileUpload = require('express-fileupload');
const ExcelImporter = require('../utils/excelImporter');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

// Database configuration
const dbConfig = {
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'Vrphobia123*',
    database: 'employee_support_portal'
};

// Middleware
router.use(fileUpload());

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
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const connection = await mysql.createConnection(dbConfig);
        
        const [users] = await connection.execute(
            'SELECT * FROM users WHERE email = ?',
            [email]
        );

        if (users.length === 0) {
            return res.status(401).json({ error: 'Geçersiz email adresi veya şifre' });
        }

        const user = users[0];
        const validPassword = await bcrypt.compare(password, user.password);

        if (!validPassword) {
            return res.status(401).json({ error: 'Geçersiz email adresi veya şifre' });
        }

        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '24h' }
        );

        res.json({ token, user: { id: user.id, email: user.email, role: user.role } });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Excel import endpoint
router.post('/import-excel', authenticateToken, async (req, res) => {
    try {
        if (!req.files || !req.files.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const file = req.files.file;
        const filePath = `./uploads/${file.name}`;
        
        await file.mv(filePath);

        const importer = new ExcelImporter(dbConfig);
        const result = await importer.importClients(filePath);

        res.json(result);
    } catch (error) {
        console.error('Import error:', error);
        res.status(500).json({ error: 'Import failed' });
    }
});

// Get all therapists
router.get('/therapists', authenticateToken, async (req, res) => {
    try {
        const connection = await mysql.createConnection(dbConfig);
        const [therapists] = await connection.execute(
            'SELECT id, name, surname, email, phone FROM users WHERE role = "psychologist"'
        );
        res.json(therapists);
    } catch (error) {
        console.error('Error fetching therapists:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get all organizations
router.get('/organizations', authenticateToken, async (req, res) => {
    try {
        const connection = await mysql.createConnection(dbConfig);
        const [organizations] = await connection.execute(
            'SELECT * FROM organizations'
        );
        res.json(organizations);
    } catch (error) {
        console.error('Error fetching organizations:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get corporate clients
router.get('/corporate-clients', authenticateToken, async (req, res) => {
    try {
        const connection = await mysql.createConnection(dbConfig);
        const [clients] = await connection.execute(`
            SELECT 
                oc.*,
                o.name as organization_name,
                u.name as therapist_name,
                u.surname as therapist_surname
            FROM organization_clients oc
            JOIN organizations o ON oc.organization_id = o.id
            JOIN users u ON oc.assigned_therapist_id = u.id
        `);
        res.json(clients);
    } catch (error) {
        console.error('Error fetching corporate clients:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get individual clients
router.get('/individual-clients', authenticateToken, async (req, res) => {
    try {
        const connection = await mysql.createConnection(dbConfig);
        const [clients] = await connection.execute(`
            SELECT 
                ic.*,
                tt.name as therapy_type,
                u.name as therapist_name,
                u.surname as therapist_surname
            FROM individual_clients ic
            JOIN therapy_types tt ON ic.therapy_type_id = tt.id
            JOIN users u ON ic.assigned_therapist_id = u.id
        `);
        res.json(clients);
    } catch (error) {
        console.error('Error fetching individual clients:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get appointments
router.get('/appointments', authenticateToken, async (req, res) => {
    try {
        const connection = await mysql.createConnection(dbConfig);
        const [appointments] = await connection.execute(`
            SELECT 
                a.*,
                u.name as psychologist_name,
                u.surname as psychologist_surname,
                tt.name as therapy_type
            FROM appointments a
            JOIN users u ON a.psychologist_id = u.id
            JOIN therapy_types tt ON a.therapy_type_id = tt.id
        `);
        res.json(appointments);
    } catch (error) {
        console.error('Error fetching appointments:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Create appointment
router.post('/appointments', authenticateToken, async (req, res) => {
    try {
        const {
            client_type,
            client_id,
            psychologist_id,
            therapy_type_id,
            appointment_time,
            duration,
            location
        } = req.body;

        const connection = await mysql.createConnection(dbConfig);
        const [result] = await connection.execute(`
            INSERT INTO appointments 
            (client_type, client_id, psychologist_id, therapy_type_id, appointment_time, duration, location)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [client_type, client_id, psychologist_id, therapy_type_id, appointment_time, duration, location]);

        res.json({ id: result.insertId, message: 'Appointment created successfully' });
    } catch (error) {
        console.error('Error creating appointment:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
