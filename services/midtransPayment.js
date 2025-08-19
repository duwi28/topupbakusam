const midtransClient = require('midtrans-client');
const { EventEmitter } = require('events');
const Logger = require('../utils/logger');

class MidtransPaymentService extends EventEmitter {
    constructor() {
        super();
        this.isConnected = false;
        this.logger = new Logger();
        
        // Midtrans configuration
        this.serverKey = process.env.MIDTRANS_SERVER_KEY;
        this.clientKey = process.env.MIDTRANS_CLIENT_KEY;
        this.isProduction = process.env.NODE_ENV === 'production';
        
        // Initialize Midtrans client
        this.snap = new midtransClient.Snap({
            isProduction: this.isProduction,
            serverKey: this.serverKey,
            clientKey: this.clientKey
        });

        // Initialize Core API client for additional operations
        this.core = new midtransClient.CoreApi({
            isProduction: this.isProduction,
            serverKey: this.serverKey,
            clientKey: this.clientKey
        });

        console.log('🔗 Midtrans Payment Service initialized');
        console.log('🔍 Environment Variables Debug:');
        console.log('  MIDTRANS_SERVER_KEY:', this.serverKey ? '✅ Set (' + this.serverKey.substring(0, 20) + '...)' : '❌ Not Set');
        console.log('  MIDTRANS_CLIENT_KEY:', this.clientKey ? '✅ Set (' + this.clientKey.substring(0, 20) + '...)' : '❌ Not Set');
        console.log('  NODE_ENV:', process.env.NODE_ENV || 'development');
        console.log('  Mode:', this.isProduction ? 'PRODUCTION' : 'SANDBOX');
    }

    getStatus() {
        return {
            connected: this.isConnected,
            serverKey: this.serverKey ? '✅ Set' : '❌ Not Set',
            clientKey: this.clientKey ? '✅ Set' : '❌ Not Set',
            mode: this.isProduction ? 'PRODUCTION' : 'SANDBOX',
            service: 'Midtrans'
        };
    }

    async testConnection() {
        try {
            console.log('🔍 Testing Midtrans connection...');
            
            // Test dengan create token untuk validasi kredensial
            const testData = {
                transaction_details: {
                    order_id: 'TEST_CONNECTION_' + Date.now(),
                    gross_amount: 1000
                },
                item_details: [{
                    id: 'TEST_ITEM',
                    price: 1000,
                    quantity: 1,
                    name: 'Test Connection'
                }]
            };

            const token = await this.snap.createTransactionToken(testData);
            
            if (token) {
                this.isConnected = true;
                console.log('✅ Midtrans connection successful');
                return { 
                    success: true, 
                    message: 'Connected to Midtrans API',
                    token: token
                };
            } else {
                throw new Error('Failed to create transaction token');
            }
        } catch (error) {
            console.error('❌ Midtrans connection failed:', error.message);
            this.isConnected = false;
            return { 
                success: false, 
                error: error.message 
            };
        }
    }

