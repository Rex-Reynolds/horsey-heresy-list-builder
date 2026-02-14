"""Database connection and base model setup."""
from datetime import datetime
from peewee import SqliteDatabase, Model, DateTimeField
from src.config import DB_PATH

# Initialize SQLite database connection
db = SqliteDatabase(str(DB_PATH))


class BaseModel(Model):
    """Base model with common fields for all models."""

    created_at = DateTimeField(default=datetime.now)
    updated_at = DateTimeField(default=datetime.now)

    class Meta:
        database = db

    def save(self, *args, **kwargs):
        """Override save to update the updated_at timestamp."""
        self.updated_at = datetime.now()
        return super().save(*args, **kwargs)


def initialize_database():
    """Initialize the database and create all tables."""
    from src.models.tournament import Tournament, ArmyList, UnitEntry
    from src.models.catalogue import Unit, Weapon, Upgrade, UnitUpgrade, Detachment
    from src.models.roster import Roster, RosterEntry
    from src.models.collection import Collection, CollectionItem

    db.connect()
    db.create_tables([
        Tournament,
        ArmyList,
        UnitEntry,
        Unit,
        Weapon,
        Upgrade,
        UnitUpgrade,
        Detachment,
        Roster,
        RosterEntry,
        Collection,
        CollectionItem,
    ], safe=True)

    # Migrate: add new columns if they don't exist (SQLite ALTER TABLE)
    _migrate_add_columns(db)

    db.close()


def _migrate_add_columns(database):
    """Add new columns to existing tables (safe for repeated runs)."""
    migrations = [
        ("unit", "bsdata_category", "VARCHAR(255)"),
        ("detachment", "parent_id", "VARCHAR(255)"),
        ("detachment", "unit_restrictions", "TEXT"),
        ("detachment", "faction", "VARCHAR(255)"),
    ]

    for table, column, col_type in migrations:
        try:
            database.execute_sql(f"ALTER TABLE {table} ADD COLUMN {column} {col_type}")
        except Exception:
            # Column already exists
            pass
