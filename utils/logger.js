const fs = require('fs');
const path = require('path');

class Logger {
    constructor() {
        this.logDir = './logs';
        this.ensureLogDirectory();
    }

    ensureLogDirectory() {
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }
    }

    getTimestamp() {
        return new Date().toISOString();
    }

    getFormattedTimestamp() {
        return new Date().toLocaleString('id-ID', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }

    formatMessage(level, message, data = null) {
        const timestamp = this.getFormattedTimestamp();
        let formattedMessage = `[${timestamp}] [${level}] ${message}`;
        
        if (data) {
            if (typeof data === 'object') {
                formattedMessage += `\n${JSON.stringify(data, null, 2)}`;
            } else {
                formattedMessage += ` | Data: ${data}`;
            }
        }
        
        return formattedMessage;
    }

    writeToFile(level, message, data = null) {
        try {
            const timestamp = this.getTimestamp();
            const date = timestamp.split('T')[0];
            const logFile = path.join(this.logDir, `bot-${date}.log`);
            
            const logEntry = this.formatMessage(level, message, data);
            const fullLogEntry = `${logEntry}\n`;
            
            fs.appendFileSync(logFile, fullLogEntry, 'utf8');
        } catch (error) {
            console.error('❌ Error writing to log file:', error);
        }
    }

    info(message, data = null) {
        const formattedMessage = this.formatMessage('INFO', message, data);
        console.log(`ℹ️  ${formattedMessage}`);
        this.writeToFile('INFO', message, data);
    }

    success(message, data = null) {
        const formattedMessage = this.formatMessage('SUCCESS', message, data);
        console.log(`✅ ${formattedMessage}`);
        this.writeToFile('SUCCESS', message, data);
    }

    warn(message, data = null) {
        const formattedMessage = this.formatMessage('WARN', message, data);
        console.log(`⚠️  ${formattedMessage}`);
        this.writeToFile('WARN', message, data);
    }

    error(message, data = null) {
        const formattedMessage = this.formatMessage('ERROR', message, data);
        console.log(`❌ ${formattedMessage}`);
        this.writeToFile('ERROR', message, data);
    }

    debug(message, data = null) {
        if (process.env.NODE_ENV === 'development') {
            const formattedMessage = this.formatMessage('DEBUG', message, data);
            console.log(`🐛 ${formattedMessage}`);
            this.writeToFile('DEBUG', message, data);
        }
    }

    trace(message, data = null) {
        if (process.env.NODE_ENV === 'development') {
            const formattedMessage = this.formatMessage('TRACE', message, data);
            console.log(`🔍 ${formattedMessage}`);
            this.writeToFile('TRACE', message, data);
        }
    }

    fatal(message, data = null) {
        const formattedMessage = this.formatMessage('FATAL', message, data);
        console.error(`💀 ${formattedMessage}`);
        this.writeToFile('FATAL', message, data);
    }

    silent(message, data = null) {
        // Silent logging - hanya write ke file, tidak console
        this.writeToFile('SILENT', message, data);
    }

    // Log khusus untuk transaksi
    transaction(type, driverName, amount, status, transactionId = null) {
        const message = `Transaksi ${type} - Driver: ${driverName}, Jumlah: Rp ${amount.toLocaleString('id-ID')}, Status: ${status}`;
        const data = {
            type,
            driverName,
            amount,
            status,
            transactionId,
            timestamp: this.getTimestamp()
        };
        
        this.info(message, data);
    }

    // Log khusus untuk WhatsApp
    whatsapp(event, data = null) {
        const message = `WhatsApp Event: ${event}`;
        this.info(message, data);
    }

    // Log khusus untuk Google Sheets
    sheets(action, data = null) {
        const message = `Google Sheets: ${action}`;
        this.info(message, data);
    }

    // Log khusus untuk validasi
    validation(type, result, data = null) {
        const message = `Validasi ${type}: ${result ? 'BERHASIL' : 'GAGAL'}`;
        this.info(message, data);
    }

    // Log khusus untuk rate limiting
    rateLimit(whatsappNumber, action) {
        const message = `Rate Limit - Nomor: ${whatsappNumber}, Action: ${action}`;
        this.warn(message);
    }

    // Log khusus untuk error sistem
    systemError(error, context = '') {
        const message = `System Error${context ? ` - ${context}` : ''}`;
        const errorData = {
            message: error.message,
            stack: error.stack,
            context,
            timestamp: this.getTimestamp()
        };
        
        this.error(message, errorData);
    }

    // Log khusus untuk performance
    performance(action, duration, data = null) {
        const message = `Performance - ${action}: ${duration}ms`;
        this.debug(message, data);
    }

    // Log khusus untuk security
    security(event, data = null) {
        const message = `Security Event: ${event}`;
        this.warn(message, data);
    }

    // Log khusus untuk admin actions
    adminAction(action, adminNumber, data = null) {
        const message = `Admin Action: ${action} by ${adminNumber}`;
        this.info(message, data);
    }

    // Log khusus untuk driver actions
    driverAction(action, driverNumber, data = null) {
        const message = `Driver Action: ${action} by ${driverNumber}`;
        this.info(message, data);
    }

    // Cleanup log files (hapus log lama)
    cleanupLogs(daysToKeep = 30) {
        try {
            const files = fs.readdirSync(this.logDir);
            const now = new Date();
            
            files.forEach(file => {
                if (file.startsWith('bot-') && file.endsWith('.log')) {
                    const filePath = path.join(this.logDir, file);
                    const stats = fs.statSync(filePath);
                    const daysOld = (now - stats.mtime) / (1000 * 60 * 60 * 24);
                    
                    if (daysOld > daysToKeep) {
                        fs.unlinkSync(filePath);
                        this.info(`Log file cleaned up: ${file}`);
                    }
                }
            });
        } catch (error) {
            this.error('Error cleaning up log files:', error);
        }
    }

    // Get log statistics
    getLogStats() {
        try {
            const files = fs.readdirSync(this.logDir);
            const stats = {
                totalFiles: files.length,
                totalSize: 0,
                oldestFile: null,
                newestFile: null
            };

            files.forEach(file => {
                if (file.startsWith('bot-') && file.endsWith('.log')) {
                    const filePath = path.join(this.logDir, file);
                    const fileStats = fs.statSync(filePath);
                    
                    stats.totalSize += fileStats.size;
                    
                    if (!stats.oldestFile || fileStats.mtime < stats.oldestFile.mtime) {
                        stats.oldestFile = { name: file, mtime: fileStats.mtime };
                    }
                    
                    if (!stats.newestFile || fileStats.mtime > stats.newestFile.mtime) {
                        stats.newestFile = { name: file, mtime: fileStats.mtime };
                    }
                }
            });

            return stats;
        } catch (error) {
            this.error('Error getting log stats:', error);
            return null;
        }
    }
}

module.exports = Logger;
