"""Unit popularity analysis."""
import logging
from datetime import datetime, timedelta
from collections import defaultdict
from peewee import fn

from src.models import ArmyList, UnitEntry, Tournament
from src.config import RECENT_MONTHS

logger = logging.getLogger(__name__)


def calculate_unit_popularity(
    faction: str = "Solar Auxilia",
    months: int = RECENT_MONTHS,
    min_lists: int = 5
) -> list[dict]:
    """
    Calculate unit popularity metrics.

    Args:
        faction: Faction to analyze
        months: Number of recent months to analyze
        min_lists: Minimum number of lists required for inclusion

    Returns:
        List of dicts with: unit_name, inclusion_rate, avg_quantity, count, trend
    """
    # Calculate date cutoff
    cutoff_date = datetime.now() - timedelta(days=months * 30)

    # Get all relevant army lists
    lists = (
        ArmyList
        .select()
        .join(Tournament)
        .where(
            (ArmyList.faction == faction) &
            (Tournament.date >= cutoff_date.date())
        )
    )

    total_lists = lists.count()
    if total_lists < min_lists:
        logger.warning(f"Only {total_lists} lists found, need at least {min_lists}")
        return []

    logger.info(f"Analyzing {total_lists} {faction} lists from last {months} months")

    # Count unit occurrences
    unit_stats = defaultdict(lambda: {"count": 0, "total_quantity": 0})

    for army_list in lists:
        list_units = set()  # Track unique units per list
        for entry in army_list.unit_entries:
            unit_name = entry.unit_name
            list_units.add(unit_name)
            unit_stats[unit_name]["total_quantity"] += entry.quantity

        # Increment count for each unique unit in this list
        for unit_name in list_units:
            unit_stats[unit_name]["count"] += 1

    # Calculate metrics
    results = []
    for unit_name, stats in unit_stats.items():
        inclusion_rate = (stats["count"] / total_lists) * 100
        avg_quantity = stats["total_quantity"] / stats["count"] if stats["count"] > 0 else 0

        # Calculate trend (compare last 3 months vs previous 3 months)
        trend = _calculate_trend(unit_name, faction)

        results.append({
            "unit_name": unit_name,
            "inclusion_rate": round(inclusion_rate, 1),
            "avg_quantity": round(avg_quantity, 1),
            "count": stats["count"],
            "trend": trend,
        })

    # Sort by inclusion rate
    results.sort(key=lambda x: x["inclusion_rate"], reverse=True)

    logger.info(f"Calculated popularity for {len(results)} units")
    return results


def _calculate_trend(unit_name: str, faction: str) -> str:
    """
    Calculate trend direction for a unit.

    Returns: "↑" (increasing), "↓" (decreasing), "→" (stable)
    """
    try:
        # Get lists from last 3 months
        recent_cutoff = datetime.now() - timedelta(days=90)
        recent_lists = (
            ArmyList
            .select()
            .join(Tournament)
            .where(
                (ArmyList.faction == faction) &
                (Tournament.date >= recent_cutoff.date())
            )
        )
        recent_total = recent_lists.count()

        # Get lists from 3-6 months ago
        previous_start = datetime.now() - timedelta(days=180)
        previous_end = datetime.now() - timedelta(days=90)
        previous_lists = (
            ArmyList
            .select()
            .join(Tournament)
            .where(
                (ArmyList.faction == faction) &
                (Tournament.date >= previous_start.date()) &
                (Tournament.date < previous_end.date())
            )
        )
        previous_total = previous_lists.count()

        if recent_total < 3 or previous_total < 3:
            return "→"

        # Count unit appearances
        recent_count = (
            UnitEntry
            .select()
            .join(ArmyList)
            .join(Tournament)
            .where(
                (UnitEntry.unit_name == unit_name) &
                (ArmyList.faction == faction) &
                (Tournament.date >= recent_cutoff.date())
            )
            .count()
        )

        previous_count = (
            UnitEntry
            .select()
            .join(ArmyList)
            .join(Tournament)
            .where(
                (UnitEntry.unit_name == unit_name) &
                (ArmyList.faction == faction) &
                (Tournament.date >= previous_start.date()) &
                (Tournament.date < previous_end.date())
            )
            .count()
        )

        recent_rate = recent_count / recent_total
        previous_rate = previous_count / previous_total if previous_total > 0 else 0

        # Calculate change percentage
        if previous_rate == 0:
            return "↑" if recent_rate > 0 else "→"

        change = ((recent_rate - previous_rate) / previous_rate) * 100

        if change > 10:
            return "↑"
        elif change < -10:
            return "↓"
        else:
            return "→"

    except Exception as e:
        logger.debug(f"Could not calculate trend for {unit_name}: {e}")
        return "→"


def get_top_units(faction: str = "Solar Auxilia", limit: int = 10) -> list[dict]:
    """Get top N most popular units."""
    all_units = calculate_unit_popularity(faction=faction)
    return all_units[:limit]


def get_unit_stats(unit_name: str, faction: str = "Solar Auxilia") -> dict:
    """Get detailed statistics for a specific unit."""
    popularity = calculate_unit_popularity(faction=faction)

    for unit in popularity:
        if unit["unit_name"] == unit_name:
            return unit

    return {
        "unit_name": unit_name,
        "inclusion_rate": 0.0,
        "avg_quantity": 0.0,
        "count": 0,
        "trend": "→",
    }
