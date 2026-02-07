"""Create comprehensive demo data with 10+ lists to showcase all features."""
from datetime import datetime, timedelta
from src.models import db, Tournament, ArmyList, UnitEntry, initialize_database
from src.scrapers.parsers import parse_army_list

# 10 diverse Solar Auxilia tournament lists
DEMO_LISTS = [
    # List 1 - Dracosan Rush
    """
    HQ:
    - Legate Commander [150pts]

    TROOPS:
    - 3x Lasrifle Section [180pts each]

    HEAVY SUPPORT:
    - 3x Dracosan Armoured Transport [200pts each]
    - Leman Russ Battle Tank Squadron [450pts]
      · 3x Leman Russ

    Total: 1990pts
    """,

    # List 2 - Balanced
    """
    HQ:
    - Legate Commander [140pts]

    TROOPS:
    - 2x Lasrifle Section [200pts each]
    - 2x Veletaris Storm Section [250pts each]

    ELITES:
    - Charonite Ogryns [180pts]

    HEAVY SUPPORT:
    - Dracosan Armoured Transport [200pts]
    - Leman Russ Battle Tank [300pts]

    Total: 2020pts
    """,

    # List 3 - Tank Heavy
    """
    HQ:
    - Auxilia Tactical Command Section [120pts]

    TROOPS:
    - 3x Lasrifle Section [180pts each]

    HEAVY SUPPORT:
    - 2x Leman Russ Battle Tank [300pts each]
    - Malcador Heavy Tank [400pts]
    - Dracosan Armoured Transport [180pts]

    Total: 1960pts
    """,

    # List 4 - Infantry Focus
    """
    HQ:
    - Legate Commander [150pts]

    TROOPS:
    - 4x Lasrifle Section [180pts each]
    - Veletaris Storm Section [250pts]

    ELITES:
    - Charonite Ogryns [180pts]
    - Auxilia Flamer Section [120pts]

    HEAVY SUPPORT:
    - Dracosan Armoured Transport [200pts]

    Total: 1940pts
    """,

    # List 5 - Dracosan spam
    """
    HQ:
    - Legate Commander [140pts]

    TROOPS:
    - 2x Lasrifle Section [200pts each]
    - 2x Veletaris Storm Section [250pts each]

    HEAVY SUPPORT:
    - 4x Dracosan Armoured Transport [190pts each]

    Total: 2000pts
    """,

    # List 6 - Elite infantry
    """
    HQ:
    - Auxilia Tactical Command Section [130pts]

    TROOPS:
    - 2x Lasrifle Section [200pts each]
    - 3x Veletaris Storm Section [240pts each]

    ELITES:
    - Charonite Ogryns [180pts]

    HEAVY SUPPORT:
    - Leman Russ Battle Tank Squadron [350pts]

    Total: 1990pts
    """,

    # List 7 - Mixed arms
    """
    HQ:
    - Legate Commander [150pts]

    TROOPS:
    - 3x Lasrifle Section [180pts each]

    ELITES:
    - Charonite Ogryns [180pts]

    FAST ATTACK:
    - Tarantula Sentry Gun Battery [150pts]

    HEAVY SUPPORT:
    - Dracosan Armoured Transport [200pts]
    - 2x Leman Russ Battle Tank [290pts each]

    Total: 1970pts
    """,

    # List 8 - Budget build
    """
    HQ:
    - Auxilia Tactical Command Section [120pts]

    TROOPS:
    - 4x Lasrifle Section [180pts each]

    ELITES:
    - Auxilia Flamer Section [120pts]

    HEAVY SUPPORT:
    - Dracosan Armoured Transport [200pts]
    - Leman Russ Battle Tank Squadron [460pts]
    - Malcador Heavy Tank [380pts]

    Total: 2000pts
    """,

    # List 9 - Veletaris core
    """
    HQ:
    - Legate Commander [140pts]

    TROOPS:
    - Lasrifle Section [200pts]
    - 4x Veletaris Storm Section [240pts each]

    HEAVY SUPPORT:
    - 2x Dracosan Armoured Transport [200pts each]

    Total: 1900pts
    """,

    # List 10 - Super-heavy
    """
    HQ:
    - Legate Commander [150pts]

    TROOPS:
    - 3x Lasrifle Section [180pts each]

    HEAVY SUPPORT:
    - Dracosan Armoured Transport [200pts]
    - Malcador Heavy Tank [420pts]
    - Leman Russ Battle Tank Squadron [340pts]

    Total: 1950pts
    """,

    # List 11 - Ogryn support
    """
    HQ:
    - Auxilia Tactical Command Section [130pts]

    TROOPS:
    - 2x Lasrifle Section [200pts each]
    - Veletaris Storm Section [250pts]

    ELITES:
    - 2x Charonite Ogryns [180pts each]

    HEAVY SUPPORT:
    - Dracosan Armoured Transport [200pts]
    - Leman Russ Battle Tank [300pts]

    Total: 1940pts
    """,

    # List 12 - Balanced meta
    """
    HQ:
    - Legate Commander [150pts]

    TROOPS:
    - 2x Lasrifle Section [200pts each]
    - 2x Veletaris Storm Section [250pts each]

    HEAVY SUPPORT:
    - 2x Dracosan Armoured Transport [200pts each]
    - Leman Russ Battle Tank [300pts]

    Total: 2000pts
    """,
]

def create_demo_data():
    """Create demo tournament with 12 lists."""
    print("Creating demo tournament data with 12 lists...")
    initialize_database()

    with db.atomic():
        # Create or get tournament
        tournament, created = Tournament.get_or_create(
            bcp_event_id="demo_001",
            defaults={
                "name": "Horus Heresy GT Demo 2026",
                "date": (datetime.now() - timedelta(days=15)).date(),
                "location": "Virtual",
                "player_count": len(DEMO_LISTS),
            }
        )

        if not created:
            print("  ℹ Tournament exists, clearing old data...")
            ArmyList.delete().where(ArmyList.tournament == tournament).execute()

        # Create lists
        for idx, list_text in enumerate(DEMO_LISTS, 1):
            units, confidence = parse_army_list(list_text)

            army_list = ArmyList.create(
                tournament=tournament,
                player_name=f"Demo Player {idx}",
                faction="Solar Auxilia",
                list_text=list_text,
                points=2000,
                parse_confidence=confidence
            )

            for unit_data in units:
                UnitEntry.create(
                    army_list=army_list,
                    unit_name=unit_data["name"],
                    quantity=unit_data["quantity"],
                    points=unit_data["points"],
                    category=unit_data["category"],
                    upgrades=unit_data["upgrades"]
                )

            print(f"  ✓ Created list {idx}/12 ({len(units)} units, {confidence:.2f} confidence)")

    print(f"\n✓ Demo data created!")
    print(f"  Lists: {len(DEMO_LISTS)}")
    print(f"  Total unit entries: {UnitEntry.select().count()}")
    print(f"\nNow run: auxilia tournament stats")

if __name__ == "__main__":
    create_demo_data()
