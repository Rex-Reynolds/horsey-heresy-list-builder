# 🌊 DigitalOcean Droplet Deployment Guide

Complete guide for deploying Solar Auxilia List Builder to a DigitalOcean droplet.

---

## Prerequisites

- DigitalOcean droplet (Ubuntu 22.04 LTS recommended)
- Domain name (optional, but recommended for SSL)
- SSH access to your droplet

**Recommended Droplet Size:**
- **Basic:** $6/month (1GB RAM, 1 CPU) - Good for testing
- **Production:** $12/month (2GB RAM, 1 CPU) - Recommended
- **High Traffic:** $24/month (4GB RAM, 2 CPUs)

---

## Quick Deploy Script

```bash
# On your local machine
git clone https://github.com/Rex-Reynolds/horsey-heresy-list-builder
cd horsey-heresy-list-builder

# Copy deployment script to droplet
scp scripts/deploy_digitalocean.sh root@YOUR_DROPLET_IP:/root/

# SSH into droplet
ssh root@YOUR_DROPLET_IP

# Run deployment
chmod +x /root/deploy_digitalocean.sh
./deploy_digitalocean.sh
```

**Done!** Your app will be live at `http://YOUR_DROPLET_IP`

---

## Manual Step-by-Step Deployment

### 1. Initial Server Setup

```bash
# SSH into your droplet
ssh root@YOUR_DROPLET_IP

# Update system
apt update && apt upgrade -y

# Install dependencies
apt install -y python3.11 python3.11-venv python3-pip nginx git supervisor

# Create app user
adduser auxilia --disabled-password --gecos ""
usermod -aG sudo auxilia

# Switch to app user
su - auxilia
```

### 2. Clone and Setup Application

```bash
# Clone repository
cd /home/auxilia
git clone https://github.com/Rex-Reynolds/horsey-heresy-list-builder
cd horsey-heresy-list-builder

# Create virtual environment
python3.11 -m venv venv
source venv/bin/activate

# Install dependencies
pip install --upgrade pip
pip install -r requirements.txt
pip install -r web/requirements.txt
pip install -r api/requirements.txt

# Initialize database
python -c "from src.models.database import initialize_database; initialize_database()"

# Load BSData catalogue
./venv/bin/python -m src.cli.main bsdata update
./venv/bin/python -m src.cli.main bsdata load
```

### 3. Configure Systemd Services

Create service files for auto-start and auto-restart.

**Streamlit Service:**

```bash
sudo nano /etc/systemd/system/auxilia-streamlit.service
```

```ini
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
```

**FastAPI Service:**

```bash
sudo nano /etc/systemd/system/auxilia-api.service
```

```ini
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
```

**Enable and start services:**

```bash
sudo systemctl daemon-reload
sudo systemctl enable auxilia-streamlit
sudo systemctl enable auxilia-api
sudo systemctl start auxilia-streamlit
sudo systemctl start auxilia-api

# Check status
sudo systemctl status auxilia-streamlit
sudo systemctl status auxilia-api
```

### 4. Configure Nginx Reverse Proxy

```bash
sudo nano /etc/nginx/sites-available/auxilia
```

```nginx
# Main Streamlit App
server {
    listen 80;
    server_name YOUR_DOMAIN.com www.YOUR_DOMAIN.com;

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
    }

    # WebSocket support for Streamlit
    location /_stcore/stream {
        proxy_pass http://127.0.0.1:8501/_stcore/stream;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# API Backend
server {
    listen 80;
    server_name api.YOUR_DOMAIN.com;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**Enable site:**

```bash
sudo ln -s /etc/nginx/sites-available/auxilia /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 5. Configure Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
sudo ufw status
```

### 6. Set Up SSL with Let's Encrypt (Optional but Recommended)

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d YOUR_DOMAIN.com -d www.YOUR_DOMAIN.com -d api.YOUR_DOMAIN.com

# Auto-renewal is configured automatically
sudo certbot renew --dry-run
```

### 7. Configure Domain DNS

In your domain registrar (Namecheap, GoDaddy, etc.):

```
A Record:     @              -> YOUR_DROPLET_IP
A Record:     www            -> YOUR_DROPLET_IP
A Record:     api            -> YOUR_DROPLET_IP
```

---

## Deployment Options

