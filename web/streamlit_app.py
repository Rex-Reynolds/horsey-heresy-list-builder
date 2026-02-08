"""
Solar Auxilia List Builder - Streamlit MVP
Fast, interactive army list builder powered by BSData and tournament analysis.
"""
import streamlit as st
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.models import db, Unit, Weapon, Upgrade, UnitUpgrade, Roster, RosterEntry
from src.bsdata.foc_validator import FOCValidator
from src.bsdata.points_calculator import PointsCalculator
from src.analytics.unit_popularity import get_unit_popularity, get_trending_units
import json

# Page config
st.set_page_config(
    page_title="Solar Auxilia List Builder",
    page_icon="⚔️",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Initialize database connection
db.connect(reuse_if_open=True)

# Custom CSS
st.markdown("""
<style>
    .big-font {
        font-size: 24px !important;
        font-weight: bold;
    }
    .valid-roster {
        background-color: #d4edda;
        border: 2px solid #28a745;
        border-radius: 5px;
        padding: 10px;
        margin: 10px 0;
    }
    .invalid-roster {
        background-color: #f8d7da;
        border: 2px solid #dc3545;
        border-radius: 5px;
        padding: 10px;
        margin: 10px 0;
    }
    .unit-card {
        background-color: #f8f9fa;
        border-radius: 8px;
        padding: 15px;
        margin: 10px 0;
        border-left: 4px solid #007bff;
    }
</style>
""", unsafe_allow_html=True)

# App state initialization
if 'roster' not in st.session_state:
    st.session_state.roster = None
if 'roster_entries' not in st.session_state:
    st.session_state.roster_entries = []

# Header
st.title("⚔️ Solar Auxilia List Builder")
st.markdown("*Tournament-informed army list builder powered by BSData*")

# Sidebar - Roster Management
with st.sidebar:
    st.header("📋 Your Roster")

    # Create/Load Roster
    roster_name = st.text_input("Roster Name", value="My Solar Auxilia Force")
    points_limit = st.selectbox("Points Limit", [1000, 1500, 2000, 2500, 3000, 3500, 4000], index=4)
    detachment_type = st.selectbox("Detachment", [
        "Crusade Force Organization Chart",
        "Crusade Primary Detachment",
        "Auxiliary - Tactical Support",
        "Auxiliary - First Strike",
    ])

    if st.button("New Roster"):
        # Create new roster
        if st.session_state.roster:
            # Delete old roster entries
            for entry in st.session_state.roster_entries:
                entry.delete_instance()

        st.session_state.roster = Roster.create(
            name=roster_name,
            detachment_type=detachment_type,
            points_limit=points_limit
        )
        st.session_state.roster_entries = []
        st.success("✅ New roster created!")
        st.rerun()

    # Display current roster
    if st.session_state.roster:
        st.markdown("---")
        st.markdown(f"**{st.session_state.roster.name}**")

        # Calculate and display points
        total_points = sum(entry.total_cost for entry in st.session_state.roster_entries)
        points_remaining = points_limit - total_points

        st.metric("Total Points", f"{total_points} / {points_limit}")
        st.progress(min(total_points / points_limit, 1.0))

        if points_remaining < 0:
            st.error(f"⚠️ Over budget by {abs(points_remaining)} pts!")
        else:
            st.info(f"💰 {points_remaining} pts remaining")

        # Validate roster
        if st.button("Validate Roster"):
            try:
                validator = FOCValidator(detachment_type)
                is_valid, errors = validator.validate_roster(st.session_state.roster_entries)

                if is_valid:
                    st.success("✅ Roster is valid!")
                else:
                    st.error("❌ Roster validation failed:")
                    for error in errors:
                        st.write(f"- {error}")
            except Exception as e:
                st.warning(f"Validation not available: {str(e)}")

        # Export
        st.markdown("---")
        st.subheader("📤 Export")
        if st.button("Export as Text"):
            export_text = f"# {st.session_state.roster.name}\n"
            export_text += f"**Detachment:** {detachment_type}\n"
            export_text += f"**Points:** {total_points} / {points_limit}\n\n"

            for entry in st.session_state.roster_entries:
                export_text += f"- {entry.unit_name} ({entry.total_cost} pts)\n"

            st.download_button(
                "Download List",
                export_text,
                file_name=f"{roster_name.replace(' ', '_')}.txt",
                mime="text/plain"
            )

# Main content tabs
tab1, tab2, tab3, tab4 = st.tabs(["📚 Browse Units", "🎖️ Build Roster", "📊 Meta Analysis", "ℹ️ About"])

with tab1:
    st.header("Browse Unit Catalogue")

    col1, col2 = st.columns([1, 3])

    with col1:
        # Category filter
        categories = ["All"] + ["HQ", "Troops", "Elites", "Fast Attack", "Heavy Support", "Lord of War"]
        selected_category = st.selectbox("Category", categories)

        # Search
        search_query = st.text_input("🔍 Search units")

    with col2:
        # Get units
        if selected_category == "All":
            units = Unit.select().order_by(Unit.name)
        else:
            units = Unit.select().where(Unit.unit_type == selected_category).order_by(Unit.name)

        # Apply search filter
        if search_query:
            units = units.where(Unit.name.contains(search_query))

        units = list(units)

        st.write(f"*Found {len(units)} units*")

        # Display units
        for unit in units:
            with st.expander(f"{unit.name} - {unit.base_cost} pts ({unit.unit_type})"):
                # Parse profiles
                try:
                    profiles = json.loads(unit.profiles)
                    if profiles:
                        st.markdown("**Profiles:**")
                        for profile in profiles[:2]:  # Show first 2 profiles
                            st.write(f"*{profile['name']}*")
                            if profile.get('characteristics'):
                                char_cols = st.columns(4)
                                for i, (key, value) in enumerate(profile['characteristics'].items()):
                                    char_cols[i % 4].metric(key, value)
                except:
                    pass

                # Show available upgrades
                upgrades = (UnitUpgrade
                           .select(UnitUpgrade, Upgrade)
                           .join(Upgrade)
                           .where(UnitUpgrade.unit == unit))

                upgrade_list = list(upgrades)
                if upgrade_list:
                    st.markdown(f"**Available Upgrades:** {len(upgrade_list)}")
                    for uu in upgrade_list[:5]:
                        st.write(f"- {uu.upgrade.name} ({uu.upgrade.cost} pts)")

                # Add to roster button
                if st.session_state.roster:
                    if st.button(f"Add to Roster", key=f"add_{unit.id}"):
                        entry = RosterEntry.create(
                            roster=st.session_state.roster,
                            unit=unit,
                            unit_name=unit.name,
                            quantity=1,
                            upgrades=None,
                            total_cost=unit.base_cost,
                            category=unit.unit_type
                        )
                        st.session_state.roster_entries.append(entry)
                        st.success(f"Added {unit.name} to roster!")
                        st.rerun()

with tab2:
    st.header("Build Your Roster")

    if not st.session_state.roster:
        st.info("👈 Create a new roster in the sidebar to start building!")
    else:
        if not st.session_state.roster_entries:
            st.info("No units in roster yet. Browse units and add them to your roster!")
        else:
            # Group by category
            by_category = {}
            for entry in st.session_state.roster_entries:
                if entry.category not in by_category:
                    by_category[entry.category] = []
                by_category[entry.category].append(entry)

            # Display by category
            for category in sorted(by_category.keys()):
                st.subheader(f"🎯 {category}")

                for entry in by_category[category]:
                    col1, col2, col3 = st.columns([3, 1, 1])

                    with col1:
                        st.markdown(f"**{entry.unit_name}**")
                        st.caption(f"{entry.total_cost} pts")

                    with col2:
                        new_qty = st.number_input(
                            "Qty",
                            min_value=1,
                            max_value=10,
                            value=entry.quantity,
                            key=f"qty_{entry.id}"
                        )
                        if new_qty != entry.quantity:
                            entry.quantity = new_qty
                            entry.total_cost = entry.unit.base_cost * new_qty
                            entry.save()
                            st.rerun()

                    with col3:
                        if st.button("🗑️", key=f"delete_{entry.id}"):
                            st.session_state.roster_entries.remove(entry)
                            entry.delete_instance()
                            st.rerun()

with tab3:
    st.header("📊 Meta Analysis")
    st.markdown("*Based on tournament data analysis*")

    try:
        # Unit popularity
        st.subheader("🔥 Most Popular Units")

        popularity = get_unit_popularity(min_appearances=3)

        if popularity:
            # Show top 10
            for i, stat in enumerate(popularity[:10], 1):
                col1, col2, col3 = st.columns([3, 1, 1])
                with col1:
                    st.write(f"{i}. **{stat['unit_name']}**")
                with col2:
                    st.metric("Appearances", stat['appearances'])
                with col3:
                    st.metric("Avg Points", f"{stat['avg_points']:.0f}")
        else:
            st.info("Run `auxilia tournament update` to scrape tournament data for meta analysis!")

        # Trending units
        st.subheader("📈 Trending Units")
        trending = get_trending_units(months=6)

        if trending:
            for unit in trending[:5]:
                st.write(f"↗️ **{unit['unit_name']}** ({unit['trend_indicator']})")

    except Exception as e:
        st.warning("Tournament data not available. Run `auxilia tournament update` to enable meta analysis.")

with tab4:
    st.header("About")
    st.markdown("""
    ## Solar Auxilia List Builder

    A tournament-informed army list builder for Warhammer: The Horus Heresy Solar Auxilia faction.

    ### Features
    - ✅ Browse 53 Solar Auxilia units with full stats
    - ✅ 317 weapons and 83 upgrades from BSData
    - ✅ Real-time points calculation
    - ✅ FOC validation
    - ✅ Tournament meta analysis
    - ✅ Export lists to text

    ### Data Sources
    - **Unit Rules:** [BSData Horus Heresy 3rd Edition](https://github.com/BSData/horus-heresy-3rd-edition)
    - **Tournament Data:** [Best Coast Pairings](https://www.bestcoastpairings.com)

    ### Tech Stack
    - **Backend:** Python, Peewee ORM, SQLite
    - **Frontend:** Streamlit
    - **Data:** BSData XML catalogues

    ### Links
    - [GitHub Repository](https://github.com/Rex-Reynolds/horsey-heresy-list-builder)
    - [Report Issues](https://github.com/Rex-Reynolds/horsey-heresy-list-builder/issues)

    ---

    Made with ❤️ by the Horus Heresy community
    """)

# Footer
st.markdown("---")
st.caption("Solar Auxilia List Builder v3.0 | Powered by BSData | Tournament data from Best Coast Pairings")
