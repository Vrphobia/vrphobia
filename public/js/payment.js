class PaymentManager {
    constructor() {
        this.stripe = Stripe(STRIPE_PUBLIC_KEY);
        this.elements = this.stripe.elements();
        this.paymentElement = null;
        this.cardElement = null;
        this.setupPaymentForm();
    }

    // Ödeme formunu hazırla
    setupPaymentForm() {
        // Kart elementi oluştur
        const style = {
            base: {
                color: '#32325d',
                fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
                fontSmoothing: 'antialiased',
                fontSize: '16px',
                '::placeholder': {
                    color: '#aab7c4'
                }
            },
            invalid: {
                color: '#fa755a',
                iconColor: '#fa755a'
            }
        };

        this.cardElement = this.elements.create('card', { style });
        this.cardElement.mount('#card-element');

        // Kart değişikliklerini dinle
        this.cardElement.on('change', ({ error }) => {
            const displayError = document.getElementById('card-errors');
            if (error) {
                displayError.textContent = error.message;
            } else {
                displayError.textContent = '';
            }
        });
    }

    // Tek seferlik ödeme yap
    async processPayment(amount, currency = 'TRY', description = '') {
        try {
            // Payment Intent oluştur
            const response = await fetch('/api/payments/create-payment-intent', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    amount,
                    currency
                })
            });

            const { clientSecret } = await response.json();

            // Ödemeyi onayla
            const { paymentIntent, error } = await this.stripe.confirmCardPayment(clientSecret, {
                payment_method: {
                    card: this.cardElement,
                    billing_details: {
                        name: document.getElementById('name').value
                    }
                }
            });

            if (error) {
                throw new Error(error.message);
            }

            // Ödemeyi kaydet
            await this.savePayment({
                amount,
                currency,
                description,
                paymentMethod: 'stripe',
                transactionId: paymentIntent.id
            });

            return { success: true, paymentIntent };
        } catch (error) {
            console.error('Payment error:', error);
            return { success: false, error: error.message };
        }
    }

    // Ödemeyi veritabanına kaydet
    async savePayment(paymentData) {
        try {
            const response = await fetch('/api/payments', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(paymentData)
            });

            if (!response.ok) {
                throw new Error('Payment save failed');
            }

            return await response.json();
        } catch (error) {
            console.error('Save payment error:', error);
            throw error;
        }
    }

    // Abonelik başlat
    async startSubscription(planId) {
        try {
            const response = await fetch('/api/payments/subscriptions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    planId,
                    paymentMethod: 'stripe'
                })
            });

            const { clientSecret, subscriptionId } = await response.json();

            // Abonelik ödemesini onayla
            const { subscription, error } = await this.stripe.confirmCardPayment(clientSecret, {
                payment_method: {
                    card: this.cardElement,
                    billing_details: {
                        name: document.getElementById('name').value
                    }
                }
            });

            if (error) {
                throw new Error(error.message);
            }

            return { success: true, subscription };
        } catch (error) {
            console.error('Subscription error:', error);
            return { success: false, error: error.message };
        }
    }

    // Aboneliği iptal et
    async cancelSubscription(subscriptionId) {
        try {
            const response = await fetch(`/api/payments/subscriptions/${subscriptionId}/cancel`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) {
                throw new Error('Subscription cancellation failed');
            }

            return await response.json();
        } catch (error) {
            console.error('Cancel subscription error:', error);
            throw error;
        }
    }

    // Faturaları listele
    async getInvoices() {
        try {
            const response = await fetch('/api/payments/invoices', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            return await response.json();
        } catch (error) {
            console.error('Get invoices error:', error);
            throw error;
        }
    }

    // Fatura indir
    async downloadInvoice(invoiceId) {
        try {
            window.location.href = `/api/payments/invoices/${invoiceId}/download`;
        } catch (error) {
            console.error('Download invoice error:', error);
            throw error;
        }
    }

    // Kayıtlı ödeme yöntemlerini listele
    async getPaymentMethods() {
        try {
            const response = await fetch('/api/payments/payment-methods', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            return await response.json();
        } catch (error) {
            console.error('Get payment methods error:', error);
            throw error;
        }
    }

    // Yeni ödeme yöntemi ekle
    async addPaymentMethod() {
        try {
            const { paymentMethod, error } = await this.stripe.createPaymentMethod({
                type: 'card',
                card: this.cardElement,
                billing_details: {
                    name: document.getElementById('name').value
                }
            });

            if (error) {
                throw new Error(error.message);
            }

            const response = await fetch('/api/payments/payment-methods', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    paymentMethodId: paymentMethod.id
                })
            });

            if (!response.ok) {
                throw new Error('Adding payment method failed');
            }

            return await response.json();
        } catch (error) {
            console.error('Add payment method error:', error);
            throw error;
        }
    }

    // Ödeme yöntemi sil
    async deletePaymentMethod(paymentMethodId) {
        try {
            const response = await fetch(`/api/payments/payment-methods/${paymentMethodId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) {
                throw new Error('Deleting payment method failed');
            }

            return await response.json();
        } catch (error) {
            console.error('Delete payment method error:', error);
            throw error;
        }
    }

    // Abonelik planlarını listele
    async getSubscriptionPlans() {
        try {
            const response = await fetch('/api/payments/subscription-plans');
            return await response.json();
        } catch (error) {
            console.error('Get subscription plans error:', error);
            throw error;
        }
    }
}

// Kullanım örneği:
/*
const paymentManager = new PaymentManager();

// Tek seferlik ödeme
document.getElementById('payment-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const amount = document.getElementById('amount').value;
    const result = await paymentManager.processPayment(amount);
    if (result.success) {
        alert('Ödeme başarılı!');
    } else {
        alert(`Ödeme başarısız: ${result.error}`);
    }
});

// Abonelik başlatma
document.getElementById('subscription-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const planId = document.getElementById('plan').value;
    const result = await paymentManager.startSubscription(planId);
    if (result.success) {
        alert('Abonelik başarıyla başlatıldı!');
    } else {
        alert(`Abonelik başlatılamadı: ${result.error}`);
    }
});
*/
