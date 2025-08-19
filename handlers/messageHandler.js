const logger = require('../utils/logger');

class MessageHandler {
    constructor() {
        this.commands = {
            'TOPUP': this.handleTopupCommand.bind(this),
            'SALDO': this.handleBalanceCommand.bind(this),
            'HELP': this.handleHelpCommand.bind(this),
            'INFO': this.handleInfoCommand.bind(this)
        };
    }

    async handleMessage(message, topupHandler) {
        try {
            const { from, body } = message;
            const command = body.trim().toUpperCase();
            
            logger.info(`📨 Processing message from ${from}: ${body}`);
            
            // Check if it's a command
            if (command.startsWith('TOPUP ')) {
                return await this.handleTopupCommand(message, topupHandler);
            } else if (command === 'SALDO') {
                return await this.handleBalanceCommand(message, topupHandler);
            } else if (command === 'HELP') {
                return await this.handleHelpCommand(message);
            } else if (command === 'INFO') {
                return await this.handleInfoCommand(message);
            } else {
                // Unknown command
                return await this.handleUnknownCommand(message);
            }
            
        } catch (error) {
            logger.error('❌ Error handling message:', error);
            return {
                success: false,
                error: 'Terjadi kesalahan sistem'
            };
        }
    }

    async handleTopupCommand(message, topupHandler) {
        try {
            const { from, body } = message;
            const parts = body.trim().split(' ');
            
            if (parts.length !== 2) {
                return {
                    success: false,
                    error: 'Format: TOPUP <jumlah>\nContoh: TOPUP 50000'
                };
            }
            
            const amount = parseInt(parts[1]);
            if (isNaN(amount) || amount < 1000) {
                return {
                    success: false,
                    error: 'Jumlah top-up minimal Rp 1.000'
                };
            }
            
            if (amount > 10000000) {
                return {
                    success: false,
                    error: 'Jumlah top-up maksimal Rp 10.000.000'
                };
            }
            
            logger.info(`💰 Processing topup request: ${from} - Rp ${amount}`);
            
            // Process topup using topup handler
            const result = await topupHandler.processTopup(message, amount, from);
            
            if (result.success) {
                return {
                    success: true,
                    message: `💳 *PEMBAYARAN TOP-UP*\n\n` +
                        `💰 Jumlah: Rp ${amount.toLocaleString('id-ID')}\n` +
                        `💳 Order ID: ${result.orderId}\n` +
                        `⏰ Expired: ${new Date(result.expiredAt).toLocaleString('id-ID')}\n\n` +
                        `Silakan scan QR code atau klik link pembayaran:\n` +
                        `🔗 Link: ${result.paymentUrl}\n` +
                        `📱 QR Code: ${result.qrCode}\n\n` +
                        `⚠️ Pembayaran akan expired dalam 24 jam`,
                    data: result
                };
            } else {
                return {
                    success: false,
                    error: result.error
                };
            }
            
        } catch (error) {
            logger.error('❌ Error handling topup command:', error);
            return {
                success: false,
                error: 'Terjadi kesalahan saat memproses top-up'
            };
        }
    }

    async handleBalanceCommand(message, topupHandler) {
        try {
            const { from } = message;
            
            logger.info(`💵 Checking balance for: ${from}`);
            
            // Get driver data from sheets service
            const sheetsService = topupHandler.sheetsService;
            const driverData = await sheetsService.getDriverByPhone(from);
            
            if (!driverData) {
                return {
                    success: false,
                    error: 'Nomor WhatsApp tidak terdaftar sebagai driver'
                };
            }
            
            const balance = driverData.balance || 0;
            
            return {
                success: true,
                message: `💵 *SALDO DRIVER*\n\n` +
                    `🆔 ID: ${driverData.id}\n` +
                    `👤 Nama: ${driverData.name}\n` +
                    `📱 Nomor: ${driverData.phone}\n` +
                    `💰 Saldo: Rp ${balance.toLocaleString('id-ID')}\n` +
                    `📊 Rating: ${driverData.rating}/10\n` +
                    `🚦 Status: ${driverData.status}\n` +
                    `⚠️ Pelanggaran: ${driverData.statusPelanggaran}\n` +
                    `📈 Order Bulan Ini: ${driverData.totalOrderBulanIni}\n` +
                    `💸 Komisi Bulan Ini: Rp ${driverData.totalKomisiBulanIni.toLocaleString('id-ID')}\n` +
                    `📅 Daftar: ${driverData.tanggalDaftar}\n` +
                    `⏰ Update: ${driverData.lastUpdate || 'Belum ada update'}`,
                data: {
                    driver: driverData,
                    balance: balance
                }
            };
            
        } catch (error) {
            logger.error('❌ Error handling balance command:', error);
            return {
                success: false,
                error: 'Terjadi kesalahan saat cek saldo'
            };
        }
    }

