const express = require('express');
const router = express.Router();
const pool = require('../database/db');
const { authenticateToken, isAdmin } = require('../middleware/auth');

// Dashboard istatistikleri
router.get('/dashboard-stats', authenticateToken, async (req, res) => {
    try {
        const [totalClientsResult] = await pool.query('SELECT COUNT(*) as count FROM users WHERE role = "client"');
        const [activeTherapistsResult] = await pool.query('SELECT COUNT(*) as count FROM users WHERE role = "therapist" AND status = "active"');
        const [monthlyAppointmentsResult] = await pool.query('SELECT COUNT(*) as count FROM appointments WHERE MONTH(appointment_date) = MONTH(CURRENT_DATE()) AND YEAR(appointment_date) = YEAR(CURRENT_DATE())');
        const [monthlyIncomeResult] = await pool.query('SELECT SUM(amount) as total FROM payments WHERE MONTH(payment_date) = MONTH(CURRENT_DATE()) AND YEAR(payment_date) = YEAR(CURRENT_DATE()) AND status = "completed"');

        // Son 6 ayın seans istatistikleri
        const [appointmentStats] = await pool.query(`
            SELECT 
                DATE_FORMAT(appointment_date, '%Y-%m') as month,
                COUNT(*) as count
            FROM appointments
            WHERE appointment_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 6 MONTH)
            GROUP BY month
            ORDER BY month ASC
        `);

        // Son 6 ayın gelir istatistikleri
        const [incomeStats] = await pool.query(`
            SELECT 
                DATE_FORMAT(payment_date, '%Y-%m') as month,
                SUM(amount) as total
            FROM payments
            WHERE payment_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 6 MONTH)
                AND status = "completed"
            GROUP BY month
            ORDER BY month ASC
        `);

        res.json({
            totalClients: totalClientsResult[0].count,
            activeTherapists: activeTherapistsResult[0].count,
            monthlyAppointments: monthlyAppointmentsResult[0].count,
            monthlyIncome: monthlyIncomeResult[0].total || 0,
            appointmentStats: {
                labels: appointmentStats.map(stat => stat.month),
                data: appointmentStats.map(stat => stat.count)
            },
            incomeStats: {
                labels: incomeStats.map(stat => stat.month),
                data: incomeStats.map(stat => stat.total)
            }
        });
    } catch (error) {
        console.error('Dashboard istatistikleri alınırken hata:', error);
        res.status(500).json({ error: 'Dashboard istatistikleri alınamadı' });
    }
});

// Fobi türleri
router.get('/phobia-types', authenticateToken, async (req, res) => {
    try {
        const [phobiaTypes] = await pool.query('SELECT * FROM phobia_types ORDER BY name');
        res.json(phobiaTypes);
    } catch (error) {
        console.error('Fobi türleri alınırken hata:', error);
        res.status(500).json({ error: 'Fobi türleri alınamadı' });
    }
});

router.post('/phobia-types', authenticateToken, async (req, res) => {
    const { name, description } = req.body;
    try {
        const [result] = await pool.query(
            'INSERT INTO phobia_types (name, description) VALUES (?, ?)',
            [name, description]
        );
        res.json({ id: result.insertId, name, description });
    } catch (error) {
        console.error('Fobi türü eklenirken hata:', error);
        res.status(500).json({ error: 'Fobi türü eklenemedi' });
    }
});

// VR senaryoları
router.get('/vr-scenarios', authenticateToken, async (req, res) => {
    try {
        const [scenarios] = await pool.query(`
            SELECT 
                s.*,
                p.name as phobia_type,
                COUNT(DISTINCT vs.id) as usage_count,
                AVG(CASE WHEN vs.completion_percentage >= 80 THEN 1 ELSE 0 END) * 100 as success_rate
            FROM vr_scenarios s
            LEFT JOIN phobia_types p ON s.phobia_type_id = p.id
            LEFT JOIN vr_sessions vs ON s.id = vs.scenario_id
            GROUP BY s.id
            ORDER BY s.name
        `);
        res.json(scenarios);
    } catch (error) {
        console.error('VR senaryoları alınırken hata:', error);
        res.status(500).json({ error: 'VR senaryoları alınamadı' });
    }
});

