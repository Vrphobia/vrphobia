require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

async function verifyAndCreateAdmin() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/esp-portal', {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('Connected to MongoDB');

        // Check if admin exists
        const adminEmail = 'admin@esp.com';
        const adminPassword = 'Admin123!';
        
        let admin = await User.findOne({ email: adminEmail });
        
        if (admin) {
            console.log('Admin user exists, updating password...');
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(adminPassword, salt);
            admin.password = hashedPassword;
            admin.role = 'admin';
            admin.status = 'active';
            admin.emailVerified = true;
            admin.permissions = [
                'view_dashboard',
                'manage_users',
                'manage_therapists',
                'manage_clients',
                'manage_sessions',
                'view_reports',
                'manage_reports',
                'manage_settings'
            ];
            await admin.save();
            console.log('Admin password updated');
        } else {
            console.log('Creating new admin user...');
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(adminPassword, salt);
            
            admin = new User({
                name: 'System Admin',
                email: adminEmail,
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
                emailVerified: true
            });
            
            await admin.save();
            console.log('New admin user created');
        }

        // Verify we can find the admin
        const verifyAdmin = await User.findOne({ email: adminEmail });
        if (verifyAdmin) {
            console.log('Admin user verified in database');
            console.log('Admin credentials:');
            console.log('Email:', adminEmail);
            console.log('Password:', adminPassword);
        } else {
            console.log('Failed to verify admin user!');
        }

        await mongoose.connection.close();
        
    } catch (error) {
        console.error('Error:', error);
    }
}

verifyAndCreateAdmin();
