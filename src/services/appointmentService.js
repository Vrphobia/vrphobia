const schedule = require('node-schedule');
const nodemailer = require('nodemailer');
const moment = require('moment');

class AppointmentService {
    constructor(db) {
        this.db = db;
        this.emailTransporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: process.env.SMTP_PORT || 587,
            secure: false,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });
    }

    // Randevu oluşturma
    async createAppointment(appointmentData) {
        const { clientId, therapistId, dateTime, duration, notes, therapyTypeId } = appointmentData;

        // Çakışma kontrolü
        const isAvailable = await this.checkAvailability(therapistId, dateTime, duration);
        if (!isAvailable) {
            throw new Error('Seçilen zaman diliminde terapist müsait değil');
        }

        // Randevuyu oluştur
        const [result] = await this.db.execute(`
            INSERT INTO appointments (
                client_id, 
                therapist_id, 
                appointment_time, 
                duration, 
                notes,
                therapy_type_id,
                status
            ) VALUES (?, ?, ?, ?, ?, ?, 'scheduled')
        `, [clientId, therapistId, dateTime, duration, notes, therapyTypeId]);

        // Hatırlatıcıları planla
        await this.scheduleReminders(result.insertId, dateTime, clientId, therapistId);

        return result.insertId;
    }

    // Müsaitlik kontrolü
    async checkAvailability(therapistId, dateTime, duration) {
        const appointmentStart = moment(dateTime);
        const appointmentEnd = moment(dateTime).add(duration, 'minutes');

        const [existingAppointments] = await this.db.execute(`
            SELECT * FROM appointments 
            WHERE therapist_id = ? 
            AND appointment_time BETWEEN ? AND ?
            AND status != 'cancelled'
        `, [
            therapistId,
            appointmentStart.subtract(duration, 'minutes').format('YYYY-MM-DD HH:mm:ss'),
            appointmentEnd.add(duration, 'minutes').format('YYYY-MM-DD HH:mm:ss')
        ]);

        return existingAppointments.length === 0;
    }

    // Terapist müsaitlik saatlerini getir
    async getTherapistAvailability(therapistId, date) {
        // Terapistin çalışma saatlerini al
        const [workingHours] = await this.db.execute(`
            SELECT * FROM therapist_working_hours 
            WHERE therapist_id = ? 
            AND day_of_week = WEEKDAY(?)
        `, [therapistId, date]);

        if (workingHours.length === 0) {
            return [];
        }

        // Mevcut randevuları al
        const [appointments] = await this.db.execute(`
            SELECT appointment_time, duration 
            FROM appointments 
            WHERE therapist_id = ? 
            AND DATE(appointment_time) = ?
            AND status != 'cancelled'
        `, [therapistId, date]);

        // Müsait zaman dilimlerini hesapla
        const availableSlots = [];
        const startTime = moment(date + ' ' + workingHours[0].start_time);
        const endTime = moment(date + ' ' + workingHours[0].end_time);

        while (startTime.isBefore(endTime)) {
            const slotEnd = moment(startTime).add(60, 'minutes');
            const isAvailable = !appointments.some(apt => {
                const aptStart = moment(apt.appointment_time);
                const aptEnd = moment(apt.appointment_time).add(apt.duration, 'minutes');
                return startTime.isBetween(aptStart, aptEnd) || 
                       slotEnd.isBetween(aptStart, aptEnd);
            });

            if (isAvailable) {
                availableSlots.push(startTime.format('HH:mm'));
            }
            startTime.add(60, 'minutes');
        }

        return availableSlots;
    }

    // Randevu hatırlatıcıları planla
    async scheduleReminders(appointmentId, dateTime, clientId, therapistId) {
        const appointment = moment(dateTime);

        // 1 gün önce hatırlatma
        schedule.scheduleJob(appointment.subtract(1, 'days').toDate(), async () => {
            await this.sendReminders(appointmentId, 'day_before');
        });

        // 1 saat önce hatırlatma
        schedule.scheduleJob(appointment.subtract(1, 'hours').toDate(), async () => {
            await this.sendReminders(appointmentId, 'hour_before');
        });
    }

    // Hatırlatma gönder
    async sendReminders(appointmentId, type) {
        const [appointment] = await this.db.execute(`
            SELECT 
                a.*,
                c.email as client_email,
                c.name as client_name,
                t.email as therapist_email,
                t.name as therapist_name
            FROM appointments a
            JOIN clients c ON a.client_id = c.id
            JOIN users t ON a.therapist_id = t.id
            WHERE a.id = ?
        `, [appointmentId]);

        if (appointment.length === 0) return;

        const apt = appointment[0];
        const timeStr = moment(apt.appointment_time).format('DD/MM/YYYY HH:mm');

        // Danışana email gönder
        await this.emailTransporter.sendMail({
            to: apt.client_email,
            subject: 'Randevu Hatırlatması',
            text: `Sayın ${apt.client_name}, ${timeStr} tarihindeki randevunuzu hatırlatmak isteriz.`
        });

        // Terapiste email gönder
        await this.emailTransporter.sendMail({
            to: apt.therapist_email,
            subject: 'Randevu Hatırlatması',
            text: `Sayın ${apt.therapist_name}, ${timeStr} tarihinde ${apt.client_name} ile randevunuz bulunmaktadır.`
        });
    }

    // Randevu güncelleme
    async updateAppointment(appointmentId, updateData) {
        const { dateTime, duration, notes, status } = updateData;

        if (dateTime && duration) {
            const [appointment] = await this.db.execute(
                'SELECT therapist_id FROM appointments WHERE id = ?',
                [appointmentId]
            );

            const isAvailable = await this.checkAvailability(
                appointment[0].therapist_id,
                dateTime,
                duration
            );

            if (!isAvailable) {
                throw new Error('Seçilen zaman diliminde terapist müsait değil');
            }
        }

        await this.db.execute(`
            UPDATE appointments 
            SET 
                appointment_time = COALESCE(?, appointment_time),
                duration = COALESCE(?, duration),
                notes = COALESCE(?, notes),
                status = COALESCE(?, status),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [dateTime, duration, notes, status, appointmentId]);

        return true;
    }

    // Randevu iptal
    async cancelAppointment(appointmentId, reason) {
        await this.db.execute(`
            UPDATE appointments 
            SET 
                status = 'cancelled',
                cancellation_reason = ?,
                cancelled_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [reason, appointmentId]);

        // İptal bildirimi gönder
        const [appointment] = await this.db.execute(`
            SELECT 
                a.*,
                c.email as client_email,
                c.name as client_name,
                t.email as therapist_email,
                t.name as therapist_name
            FROM appointments a
            JOIN clients c ON a.client_id = c.id
            JOIN users t ON a.therapist_id = t.id
            WHERE a.id = ?
        `, [appointmentId]);

        if (appointment.length > 0) {
            const apt = appointment[0];
            const timeStr = moment(apt.appointment_time).format('DD/MM/YYYY HH:mm');

            // Danışana iptal emaili
            await this.emailTransporter.sendMail({
                to: apt.client_email,
                subject: 'Randevu İptali',
                text: `Sayın ${apt.client_name}, ${timeStr} tarihindeki randevunuz iptal edilmiştir. Sebep: ${reason}`
            });

            // Terapiste iptal emaili
            await this.emailTransporter.sendMail({
                to: apt.therapist_email,
                subject: 'Randevu İptali',
                text: `Sayın ${apt.therapist_name}, ${timeStr} tarihindeki ${apt.client_name} ile randevunuz iptal edilmiştir.`
            });
        }

        return true;
    }
}

module.exports = AppointmentService;