router.post('/vr-scenarios', authenticateToken, async (req, res) => {
    const { name, description, phobia_type_id, difficulty_level, duration_minutes, success_criteria } = req.body;
    try {
        const [result] = await pool.query(
            'INSERT INTO vr_scenarios (name, description, phobia_type_id, difficulty_level, duration_minutes, success_criteria) VALUES (?, ?, ?, ?, ?, ?)',
            [name, description, phobia_type_id, difficulty_level, duration_minutes, success_criteria]
        );
        res.json({ id: result.insertId, ...req.body });
    } catch (error) {
        console.error('VR senaryo eklenirken hata:', error);
        res.status(500).json({ error: 'VR senaryo eklenemedi' });
    }
});

// Finansal özet
router.get('/financial-summary', authenticateToken, async (req, res) => {
    try {
        // Aylık gelir
        const [monthlyRevenue] = await pool.query(`
            SELECT SUM(amount) as total
            FROM payments
            WHERE MONTH(payment_date) = MONTH(CURRENT_DATE())
                AND YEAR(payment_date) = YEAR(CURRENT_DATE())
                AND status = 'completed'
        `);

        // Bekleyen ödemeler
        const [pendingPayments] = await pool.query(`
            SELECT SUM(amount) as total
            FROM payments
            WHERE status = 'pending'
        `);

        // Ortalama seans ücreti
        const [avgSessionFee] = await pool.query(`
            SELECT AVG(amount) as average
            FROM payments
            WHERE status = 'completed'
                AND payment_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH)
        `);

        // Tahsilat oranı
        const [collectionRate] = await pool.query(`
            SELECT 
                (SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) / 
                 SUM(amount)) * 100 as rate
            FROM payments
            WHERE payment_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH)
        `);

        // Son ödemeler
        const [recentPayments] = await pool.query(`
            SELECT 
                p.*,
                CONCAT(u.name, ' ', u.surname) as client_name
            FROM payments p
            JOIN users u ON p.client_id = u.id
            ORDER BY p.payment_date DESC
            LIMIT 10
        `);

        res.json({
            monthlyRevenue: monthlyRevenue[0].total || 0,
            pendingPayments: pendingPayments[0].total || 0,
            avgSessionFee: avgSessionFee[0].average || 0,
            collectionRate: Math.round(collectionRate[0].rate || 0),
            recentPayments
        });
    } catch (error) {
        console.error('Finansal özet alınırken hata:', error);
        res.status(500).json({ error: 'Finansal özet alınamadı' });
    }
});

// Sistem ayarları
router.get('/settings', authenticateToken, async (req, res) => {
    try {
        // Bu kısım normalde veritabanından gelecek
        const settings = {
            security: {
                twoFactorEnabled: true,
                auditLogEnabled: true,
                autoBackupEnabled: true
            },
            notifications: {
                newAppointment: true,
                cancelledAppointment: true,
                paymentReminder: true,
                systemAlert: true
            },
            system: {
                version: '1.0.0',
                lastBackup: '2025-02-21 10:30:00',
                databaseSize: '256 MB',
                storageUsage: '1.2 GB'
            }
        };
        
        res.json(settings);
    } catch (error) {
        console.error('Ayarlar alınırken hata:', error);
        res.status(500).json({ error: 'Ayarlar alınamadı' });
    }
});

