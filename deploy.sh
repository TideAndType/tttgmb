#!/bin/bash
set -e

# ============================================================
# TideAndType Client Portal — DigitalOcean deployment script
# Run this on a fresh Ubuntu 22.04 / 24.04 Droplet as root
# Usage: bash deploy.sh yourdomain.com your@email.com
# ============================================================

DOMAIN="${1}"
EMAIL="${2}"

if [ -z "$DOMAIN" ] || [ -z "$EMAIL" ]; then
  echo "Usage: bash deploy.sh yourdomain.com your@email.com"
  exit 1
fi

echo ""
echo "========================================"
echo " Deploying portal to $DOMAIN"
echo "========================================"
echo ""

# --- 1. Install Docker ---
echo "→ Installing Docker..."
apt-get update -qq
apt-get install -y -qq ca-certificates curl gnupg
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
  > /etc/apt/sources.list.d/docker.list
apt-get update -qq
apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-compose-plugin
echo "✓ Docker installed"

# --- 2. Clone the repo ---
echo "→ Cloning repository..."
if [ ! -d "/opt/portal" ]; then
  git clone https://github.com/tideandtype/tttgmb.git /opt/portal
else
  cd /opt/portal && git pull origin main
fi
cd /opt/portal
echo "✓ Repository ready"

# --- 3. Configure domain in nginx ---
echo "→ Configuring nginx for $DOMAIN..."
sed -i "s/YOUR_DOMAIN/$DOMAIN/g" nginx/conf.d/app.conf
echo "✓ Nginx configured"

# --- 4. Generate .env if not present ---
if [ ! -f ".env" ]; then
  echo "→ Generating .env file..."
  POSTGRES_PASSWORD=$(openssl rand -base64 32 | tr -d /=+ | head -c 32)
  NEXTAUTH_SECRET=$(openssl rand -base64 32)

  cat > .env << ENVEOF
# Database
POSTGRES_PASSWORD=$POSTGRES_PASSWORD

# Next.js
NEXTAUTH_SECRET=$NEXTAUTH_SECRET
NEXTAUTH_URL=https://$DOMAIN

# Google OAuth (fill these in — https://console.cloud.google.com)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Google Analytics
GA_CLIENT_ID=
GA_CLIENT_SECRET=
GA_REDIRECT_URI=https://$DOMAIN/api/ga/callback

# Invoiless (https://invoiless.com)
INVOILESS_API_KEY=
ENVEOF
  echo "✓ .env created — edit /opt/portal/.env to add your API keys before starting"
  echo ""
  echo "  ┌─────────────────────────────────────────────────────┐"
  echo "  │  IMPORTANT: fill in these values in /opt/portal/.env │"
  echo "  │  GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET             │"
  echo "  │  GA_CLIENT_ID / GA_CLIENT_SECRET                     │"
  echo "  │  INVOILESS_API_KEY                                   │"
  echo "  └─────────────────────────────────────────────────────┘"
  echo ""
  read -p "Press Enter once you've filled in .env to continue..."
fi

# --- 5. Get SSL certificate (HTTP-only nginx first) ---
echo "→ Getting SSL certificate from Let's Encrypt..."

# Start nginx with HTTP only temporarily
cat > /tmp/nginx-http-only.conf << 'NGINXEOF'
server {
    listen 80;
    server_name _;
    location /.well-known/acme-challenge/ { root /var/www/certbot; }
    location / { return 200 'ok'; }
}
NGINXEOF

docker compose up -d nginx

# Wait for nginx
sleep 3

# Issue cert
docker compose run --rm certbot certonly \
  --webroot \
  --webroot-path /var/www/certbot \
  --email "$EMAIL" \
  --agree-tos \
  --no-eff-email \
  -d "$DOMAIN"

echo "✓ SSL certificate issued"

# --- 6. Start everything ---
echo "→ Building and starting all services..."
docker compose up -d --build
echo "✓ Services started"

# --- 7. Run database migrations + seed ---
echo "→ Running database migrations..."
sleep 5
docker compose exec app npx prisma db push --skip-generate
docker compose exec app npx prisma db seed 2>/dev/null || true
echo "✓ Database ready"

# --- 8. Set up auto-renew cron ---
echo "→ Setting up SSL auto-renewal..."
(crontab -l 2>/dev/null; echo "0 3 * * * cd /opt/portal && docker compose exec certbot certbot renew --quiet && docker compose exec nginx nginx -s reload") | crontab -
echo "✓ Auto-renewal configured"

echo ""
echo "========================================"
echo " ✅ Deployment complete!"
echo ""
echo "  Portal URL:  https://$DOMAIN"
echo "  Admin login: admin@example.com"
echo "  Password:    Admin1234!"
echo ""
echo "  ⚠️  Change the admin password after first login!"
echo "========================================"
