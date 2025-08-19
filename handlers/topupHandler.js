const { v4: uuidv4 } = require('uuid');
const moment = require('moment');
const logger = require('../utils/logger');
const helpers = require('../utils/helpers');

class TopupHandler {
    constructor(whatsappService, sheetsService, mayarPaymentService) {
        this.whatsappService = whatsappService;
        this.sheetsService = sheetsService;
        this.mayarPaymentService = mayarPaymentService;
        this.pendingPayments = new Map(); // Menyimpan payment yang pending
        this.rateLimitMap = new Map(); // Rate limiting untuk mencegah spam
    }

    async processTopup(message, amount, driverPhone) {
        try {
            logger.info(`💰 Memproses top-up untuk ${driverPhone} sebesar Rp ${amount}`);

            // Validasi request
            const validation = await this.validateTopupRequest(driverPhone, amount);
            if (!validation.isValid) {
                return {
                    success: false,
                    error: validation.message
                };
            }

            // Cek rate limiting
            if (this.isRateLimited(driverPhone)) {
                return {
                    success: false,
                    error: 'Terlalu banyak request. Silakan tunggu beberapa menit.'
                };
            }

            // Generate order ID
            const orderId = `TOPUP_${driverPhone}_${Date.now()}_${uuidv4().substr(0, 8)}`;

            // Buat payment di Mayar.id
            const paymentData = {
                orderId: orderId,
                amount: amount,
                customerName: validation.driverData.name || 'Driver',
                customerPhone: driverPhone,
                customerEmail: validation.driverData.email || '',
                description: `Top-up saldo driver ${validation.driverData.name || driverPhone}`,
                paymentMethod: 'qris' // Default menggunakan QRIS
            };

            const paymentResult = await this.mayarPaymentService.createPayment(paymentData);

            if (!paymentResult.success) {
                logger.error('❌ Gagal membuat payment:', paymentResult.error);
                return {
                    success: false,
                    error: 'Gagal membuat pembayaran. Silakan coba lagi.'
                };
            }

            // Simpan payment ke pending payments
            this.pendingPayments.set(orderId, {
                driverPhone: driverPhone,
                amount: amount,
                paymentId: paymentResult.paymentId,
                status: 'pending',
                createdAt: new Date(),
                driverData: validation.driverData
            });

            // Update rate limit
            this.updateRateLimit(driverPhone);

            logger.success(`✅ Payment berhasil dibuat: ${orderId} - ${paymentResult.paymentId}`);

            return {
                success: true,
                orderId: orderId,
                paymentId: paymentResult.paymentId,
                amount: amount,
                paymentUrl: paymentResult.paymentUrl,
                qrCode: paymentResult.qrCode,
                expiredAt: paymentResult.expiredAt,
                message: 'Pembayaran berhasil dibuat. Silakan scan QR code atau klik link pembayaran.'
            };

        } catch (error) {
            logger.error('❌ Error processing topup:', error);
            return {
                success: false,
                error: 'Terjadi kesalahan sistem. Silakan coba lagi.'
            };
        }
    }

