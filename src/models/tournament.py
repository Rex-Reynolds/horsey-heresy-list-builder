"""Tournament data models."""
from peewee import (
    CharField, DateField, IntegerField, TextField,
    ForeignKeyField, FloatField
)
from src.models.database import BaseModel


class Tournament(BaseModel):
    """Represents a Horus Heresy tournament."""

    name = CharField(index=True)
    date = DateField(index=True)
    location = CharField(null=True)
    player_count = IntegerField(default=0)
    bcp_event_id = CharField(unique=True, null=True)  # Best Coast Pairings ID

    class Meta:
        indexes = (
            (('name', 'date'), False),  # Composite index for uniqueness check
        )


class ArmyList(BaseModel):
    """Represents a player's army list submitted to a tournament."""

    tournament = ForeignKeyField(Tournament, backref='army_lists', on_delete='CASCADE')
    player_name = CharField(index=True)
    faction = CharField(index=True)
    list_text = TextField()  # Raw list text as submitted
    points = IntegerField(null=True)
    placement = IntegerField(null=True)  # Final tournament placement
    parse_confidence = FloatField(default=0.0)  # Quality of parsing (0-1)

    class Meta:
        indexes = (
            (('tournament', 'player_name'), False),
        )


class UnitEntry(BaseModel):
    """Represents a parsed unit entry from an army list."""

    army_list = ForeignKeyField(ArmyList, backref='unit_entries', on_delete='CASCADE')
    unit_name = CharField(index=True)  # Normalized unit name
    quantity = IntegerField(default=1)
    points = IntegerField(null=True)
    category = CharField(null=True)  # HQ, Troops, Elites, etc.
    upgrades = TextField(null=True)  # Raw upgrade text

    class Meta:
        indexes = (
            (('unit_name',), False),
            (('army_list', 'unit_name'), False),
        )
