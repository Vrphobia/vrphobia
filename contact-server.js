require('dotenv').config();

const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const app = express();

app.use(express.json());
app.use(cors());
app.use(express.static('public'));

// Rate limiting - IP başına saatte maksimum 5 istek
const limiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 saat
    max: 5, // IP başına maksimum istek
    message: 'Çok fazla istek gönderdiniz. Lütfen bir saat sonra tekrar deneyin.'
});

app.use('/api/contact', limiter);

// E-posta gönderme için transporter oluştur
const transporter = nodemailer.createTransport({
    host: 'mail.vrphobia.net',
    port: 465,
    secure: true,
    auth: {
        user: 'kurumsal@vrphobia.net',
        pass: process.env.EMAIL_PASSWORD
    }
});

// İletişim formu endpoint'i
app.post('/api/contact', async (req, res) => {
    console.log('Form verisi alındı:', req.body);
    
    try {
        const { name, email, phone, company, message } = req.body;
        
        // Gerekli alanları kontrol et
        if (!name || !email || !message) {
            throw new Error('Gerekli alanlar eksik');
        }
        
        console.log('E-posta gönderiliyor...');
        
        // E-posta içeriği
        const mailOptions = {
            from: 'kurumsal@vrphobia.net',
            to: 'kurumsal@vrphobia.net',
            replyTo: email,
            subject: 'VR Phobia - Yeni İletişim Formu Mesajı',
            html: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: #1a1a1a; color: white; padding: 20px; text-align: center; }
                    .content { background: #f9f9f9; padding: 20px; border-radius: 5px; }
                    .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
                    th { background-color: #f2f2f2; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h2>VR Phobia - Yeni İletişim Formu Mesajı</h2>
                    </div>
                    <div class="content">
                        <table>
                            <tr>
                                <th>İsim:</th>
                                <td>${name}</td>
                            </tr>
                            <tr>
                                <th>E-posta:</th>
                                <td>${email}</td>
                            </tr>
                            <tr>
                                <th>Telefon:</th>
                                <td>${phone || '-'}</td>
                            </tr>
                            <tr>
                                <th>Şirket:</th>
                                <td>${company || '-'}</td>
                            </tr>
                            <tr>
                                <th>Mesaj:</th>
                                <td>${message}</td>
                            </tr>
                        </table>
                    </div>
                    <div class="footer">
                        <p>Bu e-posta VR Phobia iletişim formundan otomatik olarak gönderilmiştir.</p>
                    </div>
                </div>
            </body>
            </html>
            `
        };

        // E-postayı gönder
        console.log('Mail gönderiliyor:', mailOptions);
        const info = await transporter.sendMail(mailOptions);
        console.log('E-posta gönderildi:', info);
        
        res.json({ 
            success: true, 
            message: 'Mesajınız başarıyla gönderildi.' 
        });
    } catch (error) {
        console.error('E-posta gönderme hatası:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Mesaj gönderilirken bir hata oluştu: ' + error.message 
        });
    }
});

// Teklif formu endpoint'i
app.post('/api/quote', async (req, res) => {
    try {
        const { companyName, employeeCount, contactName, phone, email, service, notes } = req.body;

        // E-posta içeriğini hazırla
        const mailOptions = {
            from: 'kurumsal@vrphobia.net',
            to: 'kurumsal@vrphobia.net',
            subject: 'VR PHOBIA - Yeni Teklif Talebi',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #0d6efd; border-bottom: 2px solid #0d6efd; padding-bottom: 10px;">Yeni Teklif Talebi</h2>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Şirket Adı:</strong></td>
                            <td style="padding: 10px; border-bottom: 1px solid #eee;">${companyName}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Çalışan Sayısı:</strong></td>
                            <td style="padding: 10px; border-bottom: 1px solid #eee;">${employeeCount}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>İletişim Kişisi:</strong></td>
                            <td style="padding: 10px; border-bottom: 1px solid #eee;">${contactName}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Telefon:</strong></td>
                            <td style="padding: 10px; border-bottom: 1px solid #eee;">${phone || 'Belirtilmedi'}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>E-posta:</strong></td>
                            <td style="padding: 10px; border-bottom: 1px solid #eee;">${email}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>İlgilenilen Hizmet:</strong></td>
                            <td style="padding: 10px; border-bottom: 1px solid #eee;">${service}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Ek Notlar:</strong></td>
                            <td style="padding: 10px; border-bottom: 1px solid #eee;">${notes || 'Belirtilmedi'}</td>
                        </tr>
                    </table>
                    <p style="color: #666; font-size: 12px; margin-top: 20px; text-align: center;">
                        Bu e-posta VR Phobia web sitesindeki teklif formundan otomatik olarak gönderilmiştir.
                    </p>
                </div>
            `
        };

        // E-postayı gönder
        await transporter.sendMail(mailOptions);
        console.log('Teklif e-postası başarıyla gönderildi');

        res.json({ success: true, message: 'Teklif talebiniz başarıyla alındı.' });
    } catch (error) {
        console.error('Teklif e-postası gönderme hatası:', error);
        res.status(500).json({ success: false, message: 'Teklif talebi gönderilemedi. Lütfen daha sonra tekrar deneyin.' });
    }
});

const port = 3002;
app.listen(port, () => {
    console.log(`Sunucu http://localhost:${port} adresinde çalışıyor`);
});