    async processPaymentSuccess(paymentData) {
        try {
            const { paymentId, orderId, amount, metadata } = paymentData;
            
            logger.info(`💰 Memproses pembayaran berhasil: ${paymentId}`);

            // Ambil data pending payment
            const pendingPayment = this.pendingPayments.get(orderId);
            if (!pendingPayment) {
                logger.warn(`⚠️ Pending payment tidak ditemukan: ${orderId}`);
                return { success: false, error: 'Pending payment tidak ditemukan' };
            }

            const { driverPhone, driverData } = pendingPayment;

            // Update saldo driver di Google Sheets
            const currentBalance = driverData.balance || 0;
            const newBalance = currentBalance + amount;

            const updateResult = await this.sheetsService.updateDriverBalance(
                driverPhone,
                newBalance
            );

            if (!updateResult.success) {
                logger.error('❌ Gagal update saldo driver:', updateResult.error);
                
                // Kirim notifikasi ke admin
                await this.notifyAdminPaymentError(paymentId, orderId, driverPhone, amount);
                
                return { success: false, error: 'Gagal update saldo driver' };
            }

            // Simpan transaksi ke history
            const transaction = {
                id: uuidv4(),
                orderId: orderId,
                paymentId: paymentId,
                driverPhone: driverPhone,
                driverName: driverData.name,
                amount: amount,
                type: 'topup',
                status: 'success',
                previousBalance: currentBalance,
                newBalance: newBalance,
                timestamp: new Date().toISOString(),
                paymentMethod: 'qris',
                metadata: metadata
            };

            await this.saveTransactionHistory(transaction);

            // Hapus dari pending payments
            this.pendingPayments.delete(orderId);

            // Kirim konfirmasi ke driver
            await this.sendTopupConfirmation(driverPhone, amount, newBalance, orderId);

            // Kirim notifikasi ke admin
            await this.notifyAdminPaymentSuccess(paymentId, orderId, driverPhone, amount, newBalance);

            logger.success(`✅ Top-up berhasil diproses: ${driverPhone} + Rp ${amount} = Rp ${newBalance}`);

            return {
                success: true,
                message: 'Top-up berhasil diproses',
                transaction: transaction
            };

        } catch (error) {
            logger.error('❌ Error processing payment success:', error);
            return { success: false, error: error.message };
        }
    }

    async processPaymentExpired(paymentData) {
        try {
            const { paymentId, orderId } = paymentData;
            
            logger.warn(`⏰ Payment expired: ${paymentId}`);

            // Ambil data pending payment
            const pendingPayment = this.pendingPayments.get(orderId);
            if (!pendingPayment) {
                logger.warn(`⚠️ Pending payment tidak ditemukan: ${orderId}`);
                return { success: false, error: 'Pending payment tidak ditemukan' };
            }

            const { driverPhone, amount } = pendingPayment;

            // Hapus dari pending payments
            this.pendingPayments.delete(orderId);

            // Kirim notifikasi ke driver
            await this.whatsappService.sendMessage(
                driverPhone,
                `⏰ Pembayaran top-up Rp ${helpers.formatCurrency(amount)} telah expired.\n\nSilakan buat ulang pembayaran dengan command:\nTOPUP <jumlah>`
            );

            // Kirim notifikasi ke admin
            await this.notifyAdminPaymentExpired(paymentId, orderId, driverPhone, amount);

            logger.info(`✅ Payment expired processed: ${orderId}`);

            return { success: true, message: 'Payment expired processed' };

        } catch (error) {
            logger.error('❌ Error processing payment expired:', error);
            return { success: false, error: error.message };
        }
    }

    async processPaymentFailed(paymentData) {
        try {
            const { paymentId, orderId, amount } = paymentData;
            
            logger.error(`❌ Payment failed: ${paymentId}`);

            // Ambil data pending payment
            const pendingPayment = this.pendingPayments.get(orderId);
            if (!pendingPayment) {
                logger.warn(`⚠️ Pending payment tidak ditemukan: ${orderId}`);
                return { success: false, error: 'Pending payment tidak ditemukan' };
            }

            const { driverPhone } = pendingPayment;

            // Hapus dari pending payments
            this.pendingPayments.delete(orderId);

            // Kirim notifikasi ke driver
            await this.whatsappService.sendMessage(
                driverPhone,
                `❌ Pembayaran top-up Rp ${helpers.formatCurrency(amount)} gagal.\n\nSilakan coba lagi dengan command:\nTOPUP <jumlah>`
            );

            // Kirim notifikasi ke admin
            await this.notifyAdminPaymentFailed(paymentId, orderId, driverPhone, amount);

            logger.info(`✅ Payment failed processed: ${orderId}`);

            return { success: true, message: 'Payment failed processed' };

        } catch (error) {
            logger.error('❌ Error processing payment failed:', error);
            return { success: false, error: error.message };
        }
    }

