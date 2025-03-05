const express = require('express');
const router = express.Router();
const AppointmentService = require('../services/appointmentService');
const { authenticateToken } = require('../middleware/auth');

// Middleware to initialize appointment service
router.use((req, res, next) => {
    req.appointmentService = new AppointmentService(req.db);
    next();
});

// Yeni randevu oluştur
router.post('/', authenticateToken, async (req, res) => {
    try {
        const appointmentData = {
            clientId: req.body.clientId,
            therapistId: req.body.therapistId,
            dateTime: req.body.dateTime,
            duration: req.body.duration || 60, // varsayılan 60 dakika
            notes: req.body.notes,
            therapyTypeId: req.body.therapyTypeId
        };

        const appointmentId = await req.appointmentService.createAppointment(appointmentData);
        res.status(201).json({ 
            message: 'Randevu başarıyla oluşturuldu',
            appointmentId 
        });
    } catch (error) {
        console.error('Error creating appointment:', error);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
});

// Terapist müsaitlik kontrolü
router.get('/availability/:therapistId', authenticateToken, async (req, res) => {
    try {
        const { therapistId } = req.params;
        const { date } = req.query;

        const availableSlots = await req.appointmentService.getTherapistAvailability(
            therapistId,
            date
        );

        res.json(availableSlots);
    } catch (error) {
        console.error('Error checking availability:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Randevu güncelle
router.put('/:appointmentId', authenticateToken, async (req, res) => {
    try {
        const { appointmentId } = req.params;
        const updateData = {
            dateTime: req.body.dateTime,
            duration: req.body.duration,
            notes: req.body.notes,
            status: req.body.status
        };

        await req.appointmentService.updateAppointment(appointmentId, updateData);
        res.json({ message: 'Randevu başarıyla güncellendi' });
    } catch (error) {
        console.error('Error updating appointment:', error);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
});

// Randevu iptal
router.post('/:appointmentId/cancel', authenticateToken, async (req, res) => {
    try {
        const { appointmentId } = req.params;
        const { reason } = req.body;

        await req.appointmentService.cancelAppointment(appointmentId, reason);
        res.json({ message: 'Randevu başarıyla iptal edildi' });
    } catch (error) {
        console.error('Error cancelling appointment:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Randevuları listele
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { startDate, endDate, clientId, therapistId, status } = req.query;
        
        let query = `
            SELECT 
                a.*,
                c.name as client_name,
                c.email as client_email,
                t.name as therapist_name,
                tt.name as therapy_type
            FROM appointments a
            JOIN clients c ON a.client_id = c.id
            JOIN users t ON a.therapist_id = t.id
            JOIN therapy_types tt ON a.therapy_type_id = tt.id
            WHERE 1=1
        `;
        
        const params = [];
        
        if (startDate) {
            query += ' AND a.appointment_time >= ?';
            params.push(startDate);
        }
        
        if (endDate) {
            query += ' AND a.appointment_time <= ?';
            params.push(endDate);
        }
        
        if (clientId) {
            query += ' AND a.client_id = ?';
            params.push(clientId);
        }
        
        if (therapistId) {
            query += ' AND a.therapist_id = ?';
            params.push(therapistId);
        }
        
        if (status) {
            query += ' AND a.status = ?';
            params.push(status);
        }
        
        query += ' ORDER BY a.appointment_time DESC';
        
        const [appointments] = await req.db.execute(query, params);
        res.json(appointments);
    } catch (error) {
        console.error('Error fetching appointments:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Tekrarlayan randevu oluştur
router.post('/recurring', authenticateToken, async (req, res) => {
    try {
        const {
            clientId,
            therapistId,
            startDate,
            endDate,
            dayOfWeek,
            time,
            duration,
            therapyTypeId
        } = req.body;

        const appointments = [];
        let currentDate = new Date(startDate);
        const lastDate = new Date(endDate);

        while (currentDate <= lastDate) {
            if (currentDate.getDay() === dayOfWeek) {
                const dateTime = new Date(currentDate);
                const [hours, minutes] = time.split(':');
                dateTime.setHours(parseInt(hours), parseInt(minutes));

                const appointmentData = {
                    clientId,
                    therapistId,
                    dateTime,
                    duration,
                    therapyTypeId,
                    notes: 'Tekrarlayan randevu'
                };

                try {
                    const appointmentId = await req.appointmentService.createAppointment(
                        appointmentData
                    );
                    appointments.push(appointmentId);
                } catch (error) {
                    console.error('Error creating recurring appointment:', error);
                }
            }
            currentDate.setDate(currentDate.getDate() + 1);
        }

        res.status(201).json({
            message: 'Tekrarlayan randevular oluşturuldu',
            appointments
        });
    } catch (error) {
        console.error('Error creating recurring appointments:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
