const express = require('express');
const router = express.Router();
const NotificationService = require('../services/notificationService');
const { authenticateToken } = require('../middleware/auth');

// Middleware to initialize notification service
router.use((req, res, next) => {
    req.notificationService = new NotificationService(req.db);
    next();
});

// Bildirim oluştur
router.post('/', authenticateToken, async (req, res) => {
    try {
        const notificationData = {
            userId: req.body.userId,
            type: req.body.type,
            title: req.body.title,
            message: req.body.message,
            priority: req.body.priority || 'normal',
            data: req.body.data || {},
            sendEmail: req.body.sendEmail || false,
            sendSMS: req.body.sendSMS || false,
            sendPush: req.body.sendPush || true
        };

        const notificationId = await req.notificationService.createNotification(
            notificationData
        );

        res.status(201).json({
            message: 'Bildirim başarıyla oluşturuldu',
            notificationId
        });
    } catch (error) {
        console.error('Error creating notification:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Kullanıcının bildirimlerini getir
router.get('/user/:userId', authenticateToken, async (req, res) => {
    try {
        const { userId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;

        const notifications = await req.notificationService.getUserNotifications(
            userId,
            page,
            limit
        );

        res.json(notifications);
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Bildirimi okundu olarak işaretle
router.put('/:notificationId/read', authenticateToken, async (req, res) => {
    try {
        const { notificationId } = req.params;
        const { userId } = req.body;

        await req.notificationService.markAsRead(notificationId, userId);
        res.json({ message: 'Bildirim okundu olarak işaretlendi' });
    } catch (error) {
        console.error('Error marking notification as read:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Tüm bildirimleri okundu olarak işaretle
router.put('/user/:userId/read-all', authenticateToken, async (req, res) => {
    try {
        const { userId } = req.params;
        await req.notificationService.markAllAsRead(userId);
        res.json({ message: 'Tüm bildirimler okundu olarak işaretlendi' });
    } catch (error) {
        console.error('Error marking all notifications as read:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Bildirim tercihlerini güncelle
router.put('/preferences/:userId', authenticateToken, async (req, res) => {
    try {
        const { userId } = req.params;
        const preferences = req.body;

        await req.notificationService.updateNotificationPreferences(
            userId,
            preferences
        );

        res.json({
            message: 'Bildirim tercihleri başarıyla güncellendi'
        });
    } catch (error) {
        console.error('Error updating notification preferences:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Push subscription kaydet
router.post('/push-subscription', authenticateToken, async (req, res) => {
    try {
        const { userId, subscription } = req.body;

        await req.notificationService.savePushSubscription(
            userId,
            subscription
        );

        res.status(201).json({
            message: 'Push subscription başarıyla kaydedildi'
        });
    } catch (error) {
        console.error('Error saving push subscription:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
