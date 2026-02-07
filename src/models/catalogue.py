"""BSData catalogue models."""
from peewee import CharField, IntegerField, TextField
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


class Upgrade(BaseModel):
    """Represents an upgrade/wargear option from the BSData catalogue."""

    bs_id = CharField(unique=True, index=True)
    name = CharField(index=True)
    cost = IntegerField()
    applicable_units = TextField()  # JSON: list of unit IDs this applies to
    upgrade_type = CharField(null=True)  # Weapon, Wargear, Special Rule, etc.
