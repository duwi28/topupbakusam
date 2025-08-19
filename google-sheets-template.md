# Template Google Sheets untuk Bot Top Up Driver

## Sheet 1: Data Drivers
Buat sheet dengan nama "Data Drivers" dengan struktur kolom berikut:

| A | B | C | D | E | F |
|---|---|---|---|---|---|
| Nomor WhatsApp | Nama Driver | Saldo Saat Ini | Status | Tanggal Registrasi | Catatan |
| 6281234567890 | John Doe | 0 | Active | 2024-01-01 | Driver baru |
| 6289876543210 | Jane Smith | 50000 | Active | 2024-01-02 | Driver senior |

### Format Data:
- **Kolom A**: Nomor WhatsApp (format: 6281234567890)
- **Kolom B**: Nama Driver (text)
- **Kolom C**: Saldo Saat Ini (number)
- **Kolom D**: Status (Active/Inactive)
- **Kolom E**: Tanggal Registrasi (date)
- **Kolom F**: Catatan (text)

## Sheet 2: Transactions (Opsional)
Buat sheet dengan nama "Transactions" untuk log transaksi:

| A | B | C | D | E | F | G |
|---|---|---|---|---|---|---|
| Timestamp | Transaction ID | WhatsApp | Driver Name | Type | Amount | New Balance |
| 2024-01-01 10:00:00 | TXN123456 | 6281234567890 | John Doe | TOPUP | 50000 | 50000 |

## Cara Setup:
1. Buat Google Sheets baru
2. Copy struktur di atas
3. Share dengan service account email
4. Copy Spreadsheet ID ke file .env
5. Pastikan Google Sheets API aktif di Google Cloud Console

## Tips:
- Gunakan data validation untuk kolom Status (dropdown: Active/Inactive)
- Format kolom Saldo sebagai Currency (IDR)
- Gunakan conditional formatting untuk highlight saldo rendah
- Backup data secara berkala