### Option 1: Streamlit Only (Simplest)

Just deploy the Streamlit app - it includes everything needed for a working list builder.

**Access:** `http://YOUR_DOMAIN.com`

### Option 2: FastAPI Only

Deploy just the API backend if you're building a custom frontend.

**Access:** `http://api.YOUR_DOMAIN.com/docs`

### Option 3: Full Stack (Recommended)

Deploy both Streamlit (user-facing) and API (for future integrations/mobile apps).

**Streamlit:** `http://YOUR_DOMAIN.com`
**API:** `http://api.YOUR_DOMAIN.com`
**API Docs:** `http://api.YOUR_DOMAIN.com/docs`

---

## Maintenance Commands

### View Logs

```bash
# Streamlit logs
sudo journalctl -u auxilia-streamlit -f

# API logs
sudo journalctl -u auxilia-api -f

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Restart Services

```bash
sudo systemctl restart auxilia-streamlit
sudo systemctl restart auxilia-api
sudo systemctl restart nginx
```

### Update Application

```bash
cd /home/auxilia/horsey-heresy-list-builder
git pull origin main
source venv/bin/activate
pip install -r requirements.txt --upgrade

# Restart services
sudo systemctl restart auxilia-streamlit
sudo systemctl restart auxilia-api
```

### Backup Database

```bash
# Backup SQLite database
cp data/auxilia.db data/auxilia_backup_$(date +%Y%m%d).db

# Or set up automated backups
crontab -e
# Add: 0 2 * * * cp /home/auxilia/horsey-heresy-list-builder/data/auxilia.db /home/auxilia/backups/auxilia_$(date +\%Y\%m\%d).db
```

---

## Auto-Deployment Script

Create `/root/deploy_digitalocean.sh`:

```bash
#!/bin/bash
set -e

echo "🚀 Deploying Solar Auxilia List Builder to DigitalOcean"

# Update system
echo "📦 Updating system..."
apt update && apt upgrade -y

# Install dependencies
echo "📦 Installing dependencies..."
apt install -y python3.11 python3.11-venv python3-pip nginx git supervisor ufw

# Create user
echo "👤 Creating application user..."
if ! id -u auxilia > /dev/null 2>&1; then
    adduser auxilia --disabled-password --gecos ""
fi

# Clone repository
echo "📥 Cloning repository..."
cd /home/auxilia
if [ ! -d "horsey-heresy-list-builder" ]; then
    sudo -u auxilia git clone https://github.com/Rex-Reynolds/horsey-heresy-list-builder
fi

cd horsey-heresy-list-builder

# Set up virtual environment
echo "🐍 Setting up Python environment..."
sudo -u auxilia python3.11 -m venv venv
sudo -u auxilia venv/bin/pip install --upgrade pip
sudo -u auxilia venv/bin/pip install -r requirements.txt
sudo -u auxilia venv/bin/pip install -r web/requirements.txt
sudo -u auxilia venv/bin/pip install -r api/requirements.txt

# Initialize database
echo "💾 Initializing database..."
sudo -u auxilia venv/bin/python -c "from src.models.database import initialize_database; initialize_database()"

# Load BSData
echo "📚 Loading BSData catalogue..."
sudo -u auxilia venv/bin/python -m src.cli.main bsdata update || true
sudo -u auxilia venv/bin/python -m src.cli.main bsdata load || true

# Create systemd services
echo "⚙️  Creating systemd services..."

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
systemctl start auxilia-streamlit
systemctl start auxilia-api

# Configure Nginx
echo "🌐 Configuring Nginx..."

