const express = require('express');
const router = express.Router();

router.get('/', async (req, res) => {
    try {
        // Önce terapistleri al
        const [therapists] = await req.db.execute(`
            SELECT DISTINCT u.id, u.name, u.surname, u.email, u.phone, u.role 
            FROM users u 
            WHERE u.role = 'psychologist' AND u.is_active = true
        `);

        // Her terapist için uzmanlık alanlarını al
        for (let therapist of therapists) {
            const [specialties] = await req.db.execute(`
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

router.get('/therapy-types', async (req, res) => {
    try {
        const [rows] = await req.db.execute('SELECT * FROM therapy_types');
        res.json(rows);
    } catch (error) {
        console.error('Error fetching therapy types:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

router.get('/appointments', async (req, res) => {
    try {
        const [rows] = await req.db.execute(`
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

module.exports = router;
