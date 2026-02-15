"""
Solar Auxilia List Builder - FastAPI Backend
REST API for army list building with validation and meta analysis.
"""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.models import db, Unit, Weapon, Upgrade, UnitUpgrade, Detachment, Roster, RosterDetachment, RosterEntry
from src.bsdata.points_calculator import PointsCalculator
from src.bsdata.detachment_loader import DetachmentLoader
from src.bsdata.composition_validator import CompositionValidator
from src.bsdata.foc_validator import FOCValidator
from src.bsdata.category_mapping import DISPLAY_GROUPS, get_native_categories_for_group
from src.analytics.unit_popularity import calculate_unit_popularity
import json

# Singleton composition validator
composition_validator = CompositionValidator()

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app):
    """Manage database connection lifecycle."""
    try:
        db.connect(reuse_if_open=True)
        unit_count = Unit.select().count()
        logger.info(f"Database connected: {unit_count} units loaded")
    except Exception as e:
        logger.error(f"Database connection failed: {e}")
    yield
    if not db.is_closed():
        db.close()


# Initialize FastAPI
app = FastAPI(
    title="Solar Auxilia List Builder API",
    description="REST API for Warhammer: The Horus Heresy Solar Auxilia army list building",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models for request/response
class UnitResponse(BaseModel):
    id: int
    bs_id: str
    name: str
    unit_type: str  # Native HH3 slot name
    bsdata_category: Optional[str] = None
    base_cost: int
    profiles: Optional[str]
    rules: Optional[str]
    constraints: Optional[List[Dict[str, Any]]] = None
    model_min: int = 1
    model_max: Optional[int] = None
    is_legacy: bool = False

class WeaponResponse(BaseModel):
    id: int
    bs_id: str
    name: str
    range_value: Optional[str]
    strength: Optional[str]
    ap: Optional[str]
    weapon_type: Optional[str]
    cost: int

class UpgradeResponse(BaseModel):
    id: int
    bs_id: str
    name: str
    cost: int
    upgrade_type: Optional[str]

class RosterCreate(BaseModel):
    name: str
    points_limit: int

class DetachmentAdd(BaseModel):
    detachment_id: int
    detachment_type: str  # "Primary", "Auxiliary", "Apex"

class RosterEntryCreate(BaseModel):
    unit_id: int
    quantity: int
    upgrades: Optional[List[Dict[str, Any]]] = None

class RosterEntryUpdate(BaseModel):
    quantity: Optional[int] = None
    upgrades: Optional[List[Dict[str, Any]]] = None

class SlotStatus(BaseModel):
    min: int
    max: int
    filled: int
    restriction: Optional[str] = None

class DetachmentStatus(BaseModel):
    id: int
    name: str
    type: str
    slots: Dict[str, SlotStatus]
    entries: List[Dict[str, Any]]

class RosterFullResponse(BaseModel):
    id: int
    name: str
    points_limit: int
    total_points: int
    is_valid: bool
    validation_errors: Optional[List[str]] = None
    detachments: List[DetachmentStatus]

class ValidationResponse(BaseModel):
    is_valid: bool
    errors: List[str]
    total_points: int
    points_remaining: int

# Root endpoint
@app.get("/")
async def root():
    """API root endpoint."""
    return {
        "name": "Solar Auxilia List Builder API",
        "version": "2.0.0",
        "docs": "/docs",
        "endpoints": {
            "units": "/api/units",
            "weapons": "/api/weapons",
            "detachments": "/api/detachments",
            "rosters": "/api/rosters",
            "meta": "/api/meta"
        }
    }

# Health check
@app.get("/health")
async def health_check():
    """Health check endpoint."""
    try:
        return {
            "status": "healthy",
            "database": {
                "units": Unit.select().count(),
                "weapons": Weapon.select().count(),
                "upgrades": Upgrade.select().count(),
            }
        }
    except Exception as e:
        return {"status": "unhealthy", "error": str(e)}

# ===== UNITS =====

@app.get("/api/units", response_model=List[UnitResponse])
async def get_units(
    category: Optional[str] = Query(None, description="Filter by native slot or display group"),
    search: Optional[str] = Query(None, description="Search by name"),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0)
):
    """Get all units with optional filtering."""
    query = Unit.select()

    if category:
        # Check if it's a display group name (e.g., "Heavy Support")
        native_cats = get_native_categories_for_group(category)
        if native_cats:
            query = query.where(Unit.unit_type.in_(native_cats))
        else:
            # Direct native category filter
            query = query.where(Unit.unit_type == category)
    if search:
        query = query.where(Unit.name.contains(search))

    query = query.limit(limit).offset(offset)

    units = []
    for unit in query:
        unit_constraints = None
        if unit.constraints:
            try:
                unit_constraints = json.loads(unit.constraints)
            except (json.JSONDecodeError, TypeError):
                pass
        units.append(UnitResponse(
            id=unit.id,
            bs_id=unit.bs_id,
            name=unit.name,
            unit_type=unit.unit_type,
            bsdata_category=unit.bsdata_category,
            base_cost=unit.base_cost,
            profiles=unit.profiles,
            rules=unit.rules,
            constraints=unit_constraints,
            model_min=unit.model_min or 1,
            model_max=unit.model_max,
            is_legacy=bool(unit.is_legacy),
        ))

    return units

