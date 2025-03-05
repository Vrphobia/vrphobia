const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('../models/User');
require('dotenv').config();

const adminUsers = [
    {
        name: 'Ozan',
        surname: 'İlhan',
        email: 'ozan@vrphobia.net',
        phone: '+905555555555',
        role: 'admin',
        isActive: true,
        isEmailVerified: true
    },
    {
        name: 'VR Phobia',
        surname: 'Admin',
        email: 'kurumsal@vrphobia.net',
        phone: '+905555555556',
        role: 'admin',
        isActive: true,
        isEmailVerified: true
    }
];

async function createAdminUsers() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB bağlantısı başarılı');

        const password = 'Vrphobia123*';
        const hashedPassword = await bcrypt.hash(password, 10);

        for (const adminUser of adminUsers) {
            // Kullanıcının var olup olmadığını kontrol et
            const existingUser = await User.findOne({ email: adminUser.email });
            
            if (existingUser) {
                console.log(`${adminUser.email} zaten mevcut. Güncelleniyor...`);
                existingUser.role = 'admin';
                existingUser.isActive = true;
                existingUser.isEmailVerified = true;
                existingUser.password = hashedPassword;
                await existingUser.save();
            } else {
                console.log(`${adminUser.email} oluşturuluyor...`);
                const user = new User({
                    ...adminUser,
                    password: hashedPassword
                });
                await user.save();
            }
            console.log(`${adminUser.email} işlemi tamamlandı.`);
        }

        console.log('Admin kullanıcıları başarıyla oluşturuldu/güncellendi');
        process.exit(0);
    } catch (error) {
        console.error('Hata:', error);
        process.exit(1);
    }
}

createAdminUsers();
