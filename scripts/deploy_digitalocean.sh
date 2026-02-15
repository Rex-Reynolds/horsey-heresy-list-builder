#!/bin/bash
set -e

DOMAIN="heresy.build"
APP_DIR="/home/auxilia/horsey-heresy-list-builder"

echo "Deploying Solar Auxilia List Builder to DigitalOcean"
echo "Domain: $DOMAIN"
echo "=========================================================="

# Step 1: Update system
echo ""
echo "Step 1/9: Updating system..."
apt update && apt upgrade -y

# Step 2: Install dependencies (includes Node.js for frontend build)
echo ""
echo "Step 2/9: Installing dependencies..."
apt install -y python3.11 python3.11-venv python3-pip nginx git ufw curl certbot python3-certbot-nginx

# Install Node.js 20 LTS
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
    echo "Node.js $(node --version) installed"
else
    echo "Node.js $(node --version) already installed"
fi

# Step 3: Create application user
echo ""
echo "Step 3/9: Creating application user..."
if ! id -u auxilia > /dev/null 2>&1; then
    adduser auxilia --disabled-password --gecos ""
    echo "User 'auxilia' created"
else
    echo "User 'auxilia' already exists"
fi
# Nginx (www-data) needs to traverse home dir to serve frontend/dist
chmod 755 /home/auxilia

# Step 4: Clone/update repository
echo ""
echo "Step 4/9: Cloning repository..."
cd /home/auxilia
if [ ! -d "horsey-heresy-list-builder" ]; then
    sudo -u auxilia git clone https://github.com/Rex-Reynolds/horsey-heresy-list-builder
    echo "Repository cloned"
else
    echo "Repository already exists, pulling latest..."
    cd horsey-heresy-list-builder
    sudo -u auxilia git pull origin main
    cd /home/auxilia
fi

cd "$APP_DIR"

# Step 5: Python environment
echo ""
echo "Step 5/9: Setting up Python environment..."
if [ ! -d "venv" ]; then
    sudo -u auxilia python3.11 -m venv venv
fi
sudo -u auxilia venv/bin/pip install --upgrade pip -q
sudo -u auxilia venv/bin/pip install -r requirements.txt -q
sudo -u auxilia venv/bin/pip install -r api/requirements.txt -q
echo "Python environment ready"

# Step 6: Build frontend
echo ""
echo "Step 6/9: Building frontend..."
cd "$APP_DIR/frontend"
sudo -u auxilia npm ci
sudo -u auxilia npm run build
cd "$APP_DIR"
echo "Frontend built"

# Step 7: Initialize database and load data
echo ""
echo "Step 7/9: Initializing database..."
if [ ! -d "data" ]; then
    sudo -u auxilia mkdir -p data
fi
sudo -u auxilia venv/bin/python -c "from src.models.database import initialize_database; initialize_database()"
echo "Database initialized"

echo "Loading BSData catalogue..."
sudo -u auxilia venv/bin/python -m src.cli.main bsdata update 2>/dev/null || echo "BSData update skipped (offline or failed)"
sudo -u auxilia venv/bin/python -m src.cli.main bsdata load 2>/dev/null || echo "BSData load skipped (offline or failed)"

# Step 8: Create systemd service for API
echo ""
echo "Step 8/9: Creating systemd service..."

cat > /etc/systemd/system/auxilia-api.service <<EOF
[Unit]
Description=Solar Auxilia FastAPI Backend
After=network.target

[Service]
Type=simple
User=auxilia
WorkingDirectory=$APP_DIR
Environment="PATH=$APP_DIR/venv/bin"
Environment="ENVIRONMENT=production"
ExecStart=$APP_DIR/venv/bin/uvicorn api.main:app --host 127.0.0.1 --port 8000 --workers 2

Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable auxilia-api
systemctl restart auxilia-api

echo "API service started"
sleep 3

# Step 9: Configure Nginx + HTTPS
echo ""
echo "Step 9/9: Configuring Nginx..."

cat > /etc/nginx/sites-available/auxilia <<'NGINX'
server {
    listen 80;
    listen [::]:80;
    server_name heresy.build www.heresy.build;

    # React frontend (Vite build output)
    root /home/auxilia/horsey-heresy-list-builder/frontend/dist;
    index index.html;

    # Security headers
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;

    # FastAPI backend
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Static assets (cache aggressively — Vite hashes filenames)
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # SPA fallback — serve index.html for all other routes
    location / {
        try_files $uri $uri/ /index.html;
    }
}
NGINX

rm -f /etc/nginx/sites-enabled/default
ln -sf /etc/nginx/sites-available/auxilia /etc/nginx/sites-enabled/

nginx -t && systemctl restart nginx
echo "Nginx configured"

# Firewall
echo ""
echo "Configuring firewall..."
ufw --force enable
ufw allow OpenSSH
ufw allow 'Nginx Full'
echo "Firewall configured"

# HTTPS via Let's Encrypt
echo ""
echo "Setting up HTTPS..."
certbot --nginx -d "$DOMAIN" -d "www.$DOMAIN" --non-interactive --agree-tos --email admin@$DOMAIN --redirect
echo "HTTPS configured (auto-renewal enabled)"

# SQLite file permissions
chmod 600 "$APP_DIR/data/auxilia.db"
chown auxilia:auxilia "$APP_DIR/data/auxilia.db"

# Done
PUBLIC_IP=$(curl -s ifconfig.me)

echo ""
echo "=========================================================="
echo "DEPLOYMENT COMPLETE!"
echo "=========================================================="
echo ""
echo "Your Solar Auxilia List Builder is now live!"
echo ""
echo "  App:      https://$DOMAIN"
echo "  API Docs: https://$DOMAIN/api/docs"
echo "  IP:       $PUBLIC_IP"
echo ""
echo "Service Status:"
systemctl is-active auxilia-api >/dev/null 2>&1 && echo "  API:   Running" || echo "  API:   Not running"
systemctl is-active nginx >/dev/null 2>&1 && echo "  Nginx: Running" || echo "  Nginx: Running"
echo ""
echo "Useful Commands:"
echo "  View API logs:     sudo journalctl -u auxilia-api -f"
echo "  Restart API:       sudo systemctl restart auxilia-api"
echo "  Restart Nginx:     sudo systemctl restart nginx"
echo "  Renew SSL:         sudo certbot renew --dry-run"
echo "  Redeploy:          sudo bash $APP_DIR/scripts/deploy_digitalocean.sh"
echo ""
