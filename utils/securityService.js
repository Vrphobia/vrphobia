const crypto = require('crypto');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const mongoose = require('mongoose');
const SecurityLog = require('../models/SecurityLog');
const User = require('../models/User');

// Generate TOTP secret
const generateTOTPSecret = () => {
    return speakeasy.generateSecret({
        name: 'ESP Portal',
        length: 20
    });
};

// Verify TOTP token
const verifyTOTP = (secret, token) => {
    return speakeasy.totp.verify({
        secret: secret,
        encoding: 'base32',
        token: token,
        window: 1 // Allow 30 seconds window
    });
};

// Generate QR code for 2FA setup
const generateQRCode = async (secret) => {
    try {
        const otpauthUrl = speakeasy.otpauthURL({
            secret: secret.base32,
            label: 'ESP Portal',
            issuer: 'ESP'
        });
        return await qrcode.toDataURL(otpauthUrl);
    } catch (error) {
        console.error('QR Code generation error:', error);
        throw error;
    }
};

// Log security event
const logSecurityEvent = async (userId, eventType, details, ipAddress) => {
    try {
        const log = new SecurityLog({
            user: userId,
            eventType,
            details,
            ipAddress,
            userAgent: details.userAgent || 'Unknown',
            location: details.location || 'Unknown'
        });
        await log.save();
    } catch (error) {
        console.error('Security log error:', error);
    }
};

// Password strength checker
const checkPasswordStrength = (password) => {
    let strength = 0;
    const checks = {
        length: password.length >= 8,
        hasUpperCase: /[A-Z]/.test(password),
        hasLowerCase: /[a-z]/.test(password),
        hasNumbers: /\d/.test(password),
        hasSpecialChars: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    };

    strength += Object.values(checks).filter(Boolean).length;

    return {
        score: strength,
        checks,
        isStrong: strength >= 4
    };
};

// Rate limiting
const rateLimiter = {
    attempts: new Map(),
    lockouts: new Map(),

    async checkAttempts(identifier) {
        const now = Date.now();
        const attempts = this.attempts.get(identifier) || [];
        const recentAttempts = attempts.filter(time => now - time < 3600000); // 1 hour window

        if (recentAttempts.length >= 5) {
            // Lock account for 1 hour after 5 failed attempts
            this.lockouts.set(identifier, now + 3600000);
            return false;
        }

        return true;
    },

    async recordAttempt(identifier) {
        const attempts = this.attempts.get(identifier) || [];
        attempts.push(Date.now());
        this.attempts.set(identifier, attempts);
    },

    async isLocked(identifier) {
        const lockoutTime = this.lockouts.get(identifier);
        if (lockoutTime && Date.now() < lockoutTime) {
            return true;
        }
        return false;
    },

    async reset(identifier) {
        this.attempts.delete(identifier);
        this.lockouts.delete(identifier);
    }
};

// Session management
const sessionManager = {
    async createSession(userId, deviceInfo) {
        const sessionId = crypto.randomBytes(32).toString('hex');
        const user = await User.findById(userId);
        
        if (!user.sessions) {
            user.sessions = [];
        }

        user.sessions.push({
            sessionId,
            deviceInfo,
            createdAt: new Date(),
            lastActivity: new Date()
        });

        await user.save();
        return sessionId;
    },

    async validateSession(userId, sessionId) {
        const user = await User.findById(userId);
        const session = user.sessions?.find(s => s.sessionId === sessionId);
        
        if (!session) {
            return false;
        }

        // Check if session is expired (30 days)
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        if (session.lastActivity < thirtyDaysAgo) {
            await this.terminateSession(userId, sessionId);
            return false;
        }

        // Update last activity
        session.lastActivity = new Date();
        await user.save();
        return true;
    },

    async terminateSession(userId, sessionId) {
        const user = await User.findById(userId);
        user.sessions = user.sessions.filter(s => s.sessionId !== sessionId);
        await user.save();
    },

    async terminateAllSessions(userId, exceptSessionId = null) {
        const user = await User.findById(userId);
        if (exceptSessionId) {
            user.sessions = user.sessions.filter(s => s.sessionId === exceptSessionId);
        } else {
            user.sessions = [];
        }
        await user.save();
    }
};

// IP-based security
const ipSecurity = {
    suspiciousIPs: new Map(),

    async checkIP(ipAddress) {
        const attempts = this.suspiciousIPs.get(ipAddress) || 0;
        return attempts < 10; // Block after 10 suspicious activities
    },

    async markSuspiciousIP(ipAddress) {
        const attempts = (this.suspiciousIPs.get(ipAddress) || 0) + 1;
        this.suspiciousIPs.set(ipAddress, attempts);
    },

    async clearIP(ipAddress) {
        this.suspiciousIPs.delete(ipAddress);
    }
};

module.exports = {
    generateTOTPSecret,
    verifyTOTP,
    generateQRCode,
    logSecurityEvent,
    checkPasswordStrength,
    rateLimiter,
    sessionManager,
    ipSecurity
};
