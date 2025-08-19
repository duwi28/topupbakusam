# Bot WhatsApp Top Up Driver

Bot WhatsApp otomatis untuk sistem top up driver dengan integrasi Google Sheets dan validasi nomor WhatsApp.

## Fitur Utama

- ✅ **Validasi Nomor WhatsApp** - Hanya driver terdaftar yang bisa menggunakan bot
- ✅ **Integrasi Google Sheets** - Data driver tersimpan dan terupdate otomatis
- ✅ **Sistem Top Up** - Proses top up saldo driver secara otomatis
- ✅ **Notifikasi Real-time** - Update status transaksi ke admin dan driver
- ✅ **Riwayat Transaksi** - Pencatatan lengkap semua transaksi top up

## Struktur Google Sheets

Sheet "Drivers" harus memiliki kolom berikut:
- **A**: Nomor WhatsApp (format: 6281234567890)
- **B**: Nama Driver
- **C**: Saldo Saat Ini
- **D**: Status (Active/Inactive)
- **E**: Tanggal Registrasi
- **F**: Catatan

## Instalasi

1. **Clone repository**
   ```bash
   git clone <repository-url>
   cd whatsapp-topup-bot
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Setup Google Sheets API**
   - Buat project di Google Cloud Console
   - Aktifkan Google Sheets API
   - Download credentials.json dan simpan di root folder
   - Update SPREADSHEET_ID di config.env

4. **Konfigurasi Environment**
   ```bash
   cp config.env .env
   # Edit file .env sesuai konfigurasi Anda
   ```

5. **Jalankan Bot**
   ```bash
   npm start
   ```

## Penggunaan

### Driver
- Kirim pesan "TOPUP [jumlah]" untuk top up saldo
- Kirim "SALDO" untuk cek saldo
- Kirim "BANTUAN" untuk menu bantuan

### Admin
- Semua notifikasi top up akan dikirim ke nomor admin
- Admin bisa approve/reject transaksi via WhatsApp

## Struktur File

```
├── index.js              # File utama bot
├── services/
│   ├── whatsapp.js      # Service WhatsApp
│   ├── sheets.js        # Service Google Sheets
│   └── validation.js    # Validasi nomor WhatsApp
├── handlers/
│   ├── messageHandler.js # Handler pesan masuk
│   └── topupHandler.js  # Handler proses top up
├── utils/
│   ├── logger.js        # Sistem logging
│   └── helpers.js       # Helper functions
└── config/
    └── database.js      # Konfigurasi database
```

## Keamanan

- Validasi nomor WhatsApp sebelum proses top up
- Rate limiting untuk mencegah spam
- Logging semua aktivitas untuk audit trail
- Enkripsi data sensitif

## Troubleshooting

### QR Code tidak muncul
- Pastikan WhatsApp Web tidak sedang digunakan di browser lain
- Restart bot dan scan ulang QR code

### Google Sheets error
- Periksa credentials.json
- Pastikan spreadsheet ID benar
- Cek permission Google Sheets API

### Bot tidak merespon
- Periksa log error
- Pastikan session WhatsApp masih valid
- Restart bot jika diperlukan

## Support

Untuk bantuan teknis, hubungi tim development atau buat issue di repository.
