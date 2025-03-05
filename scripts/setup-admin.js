require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const User = require('../models/User');

async function setupAdmin() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/esp-portal');
        console.log('Connected to MongoDB');

        // Check if admin exists
        const existingAdmin = await User.findOne({ email: 'admin@esp.com' });
        if (existingAdmin) {
            console.log('Admin user already exists. Updating password...');
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash('Admin123!', salt);
            existingAdmin.password = hashedPassword;
            existingAdmin.status = 'active';
            existingAdmin.emailVerified = true;
            await existingAdmin.save();
            console.log('Admin password updated successfully');
        } else {
            // Create new admin user
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash('Admin123!', salt);

            const adminUser = new User({
                name: 'System Admin',
                email: 'admin@esp.com',
                password: hashedPassword,
                role: 'admin',
                permissions: [
                    'view_dashboard',
                    'manage_users',
                    'manage_therapists',
                    'manage_clients',
                    'manage_sessions',
                    'view_reports',
                    'manage_reports',
                    'manage_settings'
                ],
                status: 'active',
                emailVerified: true,
                security: {
                    twoFactorEnabled: false,
                    loginAttempts: 0
                }
            });

            await adminUser.save();
            console.log('Admin user created successfully');
        }

        console.log('\nAdmin credentials:');
        console.log('Email: admin@esp.com');
        console.log('Password: Admin123!');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

setupAdmin();