    async processPaymentCancelled(paymentData) {
        try {
            const { payment_id, order_id } = paymentData;
            
            logger.warn(`🚫 Payment cancelled: ${payment_id}`);

            // Ambil data pending payment
            const pendingPayment = this.pendingPayments.get(order_id);
            if (!pendingPayment) {
                logger.warn(`⚠️ Pending payment tidak ditemukan: ${order_id}`);
                return { success: false, error: 'Pending payment tidak ditemukan' };
            }

            const { driverPhone, amount } = pendingPayment;

            // Hapus dari pending payments
            this.pendingPayments.delete(order_id);

            // Kirim notifikasi ke driver
            await this.whatsappService.sendMessage(
                driverPhone,
                `🚫 Pembayaran top-up Rp ${helpers.formatCurrency(amount)} dibatalkan.\n\nSilakan buat ulang pembayaran dengan command:\nTOPUP <jumlah>`
            );

            // Kirim notifikasi ke admin
            await this.notifyAdminPaymentCancelled(payment_id, order_id, driverPhone, amount);

            logger.info(`✅ Payment cancelled processed: ${order_id}`);

            return { success: true, message: 'Payment cancelled processed' };

        } catch (error) {
            logger.error('❌ Error processing payment cancelled:', error.message);
            return { success: false, error: error.message };
        }
    }

    async processPaymentPending(paymentData) {
        try {
            const { payment_id, order_id, amount } = paymentData;
            
            logger.info(`⏳ Payment pending: ${payment_id} - Rp ${amount}`);

            // Ambil data pending payment
            const pendingPayment = this.pendingPayments.get(order_id);
            if (!pendingPayment) {
                logger.warn(`⚠️ Pending payment tidak ditemukan: ${order_id}`);
                return { success: false, error: 'Pending payment tidak ditemukan' };
            }

            const { driverPhone } = pendingPayment;

            // Update status payment menjadi pending
            pendingPayment.status = 'pending';
            this.pendingPayments.set(order_id, pendingPayment);

            // Kirim notifikasi ke driver bahwa pembayaran sedang diproses
            await this.whatsappService.sendMessage(
                driverPhone,
                `⏳ Pembayaran top-up Rp ${helpers.formatCurrency(amount)} sedang diproses.\n\nSilakan selesaikan pembayaran Anda.`
            );

            // Kirim notifikasi ke admin
            await this.notifyAdminPaymentPending(payment_id, order_id, driverPhone, amount);

            logger.info(`✅ Payment pending processed: ${order_id}`);

            return { success: true, message: 'Payment pending processed' };

        } catch (error) {
            logger.error('❌ Error processing payment pending:', error.message);
            return { success: false, error: error.message };
        }
    }

    async validateTopupRequest(driverPhone, amount) {
        try {
            // Validasi format nomor
            if (!helpers.isValidWhatsAppFormat(driverPhone)) {
                return {
                    isValid: false,
                    message: 'Format nomor WhatsApp tidak valid'
                };
            }

            // Validasi jumlah top-up
            if (!helpers.validateTopupAmount(amount)) {
                return {
                    isValid: false,
                    message: 'Jumlah top-up tidak valid. Minimum Rp 1.000, maksimum Rp 10.000.000'
                };
            }

            // Cek apakah driver terdaftar
            const driverData = await this.sheetsService.getDriverByPhone(driverPhone);
            if (!driverData) {
                return {
                    isValid: false,
                    message: 'Nomor WhatsApp tidak terdaftar sebagai driver'
                };
            }

            // Cek apakah ada payment pending
            const hasPendingPayment = Array.from(this.pendingPayments.values())
                .some(payment => payment.driverPhone === driverPhone && payment.status === 'pending');

            if (hasPendingPayment) {
                return {
                    isValid: false,
                    message: 'Anda masih memiliki pembayaran yang pending. Silakan selesaikan terlebih dahulu.'
                };
            }

            return {
                isValid: true,
                driverData: driverData
            };

        } catch (error) {
            logger.error('❌ Error validating topup request:', error);
            return {
                isValid: false,
                message: 'Terjadi kesalahan validasi'
            };
        }
    }

