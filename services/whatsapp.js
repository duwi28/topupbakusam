const { 
    default: makeWASocket, 
    DisconnectReason, 
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore
} = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const pino = require('pino');
const qrcode = require('qrcode-terminal');
const path = require('path');
const fs = require('fs');
const { EventEmitter } = require('events');
const Logger = require('../utils/logger');

class WhatsAppService extends EventEmitter {
    constructor() {
        super();
        this.client = null;
        this.isConnected = false;
        this.authFolder = './session';
        this.qrCode = null;
        this.connectionAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.logger = new Logger();
        
        // Pastikan folder session ada
        if (!fs.existsSync(this.authFolder)) {
            fs.mkdirSync(this.authFolder, { recursive: true });
        }
    }

    async init() {
        try {
            this.logger.info('🚀 Inisialisasi WhatsApp Baileys...');
            
            const { version } = await fetchLatestBaileysVersion();
            this.logger.info(`📱 Versi Baileys: ${version.join('.')}`);
            
            const { state, saveCreds } = await useMultiFileAuthState(this.authFolder);
            
            this.client = makeWASocket({
                version,
                printQRInTerminal: true,
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, this.logger),
                },
                browser: ['TopUp Bot', 'Chrome', '1.0.0'],
                logger: pino({ level: 'silent' }),
                connectTimeoutMs: 60_000,
                defaultQueryTimeoutMs: 0,
                generateHighQualityLinkPreview: true,
                markOnlineOnConnect: false,
                retryRequestDelayMs: 250,
            });

            // Setup event handlers
            this.setupEventHandlers();
            
            // Setup credential saving
            this.client.ev.on('creds.update', saveCreds);
            
