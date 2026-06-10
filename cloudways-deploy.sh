#!/bin/bash
set -e

# ============================================================
# Cloudways deployment script
# Run this on your Cloudways server via SSH after first push
# or let it run automatically via Cloudways Git deployment
# ============================================================

APP_DIR="/home/master/applications/APP_NAME/public_html"
cd "$APP_DIR"

echo "→ Installing dependencies..."
npm ci --production=false

echo "→ Generating Prisma client..."
npx prisma generate

echo "→ Running database migrations..."
npx prisma db push --skip-generate

echo "→ Building Next.js app..."
npm run build

echo "→ Restarting app with PM2..."
if pm2 list | grep -q "tttgmb-portal"; then
  pm2 reload tttgmb-portal
else
  pm2 start ecosystem.config.js
  pm2 save
fi

echo "✅ Deployment complete"
