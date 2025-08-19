const crypto = require('crypto');

class Helpers {
    /**
     * Format angka ke format mata uang Indonesia
     */
    static formatCurrency(amount) {
        if (typeof amount !== 'number') {
            amount = parseFloat(amount) || 0;
        }
        
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    }

    /**
     * Format tanggal ke format Indonesia
     */
    static formatDate(date, includeTime = true) {
        if (!date) {
            date = new Date();
        }
        
        if (typeof date === 'string') {
            date = new Date(date);
        }

        const options = {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        };

        if (includeTime) {
            options.hour = '2-digit';
            options.minute = '2-digit';
        }

        return date.toLocaleDateString('id-ID', options);
    }

    /**
     * Generate ID transaksi unik
     */
    static generateTransactionId(prefix = 'TXN') {
        const timestamp = Date.now().toString();
        const random = Math.random().toString(36).substr(2, 6);
        return `${prefix}${timestamp}${random}`.toUpperCase();
    }

    /**
     * Normalisasi nomor WhatsApp
     */
    static normalizeWhatsAppNumber(number) {
        if (!number) return '';
        
        // Hapus semua karakter non-digit
        let normalized = number.toString().replace(/\D/g, '');
        
        // Pastikan format 62xxx
        if (normalized.startsWith('0')) {
            normalized = '62' + normalized.substring(1);
        }
        
        return normalized;
    }

    /**
     * Validasi format nomor WhatsApp Indonesia
     */
    static isValidWhatsAppFormat(number) {
        const normalized = this.normalizeWhatsAppNumber(number);
        const indonesiaPattern = /^62\d{9,12}$/;
        return indonesiaPattern.test(normalized);
    }

    /**
     * Validasi jumlah top up
     */
    static validateTopupAmount(amount) {
        const numAmount = parseFloat(amount);
        
        if (isNaN(numAmount) || numAmount <= 0) {
            return {
                isValid: false,
                message: 'Jumlah top up harus berupa angka positif'
            };
        }

        if (numAmount < 10000) {
            return {
                isValid: false,
                message: 'Minimal top up Rp 10.000'
            };
        }

        if (numAmount > 1000000) {
            return {
                isValid: false,
                message: 'Maksimal top up Rp 1.000.000'
            };
        }

        return {
            isValid: true,
            amount: numAmount
        };
    }

    /**
     * Generate hash untuk keamanan
     */
    static generateHash(data, algorithm = 'sha256') {
        return crypto.createHash(algorithm).update(data).digest('hex');
    }

    /**
     * Generate random string
     */
    static generateRandomString(length = 8) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        
        return result;
    }

    /**
     * Delay execution
     */
    static delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Retry function dengan exponential backoff
     */
    static async retry(fn, maxRetries = 3, delay = 1000) {
        let lastError;
        
        for (let i = 0; i < maxRetries; i++) {
            try {
                return await fn();
            } catch (error) {
                lastError = error;
                
                if (i < maxRetries - 1) {
                    await this.delay(delay * Math.pow(2, i));
                }
            }
        }
        
        throw lastError;
    }

    /**
     * Parse command dari pesan
     */
    static parseCommand(message) {
        const trimmed = message.trim().toUpperCase();
        const parts = trimmed.split(' ');
        
        if (parts.length === 0) {
            return null;
        }

        const command = parts[0];
        const args = parts.slice(1);

        return {
            command,
            args,
            original: message.trim()
        };
    }

    /**
     * Sanitasi input untuk mencegah XSS
     */
    static sanitizeInput(input) {
        if (!input) return '';
        
        return input
            .replace(/[<>]/g, '') // Hapus < dan >
            .replace(/javascript:/gi, '') // Hapus javascript:
            .replace(/on\w+=/gi, '') // Hapus event handlers
            .trim();
    }

    /**
     * Validasi email
     */
    static isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    /**
     * Validasi nomor telepon Indonesia
     */
    static isValidPhoneNumber(phoneNumber) {
        const patterns = [
            /^(\+62|62|0)8[1-9][0-9]{6,9}$/, // Format umum Indonesia
            /^(\+62|62|0)2[1-9][0-9]{6,8}$/  // Format area code
        ];

        return patterns.some(pattern => pattern.test(phoneNumber));
    }

    /**
     * Format ukuran file
     */
    static formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Check apakah string adalah angka
     */
    static isNumeric(str) {
        if (typeof str !== 'string') return false;
        return !isNaN(str) && !isNaN(parseFloat(str));
    }

    /**
     * Check apakah string adalah integer
     */
    static isInteger(str) {
        if (typeof str !== 'string') return false;
        return Number.isInteger(Number(str));
    }

    /**
     * Truncate string dengan ellipsis
     */
    static truncateString(str, maxLength = 50) {
        if (str.length <= maxLength) return str;
        return str.substring(0, maxLength) + '...';
    }

    /**
     * Capitalize first letter
     */
    static capitalizeFirst(str) {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    }

    /**
     * Generate slug dari string
     */
    static generateSlug(str) {
        return str
            .toLowerCase()
            .replace(/[^a-z0-9 -]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim('-');
    }

    /**
     * Check apakah hari ini adalah hari kerja
     */
    static isWorkDay(date = new Date()) {
        const day = date.getDay();
        return day >= 1 && day <= 5; // Senin - Jumat
    }

    /**
     * Check apakah waktu sekarang adalah jam kerja
     */
    static isWorkHour(date = new Date()) {
        const hour = date.getHours();
        return hour >= 8 && hour <= 17; // 08:00 - 17:00
    }

    /**
     * Get time difference dalam format yang mudah dibaca
     */
    static getTimeDifference(date1, date2 = new Date()) {
        const diff = Math.abs(date2 - date1);
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) {
            return `${days} hari yang lalu`;
        } else if (hours > 0) {
            return `${hours} jam yang lalu`;
        } else if (minutes > 0) {
            return `${minutes} menit yang lalu`;
        } else {
            return 'Baru saja';
        }
    }

    /**
     * Validate Indonesian ID number format
     */
    static isValidIndonesianID(idNumber) {
        // Format: 16 digit
        if (!/^\d{16}$/.test(idNumber)) {
            return false;
        }

        // Check province code (first 2 digits)
        const provinceCode = parseInt(idNumber.substring(0, 2));
        if (provinceCode < 11 || provinceCode > 94) {
            return false;
        }

        // Check city code (digits 3-4)
        const cityCode = parseInt(idNumber.substring(2, 4));
        if (cityCode < 1 || cityCode > 99) {
            return false;
        }

        return true;
    }

    /**
     * Generate Indonesian ID number (untuk testing)
     */
    static generateIndonesianID() {
        const provinceCode = Math.floor(Math.random() * (94 - 11 + 1)) + 11;
        const cityCode = Math.floor(Math.random() * 99) + 1;
        const birthDate = Math.floor(Math.random() * 999999);
        const gender = Math.floor(Math.random() * 999);
        const sequence = Math.floor(Math.random() * 9999);
        
        return `${provinceCode.toString().padStart(2, '0')}${cityCode.toString().padStart(2, '0')}${birthDate.toString().padStart(6, '0')}${gender.toString().padStart(3, '0')}${sequence.toString().padStart(4, '0')}`;
    }
}

module.exports = Helpers;
