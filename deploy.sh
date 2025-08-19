#!/bin/bash

# 🚀 WhatsApp Bot Deployment Script untuk VPS
# Author: AI Assistant
# Date: $(date)

echo "🚀 Starting WhatsApp Bot Deployment..."

# 1. Install dependencies
echo "📦 Installing dependencies..."
npm install

# 2. Create logs directory
echo "📁 Creating logs directory..."
mkdir -p logs

# 3. Install PM2 globally if not exists
if ! command -v pm2 &> /dev/null; then
    echo "📦 Installing PM2 globally..."
    npm install -g pm2
else
    echo "✅ PM2 already installed"
fi

# 4. Stop existing PM2 process if running
echo "🛑 Stopping existing PM2 processes..."
pm2 stop top-up-bot 2>/dev/null || true
pm2 delete top-up-bot 2>/dev/null || true

# 5. Start with PM2
echo "🚀 Starting WhatsApp Bot with PM2..."
pm2 start ecosystem.config.js --env production

# 6. Save PM2 configuration
echo "💾 Saving PM2 configuration..."
pm2 save

# 7. Setup PM2 startup script
echo "🔧 Setting up PM2 startup script..."
pm2 startup

# 8. Show status
echo "📊 PM2 Status:"
pm2 status

echo "🎉 Deployment completed successfully!"
echo "📱 Top-Up Bot is now running with PM2"
echo "🔍 Check logs with: pm2 logs top-up-bot"
echo "📊 Monitor with: pm2 monit"