@app.get("/api/units/{unit_id}", response_model=UnitResponse)
async def get_unit(unit_id: int):
    """Get a specific unit by ID."""
    try:
        unit = Unit.get_by_id(unit_id)
        unit_constraints = None
        if unit.constraints:
            try:
                unit_constraints = json.loads(unit.constraints)
            except (json.JSONDecodeError, TypeError):
                pass
        return UnitResponse(
            id=unit.id,
            bs_id=unit.bs_id,
            name=unit.name,
            unit_type=unit.unit_type,
            bsdata_category=unit.bsdata_category,
            base_cost=unit.base_cost,
            profiles=unit.profiles,
            rules=unit.rules,
            constraints=unit_constraints,
            model_min=unit.model_min or 1,
            model_max=unit.model_max,
            is_legacy=bool(unit.is_legacy),
        )
    except Unit.DoesNotExist:
        raise HTTPException(status_code=404, detail="Unit not found")

@app.get("/api/units/{unit_id}/upgrades")
async def get_unit_upgrades(unit_id: int):
    """Get available upgrades for a unit, grouped by upgrade group."""
    try:
        unit = Unit.get_by_id(unit_id)
    except Unit.DoesNotExist:
        raise HTTPException(status_code=404, detail="Unit not found")

    unit_upgrades = (UnitUpgrade
                     .select(UnitUpgrade, Upgrade)
                     .join(Upgrade)
                     .where(UnitUpgrade.unit == unit))

    # Group upgrades by group_name
    groups: Dict[str, Dict[str, Any]] = {}
    ungrouped = []

    for uu in unit_upgrades:
        upgrade_data = {
            "id": uu.upgrade.id,
            "bs_id": uu.upgrade.bs_id,
            "name": uu.upgrade.name,
            "cost": uu.upgrade.cost,
            "upgrade_type": uu.upgrade.upgrade_type,
        }
        if uu.group_name:
            if uu.group_name not in groups:
                groups[uu.group_name] = {
                    "group_name": uu.group_name,
                    "min_quantity": uu.min_quantity,
                    "max_quantity": uu.max_quantity,
                    "upgrades": [],
                }
            groups[uu.group_name]["upgrades"].append(upgrade_data)
        else:
            ungrouped.append(upgrade_data)

    return {
        "groups": list(groups.values()),
        "ungrouped": ungrouped,
    }

# ===== WEAPONS =====

@app.get("/api/weapons", response_model=List[WeaponResponse])
async def get_weapons(
    search: Optional[str] = Query(None, description="Search by name"),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0)
):
    """Get all weapons with optional filtering."""
    query = Weapon.select()

    if search:
        query = query.where(Weapon.name.contains(search))

    query = query.limit(limit).offset(offset)

    weapons = []
    for weapon in query:
        weapons.append(WeaponResponse(
            id=weapon.id,
            bs_id=weapon.bs_id,
            name=weapon.name,
            range_value=weapon.range_value,
            strength=weapon.strength,
            ap=weapon.ap,
            weapon_type=weapon.weapon_type,
            cost=weapon.cost
        ))

    return weapons

# ===== ROSTERS =====

