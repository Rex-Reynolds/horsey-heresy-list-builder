"""User roster models for list building."""
from peewee import CharField, IntegerField, TextField, ForeignKeyField
from src.models.database import BaseModel
from src.models.catalogue import Unit


class Roster(BaseModel):
    """Represents a user-created army roster."""

    name = CharField(default="Unnamed List")
    user_id = CharField(default="default")  # Future: user authentication
    detachment_type = CharField()  # Auxiliary, Apex, etc.
    points_limit = IntegerField()
    total_points = IntegerField(default=0)
    is_valid = IntegerField(default=0)  # Boolean: FOC validation status
    validation_errors = TextField(null=True)  # JSON: list of validation errors


class RosterEntry(BaseModel):
    """Represents a unit entry in a roster."""

    roster = ForeignKeyField(Roster, backref='entries', on_delete='CASCADE')
    unit = ForeignKeyField(Unit, null=True)  # Link to catalogue unit
    unit_name = CharField()  # Cached for display
    quantity = IntegerField(default=1)
    upgrades = TextField(null=True)  # JSON: selected upgrades
    total_cost = IntegerField()
    category = CharField()  # HQ, Troops, etc.

    class Meta:
        indexes = (
            (('roster', 'unit_name'), False),
        )