    isRateLimited(driverPhone) {
        const now = Date.now();
        const rateLimitWindow = 5 * 60 * 1000; // 5 menit
        const maxRequests = 3; // Maksimal 3 request dalam 5 menit

        if (!this.rateLimitMap.has(driverPhone)) {
            this.rateLimitMap.set(driverPhone, {
                count: 1,
                firstRequest: now
            });
            return false;
        }

        const rateLimit = this.rateLimitMap.get(driverPhone);
        
        // Reset jika sudah lewat window
        if (now - rateLimit.firstRequest > rateLimitWindow) {
            this.rateLimitMap.set(driverPhone, {
                count: 1,
                firstRequest: now
            });
            return false;
        }

        // Cek apakah melebihi limit
        if (rateLimit.count >= maxRequests) {
            return true;
        }

        // Increment counter
        rateLimit.count++;
        return false;
    }

    updateRateLimit(driverPhone) {
        // Rate limit sudah diupdate di isRateLimited
    }

    async sendTopupConfirmation(driverPhone, amount, newBalance, orderId) {
        try {
            const message = `🎉 *TOP-UP BERHASIL!*\n\n` +
                `💰 Jumlah: Rp ${helpers.formatCurrency(amount)}\n` +
                `💳 Order ID: ${orderId}\n` +
                `💵 Saldo Baru: Rp ${helpers.formatCurrency(newBalance)}\n` +
                `⏰ Waktu: ${moment().format('DD/MM/YYYY HH:mm:ss')}\n\n` +
                `Terima kasih telah menggunakan layanan top-up kami! 🚗💨`;

            await this.whatsappService.sendMessage(driverPhone, message);
            logger.success(`✅ Konfirmasi top-up berhasil dikirim ke ${driverPhone}`);

        } catch (error) {
            logger.error('❌ Error sending topup confirmation:', error);
        }
    }

    async notifyAdminPaymentSuccess(paymentId, orderId, driverPhone, amount, newBalance) {
        try {
            const adminNumber = process.env.ADMIN_NUMBER;
            if (!adminNumber) return;

            const message = `✅ *PAYMENT SUCCESS*\n\n` +
                `💳 Payment ID: ${paymentId}\n` +
                `📋 Order ID: ${orderId}\n` +
                `📱 Driver: ${driverPhone}\n` +
                `💰 Amount: Rp ${helpers.formatCurrency(amount)}\n` +
                `💵 New Balance: Rp ${helpers.formatCurrency(newBalance)}\n` +
                `⏰ Time: ${moment().format('DD/MM/YYYY HH:mm:ss')}`;

            await this.whatsappService.sendMessage(adminNumber, message);
            logger.success('✅ Notifikasi admin payment success berhasil dikirim');

        } catch (error) {
            logger.error('❌ Error notifying admin payment success:', error);
        }
    }

    async notifyAdminPaymentError(paymentId, orderId, driverPhone, amount) {
        try {
            const adminNumber = process.env.ADMIN_NUMBER;
            if (!adminNumber) return;

            const message = `❌ *PAYMENT ERROR*\n\n` +
                `💳 Payment ID: ${paymentId}\n` +
                `📋 Order ID: ${orderId}\n` +
                `📱 Driver: ${driverPhone}\n` +
                `💰 Amount: Rp ${helpers.formatCurrency(amount)}\n` +
                `⚠️ Error: Gagal update saldo driver\n` +
                `⏰ Time: ${moment().format('DD/MM/YYYY HH:mm:ss')}`;

            await this.whatsappService.sendMessage(adminNumber, message);
            logger.success('✅ Notifikasi admin payment error berhasil dikirim');

        } catch (error) {
            logger.error('❌ Error notifying admin payment error:', error);
        }
    }

    async notifyAdminPaymentExpired(paymentId, orderId, driverPhone, amount) {
        try {
            const adminNumber = process.env.ADMIN_NUMBER;
            if (!adminNumber) return;

            const message = `⏰ *PAYMENT EXPIRED*\n\n` +
                `💳 Payment ID: ${paymentId}\n` +
                `📋 Order ID: ${orderId}\n` +
                `📱 Driver: ${driverPhone}\n` +
                `💰 Amount: Rp ${helpers.formatCurrency(amount)}\n` +
                `⏰ Time: ${moment().format('DD/MM/YYYY HH:mm:ss')}`;

            await this.whatsappService.sendMessage(adminNumber, message);
            logger.success('✅ Notifikasi admin payment expired berhasil dikirim');

        } catch (error) {
            logger.error('❌ Error notifying admin payment expired:', error);
        }
    }

