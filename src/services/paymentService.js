const Iyzipay = require('iyzipay');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const moment = require('moment-timezone');

class PaymentService {
    constructor(db) {
        this.db = db;
        
        // Iyzipay yapılandırması
        this.iyzipay = new Iyzipay({
            apiKey: process.env.IYZIPAY_API_KEY,
            secretKey: process.env.IYZIPAY_SECRET_KEY,
            uri: process.env.IYZIPAY_URI
        });
    }

    // Ödeme oluştur
    async createPayment(paymentData) {
        const {
            userId,
            amount,
            currency,
            description,
            paymentMethod,
            cardDetails,
            installment
        } = paymentData;

        const connection = await this.db.getConnection();
        
        try {
            await connection.beginTransaction();

            // Kullanıcı bilgilerini al
            const [user] = await connection.execute(`
                SELECT * FROM users WHERE id = ?
            `, [userId]);

            if (!user.length) {
                throw new Error('Kullanıcı bulunamadı');
            }

            let paymentResult;

            // Ödeme yöntemine göre işlem yap
            if (paymentMethod === 'iyzipay') {
                paymentResult = await this.processIyzipayPayment({
                    user: user[0],
                    amount,
                    currency,
                    description,
                    cardDetails,
                    installment
                });
            } else if (paymentMethod === 'stripe') {
                paymentResult = await this.processStripePayment({
                    user: user[0],
                    amount,
                    currency,
                    description,
                    cardDetails
                });
            } else {
                throw new Error('Geçersiz ödeme yöntemi');
            }

            // Ödemeyi veritabanına kaydet
            const [result] = await connection.execute(`
                INSERT INTO payments (
                    user_id,
                    amount,
                    currency,
                    description,
                    payment_method,
                    transaction_id,
                    status,
                    installment,
                    created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
            `, [
                userId,
                amount,
                currency,
                description,
                paymentMethod,
                paymentResult.transactionId,
                paymentResult.status,
                installment || 1
            ]);

            // Fatura oluştur
            const invoiceId = await this.createInvoice(
                connection,
                result.insertId,
                user[0],
                paymentData
            );

            await connection.commit();

            return {
                paymentId: result.insertId,
                invoiceId,
                ...paymentResult
            };
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    // Iyzipay ile ödeme işle
    async processIyzipayPayment(data) {
        const request = {
            locale: 'tr',
            conversationId: `conv_${Date.now()}`,
            price: data.amount.toString(),
            paidPrice: data.amount.toString(),
            currency: data.currency,
            installment: data.installment || 1,
            basketId: `b_${Date.now()}`,
            paymentChannel: 'WEB',
            paymentGroup: 'PRODUCT',
            paymentCard: {
                cardHolderName: data.cardDetails.holderName,
                cardNumber: data.cardDetails.number,
                expireMonth: data.cardDetails.expireMonth,
                expireYear: data.cardDetails.expireYear,
                cvc: data.cardDetails.cvc,
                registerCard: '0'
            },
            buyer: {
                id: data.user.id.toString(),
                name: data.user.name,
                surname: data.user.surname,
                email: data.user.email,
                identityNumber: '11111111111',
                registrationAddress: data.user.address,
                city: data.user.city,
                country: 'Turkey',
                ip: data.user.lastLoginIp
            },
            billingAddress: {
                contactName: data.user.name,
                city: data.user.city,
                country: 'Turkey',
                address: data.user.address
            },
            basketItems: [
                {
                    id: `item_${Date.now()}`,
                    name: data.description,
                    category1: 'Therapy',
                    itemType: 'VIRTUAL',
                    price: data.amount.toString()
                }
            ]
        };

        return new Promise((resolve, reject) => {
            this.iyzipay.payment.create(request, (err, result) => {
                if (err) {
                    reject(err);
                } else {
                    resolve({
                        transactionId: result.paymentId,
                        status: result.status
                    });
                }
            });
        });
    }

    // Stripe ile ödeme işle
    async processStripePayment(data) {
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(data.amount * 100), // Stripe kuruş cinsinden çalışır
            currency: data.currency.toLowerCase(),
            description: data.description,
            payment_method_types: ['card'],
            metadata: {
                userId: data.user.id.toString()
            }
        });

        return {
            transactionId: paymentIntent.id,
            status: paymentIntent.status,
            clientSecret: paymentIntent.client_secret
        };
    }

