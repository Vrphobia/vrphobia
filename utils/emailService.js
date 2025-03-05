const nodemailer = require('nodemailer');

// Create transporter
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: true,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

// Email templates
const emailTemplates = {
    welcomeEmployee: (data) => ({
        subject: 'Welcome to VR Phobia Portal',
        html: `
            <h1>Welcome ${data.name}!</h1>
            <p>Your account has been successfully created.</p>
            <p>You can now log in using your email and password.</p>
            <p>For security reasons, please change your password after your first login.</p>
        `
    }),
    passwordReset: (resetLink) => ({
        subject: 'Password Reset Request',
        html: `
            <h1>Password Reset Request</h1>
            <p>You requested to reset your password.</p>
            <p>Please click the link below to reset your password:</p>
            <a href="${resetLink}">Reset Password</a>
            <p>This link will expire in 1 hour.</p>
            <p>If you didn't request this, please ignore this email.</p>
        `
    }),
    appointmentConfirmation: (data) => ({
        subject: 'Appointment Confirmation',
        html: `
            <h1>Appointment Confirmed</h1>
            <p>Your appointment has been scheduled for:</p>
            <p>Date: ${data.date}</p>
            <p>Time: ${data.time}</p>
            <p>With: ${data.therapist}</p>
            ${data.meetingLink ? `<p>Meeting Link: <a href="${data.meetingLink}">Join Meeting</a></p>` : ''}
        `
    }),
    appointmentReminder: (appointment) => ({
        subject: 'VR PHOBIA - Randevu Hatırlatması',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <img src="cid:logo" alt="VR PHOBIA Logo" style="max-width: 200px; margin: 20px 0;">
                <h2>Randevu Hatırlatması</h2>
                <p>Yarınki randevunuzu hatırlatmak isteriz:</p>
                <ul>
                    <li>Tarih: ${new Date(appointment.dateTime).toLocaleDateString('tr-TR')}</li>
                    <li>Saat: ${new Date(appointment.dateTime).toLocaleTimeString('tr-TR')}</li>
                    <li>Tür: ${appointment.type}</li>
                </ul>
                ${appointment.meetingLink ? `
                <p>Görüşme bağlantısı:</p>
                <a href="${appointment.meetingLink}" style="display: inline-block; padding: 10px 20px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0;">Görüşmeye Katıl</a>
                ` : ''}
            </div>
        `
    })
};

// Send email function
const sendEmail = async (to, template, data) => {
    try {
        const emailTemplate = emailTemplates[template](data);
        
        const mailOptions = {
            from: `"VR PHOBIA" <${process.env.SMTP_USER}>`,
            to,
            subject: emailTemplate.subject,
            html: emailTemplate.html
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent: %s', info.messageId);
        return true;
    } catch (error) {
        console.error('Error sending email:', error);
        throw error;
    }
};

// Test email connection
const testEmailConnection = async () => {
    try {
        await transporter.verify();
        console.log('Email server connection successful');
        return true;
    } catch (error) {
        console.error('Email server connection failed:', error);
        throw error;
    }
};

module.exports = {
    sendEmail,
    testEmailConnection
};
