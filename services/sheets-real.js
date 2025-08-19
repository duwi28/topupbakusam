const { GoogleSpreadsheet } = require('google-spreadsheet');
const Logger = require('../utils/logger');

class GoogleSheetsRealService {
    constructor() {
        this.isConnected = false;
        this.doc = null;
        this.sheet = null;
        this.spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
        this.credentialsPath = process.env.GOOGLE_SHEETS_CREDENTIALS_PATH;
        this.range = process.env.GOOGLE_SHEETS_RANGE || 'Test Data Driver!A:M';
        this.logger = new Logger();
        
        console.log('📊 Google Sheets Real Service initialized');
        console.log('🔍 Environment Variables Debug:');
        console.log('  GOOGLE_SHEETS_SPREADSHEET_ID:', this.spreadsheetId ? '✅ Set' : '❌ Not Set');
        console.log('  GOOGLE_SHEETS_CREDENTIALS_PATH:', this.credentialsPath ? '✅ Set' : '❌ Not Set');
        console.log('  GOOGLE_SHEETS_RANGE:', this.range);
    }

    getStatus() {
        return {
            connected: this.isConnected,
            spreadsheetId: this.spreadsheetId || 'Not Set',
            credentialsPath: this.credentialsPath || 'Not Set',
            range: this.range,
            mode: 'REAL_PRODUCTION'
        };
    }

    async connect() {
        try {
            if (!this.spreadsheetId || !this.credentialsPath) {
                throw new Error('Google Sheets credentials not configured');
            }

            this.logger.info('🔗 Connecting to Google Sheets...');
            
            // Load credentials
            const credentials = require(this.credentialsPath);
            
            // Initialize Google Sheets
            this.doc = new GoogleSpreadsheet(this.spreadsheetId);
            await this.doc.useServiceAccountAuth(credentials);
            await this.doc.loadInfo();
            
            // Get the specific sheet
            const sheetTitle = this.range.split('!')[0];
            this.sheet = this.doc.sheetsByTitle[sheetTitle];
            
            if (!this.sheet) {
                throw new Error(`Sheet "${sheetTitle}" not found`);
            }
            
            // Load sheet data
            await this.sheet.loadCells();
            
            this.isConnected = true;
            this.logger.success('✅ Google Sheets Real API connected successfully');
            this.logger.info(`📊 Sheet: ${this.sheet.title} (${this.sheet.rowCount} rows)`);
            
            return true;
        } catch (error) {
            this.logger.error('❌ Failed to connect to Google Sheets:', error);
            this.isConnected = false;
            return false;
        }
    }

    async getAllDrivers() {
        try {
            if (!this.isConnected) {
                await this.connect();
            }

            const drivers = [];
            const headers = this.getHeaders();
            
            // Read data from sheet (skip header row)
            for (let rowIndex = 1; rowIndex < this.sheet.rowCount; rowIndex++) {
                const driver = this.readDriverRow(rowIndex, headers);
                if (driver && driver.phone) {
                    drivers.push(driver);
                }
            }
            
            this.logger.info(`👥 Found ${drivers.length} drivers in sheet`);
            return drivers;
        } catch (error) {
            this.logger.error('❌ Error getting all drivers:', error);
            return [];
        }
    }

    async getDriverByPhone(phone) {
        try {
            if (!this.isConnected) {
                await this.connect();
            }

            const normalizedPhone = this.normalizePhoneNumber(phone);
            const headers = this.getHeaders();
            
            // Search through rows
            for (let rowIndex = 1; rowIndex < this.sheet.rowCount; rowIndex++) {
                const driver = this.readDriverRow(rowIndex, headers);
                if (driver && this.normalizePhoneNumber(driver.phone) === normalizedPhone) {
                    this.logger.info(`👤 Driver found: ${driver.name} (${driver.phone})`);
                    return driver;
                }
            }
            
            this.logger.warn(`⚠️ Driver not found for phone: ${phone}`);
            return null;
        } catch (error) {
            this.logger.error('❌ Error finding driver by phone:', error);
            return null;
        }
    }

