"""User roster models for list building."""
import json
import logging
from peewee import CharField, IntegerField, TextField, ForeignKeyField
from src.models.database import BaseModel
from src.models.catalogue import Unit

logger = logging.getLogger(__name__)


class Roster(BaseModel):
    """Represents a user-created army roster."""

    name = CharField(default="Unnamed List")
    user_id = CharField(default="default")  # Future: user authentication
    detachment_type = CharField()  # Auxiliary, Apex, etc.
    points_limit = IntegerField()
    total_points = IntegerField(default=0)
    is_valid = IntegerField(default=0)  # Boolean: FOC validation status
    validation_errors = TextField(null=True)  # JSON: list of validation errors

    def validate(self):
        """Run FOC validation, update is_valid and validation_errors."""
        from src.bsdata.foc_validator import FOCValidator

        try:
            validator = FOCValidator(self.detachment_type)
            is_valid, errors = validator.validate_roster(self.entries)

            self.is_valid = 1 if is_valid else 0
            self.validation_errors = json.dumps(errors) if errors else None
            self.save()

            if is_valid:
                logger.info(f"✓ Roster '{self.name}' is valid")
            else:
                logger.warning(f"✗ Roster '{self.name}' validation failed: {len(errors)} error(s)")

            return is_valid, errors

        except Exception as e:
            logger.error(f"Validation failed for roster '{self.name}': {e}")
            self.is_valid = 0
            self.validation_errors = json.dumps([f"Validation error: {str(e)}"])
            self.save()
            return False, [f"Validation error: {str(e)}"]

    def calculate_total_points(self):
        """Calculate and update total_points."""
        from src.bsdata.points_calculator import PointsCalculator

        try:
            total = PointsCalculator.calculate_roster_total(self)
            self.total_points = total
            self.save()

            logger.info(f"Roster '{self.name}' total: {total} points")
            return total

        except Exception as e:
            logger.error(f"Failed to calculate points for roster '{self.name}': {e}")
            return self.total_points

    def get_validation_status(self) -> dict:
        """
        Get detailed validation status.

        Returns:
            Dict with validation info
        """
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

    def refresh(self):
        """Recalculate points and revalidate roster."""
        self.calculate_total_points()
        return self.validate()


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
