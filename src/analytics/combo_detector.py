"""Unit combination and synergy detection."""
import logging
from collections import defaultdict
from itertools import combinations

from src.models import ArmyList, UnitEntry
from src.config import MIN_SUPPORT, CONFIDENCE_THRESHOLD

logger = logging.getLogger(__name__)


def detect_unit_combos(
    faction: str = "Solar Auxilia",
    min_support: float = MIN_SUPPORT,
    min_confidence: float = CONFIDENCE_THRESHOLD
) -> list[dict]:
    """
    Detect frequently co-occurring unit combinations using association rules.

    Uses a simplified Apriori-like algorithm:
    - Support: % of lists containing both units
    - Confidence: P(Y|X) = % of lists with X that also have Y

    Args:
        faction: Faction to analyze
        min_support: Minimum support threshold (0-1)
        min_confidence: Minimum confidence threshold (0-1)

    Returns:
        List of combo dicts with: unit_a, unit_b, support, confidence, lift
    """
    # Get all lists for faction
    lists = ArmyList.select().where(ArmyList.faction == faction)
    total_lists = lists.count()

    if total_lists < 10:
        logger.warning(f"Only {total_lists} lists, need at least 10 for combo detection")
        return []

    logger.info(f"Detecting combos in {total_lists} {faction} lists")

    # Build list of units per army list
    list_units = defaultdict(set)
    all_units = set()

    for army_list in lists:
        for entry in army_list.unit_entries:
            list_units[army_list.id].add(entry.unit_name)
            all_units.add(entry.unit_name)

    logger.debug(f"Found {len(all_units)} unique units")

    # Count unit occurrences
    unit_counts = defaultdict(int)
    for units in list_units.values():
        for unit in units:
            unit_counts[unit] += 1

    # Find frequent pairs (support >= min_support)
    combos = []

    for unit_a, unit_b in combinations(sorted(all_units), 2):
        # Count co-occurrences
        co_occurrence = sum(
            1 for units in list_units.values()
            if unit_a in units and unit_b in units
        )

        # Calculate support: % of lists with both
        support = co_occurrence / total_lists

        if support < min_support:
            continue

        # Calculate confidence: P(B|A) and P(A|B)
        count_a = unit_counts[unit_a]
        count_b = unit_counts[unit_b]

        confidence_a_to_b = co_occurrence / count_a if count_a > 0 else 0
        confidence_b_to_a = co_occurrence / count_b if count_b > 0 else 0

        # Use higher confidence direction
        if confidence_a_to_b >= confidence_b_to_a:
            primary_unit = unit_a
            secondary_unit = unit_b
            confidence = confidence_a_to_b
        else:
            primary_unit = unit_b
            secondary_unit = unit_a
            confidence = confidence_b_to_a

        if confidence < min_confidence:
            continue

        # Calculate lift: how much more likely than random
        # Lift = P(A,B) / (P(A) * P(B))
        prob_a = count_a / total_lists
        prob_b = count_b / total_lists
        expected_co_occurrence = prob_a * prob_b
        lift = support / expected_co_occurrence if expected_co_occurrence > 0 else 0

        combos.append({
            "unit_a": primary_unit,
            "unit_b": secondary_unit,
            "support": round(support * 100, 1),  # Convert to percentage
            "confidence": round(confidence * 100, 1),
            "lift": round(lift, 2),
            "count": co_occurrence,
        })

    # Sort by confidence, then support
    combos.sort(key=lambda x: (x["confidence"], x["support"]), reverse=True)

    logger.info(f"Found {len(combos)} unit combinations")
    return combos


def get_synergies_for_unit(
    unit_name: str,
    faction: str = "Solar Auxilia",
    limit: int = 5
) -> list[dict]:
    """
    Get top synergy recommendations for a specific unit.

    Args:
        unit_name: Unit to find synergies for
        faction: Faction to analyze
        limit: Maximum number of recommendations

    Returns:
        List of synergy dicts with paired unit and confidence
    """
    all_combos = detect_unit_combos(faction=faction)

    synergies = [
        {
            "paired_unit": combo["unit_b"],
            "confidence": combo["confidence"],
            "support": combo["support"],
        }
        for combo in all_combos
        if combo["unit_a"] == unit_name
    ]

    # Also check reverse direction
    reverse_synergies = [
        {
            "paired_unit": combo["unit_a"],
            "confidence": combo["confidence"],
            "support": combo["support"],
        }
        for combo in all_combos
        if combo["unit_b"] == unit_name
    ]

    all_synergies = synergies + reverse_synergies
    all_synergies.sort(key=lambda x: x["confidence"], reverse=True)

    return all_synergies[:limit]


def explain_combo(combo: dict) -> str:
    """Generate human-readable explanation for a combo."""
    return (
        f"If you include {combo['unit_a']}, {combo['confidence']:.0f}% of tournament "
        f"lists also include {combo['unit_b']} (appears together in {combo['support']:.0f}% of all lists)"
    )