    async notifyAdminPaymentFailed(paymentId, orderId, driverPhone, amount) {
        try {
            const adminNumber = process.env.ADMIN_NUMBER;
            if (!adminNumber) return;

            const message = `❌ *PAYMENT FAILED*\n\n` +
                `💳 Payment ID: ${paymentId}\n` +
                `📋 Order ID: ${orderId}\n` +
                `📱 Driver: ${driverPhone}\n` +
                `💰 Amount: Rp ${helpers.formatCurrency(amount)}\n` +
                `⏰ Time: ${moment().format('DD/MM/YYYY HH:mm:ss')}`;

            await this.whatsappService.sendMessage(adminNumber, message);
            logger.success('✅ Notifikasi admin payment failed berhasil dikirim');

        } catch (error) {
            logger.error('❌ Error notifying admin payment failed:', error);
        }
    }

    async notifyAdminPaymentCancelled(paymentId, orderId, driverPhone, amount) {
        try {
            const adminNumber = process.env.ADMIN_NUMBER;
            if (!adminNumber) return;

            const message = `🚫 *PAYMENT CANCELLED*\n\n` +
                `💳 Payment ID: ${paymentId}\n` +
                `📋 Order ID: ${orderId}\n` +
                `📱 Driver: ${driverPhone}\n` +
                `💰 Amount: Rp ${helpers.formatCurrency(amount)}\n` +
                `⏰ Time: ${moment().format('DD/MM/YYYY HH:mm:ss')}`;

            await this.whatsappService.sendMessage(adminNumber, message);
            logger.success('✅ Notifikasi admin payment cancelled berhasil dikirim');

        } catch (error) {
            logger.error('❌ Error notifying admin payment cancelled:', error);
        }
    }

    async notifyAdminPaymentPending(paymentId, orderId, driverPhone, amount) {
        try {
            const adminNumber = process.env.ADMIN_NUMBER;
            if (!adminNumber) return;

            const message = `⏳ *PAYMENT PENDING*\n\n` +
                `💳 Payment ID: ${paymentId}\n` +
                `📋 Order ID: ${orderId}\n` +
                `📱 Driver: ${driverPhone}\n` +
                `💰 Amount: Rp ${helpers.formatCurrency(amount)}\n` +
                `⏰ Time: ${moment().format('DD/MM/YYYY HH:mm:ss')}`;

            await this.whatsappService.sendMessage(adminNumber, message);
            logger.success('✅ Notifikasi admin payment pending berhasil dikirim');

        } catch (error) {
            logger.error('❌ Error notifying admin payment pending:', error);
        }
    }

    async saveTransactionHistory(transaction) {
        try {
            // Simpan ke Google Sheets atau database lokal
            // Untuk sementara, log saja
            logger.info(`💾 Menyimpan transaksi: ${transaction.id}`);
            
            // TODO: Implement save to Google Sheets atau database
            return { success: true };
        } catch (error) {
            logger.error('❌ Error saving transaction history:', error);
            return { success: false, error: error.message };
        }
    }

    async getTransactionHistory(driverPhone = null, limit = 50) {
        try {
            // TODO: Implement get transaction history
            logger.info('📋 Mengambil riwayat transaksi');
            return { success: true, transactions: [] };
        } catch (error) {
            logger.error('❌ Error getting transaction history:', error);
            return { success: false, error: error.message };
        }
    }

    getPendingPayments() {
        return Array.from(this.pendingPayments.values());
    }

    getPendingPaymentByOrderId(orderId) {
        return this.pendingPayments.get(orderId);
    }

    getPendingPaymentByDriverPhone(driverPhone) {
        return Array.from(this.pendingPayments.values())
            .find(payment => payment.driverPhone === driverPhone && payment.status === 'pending');
    }
}

module.exports = TopupHandler;
