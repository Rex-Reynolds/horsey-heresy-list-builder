# 🚀 Quick Start Guide - Web Apps

Get your Solar Auxilia List Builder running online in **15 minutes**!

---

## Option 1: Streamlit App (Fastest - 5 minutes)

**Perfect for:** MVP, testing, single-user deployments

### Local Testing

```bash
# Install dependencies
cd web
pip install -r requirements.txt

# Run app
streamlit run streamlit_app.py
```

Visit `http://localhost:8501` - Your app is live!

### Deploy to Cloud (FREE)

1. **Push to GitHub**
   ```bash
   git add -A
   git commit -m "Ready to deploy"
   git push
   ```

2. **Deploy**
   - Go to [share.streamlit.io](https://share.streamlit.io)
   - Click "New app"
   - Select your GitHub repo
   - Main file: `web/streamlit_app.py`
   - Click "Deploy!"

3. **Done!** Your app is live at `https://your-app.streamlit.app`

**Cost:** $0/month

---

## Option 2: FastAPI Backend (For Multi-User Apps)

**Perfect for:** Production, mobile apps, React frontend

### Local Testing

```bash
# Install dependencies
cd api
pip install -r requirements.txt

# Run API
uvicorn main:app --reload
```

Visit:
- API Docs: `http://localhost:8000/docs`
- Health Check: `http://localhost:8000/health`

### Deploy to Railway (FREE $5 credit)

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize project
railway init

# Deploy
railway up

# Get your URL
railway domain
```

**Done!** Your API is live at `https://your-api.railway.app`

**Cost:** $0/month (with credit)

---

## Option 3: Full Stack (Streamlit + API)

Deploy both for maximum flexibility:

1. **Deploy API to Railway** (see above)
2. **Deploy Streamlit to Streamlit Cloud** (see above)
3. **Connect them** (optional - Streamlit can work standalone)

---

## What You Get

### Streamlit App Features
✅ Browse 53 Solar Auxilia units
✅ View full stats and profiles
✅ 317 weapons + 83 upgrades
✅ Build rosters with drag-and-drop
✅ Real-time points calculation
✅ FOC validation
✅ Tournament meta analysis
✅ Export to text

### FastAPI Features
✅ Complete REST API
✅ Auto-generated docs
✅ Unit/weapon/upgrade endpoints
✅ Roster management
✅ Validation endpoints
✅ Meta analysis API
✅ CORS enabled

---

## Testing Your Deployment

### Streamlit

1. Browse units by category
2. Create a new roster
3. Add some units
4. Click "Validate Roster"
5. Export your list

### FastAPI

```bash
# Health check
curl https://your-api.railway.app/health

# Get units
curl https://your-api.railway.app/api/units?category=Troops

# View docs
open https://your-api.railway.app/docs
```

---

## Troubleshooting

### Streamlit: "Database not found"

```bash
# Build database first
cd .. && auxilia bsdata load
cd web && streamlit run streamlit_app.py
```

### API: "Import errors"

```bash
# Ensure parent directory is accessible
export PYTHONPATH="${PYTHONPATH}:$(pwd)/.."
uvicorn main:app --reload
```

### Railway: "Build failed"

Check `railway logs` for errors. Common issues:
- Missing dependencies in requirements.txt
- Wrong Python version (needs 3.11+)
- Database not initialized

---

## Next Steps

1. ✅ Deploy Streamlit (5 min)
2. ✅ Test with users
3. ✅ Deploy API (10 min)
4. ⏭️ Build React frontend (coming soon)
5. ⏭️ Add custom domain
6. ⏭️ Enable analytics

---

## Support

- **Docs:** [DEPLOYMENT.md](DEPLOYMENT.md)
- **Issues:** [GitHub Issues](https://github.com/Rex-Reynolds/horsey-heresy-list-builder/issues)
- **API Docs:** https://your-api.railway.app/docs

---

**Let's get it online!** Start with Streamlit for instant results. 🚀
