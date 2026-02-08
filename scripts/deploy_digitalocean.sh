#!/bin/bash
set -e

echo "🚀 Deploying Solar Auxilia List Builder to DigitalOcean"
echo "=========================================================="

# Update system
echo ""
echo "📦 Step 1/8: Updating system..."
apt update && apt upgrade -y

# Install dependencies
echo ""
echo "📦 Step 2/8: Installing dependencies..."
apt install -y python3.11 python3.11-venv python3-pip nginx git supervisor ufw curl

# Create user
echo ""
echo "👤 Step 3/8: Creating application user..."
if ! id -u auxilia > /dev/null 2>&1; then
    adduser auxilia --disabled-password --gecos ""
    echo "✓ User 'auxilia' created"
else
    echo "✓ User 'auxilia' already exists"
fi

# Clone repository
echo ""
echo "📥 Step 4/8: Cloning repository..."
cd /home/auxilia
if [ ! -d "horsey-heresy-list-builder" ]; then
    sudo -u auxilia git clone https://github.com/Rex-Reynolds/horsey-heresy-list-builder
    echo "✓ Repository cloned"
else
    echo "✓ Repository already exists, pulling latest..."
    cd horsey-heresy-list-builder
    sudo -u auxilia git pull origin main
    cd /home/auxilia
fi

cd horsey-heresy-list-builder

# Set up virtual environment
echo ""
echo "🐍 Step 5/8: Setting up Python environment..."
if [ ! -d "venv" ]; then
    sudo -u auxilia python3.11 -m venv venv
fi
sudo -u auxilia venv/bin/pip install --upgrade pip -q
sudo -u auxilia venv/bin/pip install -r requirements.txt -q
sudo -u auxilia venv/bin/pip install -r web/requirements.txt -q
sudo -u auxilia venv/bin/pip install -r api/requirements.txt -q
echo "✓ Python environment ready"

# Initialize database
echo ""
echo "💾 Step 6/8: Initializing database..."
if [ ! -d "data" ]; then
    sudo -u auxilia mkdir -p data
fi
sudo -u auxilia venv/bin/python -c "from src.models.database import initialize_database; initialize_database()"
echo "✓ Database initialized"

# Load BSData (optional, may fail if no internet)
echo ""
echo "📚 Loading BSData catalogue (this may take a minute)..."
sudo -u auxilia venv/bin/python -m src.cli.main bsdata update 2>/dev/null || echo "⚠ BSData update skipped (offline or failed)"
sudo -u auxilia venv/bin/python -m src.cli.main bsdata load 2>/dev/null || echo "⚠ BSData load skipped (offline or failed)"

# Create systemd services
echo ""
echo "⚙️  Step 7/8: Creating systemd services..."

cat > /etc/systemd/system/auxilia-streamlit.service <<EOF
[Unit]
Description=Solar Auxilia Streamlit App
After=network.target

[Service]
Type=simple
User=auxilia
WorkingDirectory=/home/auxilia/horsey-heresy-list-builder
Environment="PATH=/home/auxilia/horsey-heresy-list-builder/venv/bin"
ExecStart=/home/auxilia/horsey-heresy-list-builder/venv/bin/streamlit run web/streamlit_app.py --server.port 8501 --server.address 127.0.0.1 --server.headless true

Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

cat > /etc/systemd/system/auxilia-api.service <<EOF
[Unit]
Description=Solar Auxilia FastAPI Backend
After=network.target

[Service]
Type=simple
User=auxilia
WorkingDirectory=/home/auxilia/horsey-heresy-list-builder
Environment="PATH=/home/auxilia/horsey-heresy-list-builder/venv/bin"
ExecStart=/home/auxilia/horsey-heresy-list-builder/venv/bin/uvicorn api.main:app --host 127.0.0.1 --port 8000 --workers 2

Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Enable and start services
systemctl daemon-reload
systemctl enable auxilia-streamlit
systemctl enable auxilia-api
systemctl restart auxilia-streamlit
systemctl restart auxilia-api

echo "✓ Services created and started"

# Wait for services to start
sleep 3

# Configure Nginx
echo ""
echo "🌐 Step 8/8: Configuring Nginx..."

cat > /etc/nginx/sites-available/auxilia <<'EOF'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;

    # Streamlit app (main interface)
    location / {
        proxy_pass http://127.0.0.1:8501;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_buffering off;
        proxy_read_timeout 86400;
    }

    # Streamlit WebSocket
    location /_stcore/stream {
        proxy_pass http://127.0.0.1:8501/_stcore/stream;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # FastAPI backend
    location /api/ {
        proxy_pass http://127.0.0.1:8000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

rm -f /etc/nginx/sites-enabled/default
ln -sf /etc/nginx/sites-available/auxilia /etc/nginx/sites-enabled/

nginx -t && systemctl restart nginx
echo "✓ Nginx configured"

# Configure firewall
echo ""
echo "🔥 Configuring firewall..."
ufw --force enable
ufw allow OpenSSH
ufw allow 'Nginx Full'
echo "✓ Firewall configured"

# Get public IP
PUBLIC_IP=$(curl -s ifconfig.me)

echo ""
echo "=========================================================="
echo "✅ DEPLOYMENT COMPLETE!"
echo "=========================================================="
echo ""
echo "🎉 Your Solar Auxilia List Builder is now live!"
echo ""
echo "📍 Main App:  http://$PUBLIC_IP"
echo "📖 API Docs:  http://$PUBLIC_IP/api/docs"
echo ""
echo "📊 Service Status:"
systemctl is-active auxilia-streamlit >/dev/null 2>&1 && echo "  ✓ Streamlit: Running" || echo "  ✗ Streamlit: Not running"
systemctl is-active auxilia-api >/dev/null 2>&1 && echo "  ✓ API: Running" || echo "  ✗ API: Not running"
systemctl is-active nginx >/dev/null 2>&1 && echo "  ✓ Nginx: Running" || echo "  ✗ Nginx: Not running"
echo ""
echo "📝 Useful Commands:"
echo "  View Streamlit logs:   sudo journalctl -u auxilia-streamlit -f"
echo "  View API logs:         sudo journalctl -u auxilia-api -f"
echo "  Restart Streamlit:     sudo systemctl restart auxilia-streamlit"
echo "  Restart API:           sudo systemctl restart auxilia-api"
echo ""
echo "🔒 To Enable HTTPS:"
echo "  1. Point your domain to: $PUBLIC_IP"
echo "  2. Run: sudo apt install certbot python3-certbot-nginx"
echo "  3. Run: sudo certbot --nginx -d yourdomain.com"
echo ""
echo "📚 Full documentation: /home/auxilia/horsey-heresy-list-builder/DIGITALOCEAN_DEPLOYMENT.md"
echo ""
