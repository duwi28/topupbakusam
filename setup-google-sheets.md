# 🚀 Setup Google Sheets Real API untuk WhatsApp Bot

## 📋 **Langkah-langkah Setup:**

### **1. Buat Google Cloud Project:**
1. Buka [Google Cloud Console](https://console.cloud.google.com/)
2. Buat project baru atau pilih yang sudah ada
3. Enable Google Sheets API

### **2. Buat Service Account:**
1. Buka "IAM & Admin" > "Service Accounts"
2. Klik "Create Service Account"
3. Beri nama: `whatsapp-bot-sheets`
4. Klik "Create and Continue"

### **3. Download Credentials:**
1. Klik service account yang baru dibuat
2. Tab "Keys" > "Add Key" > "Create new key"
3. Pilih "JSON"
4. Download file `credentials.json`
5. Simpan di folder root project

### **4. Share Google Sheet:**
1. Buka Google Sheet "Test Data Driver"
2. Klik "Share" (kanan atas)
3. Tambahkan email service account: `whatsapp-bot-sheets@project-id.iam.gserviceaccount.com`
4. Beri permission "Editor"

### **5. Update Environment Variables:**
```bash
GOOGLE_SHEETS_CREDENTIALS_PATH=./credentials.json
GOOGLE_SHEETS_SPREADSHEET_ID=1CR2cZSWzSLt4tHC83boz5dBAVZbYMyhYAXYWGuxejA0
GOOGLE_SHEETS_RANGE=Test Data Driver!A:M
```

## ✅ **Setelah setup selesai, bot akan menggunakan real Google Sheets API!**