def _build_roster_response(roster: Roster) -> dict:
    """Build full roster response with detachments and slot status."""
    detachments = []
    for rd in RosterDetachment.select().where(
        RosterDetachment.roster == roster
    ).order_by(RosterDetachment.sort_order):
        slots = rd.get_slot_status()
        entries = []
        for entry in RosterEntry.select().where(
            RosterEntry.roster_detachment == rd
        ):
            unit = entry.unit
            entries.append({
                "id": entry.id,
                "unit_id": entry.unit_id,
                "unit_name": entry.unit_name,
                "quantity": entry.quantity,
                "upgrades": json.loads(entry.upgrades) if entry.upgrades else [],
                "total_cost": entry.total_cost,
                "category": entry.category,
                "model_min": unit.model_min or 1,
                "model_max": unit.model_max,
            })
        detachments.append({
            "id": rd.id,
            "name": rd.detachment_name,
            "type": rd.detachment_type,
            "detachment_id": rd.detachment_id,
            "slots": slots,
            "entries": entries,
        })

    errors = None
    if roster.validation_errors:
        try:
            errors = json.loads(roster.validation_errors)
        except json.JSONDecodeError:
            errors = [roster.validation_errors]

    # Compute composition budget
    budget = composition_validator.get_budget(roster)
    composition = {
        "primary_count": budget.primary_count,
        "primary_max": budget.primary_max,
        "auxiliary_budget": budget.auxiliary_budget,
        "auxiliary_used": budget.auxiliary_used,
        "apex_budget": budget.apex_budget,
        "apex_used": budget.apex_used,
        "warlord_available": budget.warlord_available,
        "warlord_count": budget.warlord_count,
    }

    return {
        "id": roster.id,
        "name": roster.name,
        "points_limit": roster.points_limit,
        "total_points": roster.total_points,
        "is_valid": bool(roster.is_valid),
        "validation_errors": errors,
        "detachments": detachments,
        "composition": composition,
    }


@app.post("/api/rosters")
async def create_roster(roster: RosterCreate):
    """Create a new roster."""
    new_roster = Roster.create(
        name=roster.name,
        points_limit=roster.points_limit
    )

    return _build_roster_response(new_roster)


@app.get("/api/rosters")
async def list_rosters():
    """List all rosters."""
    rosters = Roster.select()
    return [_build_roster_response(r) for r in rosters]


@app.get("/api/rosters/{roster_id}")
async def get_roster(roster_id: int):
    """Get a specific roster with full detachment/slot info."""
    try:
        roster = Roster.get_by_id(roster_id)
    except Roster.DoesNotExist:
        raise HTTPException(status_code=404, detail="Roster not found")

    return _build_roster_response(roster)


@app.delete("/api/rosters/{roster_id}")
async def delete_roster(roster_id: int):
    """Delete a roster."""
    try:
        roster = Roster.get_by_id(roster_id)
    except Roster.DoesNotExist:
        raise HTTPException(status_code=404, detail="Roster not found")

    roster.delete_instance(recursive=True)
    return {"ok": True}


# ===== ROSTER DETACHMENTS =====

@app.post("/api/rosters/{roster_id}/detachments")
async def add_detachment_to_roster(roster_id: int, body: DetachmentAdd):
    """Add a detachment to a roster."""
    try:
        roster = Roster.get_by_id(roster_id)
    except Roster.DoesNotExist:
        raise HTTPException(status_code=404, detail="Roster not found")

    try:
        detachment = Detachment.get_by_id(body.detachment_id)
    except Detachment.DoesNotExist:
        raise HTTPException(status_code=404, detail="Detachment not found")

    # Enforce composition rules
    allowed, reason = composition_validator.can_add_detachment(roster, detachment)
    if not allowed:
        raise HTTPException(status_code=422, detail=reason)

    # Calculate sort order
    existing_count = RosterDetachment.select().where(
        RosterDetachment.roster == roster
    ).count()

    rd = RosterDetachment.create(
        roster=roster,
        detachment=detachment,
        detachment_name=detachment.name,
        detachment_type=body.detachment_type,
        sort_order=existing_count,
    )

    return {
        "id": rd.id,
        "name": rd.detachment_name,
        "type": rd.detachment_type,
        "detachment_id": detachment.id,
        "slots": rd.get_slot_status(),
        "entries": [],
    }


@app.delete("/api/rosters/{roster_id}/detachments/{det_id}")
async def remove_detachment_from_roster(roster_id: int, det_id: int):
    """Remove a detachment from a roster (cascades entries)."""
    try:
        roster = Roster.get_by_id(roster_id)
    except Roster.DoesNotExist:
        raise HTTPException(status_code=404, detail="Roster not found")

    try:
        rd = RosterDetachment.get(
            (RosterDetachment.id == det_id) & (RosterDetachment.roster == roster)
        )
    except RosterDetachment.DoesNotExist:
        raise HTTPException(status_code=404, detail="Detachment not found in roster")

    rd.delete_instance(recursive=True)
    roster.calculate_total_points()

    return {"ok": True}


