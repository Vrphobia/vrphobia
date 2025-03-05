const express = require('express');
const router = express.Router();
const PaymentService = require('../services/paymentService');
const { authenticateToken } = require('../middleware/auth');

// Middleware to initialize payment service
router.use((req, res, next) => {
    req.paymentService = new PaymentService(req.db);
    next();
});

// Ödeme oluştur
router.post('/', authenticateToken, async (req, res) => {
    try {
        const paymentData = {
            userId: req.user.id,
            amount: req.body.amount,
            currency: req.body.currency || 'TRY',
            description: req.body.description,
            paymentMethod: req.body.paymentMethod,
            cardDetails: req.body.cardDetails,
            installment: req.body.installment
        };

        const result = await req.paymentService.createPayment(paymentData);
        res.status(201).json(result);
    } catch (error) {
        console.error('Error creating payment:', error);
        res.status(500).json({ error: error.message });
    }
});

// Stripe ödeme intent oluştur
router.post('/create-payment-intent', authenticateToken, async (req, res) => {
    try {
        const { amount, currency } = req.body;
        const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(amount * 100),
            currency: currency.toLowerCase(),
            metadata: {
                userId: req.user.id.toString()
            }
        });

        res.json({
            clientSecret: paymentIntent.client_secret
        });
    } catch (error) {
        console.error('Error creating payment intent:', error);
        res.status(500).json({ error: error.message });
    }
});

// Abonelik oluştur
router.post('/subscriptions', authenticateToken, async (req, res) => {
    try {
        const subscriptionData = {
            userId: req.user.id,
            planId: req.body.planId,
            paymentMethod: req.body.paymentMethod,
            cardDetails: req.body.cardDetails
        };

        const result = await req.paymentService.createSubscription(subscriptionData);
        res.status(201).json(result);
    } catch (error) {
        console.error('Error creating subscription:', error);
        res.status(500).json({ error: error.message });
    }
});

// Abonelik iptal et
router.post('/subscriptions/:subscriptionId/cancel', authenticateToken, async (req, res) => {
    try {
        const { subscriptionId } = req.params;
        const result = await req.paymentService.cancelSubscription(subscriptionId, req.user.id);
        res.json(result);
    } catch (error) {
        console.error('Error cancelling subscription:', error);
        res.status(500).json({ error: error.message });
    }
});

// Fatura listesi
router.get('/invoices', authenticateToken, async (req, res) => {
    try {
        const [invoices] = await req.db.execute(`
            SELECT 
                i.*,
                p.payment_method,
                p.transaction_id
            FROM invoices i
            JOIN payments p ON i.payment_id = p.id
            WHERE i.user_id = ?
            ORDER BY i.created_at DESC
        `, [req.user.id]);

        res.json(invoices);
    } catch (error) {
        console.error('Error fetching invoices:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Fatura indir
router.get('/invoices/:invoiceId/download', authenticateToken, async (req, res) => {
    try {
        const { invoiceId } = req.params;

        const [invoice] = await req.db.execute(`
            SELECT * FROM invoices 
            WHERE id = ? AND user_id = ?
        `, [invoiceId, req.user.id]);

        if (!invoice.length || !invoice[0].file_path) {
            throw new Error('Fatura bulunamadı');
        }

        res.download(invoice[0].file_path);
    } catch (error) {
        console.error('Error downloading invoice:', error);
        res.status(500).json({ error: error.message });
    }
});

// Ödeme yöntemlerini listele
router.get('/payment-methods', authenticateToken, async (req, res) => {
    try {
        const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

        // Stripe müşterisini bul
        const customers = await stripe.customers.list({
            email: req.user.email,
            limit: 1
        });

        if (!customers.data.length) {
            return res.json([]);
        }

        const paymentMethods = await stripe.paymentMethods.list({
            customer: customers.data[0].id,
            type: 'card'
        });

        res.json(paymentMethods.data);
    } catch (error) {
        console.error('Error listing payment methods:', error);
        res.status(500).json({ error: error.message });
    }
});

// Yeni ödeme yöntemi ekle
router.post('/payment-methods', authenticateToken, async (req, res) => {
    try {
        const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
        const { paymentMethodId } = req.body;

        // Stripe müşterisini bul veya oluştur
        let customer = await stripe.customers.list({
            email: req.user.email,
            limit: 1
        });

        if (!customer.data.length) {
            customer = await stripe.customers.create({
                email: req.user.email,
                name: req.user.name,
                metadata: {
                    userId: req.user.id.toString()
                }
            });
        } else {
            customer = customer.data[0];
        }

        // Ödeme yöntemini müşteriye bağla
        await stripe.paymentMethods.attach(paymentMethodId, {
            customer: customer.id
        });

        res.json({ message: 'Ödeme yöntemi başarıyla eklendi' });
    } catch (error) {
        console.error('Error adding payment method:', error);
        res.status(500).json({ error: error.message });
    }
});

// Ödeme yöntemi sil
router.delete('/payment-methods/:paymentMethodId', authenticateToken, async (req, res) => {
    try {
        const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
        const { paymentMethodId } = req.params;

        await stripe.paymentMethods.detach(paymentMethodId);

        res.json({ message: 'Ödeme yöntemi başarıyla silindi' });
    } catch (error) {
        console.error('Error deleting payment method:', error);
        res.status(500).json({ error: error.message });
    }
});

// Abonelik planları listele
router.get('/subscription-plans', async (req, res) => {
    try {
        const [plans] = await req.db.execute(`
            SELECT * FROM subscription_plans 
            WHERE is_active = 1
            ORDER BY price ASC
        `);

        res.json(plans);
    } catch (error) {
        console.error('Error fetching subscription plans:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
