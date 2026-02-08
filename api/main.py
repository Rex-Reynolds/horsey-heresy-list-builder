"""
Solar Auxilia List Builder - FastAPI Backend
REST API for army list building with validation and meta analysis.
"""
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.models import db, Unit, Weapon, Upgrade, UnitUpgrade, Roster, RosterEntry
from src.bsdata.foc_validator import FOCValidator
from src.bsdata.points_calculator import PointsCalculator
from src.analytics.unit_popularity import calculate_unit_popularity
import json

# Initialize FastAPI
app = FastAPI(
    title="Solar Auxilia List Builder API",
    description="REST API for Warhammer: The Horus Heresy Solar Auxilia army list building",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database
db.connect(reuse_if_open=True)

# Pydantic models for request/response
class UnitResponse(BaseModel):
    id: int
    bs_id: str
    name: str
    unit_type: str
    base_cost: int
    profiles: Optional[str]
    rules: Optional[str]

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
    detachment_type: str
    points_limit: int

class RosterEntryCreate(BaseModel):
    unit_id: int
    quantity: int
    upgrades: Optional[List[Dict[str, Any]]] = None

class RosterResponse(BaseModel):
    id: int
    name: str
    detachment_type: str
    points_limit: int
    total_points: int
    is_valid: bool
    validation_errors: Optional[str]

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
        "version": "1.0.0",
        "docs": "/docs",
        "endpoints": {
            "units": "/api/units",
            "weapons": "/api/weapons",
            "rosters": "/api/rosters",
            "meta": "/api/meta"
        }
    }

# Health check
@app.get("/health")
async def health_check():
    """Health check endpoint."""
    try:
        unit_count = Unit.select().count()
        return {"status": "healthy", "units_loaded": unit_count}
    except Exception as e:
        return {"status": "unhealthy", "error": str(e)}

# ===== UNITS =====

@app.get("/api/units", response_model=List[UnitResponse])
async def get_units(
    category: Optional[str] = Query(None, description="Filter by FOC category"),
    search: Optional[str] = Query(None, description="Search by name"),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0)
):
    """Get all units with optional filtering."""
    query = Unit.select()

    if category:
        query = query.where(Unit.unit_type == category)
    if search:
        query = query.where(Unit.name.contains(search))

    query = query.limit(limit).offset(offset)

    units = []
    for unit in query:
        units.append(UnitResponse(
            id=unit.id,
            bs_id=unit.bs_id,
            name=unit.name,
            unit_type=unit.unit_type,
            base_cost=unit.base_cost,
            profiles=unit.profiles,
            rules=unit.rules
        ))

    return units

@app.get("/api/units/{unit_id}", response_model=UnitResponse)
async def get_unit(unit_id: int):
    """Get a specific unit by ID."""
    try:
        unit = Unit.get_by_id(unit_id)
        return UnitResponse(
            id=unit.id,
            bs_id=unit.bs_id,
            name=unit.name,
            unit_type=unit.unit_type,
            base_cost=unit.base_cost,
            profiles=unit.profiles,
            rules=unit.rules
        )
    except Unit.DoesNotExist:
        raise HTTPException(status_code=404, detail="Unit not found")

@app.get("/api/units/{unit_id}/upgrades", response_model=List[UpgradeResponse])
async def get_unit_upgrades(unit_id: int):
    """Get available upgrades for a unit."""
    try:
        unit = Unit.get_by_id(unit_id)
    except Unit.DoesNotExist:
        raise HTTPException(status_code=404, detail="Unit not found")

    upgrades = (UnitUpgrade
                .select(UnitUpgrade, Upgrade)
                .join(Upgrade)
                .where(UnitUpgrade.unit == unit))

    result = []
    for uu in upgrades:
        result.append(UpgradeResponse(
            id=uu.upgrade.id,
            bs_id=uu.upgrade.bs_id,
            name=uu.upgrade.name,
            cost=uu.upgrade.cost,
            upgrade_type=uu.upgrade.upgrade_type
        ))

    return result

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

@app.post("/api/rosters", response_model=RosterResponse)
async def create_roster(roster: RosterCreate):
    """Create a new roster."""
    new_roster = Roster.create(
        name=roster.name,
        detachment_type=roster.detachment_type,
        points_limit=roster.points_limit
    )

    return RosterResponse(
        id=new_roster.id,
        name=new_roster.name,
        detachment_type=new_roster.detachment_type,
        points_limit=new_roster.points_limit,
        total_points=0,
        is_valid=False,
        validation_errors=None
    )

@app.get("/api/rosters/{roster_id}", response_model=RosterResponse)
async def get_roster(roster_id: int):
    """Get a specific roster."""
    try:
        roster = Roster.get_by_id(roster_id)
        return RosterResponse(
            id=roster.id,
            name=roster.name,
            detachment_type=roster.detachment_type,
            points_limit=roster.points_limit,
            total_points=roster.total_points,
            is_valid=bool(roster.is_valid),
            validation_errors=roster.validation_errors
        )
    except Roster.DoesNotExist:
        raise HTTPException(status_code=404, detail="Roster not found")

@app.post("/api/rosters/{roster_id}/entries")
async def add_roster_entry(roster_id: int, entry: RosterEntryCreate):
    """Add a unit to a roster."""
    try:
        roster = Roster.get_by_id(roster_id)
        unit = Unit.get_by_id(entry.unit_id)
    except Roster.DoesNotExist:
        raise HTTPException(status_code=404, detail="Roster not found")
    except Unit.DoesNotExist:
        raise HTTPException(status_code=404, detail="Unit not found")

    # Calculate cost
    upgrades = entry.upgrades or []
    total_cost = PointsCalculator.calculate_unit_cost(unit, upgrades) * entry.quantity

    # Create entry
    roster_entry = RosterEntry.create(
        roster=roster,
        unit=unit,
        unit_name=unit.name,
        quantity=entry.quantity,
        upgrades=json.dumps(upgrades) if upgrades else None,
        total_cost=total_cost,
        category=unit.unit_type
    )

    # Recalculate roster total
    roster.calculate_total_points()

    return {"id": roster_entry.id, "total_cost": total_cost}

@app.post("/api/rosters/{roster_id}/validate", response_model=ValidationResponse)
async def validate_roster(roster_id: int):
    """Validate a roster against FOC rules."""
    try:
        roster = Roster.get_by_id(roster_id)
    except Roster.DoesNotExist:
        raise HTTPException(status_code=404, detail="Roster not found")

    # Run validation
    is_valid, errors = roster.validate()

    # Get points
    total_points = roster.total_points
    points_remaining = roster.points_limit - total_points

    return ValidationResponse(
        is_valid=is_valid,
        errors=errors,
        total_points=total_points,
        points_remaining=points_remaining
    )

# ===== META ANALYSIS =====

@app.get("/api/meta/popular-units")
async def get_popular_units(min_appearances: int = Query(3, ge=1)):
    """Get most popular units from tournament data."""
    try:
        popularity = calculate_unit_popularity(min_appearances=min_appearances)
        return {"units": popularity[:20]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Meta analysis error: {str(e)}")

@app.get("/api/meta/trending-units")
async def get_trending(months: int = Query(6, ge=1, le=24)):
    """Get trending units (coming soon - requires tournament data)."""
    # TODO: Implement trending calculation
    return {"units": [], "message": "Trending analysis requires tournament data. Run 'auxilia tournament update' first."}

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
