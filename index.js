require('dotenv').config();
const express = require('express');
const { EventEmitter } = require('events');
const WhatsAppService = require('./services/whatsapp');
const GoogleSheetsService = require('./services/sheets-real');
const MidtransPaymentService = require('./services/midtransPayment'); // Use Midtrans service
const TopupHandler = require('./handlers/topupHandler');
const MessageHandler = require('./handlers/messageHandler');
const ValidationService = require('./services/validation');
const Logger = require('./utils/logger');
const Database = require('./config/database');

class WhatsAppBot extends EventEmitter {
    constructor() {
        super();
        
        this.app = express();
        this.port = process.env.PORT || 3000;
        this.logger = new Logger();
        
        // Initialize services
        this.whatsappService = new WhatsAppService();
        this.sheetsService = new GoogleSheetsService();
        this.mayarPaymentService = new MidtransPaymentService(); // Midtrans service
        
        // Initialize handlers
        this.topupHandler = new TopupHandler(
            this.whatsappService, 
            this.sheetsService, 
            this.mayarPaymentService
        );
        this.messageHandler = new MessageHandler();
        this.validationService = new ValidationService();
        this.database = new Database();
        
        this.setupExpress();
        this.setupWhatsApp();
        this.setupMayarWebhooks();
        this.setupEventListeners();
    }

    setupExpress() {
        this.app.use(express.json());
        this.app.use(express.urlencoded({ extended: true }));
        
        // Health check endpoint
        this.app.get('/health', (req, res) => {
            res.json({
                status: 'healthy',
                timestamp: new Date().toISOString(),
                services: {
                    whatsapp: this.whatsappService.isConnected ? 'connected' : 'disconnected',
                    sheets: this.sheetsService.isConnected ? 'connected' : 'disconnected',
                    mayar: this.mayarPaymentService.isConnected ? 'connected' : 'disconnected'
                }
            });
        });
        
        // Status endpoint
        this.app.get('/status', (req, res) => {
            res.json({
                status: 'running',
                timestamp: new Date().toISOString(),
                whatsapp: this.whatsappService.getStatus(),
                sheets: this.sheetsService.getStatus(),
                mayar: this.mayarPaymentService.getStatus()
            });
        });
    }

    setupWhatsApp() {
        this.whatsappService.on('ready', () => {
            this.logger.success('✅ WhatsApp Bot siap digunakan!');
            this.emit('ready');
        });

        this.whatsappService.on('message', async (message) => {
            try {
                await this.handleIncomingMessage(message);
            } catch (error) {
                this.logger.error('❌ Error handling message:', error);
            }
        });

        this.whatsappService.on('disconnected', () => {
            this.logger.warn('⚠️ WhatsApp Bot terputus');
            this.emit('disconnected');
        });
    }