@app.get("/api/rosters/{roster_id}/detachments")
async def get_roster_detachments(roster_id: int):
    """List roster's detachments with slot fill status."""
    try:
        roster = Roster.get_by_id(roster_id)
    except Roster.DoesNotExist:
        raise HTTPException(status_code=404, detail="Roster not found")

    result = []
    for rd in RosterDetachment.select().where(
        RosterDetachment.roster == roster
    ).order_by(RosterDetachment.sort_order):
        entries = []
        for entry in RosterEntry.select().where(
            RosterEntry.roster_detachment == rd
        ):
            unit = entry.unit
            entries.append({
                "id": entry.id,
                "unit_id": entry.unit_id,
                "unit_name": entry.unit_name,
                "quantity": entry.quantity,
                "upgrades": json.loads(entry.upgrades) if entry.upgrades else [],
                "total_cost": entry.total_cost,
                "category": entry.category,
                "model_min": unit.model_min or 1,
                "model_max": unit.model_max,
            })
        result.append({
            "id": rd.id,
            "name": rd.detachment_name,
            "type": rd.detachment_type,
            "detachment_id": rd.detachment_id,
            "slots": rd.get_slot_status(),
            "entries": entries,
        })

    return result


def validate_upgrade_selection(unit_id: int, selected_upgrade_bs_ids: List[str]) -> None:
    """
    Validate selected upgrades against group constraints.
    Raises HTTPException(422) on violation.
    """
    unit_upgrades = (
        UnitUpgrade
        .select(UnitUpgrade, Upgrade)
        .join(Upgrade)
        .where(UnitUpgrade.unit == unit_id)
    )

    # Group by group_name
    groups: Dict[str, Dict[str, Any]] = {}
    for uu in unit_upgrades:
        if not uu.group_name:
            continue
        if uu.group_name not in groups:
            groups[uu.group_name] = {
                "min": uu.min_quantity,
                "max": uu.max_quantity,
                "bs_ids": set(),
            }
        groups[uu.group_name]["bs_ids"].add(uu.upgrade.bs_id)

    selected_set = set(selected_upgrade_bs_ids)
    for group_name, group in groups.items():
        count = len(selected_set & group["bs_ids"])
        if count > group["max"]:
            raise HTTPException(
                status_code=422,
                detail=f"Upgrade group '{group_name}': selected {count}, max {group['max']}",
            )
        if count < group["min"]:
            raise HTTPException(
                status_code=422,
                detail=f"Upgrade group '{group_name}': selected {count}, min {group['min']} required",
            )


# ===== ROSTER ENTRIES (per-detachment) =====

