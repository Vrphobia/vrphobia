const nodemailer = require('nodemailer');

// Create a test account using Ethereal Email
const createTestAccount = async () => {
    const testAccount = await nodemailer.createTestAccount();
    return nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
            user: testAccount.user,
            pass: testAccount.pass,
        },
    });
};

// For production, use your actual SMTP settings
const createProductionTransport = () => {
    return nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });
};

// Export the appropriate transporter based on environment
const getTransporter = async () => {
    if (process.env.NODE_ENV === 'production') {
        return createProductionTransport();
    } else {
        return await createTestAccount();
    }
};

module.exports = getTransporter;