// Ödeme yönetimi endpointleri
router.get('/payments/stats', authenticateToken, async (req, res) => {
    try {
        const [totalRevenue] = await pool.query(`
            SELECT SUM(amount) as total
            FROM payments
            WHERE MONTH(created_at) = MONTH(CURRENT_DATE())
            AND YEAR(created_at) = YEAR(CURRENT_DATE())
        `);

        const [activeSubscriptions] = await pool.query(`
            SELECT COUNT(*) as total
            FROM subscriptions
            WHERE status = 'active'
        `);

        const [pendingPayments] = await pool.query(`
            SELECT COUNT(*) as total
            FROM payments
            WHERE status = 'pending'
            AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        `);

        const [cancelledSubscriptions] = await pool.query(`
            SELECT COUNT(*) as total
            FROM subscriptions
            WHERE status = 'cancelled'
            AND MONTH(cancelled_at) = MONTH(CURRENT_DATE())
            AND YEAR(cancelled_at) = YEAR(CURRENT_DATE())
        `);

        res.json({
            totalRevenue: totalRevenue[0].total || 0,
            activeSubscriptions: activeSubscriptions[0].total || 0,
            pendingPayments: pendingPayments[0].total || 0,
            cancelledSubscriptions: cancelledSubscriptions[0].total || 0
        });
    } catch (error) {
        console.error('Error fetching payment stats:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/payments/transactions', authenticateToken, async (req, res) => {
    try {
        const [transactions] = await pool.query(`
            SELECT 
                p.*,
                u.name as user_name,
                u.email as user_email,
                i.invoice_number,
                i.tax_amount,
                i.total_amount
            FROM payments p
            JOIN users u ON p.user_id = u.id
            LEFT JOIN invoices i ON p.id = i.payment_id
            ORDER BY p.created_at DESC
            LIMIT 100
        `);

        res.json(transactions);
    } catch (error) {
        console.error('Error fetching transactions:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/payments/subscription-plans', authenticateToken, async (req, res) => {
    try {
        const [plans] = await pool.query(`
            SELECT 
                sp.*,
                COUNT(s.id) as active_subscribers
            FROM subscription_plans sp
            LEFT JOIN subscriptions s ON sp.id = s.plan_id AND s.status = 'active'
            GROUP BY sp.id
        `);

        res.json(plans);
    } catch (error) {
        console.error('Error fetching subscription plans:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/payments/subscription-plans', authenticateToken, async (req, res) => {
    try {
        const {
            name,
            description,
            price,
            duration_months,
            features
        } = req.body;

        const [result] = await pool.query(`
            INSERT INTO subscription_plans (
                name,
                description,
                price,
                duration_months,
                features
            ) VALUES (?, ?, ?, ?, ?)
        `, [
            name,
            description,
            price,
            duration_months,
            JSON.stringify(features)
        ]);

        res.status(201).json({
            id: result.insertId,
            message: 'Plan başarıyla oluşturuldu'
        });
    } catch (error) {
        console.error('Error creating subscription plan:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.put('/payments/subscription-plans/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const {
            name,
            description,
            price,
            duration_months,
            features,
            is_active
        } = req.body;

        await pool.query(`
            UPDATE subscription_plans
            SET
                name = ?,
                description = ?,
                price = ?,
                duration_months = ?,
                features = ?,
                is_active = ?
            WHERE id = ?
        `, [
            name,
            description,
            price,
            duration_months,
            JSON.stringify(features),
            is_active,
            id
        ]);

        res.json({ message: 'Plan başarıyla güncellendi' });
    } catch (error) {
        console.error('Error updating subscription plan:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/payments/export', authenticateToken, async (req, res) => {
    try {
        const [transactions] = await pool.query(`
            SELECT 
                p.created_at,
                p.transaction_id,
                u.name as user_name,
                u.email as user_email,
                p.amount,
                p.currency,
                p.payment_method,
                p.status,
                i.invoice_number,
                i.tax_amount,
                i.total_amount
            FROM payments p
            JOIN users u ON p.user_id = u.id
            LEFT JOIN invoices i ON p.id = i.payment_id
            ORDER BY p.created_at DESC
        `);

        // CSV formatına dönüştür
        const createCsvStringifier = require('csv-writer').createObjectCsvStringifier;
        const csvStringifier = createCsvStringifier({
            header: [
                { id: 'created_at', title: 'Tarih' },
                { id: 'transaction_id', title: 'İşlem No' },
                { id: 'user_name', title: 'Kullanıcı' },
                { id: 'email', title: 'Email' },
                { id: 'amount', title: 'Tutar' },
                { id: 'currency', title: 'Para Birimi' },
                { id: 'payment_method', title: 'Ödeme Yöntemi' },
                { id: 'status', title: 'Durum' },
                { id: 'invoice_number', title: 'Fatura No' },
                { id: 'tax_amount', title: 'Vergi Tutarı' },
                { id: 'total_amount', title: 'Toplam Tutar' }
            ]
        });

        const csv = csvStringifier.getHeaderString() + csvStringifier.stringifyRecords(transactions);

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=transactions.csv');
        res.send(csv);
    } catch (error) {
        console.error('Error exporting transactions:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
