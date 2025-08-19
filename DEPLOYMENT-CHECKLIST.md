# 🚀 **DEPLOYMENT CHECKLIST - VPS**

## 📋 **File yang Sudah Dihapus (Tidak Diperlukan):**
- ✅ `test-*.js` - Semua file test
- ✅ `services/whatsapp-fixed.js` - Service WhatsApp yang tidak digunakan
- ✅ `services/whatsapp-simple.js` - Service WhatsApp yang tidak digunakan  
- ✅ `services/sheets.js` - Mock Google Sheets service
- ✅ `setup.js` - Setup script development

## 📁 **File yang Diperlukan untuk Production:**
- ✅ `index.js` - Main bot application
- ✅ `services/whatsapp.js` - WhatsApp service (Baileys)
- ✅ `services/sheets-real.js` - Real Google Sheets API service
- ✅ `services/midtransPayment.js` - Midtrans payment service
- ✅ `handlers/` - Message dan Topup handlers
- ✅ `utils/` - Logger dan helper functions
- ✅ `config/` - Database configuration
- ✅ `ecosystem.config.js` - PM2 configuration
- ✅ `deploy.sh` - Deployment script
- ✅ `package.json` - Dependencies
- ✅ `env.production` - Production environment template
- ✅ `README-PRODUCTION.md` - Production guide

## 🚀 **Langkah Deployment di VPS:**

### **1. Upload Project:**
```bash
# Upload semua file ke VPS (kecuali node_modules)
scp -r ./* user@your-vps:/path/to/project/
```

### **2. Setup Environment:**
```bash
# Copy production env
cp env.production .env

# Edit .env dengan nilai real
nano .env
```

### **3. Install Dependencies:**
```bash
# Install semua dependencies
npm install

# Install PM2 globally
sudo npm install -g pm2
```

### **4. Setup Google Sheets:**
- Download `credentials.json` dari Google Cloud Console
- Upload ke folder root project
- Share Google Sheet dengan service account

### **5. Deploy dengan PM2:**
```bash
# Make deploy script executable
chmod +x deploy.sh

# Run deployment
./deploy.sh
```

## 🔍 **Verifikasi Deployment:**
```bash
# Check PM2 status
pm2 status

# Check logs
pm2 logs top-up-bot

# Check health endpoint
curl http://localhost:3000/health
```

## 📊 **File Structure Final:**
```
whatsapp-bot/
├── index.js                 # Main application
├── package.json            # Dependencies
├── ecosystem.config.js     # PM2 config
├── deploy.sh              # Deployment script
├── env.production         # Environment template
├── .gitignore            # Git ignore rules
├── README-PRODUCTION.md   # Production guide
├── setup-google-sheets.md # Google Sheets setup
├── DEPLOYMENT-CHECKLIST.md # This file
├── services/
│   ├── whatsapp.js        # WhatsApp service
│   ├── sheets-real.js     # Real Google Sheets
│   └── midtransPayment.js # Midtrans payment
├── handlers/
│   ├── messageHandler.js   # Message handler
│   └── topupHandler.js     # Topup handler
├── utils/
│   ├── logger.js          # Logger utility
│   └── helpers.js         # Helper functions
└── config/
    └── database.js        # Database config
```

## ✅ **Status: READY FOR VPS DEPLOYMENT!**

**Bot sudah siap untuk deployment ke VPS dengan PM2! 🎉**
