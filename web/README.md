# Solar Auxilia List Builder - Streamlit App

Fast, interactive web app for building Warhammer: The Horus Heresy Solar Auxilia army lists.

## Features

- 📚 Browse 53 units with full stats and profiles
- 🎖️ Build rosters with real-time validation
- 📊 Tournament meta analysis
- 📤 Export lists to text format
- ⚡ Fast, responsive interface

## Local Development

```bash
# Install dependencies
pip install -r requirements.txt

# Initialize database (from parent directory)
cd ..
python -c "from src.models.database import initialize_database; initialize_database()"
auxilia bsdata load

# Run app
cd web
streamlit run streamlit_app.py
```

Visit `http://localhost:8501`

## Deploy to Streamlit Cloud

1. Push code to GitHub
2. Go to [share.streamlit.io](https://share.streamlit.io)
3. Connect your GitHub repo
4. Set main file path: `web/streamlit_app.py`
5. Deploy!

## Environment Variables

None required - uses local SQLite database.

For production with PostgreSQL:
- `DATABASE_URL`: PostgreSQL connection string

## Project Structure

```
web/
├── streamlit_app.py       # Main Streamlit application
├── requirements.txt       # Python dependencies
├── .streamlit/
│   └── config.toml       # Streamlit configuration
└── README.md             # This file
```

## Usage

### Browse Units
1. Select category from dropdown
2. Search for specific units
3. View stats, profiles, and available upgrades
4. Click "Add to Roster" to add units

### Build Roster
1. Create new roster in sidebar
2. Set points limit and detachment type
3. Add units from browse tab
4. Adjust quantities
5. Validate against FOC rules
6. Export to text file

### Meta Analysis
View tournament statistics:
- Most popular units
- Trending units
- Average points per unit

*Note: Requires tournament data. Run `auxilia tournament update` in CLI first.*

## Troubleshooting

**Database not found:**
```bash
cd .. && auxilia bsdata load
```

**Import errors:**
Ensure you're running from the `web/` directory with parent in path.

## Contributing

See main project [README](../README.md) for contribution guidelines.

## License

MIT