            this.logger.success('✅ WhatsApp Baileys berhasil diinisialisasi');
            return true;
            
        } catch (error) {
            this.logger.error('❌ Gagal inisialisasi WhatsApp Baileys:', error);
            return false;
        }
    }

    setupEventHandlers() {
        if (!this.client) return;

        // Connection update events
        this.client.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;
            
            console.log('🔄 Connection Update Event:', { connection, qr: qr ? 'QR Available' : 'No QR' });
            
            if (qr) {
                this.qrCode = qr;
                this.logger.info('📱 QR Code tersedia, silakan scan');
                console.log('📱 QR Code Data:', qr.substring(0, 50) + '...');
                qrcode.generate(qr, { small: true });
            }
            
            if (connection === 'close') {
                const shouldReconnect = (lastDisconnect?.error instanceof Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
                
                if (shouldReconnect && this.connectionAttempts < this.maxReconnectAttempts) {
                    this.connectionAttempts++;
                    this.logger.warn(`🔄 Mencoba reconnect... (${this.connectionAttempts}/${this.maxReconnectAttempts})`);
                    
                    setTimeout(() => {
                        this.reconnect();
                    }, 5000);
                } else {
                    this.logger.error('❌ Koneksi WhatsApp terputus permanen');
                    this.isConnected = false;
                    this.emit('disconnected');
                }
            } else if (connection === 'open') {
                this.logger.success('✅ WhatsApp berhasil terhubung!');
                this.isConnected = true;
                this.connectionAttempts = 0;
                this.qrCode = null;
                this.emit('ready');
            }
        });

        // Message events
        this.client.ev.on('messages.upsert', async (m) => {
            const message = m.messages[0];
            
            if (!message.key.fromMe && message.message) {
                try {
                    const messageContent = this.extractMessageContent(message.message);
                    const sender = message.key.remoteJid;
                    
                    if (messageContent) {
                        this.logger.info(`📨 Pesan dari ${sender}: ${messageContent}`);
                        
                        // Emit event untuk dihandle oleh message handler
                        this.emit('message', {
                            from: sender,
                            body: messageContent,
                            timestamp: message.messageTimestamp,
                            messageId: message.key.id,
                            type: this.getMessageType(message.message)
                        });
                    }
                } catch (error) {
                    this.logger.error('❌ Error processing message:', error);
                }
            }
        });

        // Presence update events
        this.client.ev.on('presence.update', (presence) => {
            this.logger.debug(`👤 Presence update: ${presence.id} - ${presence.presences}`);
        });

        // Groups update events
        this.client.ev.on('groups.update', (updates) => {
            updates.forEach(update => {
                this.logger.debug(`👥 Group update: ${update.id} - ${update.announce}`);
            });
        });
    }

    extractMessageContent(message) {
        if (message.conversation) return message.conversation;
        if (message.extendedTextMessage) return message.extendedTextMessage.text;
        if (message.imageMessage) return '[Gambar]';
        if (message.videoMessage) return '[Video]';
        if (message.audioMessage) return '[Audio]';
        if (message.documentMessage) return '[Dokumen]';
        if (message.stickerMessage) return '[Stiker]';
        return '[Media]';
    }

    getMessageType(message) {
        if (message.conversation || message.extendedTextMessage) return 'text';
        if (message.imageMessage) return 'image';
        if (message.videoMessage) return 'video';
        if (message.audioMessage) return 'audio';
        if (message.documentMessage) return 'document';
        if (message.stickerMessage) return 'sticker';
        return 'unknown';
    }

    async reconnect() {
        try {
            this.logger.info('🔄 Mencoba reconnect WhatsApp...');
            await this.init();
        } catch (error) {
            this.logger.error('❌ Gagal reconnect:', error);
        }
    }

    async sendMessage(to, message) {
        try {
            if (!this.client || !this.isConnected) {
                throw new Error('WhatsApp client tidak terhubung');
            }

            const result = await this.client.sendMessage(to, { text: message });
            this.logger.success(`✅ Pesan berhasil dikirim ke ${to}`);
            return result;
        } catch (error) {
            this.logger.error(`❌ Gagal kirim pesan ke ${to}:`, error);
            throw error;
        }
    }

    async sendReplyMessage(to, message, quotedMessageId) {
        try {
            if (!this.client || !this.isConnected) {
                throw new Error('WhatsApp client tidak terhubung');
            }

            const result = await this.client.sendMessage(to, {
                text: message,
                quoted: {
                    key: { remoteJid: to, id: quotedMessageId },
                    message: { conversation: 'Reply' }
                }
            });
            
            this.logger.success(`✅ Reply berhasil dikirim ke ${to}`);
            return result;
        } catch (error) {
            this.logger.error(`❌ Gagal kirim reply ke ${to}:`, error);
            throw error;
        }
    }

    async sendMediaMessage(to, mediaBuffer, mediaType, caption = '') {
        try {
            if (!this.client || !this.isConnected) {
                throw new Error('WhatsApp client tidak terhubung');
            }

            let mediaMessage = {};
            
            switch (mediaType) {
                case 'image':
                    mediaMessage = { image: mediaBuffer, caption };
                    break;
                case 'video':
                    mediaMessage = { video: mediaBuffer, caption };
                    break;
                case 'audio':
                    mediaMessage = { audio: mediaBuffer };
                    break;
                case 'document':
                    mediaMessage = { document: mediaBuffer, fileName: 'document' };
                    break;
                default:
                    throw new Error(`Tipe media tidak didukung: ${mediaType}`);
            }

            const result = await this.client.sendMessage(to, mediaMessage);
            this.logger.success(`✅ Media ${mediaType} berhasil dikirim ke ${to}`);
            return result;
        } catch (error) {
            this.logger.error(`❌ Gagal kirim media ${mediaType} ke ${to}:`, error);
            throw error;
        }
    }

    async getChatInfo(chatId) {
        try {
            if (!this.client || !this.isConnected) {
                throw new Error('WhatsApp client tidak terhubung');
            }

            const chat = await this.client.getChatById(chatId);
            return chat;
        } catch (error) {
            this.logger.error(`❌ Gagal get info chat ${chatId}:`, error);
            return null;
        }
    }

    async getContactInfo(contactId) {
        try {
            if (!this.client || !this.isConnected) {
                throw new Error('WhatsApp client tidak terhubung');
            }

            const contact = await this.client.getContactById(contactId);
            return contact;
        } catch (error) {
            this.logger.error(`❌ Gagal get info contact ${contactId}:`, error);
            return null;
        }
    }

    isConnected() {
        return this.isConnected;
    }

    getConnectionStatus() {
        return {
            isConnected: this.isConnected,
            qrCode: this.qrCode,
            connectionAttempts: this.connectionAttempts
        };
    }

    async start() {
        try {
            this.logger.info('🚀 Starting WhatsApp service...');
            const success = await this.init();
            if (success) {
                this.logger.success('✅ WhatsApp service started successfully');
            } else {
                throw new Error('Failed to initialize WhatsApp service');
            }
        } catch (error) {
            this.logger.error('❌ Error starting WhatsApp service:', error);
            throw error;
        }
    }

    async stop() {
        try {
            this.logger.info('🛑 Stopping WhatsApp service...');
            await this.logout();
            this.isConnected = false;
            this.logger.success('✅ WhatsApp service stopped');
        } catch (error) {
            this.logger.error('❌ Error stopping WhatsApp service:', error);
        }
    }

    getStatus() {
        return {
            isConnected: this.isConnected,
            qrCode: this.qrCode,
            connectionAttempts: this.connectionAttempts,
            client: this.client ? 'initialized' : 'not_initialized'
        };
    }

    async logout() {
        try {
            if (this.client) {
                await this.client.logout();
                this.logger.info('✅ Logout WhatsApp berhasil');
            }
        } catch (error) {
            this.logger.error('❌ Error saat logout:', error);
        }
    }
}

module.exports = WhatsAppService;
