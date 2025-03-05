require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

async function resetAdmin() {
    try {
        // Connect to MongoDB
        console.log('Connecting to MongoDB...');
        await mongoose.connect('mongodb://127.0.0.1:27017/esp-portal', {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('✅ Connected to MongoDB');

        // Define User Schema
        const userSchema = new mongoose.Schema({
            name: String,
            email: String,
            password: String,
            role: String,
            permissions: [String],
            status: String,
            emailVerified: Boolean,
            createdAt: Date,
            updatedAt: Date
        });

        const User = mongoose.model('User', userSchema);

        // Delete existing admin user
        console.log('Removing existing admin user...');
        await User.deleteOne({ email: 'admin@esp.com' });

        // Create new admin password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('Admin123!', salt);

        // Create new admin user
        console.log('Creating new admin user...');
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
            createdAt: new Date(),
            updatedAt: new Date()
        });

        await adminUser.save();
        console.log(`
✅ Admin user reset successfully!

Login Credentials:
- Email: admin@esp.com
- Password: Admin123!

Please try logging in with these credentials.
`);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.connection.close();
        process.exit();
    }
}

resetAdmin();
