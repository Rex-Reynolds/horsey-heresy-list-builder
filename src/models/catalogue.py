"""BSData catalogue models."""
import json

from peewee import BooleanField, CharField, IntegerField, TextField, ForeignKeyField, CompositeKey
from src.models.database import BaseModel


class Unit(BaseModel):
    """Represents a unit from the BSData catalogue."""

    bs_id = CharField(unique=True, index=True)  # BattleScribe UUID
    name = CharField(index=True)
    unit_type = CharField(index=True)  # Native slot: Armour/Support/Recon (HH3), Character/Battleline (40k)
    bsdata_category = CharField(null=True, index=True)  # Same as unit_type (deprecated, kept for compat)
    base_cost = IntegerField()
    profiles = TextField()  # JSON: model stats
    rules = TextField(null=True)  # JSON: special rules
    constraints = TextField(null=True)  # JSON: min/max model counts
    budget_categories = TextField(null=True)  # JSON: list of budget-relevant category IDs
    cost_per_model = IntegerField(default=0)  # Cost of one additional model beyond minimum
    model_min = IntegerField(default=1)
    model_max = IntegerField(null=True)  # None = no upper bound
    is_legacy = BooleanField(default=False)  # Expanded/Legacy unit from Legacies PDF
    tercio_categories = TextField(null=True)  # JSON: list of tercio unlock category IDs
    game_system = CharField(index=True, default="hh3")  # "hh3" or "40k10e"
    points_brackets = TextField(null=True)  # JSON: [{"models": 5, "cost": 65}, ...] (40k discrete sizing)
    leader_targets = TextField(null=True)  # JSON: list of unit names this leader can attach to (40k)


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
    game_system = CharField(index=True, default="hh3")


class Upgrade(BaseModel):
    """Represents an upgrade/wargear option from the BSData catalogue."""

    bs_id = CharField(unique=True, index=True)
    name = CharField(index=True)
    cost = IntegerField()
    applicable_units = TextField()  # JSON: list of unit IDs this applies to
    upgrade_type = CharField(null=True)  # Weapon, Wargear, Special Rule, etc.
    upgrade_group = CharField(null=True)  # Group name for related upgrades
    constraints = TextField(null=True)  # JSON: min/max constraints
    game_system = CharField(index=True, default="hh3")


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
    name = CharField(index=True)  # "Crusade Primary Detachment" (HH3) or "Ascension Day" (40k)
    detachment_type = CharField()  # "Primary"/"Auxiliary"/"Apex" (HH3) or "Detachment" (40k)
    parent_id = CharField(null=True)  # bs_id of parent (for sub-detachments)
    constraints = TextField()  # JSON: {slot_name: {min, max}}
    unit_restrictions = TextField(null=True)  # JSON: {slot_name: [allowed unit name patterns]}
    faction = CharField(null=True, index=True)  # "Solar Auxilia", "Genestealer Cults", etc.
    costs = TextField(null=True)  # JSON: {auxiliary: int, apex: int}
    modifiers = TextField(null=True)  # JSON: parsed modifier rules for dynamic slot/cost adjustments
    game_system = CharField(index=True, default="hh3")
    abilities = TextField(null=True)  # JSON: detachment rule, enhancements, stratagems (40k)


class UnitKeyword(BaseModel):
    """Keywords for units (INFANTRY, CHARACTER, BATTLELINE, etc.)."""

    unit = ForeignKeyField(Unit, backref='keywords', on_delete='CASCADE')
    keyword = CharField(index=True)
    keyword_type = CharField(default="keyword")  # "keyword", "faction", "core"

    class Meta:
        indexes = (
            (('unit', 'keyword'), True),  # Unique per unit+keyword
        )
