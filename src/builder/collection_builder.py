"""Build lists based on user's model collection."""
import logging
from collections import defaultdict
from typing import Optional

from src.models import Collection, CollectionItem, db
from src.analytics.unit_popularity import get_unit_stats
from src.analytics.combo_detector import get_synergies_for_unit

logger = logging.getLogger(__name__)


class CollectionManager:
    """Manage user's model collection."""

    def __init__(self, collection_name: str = "My Collection"):
        """Initialize or load collection."""
        self.collection, _ = Collection.get_or_create(
            name=collection_name,
            user_id="default"
        )

    def add_unit(self, unit_name: str, quantity: int, notes: str = None):
        """Add or update unit in collection."""
        item, created = CollectionItem.get_or_create(
            collection=self.collection,
            unit_name=unit_name,
            defaults={"quantity": quantity, "notes": notes}
        )

        if not created:
            item.quantity = quantity
            if notes:
                item.notes = notes
            item.save()

        logger.info(f"{'Added' if created else 'Updated'}: {quantity}x {unit_name}")
        return item

    def remove_unit(self, unit_name: str):
        """Remove unit from collection."""
        deleted = CollectionItem.delete().where(
            (CollectionItem.collection == self.collection) &
            (CollectionItem.unit_name == unit_name)
        ).execute()

        logger.info(f"Removed {unit_name}" if deleted else f"{unit_name} not found")
        return deleted > 0

    def list_collection(self) -> list[dict]:
        """List all items in collection with meta stats."""
        items = []

        for item in self.collection.items:
            stats = get_unit_stats(item.unit_name)

            items.append({
                "unit_name": item.unit_name,
                "quantity": item.quantity,
                "notes": item.notes,
                "inclusion_rate": stats["inclusion_rate"],
                "trend": stats["trend"],
            })

        # Sort by inclusion rate descending
        items.sort(key=lambda x: x["inclusion_rate"], reverse=True)
        return items

    def get_available_units(self) -> dict[str, int]:
        """Get dict of available units and quantities."""
        return {
            item.unit_name: item.quantity
            for item in self.collection.items
        }


