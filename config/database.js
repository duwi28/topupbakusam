const fs = require('fs');
const path = require('path');
const Logger = require('../utils/logger');

class DatabaseConfig {
    constructor() {
        this.logger = new Logger();
        this.dataDir = './data';
        this.ensureDataDirectory();
    }

    ensureDataDirectory() {
        if (!fs.existsSync(this.dataDir)) {
            fs.mkdirSync(this.dataDir, { recursive: true });
        }
    }

    /**
     * Simpan data ke file JSON
     */
    async saveData(filename, data) {
        try {
            const filePath = path.join(this.dataDir, `${filename}.json`);
            const jsonData = JSON.stringify(data, null, 2);
            
            await fs.promises.writeFile(filePath, jsonData, 'utf8');
            this.logger.debug(`Data berhasil disimpan ke ${filename}.json`);
            
            return true;
        } catch (error) {
            this.logger.error(`Error menyimpan data ke ${filename}:`, error);
            return false;
        }
    }

    /**
     * Baca data dari file JSON
     */
    async loadData(filename) {
        try {
            const filePath = path.join(this.dataDir, `${filename}.json`);
            
            if (!fs.existsSync(filePath)) {
                return null;
            }
            
            const data = await fs.promises.readFile(filePath, 'utf8');
            const parsedData = JSON.parse(data);
            
            this.logger.debug(`Data berhasil dibaca dari ${filename}.json`);
            return parsedData;
            
        } catch (error) {
            this.logger.error(`Error membaca data dari ${filename}:`, error);
            return null;
        }
    }

    /**
     * Tambah data baru ke file JSON
     */
    async appendData(filename, newData) {
        try {
            const existingData = await this.loadData(filename) || [];
            
            if (Array.isArray(existingData)) {
                existingData.push({
                    ...newData,
                    id: this.generateId(),
                    timestamp: new Date().toISOString()
                });
            } else {
                existingData[Date.now()] = {
                    ...newData,
                    timestamp: new Date().toISOString()
                };
            }
            
            await this.saveData(filename, existingData);
            return true;
            
        } catch (error) {
            this.logger.error(`Error append data ke ${filename}:`, error);
            return false;
        }
    }

    /**
     * Update data existing di file JSON
     */
    async updateData(filename, id, updatedData) {
        try {
            const existingData = await this.loadData(filename) || [];
            
            if (Array.isArray(existingData)) {
                const index = existingData.findIndex(item => item.id === id);
                if (index !== -1) {
                    existingData[index] = {
                        ...existingData[index],
                        ...updatedData,
                        updatedAt: new Date().toISOString()
                    };
                }
            } else {
                if (existingData[id]) {
                    existingData[id] = {
                        ...existingData[id],
                        ...updatedData,
                        updatedAt: new Date().toISOString()
                    };
                }
            }
            
            await this.saveData(filename, existingData);
            return true;
            
        } catch (error) {
            this.logger.error(`Error update data di ${filename}:`, error);
            return false;
        }
    }

    /**
     * Hapus data dari file JSON
     */
    async deleteData(filename, id) {
        try {
            const existingData = await this.loadData(filename) || [];
            
            if (Array.isArray(existingData)) {
                const filteredData = existingData.filter(item => item.id !== id);
                await this.saveData(filename, filteredData);
            } else {
                if (existingData[id]) {
                    delete existingData[id];
                    await this.saveData(filename, existingData);
                }
            }
            
            return true;
            
        } catch (error) {
            this.logger.error(`Error hapus data dari ${filename}:`, error);
            return false;
        }
    }

    /**
     * Cari data berdasarkan kriteria
     */
    async findData(filename, criteria) {
        try {
            const data = await this.loadData(filename);
            if (!data) return [];
            
            if (Array.isArray(data)) {
                return data.filter(item => {
                    return Object.keys(criteria).every(key => {
                        if (typeof criteria[key] === 'string') {
                            return item[key] && item[key].toLowerCase().includes(criteria[key].toLowerCase());
                        }
                        return item[key] === criteria[key];
                    });
                });
            }
            
            return [];
            
        } catch (error) {
            this.logger.error(`Error mencari data di ${filename}:`, error);
            return [];
        }
    }

    /**
     * Generate ID unik
     */
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    /**
     * Backup data
     */
    async backupData(filename) {
        try {
            const data = await this.loadData(filename);
            if (!data) return false;
            
            const backupDir = path.join(this.dataDir, 'backup');
            if (!fs.existsSync(backupDir)) {
                fs.mkdirSync(backupDir, { recursive: true });
            }
            
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupPath = path.join(backupDir, `${filename}_${timestamp}.json`);
            
            await fs.promises.writeFile(backupPath, JSON.stringify(data, null, 2), 'utf8');
            this.logger.info(`Backup berhasil dibuat: ${backupPath}`);
            
            return true;
            
        } catch (error) {
            this.logger.error(`Error backup data ${filename}:`, error);
            return false;
        }
    }

    /**
     * Restore data dari backup
     */
    async restoreData(filename, backupFile) {
        try {
            const backupPath = path.join(this.dataDir, 'backup', backupFile);
            
            if (!fs.existsSync(backupPath)) {
                throw new Error('File backup tidak ditemukan');
            }
            
            const backupData = await fs.promises.readFile(backupPath, 'utf8');
            const parsedData = JSON.parse(backupData);
            
            await this.saveData(filename, parsedData);
            this.logger.info(`Data berhasil di-restore dari ${backupFile}`);
            
            return true;
            
        } catch (error) {
            this.logger.error(`Error restore data ${filename}:`, error);
            return false;
        }
    }

    /**
     * List semua file data
     */
    listDataFiles() {
        try {
            const files = fs.readdirSync(this.dataDir);
            return files.filter(file => file.endsWith('.json'));
        } catch (error) {
            this.logger.error('Error list data files:', error);
            return [];
        }
    }

    /**
     * Get data statistics
     */
    async getDataStats(filename) {
        try {
            const data = await this.loadData(filename);
            if (!data) return null;
            
            if (Array.isArray(data)) {
                return {
                    totalRecords: data.length,
                    lastUpdated: data.length > 0 ? data[data.length - 1].timestamp : null,
                    fileSize: this.getFileSize(filename)
                };
            } else {
                const keys = Object.keys(data);
                return {
                    totalRecords: keys.length,
                    lastUpdated: keys.length > 0 ? data[keys[keys.length - 1]].timestamp : null,
                    fileSize: this.getFileSize(filename)
                };
            }
            
        } catch (error) {
            this.logger.error(`Error get stats untuk ${filename}:`, error);
            return null;
        }
    }

    /**
     * Get file size
     */
    getFileSize(filename) {
        try {
            const filePath = path.join(this.dataDir, `${filename}.json`);
            if (fs.existsSync(filePath)) {
                const stats = fs.statSync(filePath);
                return stats.size;
            }
            return 0;
        } catch (error) {
            return 0;
        }
    }

    /**
     * Cleanup data lama
     */
    async cleanupOldData(filename, daysToKeep = 30) {
        try {
            const data = await this.loadData(filename);
            if (!data || !Array.isArray(data)) return false;
            
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
            
            const filteredData = data.filter(item => {
                const itemDate = new Date(item.timestamp);
                return itemDate > cutoffDate;
            });
            
            await this.saveData(filename, filteredData);
            this.logger.info(`Data lama berhasil dibersihkan dari ${filename}`);
            
            return true;
            
        } catch (error) {
            this.logger.error(`Error cleanup data lama dari ${filename}:`, error);
            return false;
        }
    }
}

module.exports = DatabaseConfig;
