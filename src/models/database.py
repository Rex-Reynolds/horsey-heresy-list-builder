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
    from src.models.catalogue import Unit, Weapon, Upgrade
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
        Roster,
        RosterEntry,
        Collection,
        CollectionItem,
    ], safe=True)
    db.close()