class ListGenerator:
    """Generate tournament-viable lists from collection."""

    def __init__(self, collection: Collection):
        self.collection = collection
        self.available = {
            item.unit_name: item.quantity
            for item in collection.items
        }

    def generate_lists(self, max_lists: int = 3) -> list[dict]:
        """
        Generate multiple list suggestions using different strategies.

        Strategies:
        1. Max popularity (most tournament-common units)
        2. Best synergies (units that work well together)
        3. Balanced (mix of categories)
        """
        lists = []

        # Strategy 1: Popularity-based
        popularity_list = self._generate_popularity_based()
        if popularity_list:
            lists.append({
                "name": "Tournament Meta List",
                "strategy": "Uses most popular tournament units from your collection",
                "units": popularity_list,
                "score": self._score_list(popularity_list, "popularity"),
            })

        # Strategy 2: Synergy-based
        synergy_list = self._generate_synergy_based()
        if synergy_list:
            lists.append({
                "name": "High Synergy List",
                "strategy": "Units that frequently appear together in winning lists",
                "units": synergy_list,
                "score": self._score_list(synergy_list, "synergy"),
            })

        # Strategy 3: Balanced
        balanced_list = self._generate_balanced()
        if balanced_list:
            lists.append({
                "name": "Balanced List",
                "strategy": "Even distribution across Force Organization categories",
                "units": balanced_list,
                "score": self._score_list(balanced_list, "balance"),
            })

        # Sort by score
        lists.sort(key=lambda x: x["score"], reverse=True)
        return lists[:max_lists]

    def _generate_popularity_based(self) -> Optional[list[dict]]:
        """Generate list using most popular units."""
        units_used = []
        remaining = self.available.copy()

        # Get all units sorted by popularity
        available_units = [
            (name, qty, get_unit_stats(name))
            for name, qty in remaining.items()
            if qty > 0
        ]

        # Sort by inclusion rate
        available_units.sort(key=lambda x: x[2]["inclusion_rate"], reverse=True)

        # Try to use top units
        for unit_name, max_qty, stats in available_units:
            if remaining[unit_name] > 0:
                # Use 1-2 of each popular unit
                use_qty = min(2, remaining[unit_name])

                units_used.append({
                    "unit_name": unit_name,
                    "quantity": use_qty,
                    "inclusion_rate": stats["inclusion_rate"],
                    "reason": f"Appears in {stats['inclusion_rate']:.0f}% of tournament lists"
                })

                remaining[unit_name] -= use_qty

        return units_used if units_used else None

    def _generate_synergy_based(self) -> Optional[list[dict]]:
        """Generate list focusing on unit synergies."""
        units_used = []
        remaining = self.available.copy()

        # Start with most popular unit
        available_units = [
            (name, qty, get_unit_stats(name))
            for name, qty in remaining.items()
            if qty > 0
        ]

        if not available_units:
            return None

        available_units.sort(key=lambda x: x[2]["inclusion_rate"], reverse=True)
        anchor_unit, max_qty, stats = available_units[0]

        # Add anchor unit
        use_qty = min(1, remaining[anchor_unit])
        units_used.append({
            "unit_name": anchor_unit,
            "quantity": use_qty,
            "inclusion_rate": stats["inclusion_rate"],
            "reason": f"Core unit ({stats['inclusion_rate']:.0f}% inclusion)"
        })
        remaining[anchor_unit] -= use_qty

        # Find synergies with anchor
        synergies = get_synergies_for_unit(anchor_unit)

        for syn in synergies:
            paired_unit = syn["paired_unit"]

            if paired_unit in remaining and remaining[paired_unit] > 0:
                use_qty = min(1, remaining[paired_unit])
                unit_stats = get_unit_stats(paired_unit)

                units_used.append({
                    "unit_name": paired_unit,
                    "quantity": use_qty,
                    "inclusion_rate": unit_stats["inclusion_rate"],
                    "reason": f"Pairs with {anchor_unit} ({syn['confidence']:.0f}% confidence)"
                })

                remaining[paired_unit] -= use_qty

        # Fill remaining with popular units
        for unit_name, max_qty, stats in available_units:
            if remaining[unit_name] > 0 and len(units_used) < 8:
                use_qty = min(1, remaining[unit_name])
                units_used.append({
                    "unit_name": unit_name,
                    "quantity": use_qty,
                    "inclusion_rate": stats["inclusion_rate"],
                    "reason": f"Fill slot ({stats['inclusion_rate']:.0f}% inclusion)"
                })
                remaining[unit_name] -= use_qty

        return units_used if units_used else None

    def _generate_balanced(self) -> Optional[list[dict]]:
        """Generate balanced list across categories."""
        units_used = []
        remaining = self.available.copy()

        # Categorize available units (simplified - would use BSData in Phase 2)
        categories = {
            "HQ": ["Legate Commander", "Auxilia Tactical Command Section"],
            "Troops": ["Lasrifle Section", "Veletaris Storm Section"],
            "Elites": ["Charonite Ogryns", "Auxilia Flamer Section"],
            "Heavy Support": ["Dracosan Armoured Transport", "Leman Russ Battle Tank",
                              "Leman Russ Battle Tank Squadron", "Malcador Heavy Tank"],
            "Fast Attack": ["Tarantula Sentry Gun Battery"],
        }

        # Try to include from each category
        for category, unit_names in categories.items():
            for unit_name in unit_names:
                if unit_name in remaining and remaining[unit_name] > 0:
                    use_qty = min(1, remaining[unit_name])
                    stats = get_unit_stats(unit_name)

                    units_used.append({
                        "unit_name": unit_name,
                        "quantity": use_qty,
                        "inclusion_rate": stats["inclusion_rate"],
                        "reason": f"{category} slot ({stats['inclusion_rate']:.0f}% inclusion)"
                    })

                    remaining[unit_name] -= use_qty
                    break  # One per category for balance

        return units_used if units_used else None

    def _score_list(self, units: list[dict], strategy: str) -> float:
        """Score a list based on meta strength."""
        if not units:
            return 0.0

        # Base score on average inclusion rate
        avg_inclusion = sum(u["inclusion_rate"] for u in units) / len(units)

        # Bonus for strategy
        strategy_bonus = {
            "popularity": 1.2,
            "synergy": 1.1,
            "balance": 1.0,
        }.get(strategy, 1.0)

        return avg_inclusion * strategy_bonus

    def recommend_purchases(self, top_n: int = 5) -> list[dict]:
        """Recommend what to buy next based on meta."""
        owned_units = set(self.available.keys())

        # Get all popular units
        from src.analytics.unit_popularity import calculate_unit_popularity
        all_units = calculate_unit_popularity(faction="Solar Auxilia")

        recommendations = []

        for unit_data in all_units[:15]:  # Top 15 tournament units
            unit_name = unit_data["unit_name"]

            if unit_name not in owned_units:
                recommendations.append({
                    "unit_name": unit_name,
                    "inclusion_rate": unit_data["inclusion_rate"],
                    "avg_quantity": unit_data["avg_quantity"],
                    "reason": f"Appears in {unit_data['inclusion_rate']:.0f}% of tournament lists",
                    "priority": "HIGH" if unit_data["inclusion_rate"] > 50 else "MEDIUM",
                })

        return recommendations[:top_n]