    async createPayment(paymentData) {
        try {
            const {
                orderId,
                amount,
                customerName,
                customerPhone,
                customerEmail,
                description,
                paymentMethod = 'qris'
            } = paymentData;

            // Validasi data
            if (!orderId || !amount || !customerName || !customerPhone) {
                throw new Error('Data pembayaran tidak lengkap');
            }

            if (amount < 1000) {
                throw new Error('Minimum pembayaran Rp 1.000');
            }

            console.log(`💳 Creating Midtrans payment for order: ${orderId}`);

            const transactionDetails = {
                transaction_details: {
                    order_id: orderId,
                    gross_amount: amount
                },
                item_details: [{
                    id: 'DRIVER_TOPUP',
                    price: amount,
                    quantity: 1,
                    name: description || 'Driver Top Up',
                    merchant_name: 'Bakusam Express'
                }],
                customer_details: {
                    first_name: customerName,
                    phone: customerPhone,
                    email: customerEmail || 'driver@bakusam.com'
                },
                callbacks: {
                    finish: process.env.MIDTRANS_FINISH_URL || 'https://your-domain.com/payment/finish',
                    error: process.env.MIDTRANS_ERROR_URL || 'https://your-domain.com/payment/error',
                    pending: process.env.MIDTRANS_PENDING_URL || 'https://your-domain.com/payment/pending'
                },
                enabled_payments: ['qris', 'bank_transfer', 'gopay', 'shopeepay'],
                credit_card: {
                    secure: true
                }
            };

            // Create Snap transaction
            const transaction = await this.snap.createTransaction(transactionDetails);
            
            if (transaction && transaction.token) {
                console.log(`✅ Midtrans payment created successfully: ${orderId}`);
                
                return {
                    success: true,
                    paymentId: transaction.token,
                    orderId: orderId,
                    amount: amount,
                    status: 'pending',
                    paymentUrl: transaction.redirect_url,
                    token: transaction.token,
                    snapToken: transaction.token,
                    metadata: {
                        type: 'driver_topup',
                        driver_phone: customerPhone,
                        timestamp: new Date().toISOString()
                    }
                };
            } else {
                throw new Error('Failed to create Midtrans payment');
            }

        } catch (error) {
            console.error('❌ Midtrans payment creation failed:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async checkPaymentStatus(orderId) {
        try {
            console.log(`🔍 Checking Midtrans payment status: ${orderId}`);
            
            const status = await this.core.transaction.status(orderId);
            
            if (status) {
                return {
                    success: true,
                    paymentId: status.transaction_id,
                    orderId: status.order_id,
                    amount: status.gross_amount,
                    status: status.transaction_status,
                    paymentType: status.payment_type,
                    transactionTime: status.transaction_time,
                    fraudStatus: status.fraud_status
                };
            } else {
                throw new Error('Payment not found');
            }

        } catch (error) {
            console.error('❌ Payment status check failed:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async refundPayment(orderId, amount, reason = 'Refund request') {
        try {
            console.log(`💰 Processing refund for order: ${orderId}`);
            
            const refundData = {
                refund_key: `REFUND_${Date.now()}`,
                amount: amount,
                reason: reason
            };

            const refund = await this.core.transaction.refund(orderId, refundData);
            
            if (refund) {
                console.log(`✅ Refund processed successfully: ${refund.refund_key}`);
                return {
                    success: true,
                    refundKey: refund.refund_key,
                    amount: refund.amount,
                    status: 'processed'
                };
            } else {
                throw new Error('Failed to process refund');
            }

        } catch (error) {
            console.error('❌ Refund failed:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    handleWebhook(webhookData) {
        try {
            console.log('📥 Processing Midtrans webhook:', webhookData);
            
            const {
                order_id,
                transaction_status,
                gross_amount,
                payment_type,
                fraud_status,
                transaction_id
            } = webhookData;

            // Validasi webhook signature (implementasi sesuai dokumentasi Midtrans)
            // const isValid = this.verifyWebhookSignature(webhookData);
            
            if (transaction_status === 'capture' || transaction_status === 'settlement') {
                if (fraud_status === 'challenge' || fraud_status === 'accept') {
                    // Payment success
                    console.log(`💰 Payment success: ${transaction_id} - Rp ${gross_amount}`);
                    
                    // Emit event untuk notifikasi
                    this.emit('payment_success', {
                        orderId: order_id,
                        paymentId: transaction_id,
                        amount: gross_amount,
                        status: transaction_status,
                        paymentType: payment_type
                    });

                    return {
                        success: true,
                        message: 'Payment success processed',
                        status: 'success'
                    };
                }
            } else if (transaction_status === 'pending') {
                console.log(`⏳ Payment pending: ${transaction_id}`);
                return {
                    success: true,
                    message: 'Payment pending processed',
                    status: 'pending'
                };
            } else if (transaction_status === 'deny' || transaction_status === 'expire' || transaction_status === 'cancel') {
                console.log(`❌ Payment failed: ${transaction_id} - Status: ${transaction_status}`);
                return {
                    success: true,
                    message: 'Payment failed processed',
                    status: 'failed'
                };
            }

            return {
                success: true,
                message: 'Webhook processed',
                status: 'processed'
            };

        } catch (error) {
            console.error('❌ Webhook processing failed:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    verifyWebhookSignature(webhookData) {
        // Implementasi verifikasi signature webhook Midtrans
        // Sesuai dokumentasi resmi Midtrans
        try {
            // TODO: Implement signature verification
            return true; // Temporary return true
        } catch (error) {
            console.error('❌ Webhook signature verification failed:', error.message);
            return false;
        }
    }

    getPaymentMethods() {
        try {
            // Midtrans mendukung banyak metode pembayaran
            const methods = [
                {
                    id: 'qris',
                    name: 'QRIS',
                    description: 'Scan QR Code untuk pembayaran',
                    enabled: true
                },
                {
                    id: 'bank_transfer',
                    name: 'Transfer Bank',
                    description: 'Transfer manual ke rekening',
                    enabled: true
                },
                {
                    id: 'gopay',
                    name: 'GoPay',
                    description: 'E-wallet GoPay',
                    enabled: true
                },
                {
                    id: 'shopeepay',
                    name: 'ShopeePay',
                    description: 'E-wallet ShopeePay',
                    enabled: true
                },
                {
                    id: 'credit_card',
                    name: 'Kartu Kredit',
                    description: 'Visa, Mastercard, JCB',
                    enabled: true
                }
            ];

            return {
                success: true,
                methods: methods
            };

        } catch (error) {
            console.error('❌ Failed to get payment methods:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

module.exports = MidtransPaymentService;
