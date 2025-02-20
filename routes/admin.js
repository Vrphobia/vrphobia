const express = require('express');
const router = express.Router();
const mysql = require('mysql2/promise');

// MySQL bağlantı havuzu
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'Vrphobia123*',
    database: 'employee_support_portal'
});

// İstatistikleri getir
router.get('/statistics', async (req, res) => {
    try {
        const [userStats] = await pool.query(`
            SELECT 
                COUNT(CASE WHEN role = 'client' THEN 1 END) as totalClients,
                COUNT(CASE WHEN role = 'psychologist' THEN 1 END) as totalTherapists
            FROM users
        `);

        const [appointmentStats] = await pool.query(`
            SELECT 
                COUNT(*) as totalAppointments,
                COUNT(CASE WHEN status = 'completed' THEN 1 END) as completedAppointments,
                COUNT(CASE WHEN status = 'scheduled' THEN 1 END) as upcomingAppointments
            FROM appointments
        `);

        res.json({
            users: userStats[0],
            appointments: appointmentStats[0]
        });
    } catch (error) {
        console.error('İstatistikler getirilirken hata:', error);
        res.status(500).json({ error: 'İstatistikler getirilirken bir hata oluştu' });
    }
});

// Tüm randevuları getir
router.get('/appointments', async (req, res) => {
    try {
        const [appointments] = await pool.query(`
            SELECT 
                a.*,
                CONCAT(c.name, ' ', c.surname) as clientName,
                CONCAT(t.name, ' ', t.surname) as therapistName
            FROM appointments a
            LEFT JOIN users c ON a.client_id = c.id
            LEFT JOIN users t ON a.psychologist_id = t.id
            ORDER BY a.appointment_time DESC
        `);
        res.json(appointments);
    } catch (error) {
        console.error('Randevular getirilirken hata:', error);
        res.status(500).json({ error: 'Randevular getirilirken bir hata oluştu' });
    }
});

// Yaklaşan randevuları getir
router.get('/appointments/upcoming', async (req, res) => {
    try {
        const [appointments] = await pool.query(`
            SELECT 
                a.*,
                CONCAT(c.name, ' ', c.surname) as clientName,
                CONCAT(t.name, ' ', t.surname) as therapistName
            FROM appointments a
            LEFT JOIN users c ON a.client_id = c.id
            LEFT JOIN users t ON a.psychologist_id = t.id
            WHERE a.appointment_time >= NOW()
            ORDER BY a.appointment_time ASC
            LIMIT 5
        `);
        res.json(appointments);
    } catch (error) {
        console.error('Yaklaşan randevular getirilirken hata:', error);
        res.status(500).json({ error: 'Yaklaşan randevular getirilirken bir hata oluştu' });
    }
});

// Tek bir randevuyu getir
router.get('/appointments/:id', async (req, res) => {
    try {
        const [appointments] = await pool.query('SELECT * FROM appointments WHERE id = ?', [req.params.id]);
        if (appointments.length === 0) {
            return res.status(404).json({ error: 'Randevu bulunamadı' });
        }
        res.json(appointments[0]);
    } catch (error) {
        console.error('Randevu getirilirken hata:', error);
        res.status(500).json({ error: 'Randevu getirilirken bir hata oluştu' });
    }
});

