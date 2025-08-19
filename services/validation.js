const logger = require('../utils/logger');

class ValidationService {
    constructor() {
        console.log('✅ Validation Service initialized');
    }

    // Validate WhatsApp number format
    validateWhatsAppNumber(phone) {
        try {
            if (!phone) {
                return {
                    isValid: false,
                    message: 'Nomor WhatsApp tidak boleh kosong'
                };
            }

            // Remove all non-digit characters
            let normalized = phone.replace(/\D/g, '');
            
            // Check if it's a valid Indonesian mobile number
            if (normalized.length < 10 || normalized.length > 15) {
                return {
                    isValid: false,
                    message: 'Panjang nomor WhatsApp tidak valid (10-15 digit)'
                };
            }

            // Check if it starts with valid Indonesian mobile prefix
            const validPrefixes = ['62', '08', '628'];
            const hasValidPrefix = validPrefixes.some(prefix => 
                normalized.startsWith(prefix)
            );

            if (!hasValidPrefix) {
                return {
                    isValid: false,
                    message: 'Format nomor WhatsApp tidak valid. Gunakan format: 628xxx atau 08xxx'
                };
            }

            // Normalize to 62xxx format
            if (normalized.startsWith('0')) {
                normalized = '62' + normalized.substring(1);
            } else if (normalized.startsWith('628')) {
                normalized = '62' + normalized.substring(3);
            }

            return {
                isValid: true,
                normalizedPhone: normalized,
                message: 'Nomor WhatsApp valid'
            };

        } catch (error) {
            logger.error('❌ Error validating WhatsApp number:', error);
            return {
                isValid: false,
                message: 'Terjadi kesalahan validasi nomor'
            };
        }
    }

    // Validate top-up amount
    validateTopupAmount(amount) {
        try {
            if (!amount || isNaN(amount)) {
                return {
                    isValid: false,
                    message: 'Jumlah top-up harus berupa angka'
                };
            }

            const numAmount = parseInt(amount);
            
            if (numAmount < 1000) {
                return {
                    isValid: false,
                    message: 'Jumlah top-up minimal Rp 1.000'
                };
            }

            if (numAmount > 10000000) {
                return {
                    isValid: false,
                    message: 'Jumlah top-up maksimal Rp 10.000.000'
                };
            }

            // Check if amount is in valid increments (optional)
            if (numAmount % 1000 !== 0) {
                return {
                    isValid: false,
                    message: 'Jumlah top-up harus kelipatan Rp 1.000'
                };
            }

            return {
                isValid: true,
                amount: numAmount,
                message: 'Jumlah top-up valid'
            };

        } catch (error) {
            logger.error('❌ Error validating topup amount:', error);
            return {
                isValid: false,
                message: 'Terjadi kesalahan validasi jumlah'
            };
        }
    }

    // Validate email format
    validateEmail(email) {
        try {
            if (!email) {
                return {
                    isValid: true, // Email is optional
                    message: 'Email tidak diisi'
                };
            }

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            
            if (!emailRegex.test(email)) {
                return {
                    isValid: false,
                    message: 'Format email tidak valid'
                };
            }

            return {
                isValid: true,
                message: 'Email valid'
            };

        } catch (error) {
            logger.error('❌ Error validating email:', error);
            return {
                isValid: false,
                message: 'Terjadi kesalahan validasi email'
            };
        }
    }