@app.post("/api/rosters/{roster_id}/detachments/{det_id}/entries")
async def add_entry_to_detachment(roster_id: int, det_id: int, entry: RosterEntryCreate):
    """Add a unit to a specific detachment."""
    try:
        roster = Roster.get_by_id(roster_id)
    except Roster.DoesNotExist:
        raise HTTPException(status_code=404, detail="Roster not found")

    try:
        rd = RosterDetachment.get(
            (RosterDetachment.id == det_id) & (RosterDetachment.roster == roster)
        )
    except RosterDetachment.DoesNotExist:
        raise HTTPException(status_code=404, detail="Detachment not found in roster")

    try:
        unit = Unit.get_by_id(entry.unit_id)
    except Unit.DoesNotExist:
        raise HTTPException(status_code=404, detail="Unit not found")

    # --- Slot overflow & unit restriction enforcement ---
    slots = rd.get_slot_status()
    unit_type = unit.unit_type

    if unit_type not in slots:
        raise HTTPException(
            status_code=422,
            detail=f"'{unit.name}' ({unit_type}) has no slot in {rd.detachment_name}",
        )

    slot = slots[unit_type]
    if slot['filled'] >= slot['max']:
        raise HTTPException(
            status_code=422,
            detail=f"{unit_type} slot full ({slot['filled']}/{slot['max']}) in {rd.detachment_name}",
        )

    if slot.get('restriction'):
        if not FOCValidator._matches_restriction(unit.name, slot['restriction']):
            raise HTTPException(
                status_code=422,
                detail=f"'{unit.name}' not allowed in {unit_type} slot (restricted to: {slot['restriction']})",
            )

    # --- Roster-wide unique unit limits ---
    if unit.constraints:
        try:
            unit_constraints = json.loads(unit.constraints)
        except (json.JSONDecodeError, TypeError):
            unit_constraints = []
        for c in unit_constraints:
            if c.get('scope') == 'roster' and c.get('type') == 'max':
                max_val = c['value']
                existing_count = (
                    RosterEntry
                    .select()
                    .join(RosterDetachment)
                    .where(
                        (RosterDetachment.roster == roster) &
                        (RosterEntry.unit == unit)
                    )
                    .count()
                )
                if existing_count >= max_val:
                    raise HTTPException(
                        status_code=422,
                        detail=f"'{unit.name}' limited to {max_val} per roster",
                    )

    # --- Validate quantity against model bounds ---
    qty = entry.quantity
    model_min = unit.model_min or 1
    model_max = unit.model_max
    if qty < model_min:
        raise HTTPException(
            status_code=422,
            detail=f"'{unit.name}' requires at least {model_min} models (got {qty})",
        )
    if model_max is not None and qty > model_max:
        raise HTTPException(
            status_code=422,
            detail=f"'{unit.name}' allows at most {model_max} models (got {qty})",
        )

    # --- Validate upgrade selection against group constraints ---
    upgrades = entry.upgrades or []
    if upgrades:
        selected_bs_ids = [u['upgrade_id'] for u in upgrades if 'upgrade_id' in u]
        validate_upgrade_selection(unit.id, selected_bs_ids)

    # Calculate cost
    total_cost = PointsCalculator.calculate_unit_cost(unit, upgrades) * entry.quantity

    # Create entry with native slot name
    roster_entry = RosterEntry.create(
        roster_detachment=rd,
        unit=unit,
        unit_name=unit.name,
        quantity=entry.quantity,
        upgrades=json.dumps(upgrades) if upgrades else None,
        total_cost=total_cost,
        category=unit.unit_type,  # Native HH3 slot name
    )

    # Recalculate roster total
    roster.calculate_total_points()

    return {"id": roster_entry.id, "total_cost": total_cost}


@app.delete("/api/rosters/{roster_id}/detachments/{det_id}/entries/{entry_id}")
async def delete_entry_from_detachment(roster_id: int, det_id: int, entry_id: int):
    """Remove a unit from a detachment."""
    try:
        roster = Roster.get_by_id(roster_id)
    except Roster.DoesNotExist:
        raise HTTPException(status_code=404, detail="Roster not found")

    try:
        rd = RosterDetachment.get(
            (RosterDetachment.id == det_id) & (RosterDetachment.roster == roster)
        )
    except RosterDetachment.DoesNotExist:
        raise HTTPException(status_code=404, detail="Detachment not found in roster")

    try:
        entry = RosterEntry.get(
            (RosterEntry.id == entry_id) & (RosterEntry.roster_detachment == rd)
        )
    except RosterEntry.DoesNotExist:
        raise HTTPException(status_code=404, detail="Entry not found")

    entry.delete_instance()
    roster.calculate_total_points()
    return {"ok": True}


@app.patch("/api/rosters/{roster_id}/detachments/{det_id}/entries/{entry_id}")
async def update_entry_in_detachment(
    roster_id: int, det_id: int, entry_id: int, update: RosterEntryUpdate
):
    """Update a roster entry (quantity or upgrades)."""
    try:
        roster = Roster.get_by_id(roster_id)
    except Roster.DoesNotExist:
        raise HTTPException(status_code=404, detail="Roster not found")

    try:
        rd = RosterDetachment.get(
            (RosterDetachment.id == det_id) & (RosterDetachment.roster == roster)
        )
    except RosterDetachment.DoesNotExist:
        raise HTTPException(status_code=404, detail="Detachment not found in roster")

    try:
        entry = RosterEntry.get(
            (RosterEntry.id == entry_id) & (RosterEntry.roster_detachment == rd)
        )
    except RosterEntry.DoesNotExist:
        raise HTTPException(status_code=404, detail="Entry not found")

    if update.quantity is not None:
        unit = entry.unit
        model_min = unit.model_min or 1
        model_max = unit.model_max
        if update.quantity < model_min:
            raise HTTPException(
                status_code=422,
                detail=f"'{unit.name}' requires at least {model_min} models (got {update.quantity})",
            )
        if model_max is not None and update.quantity > model_max:
            raise HTTPException(
                status_code=422,
                detail=f"'{unit.name}' allows at most {model_max} models (got {update.quantity})",
            )
        entry.quantity = update.quantity

    if update.upgrades is not None:
        # Validate upgrade group constraints
        if update.upgrades:
            selected_bs_ids = [u['upgrade_id'] for u in update.upgrades if 'upgrade_id' in u]
            validate_upgrade_selection(entry.unit_id, selected_bs_ids)
        entry.upgrades = json.dumps(update.upgrades) if update.upgrades else None

    # Recalculate cost
    unit = entry.unit
    upgrades = json.loads(entry.upgrades) if entry.upgrades else []
    unit_cost = PointsCalculator.calculate_unit_cost(unit, upgrades)
    entry.total_cost = unit_cost * entry.quantity
    entry.save()

    roster.calculate_total_points()
    return {"id": entry.id, "total_cost": entry.total_cost, "quantity": entry.quantity}