    async handleHelpCommand(message) {
        try {
            const helpMessage = `📚 *BANTUAN TOP-UP BOT*\n\n` +
                `*Commands yang tersedia:*\n\n` +
                `💰 *TOPUP <jumlah>* - Top-up saldo\n` +
                `   Contoh: TOPUP 50000\n` +
                `   Min: Rp 1.000, Max: Rp 10.000.000\n\n` +
                `💵 *SALDO* - Cek saldo driver\n\n` +
                `❓ *HELP* - Tampilkan bantuan ini\n\n` +
                `ℹ️ *INFO* - Informasi bot\n\n` +
                `*Metode Pembayaran:*\n` +
                `• QRIS (GoPay, OVO, DANA, dll)\n` +
                `• Bank Transfer\n` +
                `• E-Wallet\n\n` +
                `*Durasi:* Pembayaran expired dalam 24 jam\n\n` +
                `Untuk bantuan lebih lanjut, hubungi admin.`;
            
            return {
                success: true,
                message: helpMessage
            };
            
        } catch (error) {
            logger.error('❌ Error handling help command:', error);
            return {
                success: false,
                error: 'Terjadi kesalahan saat menampilkan bantuan'
            };
        }
    }

    async handleInfoCommand(message) {
        try {
            const infoMessage = `ℹ️ *INFORMASI BOT*\n\n` +
                `🤖 *Top-Up Driver Bot*\n` +
                `📱 Platform: WhatsApp\n` +
                `💳 Payment Gateway: Mayar.id\n` +
                `📊 Database: Google Sheets\n` +
                `🔄 Status: Active\n\n` +
                `*Fitur:*\n` +
                `✅ Top-up saldo driver\n` +
                `✅ Cek saldo real-time\n` +
                `✅ Multiple payment methods\n` +
                `✅ Webhook notifications\n` +
                `✅ Admin monitoring\n\n` +
                `*Versi:* 1.0.0\n` +
                `*Update:* ${new Date().toLocaleDateString('id-ID')}\n\n` +
                `Powered by PT Bakusam Express Indonesia`;
            
            return {
                success: true,
                message: infoMessage
            };
            
        } catch (error) {
            logger.error('❌ Error handling info command:', error);
            return {
                success: false,
                error: 'Terjadi kesalahan saat menampilkan info'
            };
        }
    }

    async handleUnknownCommand(message) {
        try {
            const { body } = message;
            
            const unknownMessage = `❓ *COMMAND TIDAK DIKENAL*\n\n` +
                `Pesan: "${body}"\n\n` +
                `*Commands yang tersedia:*\n` +
                `• TOPUP <jumlah> - Top-up saldo\n` +
                `• SALDO - Cek saldo\n` +
                `• HELP - Bantuan\n` +
                `• INFO - Informasi bot\n\n` +
                `Ketik *HELP* untuk melihat bantuan lengkap.`;
            
            return {
                success: false,
                error: unknownMessage
            };
            
        } catch (error) {
            logger.error('❌ Error handling unknown command:', error);
            return {
                success: false,
                error: 'Terjadi kesalahan sistem'
            };
        }
    }

    // Utility methods
    isValidCommand(command) {
        return this.commands.hasOwnProperty(command);
    }

    getAvailableCommands() {
        return Object.keys(this.commands);
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR'
        }).format(amount);
    }

    formatDate(date) {
        return new Intl.DateTimeFormat('id-ID', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(new Date(date));
    }
}

module.exports = MessageHandler;
