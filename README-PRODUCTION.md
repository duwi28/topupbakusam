# 🚀 WhatsApp Bot - Production Deployment Guide

## 📋 **Prerequisites:**

### **1. VPS Requirements:**
- **OS**: Ubuntu 20.04+ / CentOS 7+
- **RAM**: Minimum 2GB (Recommended: 4GB+)
- **Storage**: Minimum 20GB
- **Node.js**: Version 18+ (LTS)

### **2. Domain & SSL:**
- Domain name untuk webhook URLs
- SSL certificate (Let's Encrypt recommended)

## 🛠️ **Installation Steps:**

### **Step 1: Server Setup**
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 globally
sudo npm install -g pm2

# Verify installation
node --version
npm --version
pm2 --version
```

### **Step 2: Project Setup**
```bash
# Clone project
git clone <your-repo-url>
cd whatsapp-bot

# Install dependencies
npm install

# Create logs directory
mkdir -p logs
```

### **Step 3: Google Sheets Setup**
1. Follow guide in `setup-google-sheets.md`
2. Download `credentials.json` to project root
3. Share Google Sheet with service account

### **Step 4: Environment Configuration**
```bash
# Copy production env file
cp env.production .env

# Edit .env with your real values
nano .env
```

**Required Environment Variables:**
```bash
# Update these with your real values
MIDTRANS_FINISH_URL=https://your-domain.com/payment/finish
MIDTRANS_ERROR_URL=https://your-domain.com/webhook/midtrans/error
MIDTRANS_PENDING_URL=https://your-domain.com/webhook/midtrans/pending
```

### **Step 5: Deploy with PM2**
```bash
# Make deploy script executable
chmod +x deploy.sh

# Run deployment
./deploy.sh
```

## 📊 **PM2 Management Commands:**

```bash
# Check status
pm2 status

# View logs
pm2 logs top-up-bot

# Monitor processes
pm2 monit

# Restart bot
pm2 restart top-up-bot

# Stop bot
pm2 stop top-up-bot

# Start bot
pm2 start top-up-bot

# Delete from PM2
pm2 delete top-up-bot
```

## 🔧 **Troubleshooting:**

### **1. Check Logs:**
```bash
pm2 logs top-up-bot --lines 100
```

### **2. Check Environment:**
```bash
pm2 env top-up-bot
```

### **3. Restart Services:**
```bash
pm2 restart all
```

### **4. Check Port Usage:**
```bash
sudo netstat -tlnp | grep :3000
```

## 📱 **WhatsApp Bot Features:**

- ✅ **Real Google Sheets API** integration
- ✅ **Midtrans Payment Gateway** (Production)
- ✅ **WhatsApp Baileys** connection
- ✅ **Auto-reconnect** handling
- ✅ **PM2 Process Management**
- ✅ **Production Logging**

## 🚨 **Security Notes:**

1. **Never commit** `credentials.json` to git
2. **Use strong passwords** for VPS
3. **Setup firewall** (UFW recommended)
4. **Regular updates** for security patches
5. **Monitor logs** for suspicious activity

## 📞 **Support:**

- Check logs first: `pm2 logs top-up-bot`
- Verify environment variables
- Test Google Sheets connection
- Test Midtrans webhook endpoints

---

**🎉 Your WhatsApp Bot is now running in production with PM2!**