# ===== VALIDATION =====

@app.post("/api/rosters/{roster_id}/validate", response_model=ValidationResponse)
async def validate_roster(roster_id: int):
    """Validate all detachments in a roster."""
    try:
        roster = Roster.get_by_id(roster_id)
    except Roster.DoesNotExist:
        raise HTTPException(status_code=404, detail="Roster not found")

    is_valid, errors = roster.validate()
    total_points = roster.total_points
    points_remaining = roster.points_limit - total_points

    return ValidationResponse(
        is_valid=is_valid,
        errors=errors,
        total_points=total_points,
        points_remaining=points_remaining
    )


# ===== DETACHMENTS =====

@app.get("/api/detachments")
async def get_detachments(
    faction: Optional[str] = Query(None, description="Filter by faction"),
    detachment_type: Optional[str] = Query(None, description="Filter by type (Primary, Auxiliary, Apex)"),
):
    """Get all available detachment types."""
    query = Detachment.select()

    if faction:
        # Include generic (faction=null) + faction-specific
        query = query.where(
            (Detachment.faction == faction) | (Detachment.faction.is_null())
        )
    if detachment_type:
        query = query.where(Detachment.detachment_type == detachment_type)

    detachments = list(query)
    if detachments:
        return [{
            "id": d.id,
            "bs_id": d.bs_id,
            "name": d.name,
            "type": d.detachment_type,
            "faction": d.faction,
            "constraints": json.loads(d.constraints) if d.constraints else {},
            "unit_restrictions": json.loads(d.unit_restrictions) if d.unit_restrictions else {},
            "costs": json.loads(d.costs) if d.costs else {},
        } for d in detachments]

    # Fallback: load from .gst file when DB is empty
    gst_path = Path(__file__).parent.parent / "data" / "bsdata" / "Horus Heresy 3rd Edition.gst"
    try:
        loader = DetachmentLoader(gst_path)
        loaded = loader.load_all_detachments()
        return [{
            "id": i + 1,
            "bs_id": d["bs_id"],
            "name": d["name"],
            "type": d["detachment_type"],
            "faction": d.get("faction"),
            "constraints": json.loads(d["constraints"]) if d["constraints"] else {},
            "unit_restrictions": json.loads(d["unit_restrictions"]) if d.get("unit_restrictions") else {},
            "costs": json.loads(d["costs"]) if d.get("costs") else {},
        } for i, d in enumerate(loaded)]
    except Exception as e:
        logger.error(f"Failed to load detachments from .gst: {e}")
        return []


@app.get("/api/display-groups")
async def get_display_groups():
    """Get display group mappings for the unit browser."""
    return DISPLAY_GROUPS


# ===== META ANALYSIS =====

@app.get("/api/meta/popular-units")
async def get_popular_units(min_appearances: int = Query(3, ge=1)):
    """Get most popular units from tournament data."""
    try:
        popularity = calculate_unit_popularity(min_lists=min_appearances)
        return {"units": popularity[:20]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Meta analysis error: {str(e)}")

@app.get("/api/meta/trending-units")
async def get_trending(months: int = Query(6, ge=1, le=24)):
    """Get trending units (not yet implemented)."""
    raise HTTPException(status_code=501, detail="Trending analysis not yet implemented")

@app.get("/api/meta/stats")
async def get_meta_stats():
    """Get overall meta statistics."""
    try:
        unit_count = Unit.select().count()
        weapon_count = Weapon.select().count()
        upgrade_count = Upgrade.select().count()

        return {
            "catalogue": {
                "units": unit_count,
                "weapons": weapon_count,
                "upgrades": upgrade_count
            },
            "status": "operational"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Run with: uvicorn api.main:app --reload
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
