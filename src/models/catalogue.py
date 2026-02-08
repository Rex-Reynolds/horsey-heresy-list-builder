"""BSData catalogue models."""
from peewee import CharField, IntegerField, TextField, ForeignKeyField, CompositeKey
from src.models.database import BaseModel


class Unit(BaseModel):
    """Represents a unit from the BSData catalogue."""

    bs_id = CharField(unique=True, index=True)  # BattleScribe UUID
    name = CharField(index=True)
    unit_type = CharField(index=True)  # HQ, Troops, Elites, Fast Attack, Heavy Support
    base_cost = IntegerField()
    profiles = TextField()  # JSON: model stats (WS, BS, S, T, W, I, A, LD, SAV, INV)
    rules = TextField(null=True)  # JSON: special rules
    constraints = TextField(null=True)  # JSON: min/max model counts


class Weapon(BaseModel):
    """Represents a weapon from the BSData catalogue."""

    bs_id = CharField(unique=True, index=True)
    name = CharField(index=True)
    range_value = CharField(null=True)
    strength = CharField(null=True)
    ap = CharField(null=True)
    weapon_type = CharField(null=True)  # Assault, Heavy, Rapid Fire, etc.
    special_rules = TextField(null=True)  # JSON: list of special rules
    profile = TextField(null=True)  # JSON: full weapon profile data
    cost = IntegerField(default=0)  # Points cost for weapon


class Upgrade(BaseModel):
    """Represents an upgrade/wargear option from the BSData catalogue."""

    bs_id = CharField(unique=True, index=True)
    name = CharField(index=True)
    cost = IntegerField()
    applicable_units = TextField()  # JSON: list of unit IDs this applies to
    upgrade_type = CharField(null=True)  # Weapon, Wargear, Special Rule, etc.
    upgrade_group = CharField(null=True)  # Group name for related upgrades
    constraints = TextField(null=True)  # JSON: min/max constraints


class UnitUpgrade(BaseModel):
    """Many-to-many: units ↔ available upgrades."""

    unit = ForeignKeyField(Unit, backref='available_upgrades', on_delete='CASCADE')
    upgrade = ForeignKeyField(Upgrade, backref='units', on_delete='CASCADE')
    min_quantity = IntegerField(default=0)
    max_quantity = IntegerField(default=1)
    group_name = CharField(null=True)  # "May exchange lasrifle for..."
    constraints = TextField(null=True)  # JSON: additional constraints

    class Meta:
        indexes = (
            (('unit', 'upgrade'), True),  # Unique composite index
        )


class Detachment(BaseModel):
    """FOC detachment types from .gst file."""

    bs_id = CharField(unique=True, index=True)
    name = CharField(index=True)  # "Crusade Primary Detachment"
    detachment_type = CharField()  # "Primary", "Auxiliary"
    constraints = TextField()  # JSON: {HQ: {min: 1, max: 2}, Troops: {min: 2, max: 6}, ...}