    // Validate driver name
    validateDriverName(name) {
        try {
            if (!name || typeof name !== 'string') {
                return {
                    isValid: false,
                    message: 'Nama driver tidak boleh kosong'
                };
            }

            const trimmedName = name.trim();
            
            if (trimmedName.length < 2) {
                return {
                    isValid: false,
                    message: 'Nama driver minimal 2 karakter'
                };
            }

            if (trimmedName.length > 100) {
                return {
                    isValid: false,
                    message: 'Nama driver maksimal 100 karakter'
                };
            }

            // Check for valid characters (letters, spaces, dots, hyphens)
            const nameRegex = /^[a-zA-Z\s\.\-']+$/;
            
            if (!nameRegex.test(trimmedName)) {
                return {
                    isValid: false,
                    message: 'Nama driver hanya boleh berisi huruf, spasi, titik, dan tanda hubung'
                };
            }

            return {
                isValid: true,
                normalizedName: trimmedName,
                message: 'Nama driver valid'
            };

        } catch (error) {
            logger.error('❌ Error validating driver name:', error);
            return {
                isValid: false,
                message: 'Terjadi kesalahan validasi nama'
            };
        }
    }

    // Validate vehicle information
    validateVehicleInfo(vehicle) {
        try {
            if (!vehicle) {
                return {
                    isValid: true, // Vehicle is optional
                    message: 'Informasi kendaraan tidak diisi'
                };
            }

            const trimmedVehicle = vehicle.trim();
            
            if (trimmedVehicle.length > 200) {
                return {
                    isValid: false,
                    message: 'Informasi kendaraan maksimal 200 karakter'
                };
            }

            return {
                isValid: true,
                normalizedVehicle: trimmedVehicle,
                message: 'Informasi kendaraan valid'
            };

        } catch (error) {
            logger.error('❌ Error validating vehicle info:', error);
            return {
                isValid: false,
                message: 'Terjadi kesalahan validasi kendaraan'
            };
        }
    }

    // Validate license plate
    validateLicensePlate(plate) {
        try {
            if (!plate) {
                return {
                    isValid: true, // License plate is optional
                    message: 'Plat nomor tidak diisi'
                };
            }

            const trimmedPlate = plate.trim().toUpperCase();
            
            // Basic Indonesian license plate format: B 1234 ABC
            const plateRegex = /^[A-Z]\s?\d{1,4}\s?[A-Z]{1,3}$/;
            
            if (!plateRegex.test(trimmedPlate)) {
                return {
                    isValid: false,
                    message: 'Format plat nomor tidak valid. Contoh: B 1234 ABC'
                };
            }

            return {
                isValid: true,
                normalizedPlate: trimmedPlate,
                message: 'Plat nomor valid'
            };

        } catch (error) {
            logger.error('❌ Error validating license plate:', error);
            return {
                isValid: false,
                message: 'Terjadi kesalahan validasi plat nomor'
            };
        }
    }

    // Validate message format
    validateMessageFormat(message) {
        try {
            if (!message || typeof message !== 'string') {
                return {
                    isValid: false,
                    message: 'Pesan tidak boleh kosong'
                };
            }

            const trimmedMessage = message.trim();
            
            if (trimmedMessage.length < 1) {
                return {
                    isValid: false,
                    message: 'Pesan terlalu pendek'
                };
            }

            if (trimmedMessage.length > 1000) {
                return {
                    isValid: false,
                    message: 'Pesan terlalu panjang (maksimal 1000 karakter)'
                };
            }

            return {
                isValid: true,
                normalizedMessage: trimmedMessage,
                message: 'Format pesan valid'
            };

        } catch (error) {
            logger.error('❌ Error validating message format:', error);
            return {
                isValid: false,
                message: 'Terjadi kesalahan validasi pesan'
            };
        }
    }

    // Validate order ID format
    validateOrderId(orderId) {
        try {
            if (!orderId || typeof orderId !== 'string') {
                return {
                    isValid: false,
                    message: 'Order ID tidak boleh kosong'
                };
            }

            const trimmedOrderId = orderId.trim();
            
            // Check if it follows the expected format: TOPUP_<phone>_<timestamp>_<uuid>
            const orderIdRegex = /^TOPUP_\d+_\d+_[a-zA-Z0-9]+$/;
            
            if (!orderIdRegex.test(trimmedOrderId)) {
                return {
                    isValid: false,
                    message: 'Format Order ID tidak valid'
                };
            }

            return {
                isValid: true,
                normalizedOrderId: trimmedOrderId,
                message: 'Order ID valid'
            };

        } catch (error) {
            logger.error('❌ Error validating order ID:', error);
            return {
                isValid: false,
                message: 'Terjadi kesalahan validasi Order ID'
            };
        }
    }

    // Validate payment method
    validatePaymentMethod(method) {
        try {
            if (!method) {
                return {
                    isValid: false,
                    message: 'Metode pembayaran tidak boleh kosong'
                };
            }

            const validMethods = ['qris', 'bank_transfer', 'e_wallet', 'credit_card'];
            const normalizedMethod = method.toLowerCase();
            
            if (!validMethods.includes(normalizedMethod)) {
                return {
                    isValid: false,
                    message: `Metode pembayaran tidak valid. Pilihan: ${validMethods.join(', ')}`
                };
            }

            return {
                isValid: true,
                normalizedMethod: normalizedMethod,
                message: 'Metode pembayaran valid'
            };

        } catch (error) {
            logger.error('❌ Error validating payment method:', error);
            return {
                isValid: false,
                message: 'Terjadi kesalahan validasi metode pembayaran'
            };
        }
    }

    // Comprehensive validation for driver data
    validateDriverData(driverData) {
        try {
            const errors = [];
            const warnings = [];

            // Required fields validation
            const nameValidation = this.validateDriverName(driverData.name);
            if (!nameValidation.isValid) {
                errors.push(`Nama: ${nameValidation.message}`);
            }

            const phoneValidation = this.validateWhatsAppNumber(driverData.phone);
            if (!phoneValidation.isValid) {
                errors.push(`WhatsApp: ${phoneValidation.message}`);
            }

            // Optional fields validation
            if (driverData.email) {
                const emailValidation = this.validateEmail(driverData.email);
                if (!emailValidation.isValid) {
                    warnings.push(`Email: ${emailValidation.message}`);
                }
            }

            if (driverData.vehicle) {
                const vehicleValidation = this.validateVehicleInfo(driverData.vehicle);
                if (!vehicleValidation.isValid) {
                    warnings.push(`Kendaraan: ${vehicleValidation.message}`);
                }
            }

            if (driverData.plate) {
                const plateValidation = this.validateLicensePlate(driverData.plate);
                if (!plateValidation.isValid) {
                    warnings.push(`Plat: ${plateValidation.message}`);
                }
            }

            return {
                isValid: errors.length === 0,
                errors: errors,
                warnings: warnings,
                message: errors.length === 0 ? 'Data driver valid' : 'Data driver tidak valid'
            };

        } catch (error) {
            logger.error('❌ Error validating driver data:', error);
            return {
                isValid: false,
                errors: ['Terjadi kesalahan validasi data'],
                warnings: [],
                message: 'Terjadi kesalahan validasi data driver'
            };
        }
    }

    // Utility method to get validation summary
    getValidationSummary(validationResults) {
        const total = validationResults.length;
        const valid = validationResults.filter(r => r.isValid).length;
        const invalid = total - valid;

        return {
            total: total,
            valid: valid,
            invalid: invalid,
            successRate: total > 0 ? (valid / total) * 100 : 0
        };
    }
}

module.exports = ValidationService;
