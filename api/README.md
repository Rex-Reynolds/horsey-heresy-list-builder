# Solar Auxilia List Builder - FastAPI Backend

REST API for the Solar Auxilia list builder with full CRUD operations, validation, and meta analysis.

## Features

- 🚀 Fast, async REST API built with FastAPI
- 📚 Full CRUD for units, weapons, upgrades, and rosters
- ✅ Real-time FOC validation
- 💰 Points calculation with upgrades
- 📊 Tournament meta analysis endpoints
- 📖 Auto-generated OpenAPI docs
- 🔒 CORS enabled for web clients

## Quick Start

```bash
# Install dependencies
pip install -r requirements.txt

# Run development server
uvicorn api.main:app --reload

# Visit API docs
open http://localhost:8000/docs
```

## API Endpoints

### Units
- `GET /api/units` - List all units (with filtering)
- `GET /api/units/{id}` - Get unit details
- `GET /api/units/{id}/upgrades` - Get available upgrades

### Weapons
- `GET /api/weapons` - List all weapons
- `GET /api/weapons/{id}` - Get weapon details

### Rosters
- `POST /api/rosters` - Create new roster
- `GET /api/rosters/{id}` - Get roster details
- `POST /api/rosters/{id}/entries` - Add unit to roster
- `POST /api/rosters/{id}/validate` - Validate roster

### Meta Analysis
- `GET /api/meta/popular-units` - Most popular units
- `GET /api/meta/trending-units` - Trending units
- `GET /api/meta/stats` - Overall statistics

## Example Requests

### Create a Roster
```bash
curl -X POST http://localhost:8000/api/rosters \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Solar Auxilia Force",
    "detachment_type": "Crusade Primary Detachment",
    "points_limit": 3000
  }'
```

### Add Unit to Roster
```bash
curl -X POST http://localhost:8000/api/rosters/1/entries \
  -H "Content-Type: application/json" \
  -d '{
    "unit_id": 1,
    "quantity": 1,
    "upgrades": []
  }'
```

### Validate Roster
```bash
curl -X POST http://localhost:8000/api/rosters/1/validate
```

## Deploy to Railway

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template)

1. Click the button above
2. Connect your GitHub repo
3. Configure environment variables (if needed)
4. Deploy!

Railway will automatically:
- Build the Docker image
- Deploy the API
- Provide a public URL

## Deploy to Render

1. Create new Web Service
2. Connect GitHub repo
3. Set build command: `pip install -r api/requirements.txt`
4. Set start command: `uvicorn api.main:app --host 0.0.0.0 --port $PORT`
5. Deploy!

## Environment Variables

```bash
# Optional: PostgreSQL database URL
DATABASE_URL=postgresql://user:pass@host:5432/dbname

# Optional: CORS origins
CORS_ORIGINS=https://your-frontend.com
```

## Development

### Run with auto-reload
```bash
uvicorn api.main:app --reload --port 8000
```

### Run tests
```bash
pytest api/tests/
```

### View API docs
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Production Considerations

1. **Database:** Switch to PostgreSQL for production
2. **CORS:** Configure allowed origins
3. **Rate Limiting:** Add rate limiting middleware
4. **Caching:** Add Redis for caching popular queries
5. **Auth:** Add authentication if needed

## Architecture

```
Client (React/Mobile)
    ↓
FastAPI (Python 3.11)
    ↓
Peewee ORM
    ↓
SQLite/PostgreSQL
```

## Performance

- Async endpoints for high concurrency
- Connection pooling
- Query optimization with Peewee
- Response caching for meta endpoints

## Contributing

See main project [README](../README.md) for contribution guidelines.

## License

MIT
