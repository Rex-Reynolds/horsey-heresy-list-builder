# 🚀 Deployment Guide

Complete guide for deploying the Solar Auxilia List Builder to production.

## Table of Contents

1. [Quick Deploy (Streamlit)](#quick-deploy-streamlit)
2. [API Deployment (FastAPI)](#api-deployment-fastapi)
3. [Frontend Deployment (React)](#frontend-deployment-react)
4. [Full Stack Setup](#full-stack-setup)
5. [Database Setup](#database-setup)
6. [Monitoring & Maintenance](#monitoring--maintenance)

---

## Quick Deploy (Streamlit)

**Deploy in 5 minutes** - Perfect for MVP and testing.

### Option 1: Streamlit Cloud (FREE)

1. **Push to GitHub**
   ```bash
   git add -A
   git commit -m "Prepare Streamlit deployment"
   git push
   ```

2. **Deploy to Streamlit Cloud**
   - Go to [share.streamlit.io](https://share.streamlit.io)
   - Sign in with GitHub
   - Click "New app"
   - Select your repo: `horsey-heresy-list-builder`
   - Main file path: `web/streamlit_app.py`
   - Click "Deploy!"

3. **Done!** Your app will be live at `https://your-app.streamlit.app`

### Option 2: Railway (Streamlit)

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Deploy
cd web
railway init
railway up
```

---

## API Deployment (FastAPI)

Deploy the REST API backend.

### Option 1: Railway (Recommended)

**Why Railway?**
- FREE $5/month credit
- Auto-deploy from GitHub
- PostgreSQL included
- Simple setup

**Steps:**

1. **Create railway.toml**
   ```toml
   [build]
   builder = "DOCKERFILE"
   dockerfilePath = "api/Dockerfile"

   [deploy]
   startCommand = "uvicorn api.main:app --host 0.0.0.0 --port $PORT"
   restartPolicyType = "ON_FAILURE"
   ```

2. **Deploy**
   ```bash
   railway login
   railway init
   railway up
   ```

3. **Add PostgreSQL** (optional)
   ```bash
   railway add postgresql
   ```

4. **Get URL**
   ```bash
   railway domain
   ```

### Option 2: Render

1. Go to [render.com](https://render.com)
2. Click "New +" → "Web Service"
3. Connect GitHub repo
4. Settings:
   - **Build Command:** `pip install -r api/requirements.txt`
   - **Start Command:** `uvicorn api.main:app --host 0.0.0.0 --port $PORT`
   - **Environment:** Python 3.11
5. Click "Create Web Service"

### Option 3: Fly.io

```bash
# Install Fly CLI
curl -L https://fly.io/install.sh | sh

# Login
fly auth login

# Deploy
fly launch
fly deploy
```

### Testing the API

```bash
# Health check
curl https://your-api.railway.app/health

# View docs
open https://your-api.railway.app/docs
```

---

## Frontend Deployment (React)

*Coming in Phase 3C - React frontend not yet implemented*

When ready, deploy to:
- **Vercel** (recommended)
- **Netlify**
- **GitHub Pages**

---

## Full Stack Setup

Deploy all components together.

### Architecture

```
Vercel (React Frontend)
    ↓
Railway (FastAPI Backend)
    ↓
Railway PostgreSQL (Database)
```

### Step-by-Step

1. **Deploy API to Railway** (see above)

2. **Deploy Frontend to Vercel**
   ```bash
   # Coming soon
   ```

3. **Connect Services**
   - Set `VITE_API_URL` in Vercel env vars
   - Point to Railway API URL
   - Configure CORS in FastAPI

4. **Custom Domain** (optional)
   - Add domain in Vercel
   - Add domain in Railway
   - Configure DNS

---

## Database Setup

### Development (SQLite)

Already configured! Database at `data/auxilia.db`

### Production (PostgreSQL)

**Why PostgreSQL?**
- Multi-user support
- Better concurrency
- Hosted options available

**Setup:**

1. **Add PostgreSQL to Railway**
   ```bash
   railway add postgresql
   ```

2. **Update code** (add to `src/models/database.py`):
   ```python
   import os
   from playhouse.postgres_ext import PostgresqlExtDatabase

   DATABASE_URL = os.getenv('DATABASE_URL')

   if DATABASE_URL:
       # Production: PostgreSQL
       db = PostgresqlExtDatabase(DATABASE_URL)
   else:
       # Development: SQLite
       db = SqliteDatabase(str(DB_PATH))
   ```

3. **Migrate data**
   ```bash
   # Export SQLite data
   python scripts/export_data.py

   # Import to PostgreSQL
   python scripts/import_data.py
   ```

4. **Initialize tables**
   ```bash
   railway run python -c "from src.models.database import initialize_database; initialize_database()"
   ```

---

## Environment Variables

### Streamlit Cloud

No environment variables required - uses bundled SQLite database.

### Railway (FastAPI)

Set in Railway dashboard or via CLI:

```bash
# Optional: PostgreSQL
railway variables set DATABASE_URL=$POSTGRES_URL

# Optional: CORS
railway variables set CORS_ORIGINS=https://your-frontend.vercel.app
```

### Vercel (React - when ready)

```bash
vercel env add VITE_API_URL production
# Enter: https://your-api.railway.app
```

---

## Monitoring & Maintenance

### Streamlit Cloud

- **Logs:** View in Streamlit Cloud dashboard
- **Metrics:** Built-in usage stats
- **Uptime:** 99.9% SLA

### Railway

```bash
# View logs
railway logs

# Monitor resource usage
railway status
```

### Health Checks

Add uptime monitoring with:
- **UptimeRobot** (free)
- **Pingdom**
- **Better Uptime**

Example health check URLs:
- Streamlit: `https://your-app.streamlit.app`
- API: `https://your-api.railway.app/health`

---

## Cost Estimates

### Free Tier (Perfect for MVP)

- **Streamlit Cloud:** FREE (1 app)
- **Railway:** $5/month credit (enough for API + DB)
- **Vercel:** FREE (hobby plan)

**Total: $0/month** ✅

### Paid Tier (Production)

- **Streamlit Cloud Teams:** $250/month
- **Railway Pro:** ~$20-50/month
- **Vercel Pro:** $20/month

**Total: ~$300/month**

### Enterprise

Custom pricing for:
- Dedicated infrastructure
- SLA guarantees
- Priority support

---

## Troubleshooting

### Streamlit: "File not found" error

```bash
# Ensure database exists
cd ..
auxilia bsdata load
cd web
streamlit run streamlit_app.py
```

### API: "Database connection failed"

```bash
# Check DATABASE_URL
railway variables get DATABASE_URL

# Test connection
railway run python -c "from src.models import db; db.connect(); print('OK')"
```

### CORS errors in frontend

Update API `main.py`:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://your-frontend.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## Security Checklist

Before going live:

- [ ] Configure CORS origins (don't use `["*"]` in production)
- [ ] Add rate limiting
- [ ] Enable HTTPS (automatic on Railway/Vercel)
- [ ] Add authentication if needed
- [ ] Review database permissions
- [ ] Set up backup strategy
- [ ] Configure error monitoring (Sentry)

---

## Backup Strategy

### SQLite (Development)

```bash
# Manual backup
cp data/auxilia.db data/auxilia_backup_$(date +%Y%m%d).db
```

### PostgreSQL (Production)

Railway automatic backups:
- Daily backups
- 7-day retention
- One-click restore

Manual backup:
```bash
railway run pg_dump > backup.sql
```

---

## Next Steps

1. ✅ Deploy Streamlit to Streamlit Cloud
2. ✅ Deploy API to Railway
3. ⏭️ Build React frontend
4. ⏭️ Deploy React to Vercel
5. ⏭️ Set up monitoring
6. ⏭️ Add custom domain

---

## Support

- **Issues:** [GitHub Issues](https://github.com/Rex-Reynolds/horsey-heresy-list-builder/issues)
- **Docs:** [README.md](README.md)
- **API Docs:** https://your-api.railway.app/docs

---

**Ready to deploy?** Start with Streamlit Cloud for the fastest path to production!
