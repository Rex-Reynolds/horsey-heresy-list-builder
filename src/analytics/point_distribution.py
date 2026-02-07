"""Point allocation and distribution analysis."""
import logging
from collections import defaultdict
from statistics import mean, median

from src.models import ArmyList, UnitEntry, Tournament

logger = logging.getLogger(__name__)


def analyze_point_distribution(
    faction: str = "Solar Auxilia",
    points_level: int = 2000
) -> dict:
    """
    Analyze point allocation across force organization categories.

    Args:
        faction: Faction to analyze
        points_level: Target points level (filter ±200 points)

    Returns:
        Dict with category breakdowns and statistics
    """
    # Get lists close to target points level
    min_points = points_level - 200
    max_points = points_level + 200

    lists = (
        ArmyList
        .select()
        .where(
            (ArmyList.faction == faction) &
            (ArmyList.points >= min_points) &
            (ArmyList.points <= max_points)
        )
    )

    total_lists = lists.count()
    if total_lists == 0:
        logger.warning(f"No {faction} lists found at {points_level}pts")
        return {}

    logger.info(f"Analyzing {total_lists} lists at ~{points_level}pts")

    # Collect category allocations
    category_data = defaultdict(list)

    for army_list in lists:
        category_totals = defaultdict(int)

        for entry in army_list.unit_entries:
            category = entry.category or "UNCATEGORIZED"
            category_totals[category] += entry.points if entry.points else 0

        # Calculate percentages
        list_total = sum(category_totals.values())
        if list_total > 0:
            for category, points in category_totals.items():
                percentage = (points / list_total) * 100
                category_data[category].append({
                    "points": points,
                    "percentage": percentage
                })

    # Calculate statistics per category
    results = {}
    for category, allocations in category_data.items():
        if not allocations:
            continue

        points_values = [a["points"] for a in allocations]
        percentage_values = [a["percentage"] for a in allocations]

        results[category] = {
            "mean_points": round(mean(points_values)),
            "median_points": round(median(points_values)),
            "mean_percentage": round(mean(percentage_values), 1),
            "median_percentage": round(median(percentage_values), 1),
            "sample_size": len(allocations),
        }

    logger.info(f"Analyzed distribution across {len(results)} categories")
    return results


def identify_efficient_units(
    faction: str = "Solar Auxilia",
    min_inclusion: float = 30.0
) -> list[dict]:
    """
    Identify "efficient" units with high inclusion but relatively low point cost.

    Args:
        faction: Faction to analyze
        min_inclusion: Minimum inclusion rate (%) to consider

    Returns:
        List of efficient unit dicts with: name, inclusion_rate, avg_points, efficiency_score
    """
    from src.analytics.unit_popularity import calculate_unit_popularity

    # Get popularity data
    popularity = calculate_unit_popularity(faction=faction)

    # Calculate average points per unit
    efficient_units = []

    for unit_data in popularity:
        if unit_data["inclusion_rate"] < min_inclusion:
            continue

        unit_name = unit_data["unit_name"]

        # Get average points for this unit across all lists
        entries = (
            UnitEntry
            .select()
            .join(ArmyList)
            .where(
                (UnitEntry.unit_name == unit_name) &
                (ArmyList.faction == faction) &
                (UnitEntry.points.is_null(False))
            )
        )

        if entries.count() == 0:
            continue

        points_list = [e.points for e in entries if e.points]
        avg_points = mean(points_list) if points_list else 0

        # Calculate efficiency score: inclusion_rate / (avg_points / 100)
        # Higher score = more efficient (popular but cheap)
        efficiency_score = unit_data["inclusion_rate"] / (avg_points / 100) if avg_points > 0 else 0

        efficient_units.append({
            "unit_name": unit_name,
            "inclusion_rate": unit_data["inclusion_rate"],
            "avg_points": round(avg_points),
            "efficiency_score": round(efficiency_score, 2),
        })

    # Sort by efficiency score
    efficient_units.sort(key=lambda x: x["efficiency_score"], reverse=True)

    logger.info(f"Identified {len(efficient_units)} efficient units")
    return efficient_units


def get_category_guidelines(points_level: int = 2000, faction: str = "Solar Auxilia") -> dict:
    """
    Get recommended point allocation guidelines by category.

    Returns dict with recommended min/max points per category.
    """
    distribution = analyze_point_distribution(faction=faction, points_level=points_level)

    guidelines = {}
    for category, stats in distribution.items():
        # Use median ± 20% as guideline range
        median_pct = stats["median_percentage"]
        min_pct = median_pct * 0.8
        max_pct = median_pct * 1.2

        min_points = int((min_pct / 100) * points_level)
        max_points = int((max_pct / 100) * points_level)

        guidelines[category] = {
            "recommended_percentage": round(median_pct, 1),
            "min_points": min_points,
            "max_points": max_points,
        }

    return guidelines
