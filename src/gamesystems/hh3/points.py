"""HH3 points calculator — wraps existing PointsCalculator."""
from src.gamesystems.base import BasePointsCalculator
from src.bsdata.points_calculator import PointsCalculator


class HH3PointsCalculator(BasePointsCalculator):
    """HH3: base_cost + cost_per_model * extra models + upgrades."""

    def calculate_unit_cost(self, unit, upgrades: list, quantity: int) -> int:
        return PointsCalculator.calculate_unit_cost(unit, upgrades, quantity)