    // Fatura oluştur
    async createInvoice(connection, paymentId, user, paymentData) {
        // Fatura numarası oluştur
        const invoiceNumber = `INV-${moment().format('YYYYMMDD')}-${paymentId}`;

        // Faturayı veritabanına kaydet
        const [result] = await connection.execute(`
            INSERT INTO invoices (
                payment_id,
                user_id,
                invoice_number,
                amount,
                currency,
                tax_rate,
                tax_amount,
                total_amount,
                description,
                status,
                created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'issued', NOW())
        `, [
            paymentId,
            user.id,
            invoiceNumber,
            paymentData.amount,
            paymentData.currency,
            18, // KDV oranı
            paymentData.amount * 0.18,
            paymentData.amount * 1.18,
            paymentData.description
        ]);

        // PDF fatura oluştur
        await this.generateInvoicePDF(result.insertId, user, paymentData, invoiceNumber);

        return result.insertId;
    }

    // PDF fatura oluştur
    async generateInvoicePDF(invoiceId, user, paymentData, invoiceNumber) {
        const pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage();
        const { width, height } = page.getSize();
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

        // Şirket bilgileri
        page.drawText('VR Fobi Tedavi Merkezi', {
            x: 50,
            y: height - 50,
            size: 20,
            font
        });

        // Fatura detayları
        page.drawText(`Fatura No: ${invoiceNumber}`, {
            x: 50,
            y: height - 100,
            size: 12,
            font
        });

        page.drawText(`Tarih: ${moment().format('DD/MM/YYYY')}`, {
            x: 50,
            y: height - 120,
            size: 12,
            font
        });

        // Müşteri bilgileri
        page.drawText(`Müşteri: ${user.name}`, {
            x: 50,
            y: height - 160,
            size: 12,
            font
        });

        page.drawText(`Email: ${user.email}`, {
            x: 50,
            y: height - 180,
            size: 12,
            font
        });

        // Ödeme detayları
        page.drawText(`Açıklama: ${paymentData.description}`, {
            x: 50,
            y: height - 220,
            size: 12,
            font
        });

        page.drawText(`Tutar: ${paymentData.amount} ${paymentData.currency}`, {
            x: 50,
            y: height - 240,
            size: 12,
            font
        });

        page.drawText(`KDV (%18): ${paymentData.amount * 0.18} ${paymentData.currency}`, {
            x: 50,
            y: height - 260,
            size: 12,
            font
        });

        page.drawText(`Toplam: ${paymentData.amount * 1.18} ${paymentData.currency}`, {
            x: 50,
            y: height - 280,
            size: 12,
            font,
            color: rgb(0, 0, 0.8)
        });

        // PDF'i kaydet
        const pdfBytes = await pdfDoc.save();

        // PDF'i dosya sistemine kaydet
        const fs = require('fs').promises;
        const path = require('path');
        const invoicePath = path.join(__dirname, '..', '..', 'uploads', 'invoices', `${invoiceNumber}.pdf`);
        
        await fs.writeFile(invoicePath, pdfBytes);

        // Fatura dosya yolunu güncelle
        await this.db.execute(`
            UPDATE invoices 
            SET file_path = ?
            WHERE id = ?
        `, [invoicePath, invoiceId]);
    }