    setupMayarWebhooks() {
        // Webhook endpoint untuk Mayar.id
        this.app.post('/webhook/mayar', async (req, res) => {
            try {
                const signature = req.headers['x-mayar-signature'];
                const payload = req.body;
                
                // Verify webhook signature
                if (!this.mayarPaymentService.verifyWebhookSignature(signature, payload)) {
                    this.logger.warn('⚠️ Invalid webhook signature');
                    return res.status(401).json({ error: 'Invalid signature' });
                }
                
                // Process webhook
                const result = await this.mayarPaymentService.handleWebhook(payload);
                
                if (result.success) {
                    res.json({ success: true, message: 'Webhook processed' });
                } else {
                    res.status(400).json({ error: result.error });
                }
                
            } catch (error) {
                this.logger.error('❌ Webhook error:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        });
        
        // Test webhook endpoint untuk development
        this.app.post('/webhook/test', async (req, res) => {
            try {
                const { payment_id, order_id, status, amount } = req.body;
                
                // Simulate webhook data
                const webhookData = {
                    payment_id: payment_id || 'test_pay_001',
                    order_id: order_id || 'TEST_ORDER_001',
                    status: status || 'paid',
                    amount: amount || 1000,
                    metadata: {
                        type: 'driver_topup',
                        driver_phone: '6281234567890',
                        timestamp: new Date().toISOString()
                    }
                };
                
                // Process webhook
                const result = await this.mayarPaymentService.handleWebhook(webhookData);
                
                res.json({
                    success: true,
                    webhookData: webhookData,
                    result: result
                });
                
            } catch (error) {
                this.logger.error('❌ Test webhook error:', error);
                res.status(500).json({ error: error.message });
            }
        });
    }

    setupEventListeners() {
        // Listen to Mayar payment events
        this.mayarPaymentService.on('paymentSuccess', async (data) => {
            try {
                await this.topupHandler.processPaymentSuccess(data);
            } catch (error) {
                this.logger.error('❌ Error processing payment success:', error);
            }
        });

        this.mayarPaymentService.on('paymentPending', async (data) => {
            try {
                await this.topupHandler.processPaymentPending(data);
            } catch (error) {
                this.logger.error('❌ Error processing payment pending:', error);
            }
        });

        this.mayarPaymentService.on('paymentExpired', async (data) => {
            try {
                await this.topupHandler.processPaymentExpired(data);
            } catch (error) {
                this.logger.error('❌ Error processing payment expired:', error);
            }
        });

        this.mayarPaymentService.on('paymentFailed', async (data) => {
            try {
                await this.topupHandler.processPaymentFailed(data);
            } catch (error) {
                this.logger.error('❌ Error processing payment failed:', error);
            }
        });

        this.mayarPaymentService.on('paymentCancelled', async (data) => {
            try {
                await this.topupHandler.processPaymentCancelled(data);
            } catch (error) {
                this.logger.error('❌ Error processing payment cancelled:', error);
            }
        });
    }

    async handleIncomingMessage(message) {
        try {
            const { from, body, type } = message;
            
            // Log incoming message
            this.logger.info(`📥 Message from ${from}: ${body}`);
            
            // Handle different message types
            if (type === 'chat' && body) {
                await this.messageHandler.handleMessage(message, this.topupHandler);
            }
            
        } catch (error) {
            this.logger.error('❌ Error handling incoming message:', error);
        }
    }

    async start() {
        try {
            // Start Express server
            this.app.listen(this.port, () => {
                this.logger.success(`🚀 Server berjalan di port ${this.port}`);
                this.logger.info(`📊 Health check: http://localhost:${this.port}/health`);
                this.logger.info(`📈 Status: http://localhost:${this.port}/status`);
                this.logger.info(`🔗 Webhook: http://localhost:${this.port}/webhook/mayar`);
                this.logger.info(`🧪 Test Webhook: http://localhost:${this.port}/webhook/test`);
            });
            
            // Start WhatsApp service
            await this.whatsappService.start();
            
        } catch (error) {
            this.logger.error('❌ Error starting bot:', error);
            process.exit(1);
        }
    }

    async stop() {
        try {
            await this.whatsappService.stop();
            this.logger.info('🛑 Bot berhasil dihentikan');
        } catch (error) {
            this.logger.error('❌ Error stopping bot:', error);
        }
    }
}

// Handle process termination
process.on('SIGINT', async () => {
    console.log('\n🛑 Menerima signal SIGINT, menghentikan bot...');
    if (global.bot) {
        await global.bot.stop();
    }
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\n🛑 Menerima signal SIGTERM, menghentikan bot...');
    if (global.bot) {
        await global.bot.stop();
    }
    process.exit(0);
});

// Start bot if this file is run directly
if (require.main === module) {
    const bot = new WhatsAppBot();
    global.bot = bot;
    
    bot.start().catch(error => {
        console.error('❌ Failed to start bot:', error);
        process.exit(1);
    });
}

module.exports = WhatsAppBot;
