const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const sessionSchema = new mongoose.Schema({
    sessionId: {
        type: String,
        required: true
    },
    deviceInfo: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    lastActivity: {
        type: Date,
        default: Date.now
    }
});

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    surname: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    phone: {
        type: String,
        required: true,
        trim: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['admin', 'psychologist', 'client'],
        default: 'client'
    },
    isActive: {
        type: Boolean,
        default: false
    },
    isEmailVerified: {
        type: Boolean,
        default: false
    },
    education: {
        type: String,
        required: function() {
            return this.role === 'psychologist';
        }
    },
    certificates: {
        type: String,
        required: function() {
            return this.role === 'psychologist';
        }
    },
    experience: {
        type: String,
        required: function() {
            return this.role === 'psychologist';
        }
    },
    loginAttempts: {
        type: Number,
        default: 0
    },
    lockUntil: {
        type: Date
    },
    passwordHistory: [{
        password: String,
        changedAt: {
            type: Date,
            default: Date.now
        }
    }],
    sessions: [sessionSchema],
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();

    try {
        // Store password in history
        if (this.passwordHistory) {
            this.passwordHistory.push({
                password: this.password,
                changedAt: new Date()
            });

            // Keep only last 5 passwords
            if (this.passwordHistory.length > 5) {
                this.passwordHistory = this.passwordHistory.slice(-5);
            }
        }

        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        
        if (this.isModified('password')) {
            // this.security.passwordLastChanged = new Date();
        }

        next();
    } catch (error) {
        next(error);
    }
});

// Compare password method
userSchema.methods.comparePassword = async function(password) {
    return await bcrypt.compare(password, this.password);
};

// Check if password was used before
userSchema.methods.isPasswordReused = async function(password) {
    if (!this.passwordHistory) return false;

    for (const historicalPassword of this.passwordHistory) {
        if (await bcrypt.compare(password, historicalPassword.password)) {
            return true;
        }
    }
    return false;
};

// Check if user has permission
// userSchema.methods.hasPermission = function(permission) {
//     return this.permissions.includes(permission);
// };

// Check if account is locked
userSchema.methods.isLocked = function() {
    return this.lockUntil && this.lockUntil > Date.now();
};

// Increment login attempts
userSchema.methods.incrementLoginAttempts = async function() {
    if (this.lockUntil && this.lockUntil < Date.now()) {
        await this.resetLoginAttempts();
        return;
    }

    const attempts = this.loginAttempts + 1;
    this.loginAttempts = attempts;
    // this.security.lastFailedLogin = new Date();

    if (attempts >= 5) {
        // Lock account for 1 hour
        this.lockUntil = Date.now() + (60 * 60 * 1000);
        // this.status = 'locked';
    }

    await this.save();
};

// Reset login attempts
userSchema.methods.resetLoginAttempts = async function() {
    this.loginAttempts = 0;
    this.lockUntil = null;
    // this.status = 'active';
    await this.save();
};

// Get default permissions based on role
// userSchema.methods.getDefaultPermissions = function() {
//     switch (this.role) {
//         case 'admin':
//             return [
//                 'view_dashboard',
//                 'manage_users',
//                 'manage_therapists',
//                 'manage_clients',
//                 'manage_sessions',
//                 'view_reports',
//                 'manage_reports',
//                 'manage_settings'
//             ];
//         case 'manager':
//             return [
//                 'view_dashboard',
//                 'manage_therapists',
//                 'manage_clients',
//                 'manage_sessions',
//                 'view_reports'
//             ];
//         case 'therapist':
//             return [
//                 'view_dashboard',
//                 'manage_sessions',
//                 'view_reports'
//             ];
//         case 'client':
//             return [
//                 'view_dashboard'
//             ];
//         default:
//             return [];
//     }
// };

const User = mongoose.model('User', userSchema);

module.exports = User;
