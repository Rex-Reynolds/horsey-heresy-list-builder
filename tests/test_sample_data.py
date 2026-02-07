"""Test script with sample tournament data."""
from datetime import datetime, timedelta
from src.models import db, Tournament, ArmyList, UnitEntry, initialize_database
from src.scrapers.parsers import parse_army_list
from src.analytics.reports import generate_meta_report
from rich.console import Console

# Sample tournament list text
SAMPLE_LIST_1 = """
++ Solar Auxilia Army List - 2000pts ++

HQ:
- Legate Commander [150pts]
  · Archaeotech Pistol [10pts]
  · Power Fist [15pts]

TROOPS:
- 2x Lasrifle Section [200pts each]
- Veletaris Storm Section [250pts]

ELITES:
- Charonite Ogryns [180pts]

HEAVY SUPPORT:
- Dracosan Armoured Transport [200pts]
- Leman Russ Battle Tank Squadron [450pts]
  · 3x Leman Russ
  · Heavy Bolters [15pts]

Total: 2000pts
"""

SAMPLE_LIST_2 = """
++ 2000pt Solar Auxilia ++

HQ:
Legate Commander [140pts]

TROOPS:
3x Lasrifle Section [180pts each]

HEAVY SUPPORT:
Dracosan Armoured Transport [200pts]
2x Leman Russ Battle Tank [300pts each]
Malcador Heavy Tank [400pts]

Total: 2000pts
"""

SAMPLE_LIST_3 = """
Solar Auxilia - Auxiliary Detachment

HQ:
Auxilia Tactical Command Section [120pts]

TROOPS:
2x Lasrifle Section [200pts]
2x Veletaris Storm Section [250pts]

ELITES:
Charonite Ogryns [180pts]

FAST ATTACK:
Tarantula Sentry Gun Battery [150pts]

HEAVY SUPPORT:
Dracosan Armoured Transport [200pts]
Leman Russ Battle Tank Squadron [350pts]

Total: 1950pts
"""


def create_sample_data():
    """Create sample tournament data for testing."""
    print("Creating sample tournament data...")

    # Ensure database is initialized
    initialize_database()

    with db.atomic():
        # Create tournament (or get existing)
        tournament, created = Tournament.get_or_create(
            bcp_event_id="sample_001",
            defaults={
                "name": "Horus Heresy GT 2026",
                "date": (datetime.now() - timedelta(days=30)).date(),
                "location": "Los Angeles, CA",
                "player_count": 24,
            }
        )

        if not created:
            print("  ℹ Tournament already exists, clearing old lists...")
            # Delete old lists to recreate
            ArmyList.delete().where(ArmyList.tournament == tournament).execute()

        # Create army lists
        lists_data = [
            ("Player Alpha", SAMPLE_LIST_1),
            ("Player Beta", SAMPLE_LIST_2),
            ("Player Gamma", SAMPLE_LIST_3),
        ]

        for player_name, list_text in lists_data:
            # Parse list
            units, confidence = parse_army_list(list_text)

            # Create army list entry
            army_list = ArmyList.create(
                tournament=tournament,
                player_name=player_name,
                faction="Solar Auxilia",
                list_text=list_text,
                points=2000,
                parse_confidence=confidence
            )

            # Create unit entries
            for unit_data in units:
                UnitEntry.create(
                    army_list=army_list,
                    unit_name=unit_data["name"],
                    quantity=unit_data["quantity"],
                    points=unit_data["points"],
                    category=unit_data["category"],
                    upgrades=unit_data["upgrades"]
                )

            print(f"  ✓ Created list for {player_name} ({len(units)} units, {confidence:.2f} confidence)")

    print(f"\n✓ Sample data created successfully!")
    print(f"  Tournament: {tournament.name}")
    print(f"  Lists: {len(lists_data)}")
    print(f"  Total units: {UnitEntry.select().count()}")


def test_analytics():
    """Test analytics functions."""
    print("\n" + "="*60)
    print("Testing Analytics")
    print("="*60 + "\n")

    console = Console()
    generate_meta_report(faction="Solar Auxilia", points_level=2000, console=console)


if __name__ == "__main__":
    create_sample_data()
    test_analytics()
