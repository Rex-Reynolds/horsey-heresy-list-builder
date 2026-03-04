"""Database connection and base model setup."""
from datetime import datetime
from peewee import SqliteDatabase, Model, DateTimeField
from src.config import DB_PATH

# Initialize SQLite database connection with performance pragmas
db = SqliteDatabase(str(DB_PATH), pragmas={
    'journal_mode': 'wal',
    'cache_size': -8000,  # 8MB
    'synchronous': 'normal',
    'foreign_keys': 1,
})


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
    from src.models.catalogue import Unit, Weapon, Upgrade, UnitUpgrade, Detachment, UnitKeyword
    from src.models.roster import Roster, RosterDetachment, RosterEntry, LeaderAttachment
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
        UnitKeyword,
        Roster,
        RosterDetachment,
        RosterEntry,
        LeaderAttachment,
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
        ("unit", "budget_categories", "TEXT"),
        ("unit", "model_min", "INTEGER DEFAULT 1"),
        ("unit", "model_max", "INTEGER"),
        ("detachment", "parent_id", "VARCHAR(255)"),
        ("detachment", "unit_restrictions", "TEXT"),
        ("detachment", "faction", "VARCHAR(255)"),
        ("detachment", "costs", "TEXT"),
        ("unit", "is_legacy", "BOOLEAN DEFAULT 0"),
        ("detachment", "modifiers", "TEXT"),
        ("unit", "tercio_categories", "TEXT"),
        ("roster", "doctrine", "VARCHAR(255)"),
        ("unit", "cost_per_model", "INTEGER DEFAULT 0"),
        # Multi-game system columns
        ("unit", "game_system", "VARCHAR(32) DEFAULT 'hh3'"),
        ("weapon", "game_system", "VARCHAR(32) DEFAULT 'hh3'"),
        ("upgrade", "game_system", "VARCHAR(32) DEFAULT 'hh3'"),
        ("detachment", "game_system", "VARCHAR(32) DEFAULT 'hh3'"),
        ("roster", "game_system", "VARCHAR(32) DEFAULT 'hh3'"),
        ("roster", "faction", "VARCHAR(255)"),
        ("roster", "detachment_rule", "VARCHAR(255)"),
        ("unit", "points_brackets", "TEXT"),
        ("unit", "leader_targets", "TEXT"),
        ("detachment", "abilities", "TEXT"),
    ]

    for table, column, col_type in migrations:
        try:
            database.execute_sql(f"ALTER TABLE {table} ADD COLUMN {column} {col_type}")
        except Exception:
            # Column already exists
            pass
