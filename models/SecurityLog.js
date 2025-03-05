const mongoose = require('mongoose');

const securityLogSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false
    },
    timestamp: {
        type: Date,
        default: Date.now
    },
    event: {
        type: String,
        required: true,
        enum: [
            'login_success',
            'login_failure',
            'logout',
            'password_change',
            'password_reset_request',
            'password_reset_success',
            'account_locked',
            'account_unlocked',
            '2fa_enabled',
            '2fa_disabled',
            '2fa_verify_success',
            '2fa_verify_failure',
            'session_created',
            'session_terminated',
            'security_settings_changed'
        ]
    },
    details: {
        type: mongoose.Schema.Types.Mixed,
        required: false
    },
    ipAddress: {
        type: String,
        required: true
    },
    userAgent: {
        type: String,
        required: false
    },
    location: {
        type: String,
        required: false
    }
});

// Indexes
securityLogSchema.index({ userId: 1, timestamp: -1 });
securityLogSchema.index({ event: 1, timestamp: -1 });
securityLogSchema.index({ ipAddress: 1, timestamp: -1 });

const SecurityLog = mongoose.model('SecurityLog', securityLogSchema);

module.exports = SecurityLog;
