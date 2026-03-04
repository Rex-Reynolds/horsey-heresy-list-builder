"""HH3 composition validator — wraps existing CompositionValidator."""
from typing import Optional
from src.gamesystems.base import BaseCompositionValidator


class HH3CompositionValidator(BaseCompositionValidator):
    """Adapter wrapping existing HH3 composition + FOC validators."""

    def __init__(self):
        from src.bsdata.composition_validator import CompositionValidator
        self._comp = CompositionValidator()

    def validate(self, roster) -> tuple[bool, list[str]]:
        return roster.validate()

    def can_add_unit(self, roster, unit, detachment) -> tuple[bool, Optional[str]]:
        # HH3 uses can_add_detachment for composition; unit-level is checked via FOC
        return True, None