    async updateDriverBalance(phone, newBalance, orderId = null) {
        try {
            if (!this.isConnected) {
                await this.connect();
            }

            const normalizedPhone = this.normalizePhoneNumber(phone);
            const headers = this.getHeaders();
            
            // Find driver row
            for (let rowIndex = 1; rowIndex < this.sheet.rowCount; rowIndex++) {
                const driver = this.readDriverRow(rowIndex, headers);
                if (driver && this.normalizePhoneNumber(driver.phone) === normalizedPhone) {
                    // Update balance cell
                    const balanceColIndex = headers.indexOf('balance');
                    if (balanceColIndex !== -1) {
                        const cell = this.sheet.getCell(rowIndex, balanceColIndex);
                        cell.value = newBalance;
                        
                        // Update last update timestamp
                        const lastUpdateColIndex = headers.indexOf('lastUpdate');
                        if (lastUpdateColIndex !== -1) {
                            const timestampCell = this.sheet.getCell(rowIndex, lastUpdateColIndex);
                            timestampCell.value = new Date().toLocaleString('id-ID');
                        }
                        
                        // Save changes
                        await this.sheet.saveUpdatedCells();
                        
                        this.logger.success(`✅ Balance updated for ${driver.name}: ${driver.balance} → ${newBalance}`);
                        return true;
                    }
                }
            }
            
            this.logger.warn(`⚠️ Driver not found for phone: ${phone}`);
            return false;
        } catch (error) {
            this.logger.error('❌ Error updating driver balance:', error);
            return false;
        }
    }

    getHeaders() {
        const headers = [];
        const headerRow = 0;
        
        // Read header row
        for (let colIndex = 0; colIndex < this.sheet.columnCount; colIndex++) {
            const cell = this.sheet.getCell(headerRow, colIndex);
            if (cell.value) {
                headers.push(cell.value.toString().toLowerCase());
            }
        }
        
        return headers;
    }

    readDriverRow(rowIndex, headers) {
        try {
            const driver = {};
            
            // Map columns based on headers
            for (let colIndex = 0; colIndex < headers.length; colIndex++) {
                const cell = this.sheet.getCell(rowIndex, colIndex);
                const header = headers[colIndex];
                
                if (cell.value !== null) {
                    switch (header) {
                        case 'id':
                            driver.id = parseInt(cell.value) || 0;
                            break;
                        case 'name':
                            driver.name = cell.value.toString();
                            break;
                        case 'status':
                            driver.status = cell.value.toString();
                            break;
                        case 'phone':
                            driver.phone = cell.value.toString();
                            break;
                        case 'balance':
                            driver.balance = parseInt(cell.value) || 0;
                            break;
                        case 'lastupdate':
                            driver.lastUpdate = cell.value.toString();
                            break;
                        case 'totalorderbulanini':
                            driver.totalOrderBulanIni = parseInt(cell.value) || 0;
                            break;
                        case 'totalkomisibulanini':
                            driver.totalKomisiBulanIni = parseInt(cell.value) || 0;
                            break;
                        case 'rating':
                            driver.rating = parseInt(cell.value) || 0;
                            break;
                        case 'statuspelanggaran':
                            driver.statusPelanggaran = cell.value.toString();
                            break;
                        case 'tanggaldaftar':
                            driver.tanggalDaftar = cell.value.toString();
                            break;
                        case 'jumlahordertotal':
                            driver.jumlahOrderTotal = parseInt(cell.value) || 0;
                            break;
                        case 'totalpendapatanbulanini':
                            driver.totalPendapatanBulanIni = parseInt(cell.value) || 0;
                            break;
                        default:
                            driver[header] = cell.value;
                    }
                }
            }
            
            return driver;
        } catch (error) {
            this.logger.error(`❌ Error reading row ${rowIndex}:`, error);
            return null;
        }
    }

    normalizePhoneNumber(phone) {
        if (!phone) return '';
        
        // Remove all non-digit characters
        let normalized = phone.toString().replace(/\D/g, '');
        
        // Remove leading zeros and country code if present
        if (normalized.startsWith('0')) {
            normalized = normalized.substring(1);
        }
        if (normalized.startsWith('62')) {
            normalized = normalized.substring(2);
        }
        
        return normalized;
    }

    async disconnect() {
        try {
            if (this.doc) {
                this.doc = null;
                this.sheet = null;
                this.isConnected = false;
                this.logger.info('✅ Google Sheets connection closed');
            }
        } catch (error) {
            this.logger.error('❌ Error disconnecting from Google Sheets:', error);
        }
    }
}

module.exports = GoogleSheetsRealService;
