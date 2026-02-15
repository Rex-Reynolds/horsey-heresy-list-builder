"""User roster models for list building."""
import json
import logging
from peewee import CharField, IntegerField, TextField, ForeignKeyField
from src.models.database import BaseModel
from src.models.catalogue import Unit, Detachment

logger = logging.getLogger(__name__)


class Roster(BaseModel):
    """Represents a user-created army roster."""

    name = CharField(default="Unnamed List")
    user_id = CharField(default="default")  # Future: user authentication
    points_limit = IntegerField()
    total_points = IntegerField(default=0)
    is_valid = IntegerField(default=0)  # Boolean: FOC validation status
    validation_errors = TextField(null=True)  # JSON: list of validation errors

    def calculate_total_points(self):
        """Calculate and update total_points from all detachments' entries."""
        total = 0
        for rd in self.detachments:
            for entry in rd.entries:
                if entry.total_cost:
                    total += entry.total_cost
        self.total_points = total
        self.save()
        return total

    def validate(self):
        """Run per-detachment validation, update is_valid and validation_errors."""
        all_errors = []

        # Composition rules (detachment budget)
        from src.bsdata.composition_validator import CompositionValidator
        comp = CompositionValidator()
        comp_errors = comp.validate_composition(self)
        all_errors.extend(comp_errors)

        for rd in self.detachments:
            det_errors = rd.validate()
            all_errors.extend(det_errors)

        # Check points limit
        if self.total_points > self.points_limit:
            all_errors.append(
                f"Over points limit: {self.total_points}/{self.points_limit}"
            )

        self.is_valid = 1 if len(all_errors) == 0 else 0
        self.validation_errors = json.dumps(all_errors) if all_errors else None
        self.save()

        return len(all_errors) == 0, all_errors

    def get_validation_status(self) -> dict:
        """Get detailed validation status."""
        errors = []
        if self.validation_errors:
            try:
                errors = json.loads(self.validation_errors)
            except json.JSONDecodeError:
                errors = [self.validation_errors]

        return {
            'is_valid': bool(self.is_valid),
            'errors': errors,
            'total_points': self.total_points,
            'points_limit': self.points_limit,
            'over_points': self.total_points > self.points_limit if self.points_limit else False,
        }


class RosterDetachment(BaseModel):
    """Links a roster to a specific detachment with ordering."""

    roster = ForeignKeyField(Roster, backref='detachments', on_delete='CASCADE')
    detachment = ForeignKeyField(Detachment, null=True)  # FK to Detachment table
    detachment_name = CharField()  # Cached name for display
    detachment_type = CharField()  # "Primary", "Auxiliary", "Apex"
    sort_order = IntegerField(default=0)

    def get_slot_status(self) -> dict:
        """
        Get slot fill status for this detachment.

        Returns:
            Dict of {slot_name: {min, max, filled, restriction}}
        """
        # Load detachment constraints
        det = self.detachment
        if not det:
            return {}

        constraints = json.loads(det.constraints) if det.constraints else {}
        unit_restrictions = json.loads(det.unit_restrictions) if det.unit_restrictions else {}

        # Count entries per slot
        slot_counts = {}
        for entry in self.entries:
            slot = entry.category
            slot_counts[slot] = slot_counts.get(slot, 0) + entry.quantity

        # Build status
        slots = {}
        for slot_name, limits in constraints.items():
            slots[slot_name] = {
                'min': limits.get('min', 0),
                'max': limits.get('max', 0),
                'filled': slot_counts.get(slot_name, 0),
                'restriction': unit_restrictions.get(slot_name),
            }

        return slots

    def validate(self) -> list:
        """Validate this detachment's entries against its constraints."""
        errors = []
        slots = self.get_slot_status()

        for slot_name, status in slots.items():
            if status['filled'] < status['min']:
                errors.append(
                    f"[{self.detachment_name}] {slot_name}: "
                    f"minimum {status['min']} required, found {status['filled']}"
                )
            if status['filled'] > status['max']:
                errors.append(
                    f"[{self.detachment_name}] {slot_name}: "
                    f"maximum {status['max']} allowed, found {status['filled']}"
                )

        # Check for entries in slots not allowed by this detachment
        det = self.detachment
        if det:
            constraints = json.loads(det.constraints) if det.constraints else {}
            for entry in self.entries:
                if entry.category not in constraints:
                    errors.append(
                        f"[{self.detachment_name}] {entry.unit_name}: "
                        f"slot '{entry.category}' not available in this detachment"
                    )

        return errors

    class Meta:
        indexes = (
            (('roster', 'sort_order'), False),
        )


class RosterEntry(BaseModel):
    """Represents a unit entry in a roster, assigned to a specific detachment."""

    roster_detachment = ForeignKeyField(
        RosterDetachment, backref='entries', on_delete='CASCADE'
    )
    unit = ForeignKeyField(Unit, null=True)  # Link to catalogue unit
    unit_name = CharField()  # Cached for display
    quantity = IntegerField(default=1)
    upgrades = TextField(null=True)  # JSON: selected upgrades
    total_cost = IntegerField()
    category = CharField()  # Native HH3 slot name (e.g., "Armour", "Recon")

    class Meta:
        indexes = (
            (('roster_detachment', 'unit_name'), False),
        )
