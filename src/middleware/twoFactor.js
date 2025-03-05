const crypto = require('crypto');

// Store OTP codes temporarily (In production, use Redis or similar)
const otpStore = new Map();

// Generate OTP
const generateOTP = () => {
    return crypto.randomInt(100000, 999999).toString();
};

// Store OTP with expiration
const storeOTP = (userId, otp) => {
    otpStore.set(userId, {
        code: otp,
        expires: Date.now() + 5 * 60 * 1000 // 5 minutes
    });
};

// Verify OTP
const verifyOTP = (userId, otp) => {
    const storedOTP = otpStore.get(userId);
    
    if (!storedOTP) {
        return false;
    }

    if (Date.now() > storedOTP.expires) {
        otpStore.delete(userId);
        return false;
    }

    if (storedOTP.code !== otp) {
        return false;
    }

    otpStore.delete(userId);
    return true;
};

// Middleware to require 2FA
const require2FA = async (req, res, next) => {
    const userId = req.user.id;
    const { otp } = req.body;

    if (!otp) {
        return res.status(400).json({ error: 'OTP gereklidir' });
    }

    if (!verifyOTP(userId, otp)) {
        return res.status(401).json({ error: 'Geçersiz veya süresi dolmuş OTP' });
    }

    next();
};

// Send OTP via email (mock implementation)
const sendOTPEmail = async (email, otp) => {
    console.log(`OTP sent to ${email}: ${otp}`);
    // Implement actual email sending logic here
};

// Send OTP via SMS (mock implementation)
const sendOTPSMS = async (phone, otp) => {
    console.log(`OTP sent to ${phone}: ${otp}`);
    // Implement actual SMS sending logic here
};

// Initialize 2FA
const initialize2FA = async (req, res) => {
    const userId = req.user.id;
    const otp = generateOTP();
    
    storeOTP(userId, otp);

    // In production, you would want to send this via email/SMS
    if (req.user.email) {
        await sendOTPEmail(req.user.email, otp);
    }
    
    if (req.user.phone) {
        await sendOTPSMS(req.user.phone, otp);
    }

    res.json({ message: 'OTP gönderildi' });
};

module.exports = {
    require2FA,
    initialize2FA,
    generateOTP,
    verifyOTP
};