cat > /etc/nginx/sites-available/auxilia <<'EOF'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;

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
    }

    location /_stcore/stream {
        proxy_pass http://127.0.0.1:8501/_stcore/stream;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

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

# Configure firewall
echo "🔥 Configuring firewall..."
ufw --force enable
ufw allow OpenSSH
ufw allow 'Nginx Full'

echo ""
echo "✅ Deployment complete!"
echo ""
echo "🎉 Your Solar Auxilia List Builder is now live!"
echo ""
echo "📍 Access your app at: http://$(curl -s ifconfig.me)"
echo "📖 API docs at: http://$(curl -s ifconfig.me)/api/docs"
echo ""
echo "📊 Service status:"
systemctl status auxilia-streamlit --no-pager | grep Active
systemctl status auxilia-api --no-pager | grep Active
echo ""
echo "📝 View logs:"
echo "  sudo journalctl -u auxilia-streamlit -f"
echo "  sudo journalctl -u auxilia-api -f"
echo ""
echo "🔒 To enable HTTPS:"
echo "  1. Point your domain to this server"
echo "  2. Run: sudo certbot --nginx"
echo ""
```

Make it executable:
```bash
chmod +x /root/deploy_digitalocean.sh
```

---

## One-Command Deployment

From your **local machine**:

```bash
# Create deployment script on local
cat > deploy.sh <<'EOF'
#!/bin/bash
DROPLET_IP=$1

if [ -z "$DROPLET_IP" ]; then
    echo "Usage: ./deploy.sh YOUR_DROPLET_IP"
    exit 1
fi

echo "🚀 Deploying to $DROPLET_IP..."

# Upload deployment script
scp DIGITALOCEAN_DEPLOYMENT.md root@$DROPLET_IP:/root/

# Create and upload deployment script
ssh root@$DROPLET_IP 'bash -s' < scripts/deploy_digitalocean.sh

echo "✅ Deployment complete!"
echo "Visit: http://$DROPLET_IP"
EOF

chmod +x deploy.sh
./deploy.sh YOUR_DROPLET_IP
```

---

## Troubleshooting

### Services won't start

```bash
# Check service status
sudo systemctl status auxilia-streamlit
sudo systemctl status auxilia-api

# Check logs for errors
sudo journalctl -u auxilia-streamlit -n 50
sudo journalctl -u auxilia-api -n 50

# Common fix: permissions
sudo chown -R auxilia:auxilia /home/auxilia/horsey-heresy-list-builder
```

### Database errors

```bash
# Reinitialize database
cd /home/auxilia/horsey-heresy-list-builder
source venv/bin/activate
python -c "from src.models.database import initialize_database; initialize_database()"
python -m src.cli.main bsdata load
```

### Nginx errors

```bash
# Test nginx config
sudo nginx -t

# Check nginx logs
sudo tail -f /var/log/nginx/error.log
```

### Port already in use

```bash
# Find what's using the port
sudo lsof -i :8501
sudo lsof -i :8000

# Kill process if needed
sudo kill -9 PID
```

---

## Performance Tuning

### For Production (2GB+ Droplet)

**Increase Uvicorn workers:**
```bash
# Edit /etc/systemd/system/auxilia-api.service
ExecStart=.../uvicorn api.main:app --host 127.0.0.1 --port 8000 --workers 4
```

**Enable Nginx caching:**
```nginx
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=my_cache:10m max_size=1g inactive=60m;

server {
    location /api/ {
        proxy_cache my_cache;
        proxy_cache_valid 200 5m;
        # ... rest of config
    }
}
```

---

## Monitoring

### Simple health check

```bash
# Create monitoring script
cat > /home/auxilia/health_check.sh <<'EOF'
#!/bin/bash
if ! curl -f http://localhost:8501/_stcore/health > /dev/null 2>&1; then
    systemctl restart auxilia-streamlit
fi

if ! curl -f http://localhost:8000/health > /dev/null 2>&1; then
    systemctl restart auxilia-api
fi
EOF

chmod +x /home/auxilia/health_check.sh

# Add to crontab
crontab -e
# Add: */5 * * * * /home/auxilia/health_check.sh
```

---

## Cost Estimate

| Droplet Size | RAM | CPU | Storage | Cost/Month |
|--------------|-----|-----|---------|------------|
| Basic | 1GB | 1 | 25GB | $6 |
| **Recommended** | **2GB** | **1** | **50GB** | **$12** |
| Production | 4GB | 2 | 80GB | $24 |

**Additional costs:**
- Domain name: ~$12/year
- SSL: FREE (Let's Encrypt)
- Backups: $1.20/month (20% of droplet cost)

**Total recommended:** ~$13-14/month

---

## Next Steps

1. ✅ Run deployment script
2. ✅ Test at `http://YOUR_DROPLET_IP`
3. ✅ Set up domain and SSL
4. ✅ Configure backups
5. ✅ Set up monitoring

---

**Questions?** Check [DEPLOYMENT.md](DEPLOYMENT.md) or open an issue on GitHub!