// Yeni randevu oluştur
router.post('/appointments', async (req, res) => {
    try {
        const { clientId, psychologistId, appointmentTime, type, location, notes } = req.body;
        const [result] = await pool.query(`
            INSERT INTO appointments (client_id, psychologist_id, appointment_time, type, location, notes)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [clientId, psychologistId, appointmentTime, type, location, notes]);
        
        res.status(201).json({ id: result.insertId });
    } catch (error) {
        console.error('Randevu oluşturulurken hata:', error);
        res.status(500).json({ error: 'Randevu oluşturulurken bir hata oluştu' });
    }
});

// Randevu güncelle
router.put('/appointments/:id', async (req, res) => {
    try {
        const { clientId, psychologistId, appointmentTime, type, location, notes, status } = req.body;
        await pool.query(`
            UPDATE appointments
            SET client_id = ?, psychologist_id = ?, appointment_time = ?, 
                type = ?, location = ?, notes = ?, status = ?
            WHERE id = ?
        `, [clientId, psychologistId, appointmentTime, type, location, notes, status, req.params.id]);
        
        res.json({ message: 'Randevu güncellendi' });
    } catch (error) {
        console.error('Randevu güncellenirken hata:', error);
        res.status(500).json({ error: 'Randevu güncellenirken bir hata oluştu' });
    }
});

// Randevu sil
router.delete('/appointments/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM appointments WHERE id = ?', [req.params.id]);
        res.json({ message: 'Randevu silindi' });
    } catch (error) {
        console.error('Randevu silinirken hata:', error);
        res.status(500).json({ error: 'Randevu silinirken bir hata oluştu' });
    }
});

// Terapistleri getir
router.get('/therapists', async (req, res) => {
    try {
        const [therapists] = await pool.query(`
            SELECT id, name, surname, email, phone
            FROM users
            WHERE role = 'psychologist'
            ORDER BY name, surname
        `);
        res.json(therapists);
    } catch (error) {
        console.error('Terapistler getirilirken hata:', error);
        res.status(500).json({ error: 'Terapistler getirilirken bir hata oluştu' });
    }
});

// Danışanları getir
router.get('/clients', async (req, res) => {
    try {
        const [clients] = await pool.query(`
            SELECT id, name, surname, email, phone
            FROM users
            WHERE role = 'client'
            ORDER BY name, surname
        `);
        res.json(clients);
    } catch (error) {
        console.error('Danışanlar getirilirken hata:', error);
        res.status(500).json({ error: 'Danışanlar getirilirken bir hata oluştu' });
    }
});

// Son aktiviteleri getir
router.get('/activities', async (req, res) => {
    try {
        const [activities] = await pool.query(`
            SELECT a.*, CONCAT(u.name, ' ', u.surname) as user
            FROM activities a
            LEFT JOIN users u ON a.user_id = u.id
            ORDER BY a.timestamp DESC
            LIMIT 10
        `);
        res.json(activities);
    } catch (error) {
        console.error('Aktiviteler getirilirken hata:', error);
        res.status(500).json({ error: 'Aktiviteler getirilirken bir hata oluştu' });
    }
});

// Raporlar için endpoint'ler
router.get('/reports/appointments', async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        
        let query = `
            SELECT 
                DATE(appointment_time) as date,
                COUNT(*) as total,
                COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
                COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled
            FROM appointments
            WHERE appointment_time BETWEEN ? AND ?
            GROUP BY DATE(appointment_time)
            ORDER BY date
        `;

        const [appointments] = await pool.query(query, [startDate, endDate]);

        res.json({
            labels: appointments.map(a => a.date),
            values: appointments.map(a => a.total),
            completed: appointments.map(a => a.completed),
            cancelled: appointments.map(a => a.cancelled)
        });
    } catch (error) {
        console.error('Randevu raporu alınırken hata:', error);
        res.status(500).json({ error: 'Randevu raporu alınırken bir hata oluştu' });
    }
});

router.get('/reports/users', async (req, res) => {
    try {
        const [users] = await pool.query(`
            SELECT 
                COUNT(CASE WHEN role = 'client' THEN 1 END) as clients,
                COUNT(CASE WHEN role = 'psychologist' THEN 1 END) as therapists,
                COUNT(CASE WHEN role = 'admin' THEN 1 END) as admins
            FROM users
        `);

        res.json(users[0]);
    } catch (error) {
        console.error('Kullanıcı raporu alınırken hata:', error);
        res.status(500).json({ error: 'Kullanıcı raporu alınırken bir hata oluştu' });
    }
});

router.get('/reports/activities', async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        
        let query = `
            SELECT 
                DATE(timestamp) as date,
                COUNT(*) as total,
                action
            FROM activities
            WHERE timestamp BETWEEN ? AND ?
            GROUP BY DATE(timestamp), action
            ORDER BY date
        `;

        const [activities] = await pool.query(query, [startDate, endDate]);

        // Aktiviteleri günlere göre grupla
        const groupedActivities = activities.reduce((acc, curr) => {
            if (!acc[curr.date]) {
                acc[curr.date] = {};
            }
            acc[curr.date][curr.action] = curr.total;
            return acc;
        }, {});

        res.json({
            labels: Object.keys(groupedActivities),
            values: Object.values(groupedActivities).map(day => 
                Object.values(day).reduce((sum, count) => sum + count, 0)
            )
        });
    } catch (error) {
        console.error('Aktivite raporu alınırken hata:', error);
        res.status(500).json({ error: 'Aktivite raporu alınırken bir hata oluştu' });
    }
});

router.get('/reports/export', async (req, res) => {
    try {
        const { startDate, endDate, type, format } = req.query;
        
        // Format ve tipe göre rapor oluştur
        let data;
        if (type === 'appointments') {
            const [appointments] = await pool.query(`
                SELECT 
                    a.*,
                    CONCAT(c.name, ' ', c.surname) as clientName,
                    CONCAT(t.name, ' ', t.surname) as therapistName
                FROM appointments a
                LEFT JOIN users c ON a.client_id = c.id
                LEFT JOIN users t ON a.psychologist_id = t.id
                WHERE a.appointment_time BETWEEN ? AND ?
                ORDER BY a.appointment_time
            `, [startDate, endDate]);
            data = appointments;
        } else if (type === 'users') {
            const [users] = await pool.query(`
                SELECT name, surname, email, role, created_at
                FROM users
                WHERE created_at BETWEEN ? AND ?
                ORDER BY created_at
            `, [startDate, endDate]);
            data = users;
        } else if (type === 'activities') {
            const [activities] = await pool.query(`
                SELECT 
                    a.*,
                    CONCAT(u.name, ' ', u.surname) as userName
                FROM activities a
                LEFT JOIN users u ON a.user_id = u.id
                WHERE a.timestamp BETWEEN ? AND ?
                ORDER BY a.timestamp
            `, [startDate, endDate]);
            data = activities;
        }

        // Format'a göre dönüştür ve gönder
        if (format === 'csv') {
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename=report_${type}_${startDate}_${endDate}.csv`);
            // CSV formatına dönüştür ve gönder
            const csv = convertToCSV(data);
            res.send(csv);
        } else if (format === 'excel') {
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename=report_${type}_${startDate}_${endDate}.xlsx`);
            // Excel formatına dönüştür ve gönder
            const excel = convertToExcel(data);
            res.send(excel);
        } else if (format === 'pdf') {
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=report_${type}_${startDate}_${endDate}.pdf`);
            // PDF formatına dönüştür ve gönder
            const pdf = convertToPDF(data);
            res.send(pdf);
        }
    } catch (error) {
        console.error('Rapor dışa aktarılırken hata:', error);
        res.status(500).json({ error: 'Rapor dışa aktarılırken bir hata oluştu' });
    }
});

