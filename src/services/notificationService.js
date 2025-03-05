const webpush = require('web-push');
const sgMail = require('@sendgrid/mail');
const twilio = require('twilio');
const moment = require('moment');

class NotificationService {
    constructor(db) {
        this.db = db;
        
        // SendGrid ayarları
        sgMail.setApiKey(process.env.SENDGRID_API_KEY);
        
        // Twilio ayarları
        this.twilioClient = twilio(
            process.env.TWILIO_ACCOUNT_SID,
            process.env.TWILIO_AUTH_TOKEN
        );
        
        // Web Push ayarları
        webpush.setVapidDetails(
            'mailto:your-email@example.com',
            process.env.VAPID_PUBLIC_KEY,
            process.env.VAPID_PRIVATE_KEY
        );
    }

    // Bildirim oluştur
    async createNotification(notificationData) {
        const {
            userId,
            type,
            title,
            message,
            priority,
            data,
            sendEmail,
            sendSMS,
            sendPush
        } = notificationData;

        const connection = await this.db.getConnection();
        
        try {
            await connection.beginTransaction();

            // Bildirimi veritabanına kaydet
            const [result] = await connection.execute(`
                INSERT INTO notifications (
                    user_id,
                    type,
                    title,
                    message,
                    priority,
                    data,
                    created_at
                ) VALUES (?, ?, ?, ?, ?, ?, NOW())
            `, [userId, type, title, message, priority, JSON.stringify(data)]);

            const notificationId = result.insertId;

            // Kullanıcının tercihlerini kontrol et
            const [preferences] = await connection.execute(`
                SELECT notification_preferences 
                FROM users 
                WHERE id = ?
            `, [userId]);

            const userPreferences = JSON.parse(preferences[0].notification_preferences || '{}');

            // Email bildirimi
            if (sendEmail && userPreferences.email) {
                await this.sendEmailNotification(userId, title, message);
            }

            // SMS bildirimi
            if (sendSMS && userPreferences.sms) {
                await this.sendSMSNotification(userId, message);
            }

            // Push bildirimi
            if (sendPush && userPreferences.push) {
                await this.sendPushNotification(userId, title, message, data);
            }

            await connection.commit();
            return notificationId;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    // Email bildirimi gönder
    async sendEmailNotification(userId, title, message) {
        const [user] = await this.db.execute(
            'SELECT email, name FROM users WHERE id = ?',
            [userId]
        );

        if (!user[0].email) return;

        const msg = {
            to: user[0].email,
            from: process.env.SENDGRID_FROM_EMAIL,
            subject: title,
            text: message,
            html: `<div style="font-family: Arial, sans-serif;">
                <h2>${title}</h2>
                <p>${message}</p>
                <hr>
                <p style="font-size: 12px; color: #666;">
                    Bu email VR Fobi Tedavi Platformu tarafından gönderilmiştir.
                </p>
            </div>`
        };

        await sgMail.send(msg);
    }

    // SMS bildirimi gönder
    async sendSMSNotification(userId, message) {
        const [user] = await this.db.execute(
            'SELECT phone FROM users WHERE id = ?',
            [userId]
        );

        if (!user[0].phone) return;

        await this.twilioClient.messages.create({
            body: message,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: user[0].phone
        });
    }

    // Push bildirimi gönder
    async sendPushNotification(userId, title, message, data) {
        const [subscriptions] = await this.db.execute(
            'SELECT push_subscription FROM user_push_subscriptions WHERE user_id = ?',
            [userId]
        );

        for (const sub of subscriptions) {
            const subscription = JSON.parse(sub.push_subscription);
            const payload = JSON.stringify({
                title,
                message,
                data,
                timestamp: new Date().getTime()
            });

            try {
                await webpush.sendNotification(subscription, payload);
            } catch (error) {
                if (error.statusCode === 410) {
                    // Subscription has expired or is invalid
                    await this.db.execute(
                        'DELETE FROM user_push_subscriptions WHERE user_id = ? AND push_subscription = ?',
                        [userId, sub.push_subscription]
                    );
                }
            }
        }
    }

    // Kullanıcının bildirimlerini getir
    async getUserNotifications(userId, page = 1, limit = 10) {
        const offset = (page - 1) * limit;

        const [notifications] = await this.db.execute(`
            SELECT 
                id,
                type,
                title,
                message,
                data,
                read_at,
                created_at
            FROM notifications
            WHERE user_id = ?
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
        `, [userId, limit, offset]);

        const [total] = await this.db.execute(
            'SELECT COUNT(*) as count FROM notifications WHERE user_id = ?',
            [userId]
        );

        return {
            notifications,
            total: total[0].count,
            page,
            totalPages: Math.ceil(total[0].count / limit)
        };
    }

    // Bildirimi okundu olarak işaretle
    async markAsRead(notificationId, userId) {
        await this.db.execute(`
            UPDATE notifications 
            SET read_at = NOW() 
            WHERE id = ? AND user_id = ?
        `, [notificationId, userId]);
    }

    // Tüm bildirimleri okundu olarak işaretle
    async markAllAsRead(userId) {
        await this.db.execute(`
            UPDATE notifications 
            SET read_at = NOW() 
            WHERE user_id = ? AND read_at IS NULL
        `, [userId]);
    }

    // Bildirim tercihlerini güncelle
    async updateNotificationPreferences(userId, preferences) {
        await this.db.execute(`
            UPDATE users 
            SET notification_preferences = ?
            WHERE id = ?
        `, [JSON.stringify(preferences), userId]);
    }

    // Push subscription kaydet
    async savePushSubscription(userId, subscription) {
        await this.db.execute(`
            INSERT INTO user_push_subscriptions (
                user_id, 
                push_subscription,
                created_at
            ) VALUES (?, ?, NOW())
            ON DUPLICATE KEY UPDATE
                push_subscription = VALUES(push_subscription)
        `, [userId, JSON.stringify(subscription)]);
    }
}

module.exports = NotificationService;