    // Abonelik oluştur
    async createSubscription(subscriptionData) {
        const {
            userId,
            planId,
            paymentMethod,
            cardDetails
        } = subscriptionData;

        const connection = await this.db.getConnection();
        
        try {
            await connection.beginTransaction();

            // Plan bilgilerini al
            const [plan] = await connection.execute(`
                SELECT * FROM subscription_plans WHERE id = ?
            `, [planId]);

            if (!plan.length) {
                throw new Error('Plan bulunamadı');
            }

            // Kullanıcı bilgilerini al
            const [user] = await connection.execute(`
                SELECT * FROM users WHERE id = ?
            `, [userId]);

            if (!user.length) {
                throw new Error('Kullanıcı bulunamadı');
            }

            let subscriptionResult;

            // Ödeme yöntemine göre abonelik oluştur
            if (paymentMethod === 'stripe') {
                subscriptionResult = await this.createStripeSubscription(
                    user[0],
                    plan[0],
                    cardDetails
                );
            } else {
                throw new Error('Geçersiz ödeme yöntemi');
            }

            // Aboneliği veritabanına kaydet
            const [result] = await connection.execute(`
                INSERT INTO subscriptions (
                    user_id,
                    plan_id,
                    payment_method,
                    subscription_id,
                    status,
                    start_date,
                    end_date,
                    created_at
                ) VALUES (?, ?, ?, ?, ?, NOW(), DATE_ADD(NOW(), INTERVAL ? MONTH), NOW())
            `, [
                userId,
                planId,
                paymentMethod,
                subscriptionResult.subscriptionId,
                'active',
                plan[0].duration_months
            ]);

            await connection.commit();

            return {
                subscriptionId: result.insertId,
                ...subscriptionResult
            };
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    // Stripe ile abonelik oluştur
    async createStripeSubscription(user, plan, cardDetails) {
        // Müşteri oluştur veya mevcut müşteriyi al
        let customer = await stripe.customers.list({
            email: user.email,
            limit: 1
        });

        if (!customer.data.length) {
            customer = await stripe.customers.create({
                email: user.email,
                name: user.name,
                metadata: {
                    userId: user.id.toString()
                }
            });
        } else {
            customer = customer.data[0];
        }

        // Ödeme yöntemini ekle
        const paymentMethod = await stripe.paymentMethods.create({
            type: 'card',
            card: {
                number: cardDetails.number,
                exp_month: cardDetails.expireMonth,
                exp_year: cardDetails.expireYear,
                cvc: cardDetails.cvc
            }
        });

        await stripe.paymentMethods.attach(paymentMethod.id, {
            customer: customer.id
        });

        // Varsayılan ödeme yöntemini ayarla
        await stripe.customers.update(customer.id, {
            invoice_settings: {
                default_payment_method: paymentMethod.id
            }
        });

        // Abonelik oluştur
        const subscription = await stripe.subscriptions.create({
            customer: customer.id,
            items: [{ price: plan.stripe_price_id }],
            payment_behavior: 'default_incomplete',
            expand: ['latest_invoice.payment_intent']
        });

        return {
            subscriptionId: subscription.id,
            clientSecret: subscription.latest_invoice.payment_intent.client_secret,
            status: subscription.status
        };
    }

    // Aboneliği iptal et
    async cancelSubscription(subscriptionId, userId) {
        const connection = await this.db.getConnection();
        
        try {
            await connection.beginTransaction();

            // Abonelik bilgilerini al
            const [subscription] = await connection.execute(`
                SELECT * FROM subscriptions WHERE id = ? AND user_id = ?
            `, [subscriptionId, userId]);

            if (!subscription.length) {
                throw new Error('Abonelik bulunamadı');
            }

            // Stripe aboneliğini iptal et
            if (subscription[0].payment_method === 'stripe') {
                await stripe.subscriptions.del(subscription[0].subscription_id);
            }

            // Abonelik durumunu güncelle
            await connection.execute(`
                UPDATE subscriptions 
                SET 
                    status = 'cancelled',
                    cancelled_at = NOW()
                WHERE id = ?
            `, [subscriptionId]);

            await connection.commit();

            return { message: 'Abonelik başarıyla iptal edildi' };
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }
}

module.exports = PaymentService;
