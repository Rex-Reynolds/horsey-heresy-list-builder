"""Shared fixtures for API tests.

Uses a temporary SQLite file so the test thread and the ASGI thread
(used by FastAPI's TestClient) share the same database.
"""
import json
import os
import sys
import tempfile
from pathlib import Path

import pytest

# Ensure imports resolve from project root
sys.path.insert(0, str(Path(__file__).parent.parent))

# Force non-production mode
os.environ["ENVIRONMENT"] = "development"

from src.models.database import db
from src.models.catalogue import Unit, Weapon, Upgrade, UnitUpgrade, Detachment
from src.models.roster import Roster, RosterDetachment, RosterEntry
from src.models.tournament import Tournament, ArmyList, UnitEntry
from src.models.collection import Collection, CollectionItem

ALL_MODELS = [
    Tournament, ArmyList, UnitEntry,
    Unit, Weapon, Upgrade, UnitUpgrade, Detachment,
    Roster, RosterDetachment, RosterEntry,
    Collection, CollectionItem,
]


@pytest.fixture(autouse=True)
def _use_test_db(tmp_path):
    """Point the shared db at a temp file for full test isolation.

    A file-based DB is needed because TestClient runs the ASGI lifespan
    in a separate thread, and SQLite :memory: databases are per-connection.
    """
    db_path = str(tmp_path / "test.db")
    db.init(db_path, pragmas={"foreign_keys": 1})
    db.connect()
    db.create_tables(ALL_MODELS)
    yield
    db.drop_tables(ALL_MODELS)
    db.close()


@pytest.fixture()
def client():
    """FastAPI TestClient wired to the temp database, rate limiting disabled."""
    from fastapi.testclient import TestClient
    from api.main import app, limiter

    # Clear module-level caches so stale data doesn't leak between tests
    import api.main as api_mod
    api_mod._detachments_cache = None
    api_mod._doctrines_cache = None

    # Disable rate limiting for tests
    limiter.enabled = False

    client = TestClient(app, raise_server_exceptions=False)
    yield client
    limiter.enabled = True


@pytest.fixture()
def seed_units():
    """Seed a handful of representative units."""
    units = []
    for i, (name, unit_type, cost) in enumerate([
        ("Tactical Auxiliaries", "Line", 100),
        ("Veletaris Storm Section", "Line", 135),
        ("Auxilia Leman Russ Strike Squadron", "Armour", 200),
        ("Auxilia Malcador Heavy Tank", "Armour", 300),
        ("Legate Commander", "Command", 85),
        ("Aethon Heavy Sentinel", "War-engine", 175),
    ]):
        profiles = json.dumps([{
            "type": "Profile",
            "characteristics": {"WS": "3", "BS": "4", "S": "3", "T": "3", "W": "1"},
        }])
        u = Unit.create(
            bs_id=f"test-unit-{i}",
            name=name,
            unit_type=unit_type,
            base_cost=cost,
            profiles=profiles,
            model_min=1,
            model_max=20 if unit_type == "Line" else 3,
        )
        units.append(u)
    return units


@pytest.fixture()
def seed_detachment():
    """Seed a basic Primary detachment with common slots."""
    constraints = {
        "Command": {"min": 1, "max": 1},
        "Line": {"min": 2, "max": 6},
        "Armour": {"min": 0, "max": 3},
        "War-engine": {"min": 0, "max": 1},
    }
    # Primary detachments cost 0 auxiliary (they're free)
    costs = {"auxiliary": 0, "apex": 0}
    return Detachment.create(
        bs_id="test-det-primary",
        name="Test Primary Detachment",
        detachment_type="Primary",
        constraints=json.dumps(constraints),
        costs=json.dumps(costs),
    )


@pytest.fixture()
def seed_auxiliary_detachment():
    """Seed an Auxiliary detachment."""
    constraints = {
        "Line": {"min": 1, "max": 4},
        "Armour": {"min": 0, "max": 2},
    }
    costs = {"auxiliary": 1, "apex": 0}
    return Detachment.create(
        bs_id="test-det-auxiliary",
        name="Test Auxiliary Detachment",
        detachment_type="Auxiliary",
        constraints=json.dumps(constraints),
        costs=json.dumps(costs),
    )


@pytest.fixture()
def seed_upgrades(seed_units):
    """Seed some upgrades and link them to the first unit."""
    upgrades = []
    for i, (name, cost) in enumerate([
        ("Blast Charger", 10),
        ("Shroud Bombs", 5),
    ]):
        up = Upgrade.create(
            bs_id=f"test-upg-{i}",
            name=name,
            cost=cost,
            applicable_units=json.dumps([seed_units[0].bs_id]),
        )
        UnitUpgrade.create(
            unit=seed_units[0],
            upgrade=up,
            group_name="Wargear",
            min_quantity=0,
            max_quantity=1,
        )
        upgrades.append(up)
    return upgrades
