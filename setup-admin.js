require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Connect to MongoDB
mongoose.connect('mongodb://127.0.0.1:27017/esp-portal', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log('✅ MongoDB Connected'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Define User Schema if it doesn't exist
const userSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true },
    password: String,
    role: String,
    status: String,
    permissions: [String],
    emailVerified: Boolean,
    createdAt: Date,
    updatedAt: Date
});

const User = mongoose.model('User', userSchema);

async function createAdminUser() {
    try {
        // Check if admin already exists
        const existingAdmin = await User.findOne({ email: 'admin@esp.com' });
        
        if (existingAdmin) {
            console.log('✅ Admin user already exists');
            process.exit(0);
        }

        // Create admin user
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
            createdAt: new Date(),
            updatedAt: new Date()
        });

        await adminUser.save();
        console.log(`
✅ Admin user created successfully!

Login Credentials:
- Email: admin@esp.com
- Password: Admin123!

Please change this password immediately after first login.
`);
    } catch (error) {
        console.error('Error creating admin user:', error);
    } finally {
        process.exit();
    }
}

createAdminUser();