// Ayarlar için endpoint'ler
router.get('/settings', async (req, res) => {
    try {
        const [settings] = await pool.query('SELECT * FROM settings WHERE id = 1');
        if (settings.length === 0) {
            return res.status(404).json({ error: 'Ayarlar bulunamadı' });
        }
        res.json(JSON.parse(settings[0].value));
    } catch (error) {
        console.error('Ayarlar getirilirken hata:', error);
        res.status(500).json({ error: 'Ayarlar getirilirken bir hata oluştu' });
    }
});

router.put('/settings/:section', async (req, res) => {
    try {
        const { section } = req.params;
        const newSettings = req.body;

        // Mevcut ayarları al
        const [settings] = await pool.query('SELECT * FROM settings WHERE id = 1');
        if (settings.length === 0) {
            return res.status(404).json({ error: 'Ayarlar bulunamadı' });
        }

        // Ayarları güncelle
        const currentSettings = JSON.parse(settings[0].value);
        currentSettings[section] = newSettings;

        // Veritabanına kaydet
        await pool.query('UPDATE settings SET value = ? WHERE id = 1', [JSON.stringify(currentSettings)]);

        res.json({ message: 'Ayarlar güncellendi' });
    } catch (error) {
        console.error('Ayarlar güncellenirken hata:', error);
        res.status(500).json({ error: 'Ayarlar güncellenirken bir hata oluştu' });
    }
});

router.post('/settings/email/test', async (req, res) => {
    try {
        // E-posta ayarlarını al
        const [settings] = await pool.query('SELECT * FROM settings WHERE id = 1');
        if (settings.length === 0) {
            return res.status(404).json({ error: 'Ayarlar bulunamadı' });
        }

        const { email } = JSON.parse(settings[0].value);

        // Test e-postası gönder
        // TODO: E-posta gönderme fonksiyonu eklenecek

        res.json({ message: 'Test e-postası gönderildi' });
    } catch (error) {
        console.error('Test e-postası gönderilirken hata:', error);
        res.status(500).json({ error: 'Test e-postası gönderilirken bir hata oluştu' });
    }
});

// Yardımcı fonksiyonlar
function convertToCSV(data) {
    if (!data || data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const rows = data.map(obj => headers.map(key => obj[key]));
    
    return [
        headers.join(','),
        ...rows.map(row => row.join(','))
    ].join('\n');
}

function convertToExcel(data) {
    // TODO: Excel dönüşüm fonksiyonu eklenecek
    return Buffer.from('Excel dosyası');
}

function convertToPDF(data) {
    // TODO: PDF dönüşüm fonksiyonu eklenecek
    return Buffer.from('PDF dosyası');
}

module.exports = router;
