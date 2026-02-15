"""API tests using FastAPI TestClient with in-memory SQLite."""
import json


# ── Health & root ────────────────────────────────────────────────────

class TestHealth:
    def test_health_check(self, client, seed_units):
        r = client.get("/health")
        assert r.status_code == 200
        data = r.json()
        assert data["status"] == "healthy"
        assert data["database"]["units"] == 6

    def test_root(self, client):
        r = client.get("/")
        assert r.status_code == 200
        assert "endpoints" in r.json()


# ── Units ────────────────────────────────────────────────────────────

class TestUnits:
    def test_list_units(self, client, seed_units):
        r = client.get("/api/units")
        assert r.status_code == 200
        assert len(r.json()) == 6

    def test_list_units_empty_db(self, client):
        r = client.get("/api/units")
        assert r.status_code == 200
        assert r.json() == []

    def test_filter_by_category(self, client, seed_units):
        r = client.get("/api/units", params={"category": "Armour"})
        assert r.status_code == 200
        names = [u["name"] for u in r.json()]
        assert "Auxilia Leman Russ Strike Squadron" in names
        assert "Tactical Auxiliaries" not in names

    def test_search_by_name(self, client, seed_units):
        r = client.get("/api/units", params={"search": "Leman"})
        assert r.status_code == 200
        assert len(r.json()) == 1
        assert r.json()[0]["name"] == "Auxilia Leman Russ Strike Squadron"

    def test_get_unit_by_id(self, client, seed_units):
        unit = seed_units[0]
        r = client.get(f"/api/units/{unit.id}")
        assert r.status_code == 200
        assert r.json()["name"] == unit.name

    def test_get_unit_not_found(self, client):
        r = client.get("/api/units/9999")
        assert r.status_code == 404

    def test_unit_upgrades(self, client, seed_upgrades, seed_units):
        unit = seed_units[0]
        r = client.get(f"/api/units/{unit.id}/upgrades")
        assert r.status_code == 200
        data = r.json()
        assert len(data["groups"]) == 1
        assert data["groups"][0]["group_name"] == "Wargear"
        assert len(data["groups"][0]["upgrades"]) == 2


# ── Weapons ──────────────────────────────────────────────────────────

class TestWeapons:
    def test_list_weapons_empty(self, client):
        r = client.get("/api/weapons")
        assert r.status_code == 200
        assert r.json() == []


# ── Detachments ──────────────────────────────────────────────────────

class TestDetachments:
    def test_list_detachments(self, client, seed_detachment):
        r = client.get("/api/detachments")
        assert r.status_code == 200
        data = r.json()
        assert len(data) >= 1
        assert data[0]["name"] == "Test Primary Detachment"

    def test_detachments_cached(self, client, seed_detachment):
        """Second call should hit the module-level cache."""
        r1 = client.get("/api/detachments")
        r2 = client.get("/api/detachments")
        assert r1.json() == r2.json()


# ── Rosters CRUD ─────────────────────────────────────────────────────

class TestRosters:
    def test_create_roster(self, client):
        r = client.post("/api/rosters", json={"name": "Test List", "points_limit": 3000})
        assert r.status_code == 200
        data = r.json()
        assert data["name"] == "Test List"
        assert data["points_limit"] == 3000
        assert data["total_points"] == 0
        assert data["detachments"] == []

    def test_create_roster_empty_name(self, client):
        r = client.post("/api/rosters", json={"name": "  ", "points_limit": 3000})
        assert r.status_code == 422

    def test_list_rosters(self, client):
        client.post("/api/rosters", json={"name": "List A", "points_limit": 2000})
        client.post("/api/rosters", json={"name": "List B", "points_limit": 3000})
        r = client.get("/api/rosters")
        assert r.status_code == 200
        assert len(r.json()) == 2

    def test_get_roster(self, client):
        create = client.post("/api/rosters", json={"name": "My List", "points_limit": 3000})
        roster_id = create.json()["id"]
        r = client.get(f"/api/rosters/{roster_id}")
        assert r.status_code == 200
        assert r.json()["name"] == "My List"

    def test_get_roster_not_found(self, client):
        r = client.get("/api/rosters/9999")
        assert r.status_code == 404

    def test_update_roster_name(self, client):
        create = client.post("/api/rosters", json={"name": "Old Name", "points_limit": 3000})
        rid = create.json()["id"]
        r = client.patch(f"/api/rosters/{rid}", json={"name": "New Name"})
        assert r.status_code == 200
        assert r.json()["name"] == "New Name"

    def test_update_roster_points_limit(self, client):
        create = client.post("/api/rosters", json={"name": "List", "points_limit": 2000})
        rid = create.json()["id"]
        r = client.patch(f"/api/rosters/{rid}", json={"points_limit": 3000})
        assert r.status_code == 200
        assert r.json()["points_limit"] == 3000

    def test_delete_roster(self, client):
        create = client.post("/api/rosters", json={"name": "Doomed", "points_limit": 1000})
        rid = create.json()["id"]
        r = client.delete(f"/api/rosters/{rid}")
        assert r.status_code == 200
        assert r.json()["ok"] is True
        assert client.get(f"/api/rosters/{rid}").status_code == 404


# ── Detachment Management ───────────────────────────────────────────

class TestRosterDetachments:
    def test_add_detachment(self, client, seed_detachment):
        roster = client.post("/api/rosters", json={"name": "List", "points_limit": 3000}).json()
        r = client.post(
            f"/api/rosters/{roster['id']}/detachments",
            json={"detachment_id": seed_detachment.id, "detachment_type": "Primary"},
        )
        assert r.status_code == 200
        data = r.json()
        assert data["name"] == "Test Primary Detachment"
        assert "Line" in data["slots"]

    def test_add_detachment_not_found(self, client):
        roster = client.post("/api/rosters", json={"name": "L", "points_limit": 3000}).json()
        r = client.post(
            f"/api/rosters/{roster['id']}/detachments",
            json={"detachment_id": 9999, "detachment_type": "Primary"},
        )
        assert r.status_code == 404

    def test_remove_detachment(self, client, seed_detachment):
        roster = client.post("/api/rosters", json={"name": "L", "points_limit": 3000}).json()
        det = client.post(
            f"/api/rosters/{roster['id']}/detachments",
            json={"detachment_id": seed_detachment.id, "detachment_type": "Primary"},
        ).json()
        r = client.delete(f"/api/rosters/{roster['id']}/detachments/{det['id']}")
        assert r.status_code == 200
        assert r.json()["ok"] is True

    def test_list_detachments(self, client, seed_detachment):
        roster = client.post("/api/rosters", json={"name": "L", "points_limit": 3000}).json()
        client.post(
            f"/api/rosters/{roster['id']}/detachments",
            json={"detachment_id": seed_detachment.id, "detachment_type": "Primary"},
        )
        r = client.get(f"/api/rosters/{roster['id']}/detachments")
        assert r.status_code == 200
        assert len(r.json()) == 1


# ── Entry Management ────────────────────────────────────────────────

class TestRosterEntries:
    def _setup_roster_with_detachment(self, client, seed_detachment):
        """Helper: create a roster with one primary detachment attached."""
        roster = client.post("/api/rosters", json={"name": "L", "points_limit": 3000}).json()
        det = client.post(
            f"/api/rosters/{roster['id']}/detachments",
            json={"detachment_id": seed_detachment.id, "detachment_type": "Primary"},
        ).json()
        return roster, det

    def test_add_entry(self, client, seed_units, seed_detachment):
        roster, det = self._setup_roster_with_detachment(client, seed_detachment)
        line_unit = seed_units[0]  # Tactical Auxiliaries (Line)
        r = client.post(
            f"/api/rosters/{roster['id']}/detachments/{det['id']}/entries",
            json={"unit_id": line_unit.id, "quantity": 10},
        )
        assert r.status_code == 200
        assert r.json()["total_cost"] == 1000  # 100pts * 10

    def test_add_entry_wrong_slot(self, client, seed_units, seed_detachment):
        """Support unit shouldn't fit in a detachment with no Support slot."""
        roster, det = self._setup_roster_with_detachment(client, seed_detachment)
        # Create a Support unit that has no slot in the test detachment
        from src.models.catalogue import Unit
        support = Unit.create(
            bs_id="test-support-1", name="Rapier Battery",
            unit_type="Support", base_cost=50,
            profiles=json.dumps([]), model_min=1, model_max=3,
        )
        r = client.post(
            f"/api/rosters/{roster['id']}/detachments/{det['id']}/entries",
            json={"unit_id": support.id, "quantity": 1},
        )
        assert r.status_code == 422
        assert "no available slot" in r.json()["detail"]

    def test_add_entry_slot_overflow(self, client, seed_units, seed_detachment):
        """Command slot max=1, adding two should fail."""
        roster, det = self._setup_roster_with_detachment(client, seed_detachment)
        cmd_unit = seed_units[4]  # Legate Commander (Command)
        # First should succeed
        r1 = client.post(
            f"/api/rosters/{roster['id']}/detachments/{det['id']}/entries",
            json={"unit_id": cmd_unit.id, "quantity": 1},
        )
        assert r1.status_code == 200
        # Second should fail — slot full
        r2 = client.post(
            f"/api/rosters/{roster['id']}/detachments/{det['id']}/entries",
            json={"unit_id": cmd_unit.id, "quantity": 1},
        )
        assert r2.status_code == 422
        assert "slot full" in r2.json()["detail"]

    def test_delete_entry(self, client, seed_units, seed_detachment):
        roster, det = self._setup_roster_with_detachment(client, seed_detachment)
        entry = client.post(
            f"/api/rosters/{roster['id']}/detachments/{det['id']}/entries",
            json={"unit_id": seed_units[0].id, "quantity": 5},
        ).json()
        r = client.delete(
            f"/api/rosters/{roster['id']}/detachments/{det['id']}/entries/{entry['id']}"
        )
        assert r.status_code == 200
        assert r.json()["ok"] is True

    def test_update_entry_quantity(self, client, seed_units, seed_detachment):
        roster, det = self._setup_roster_with_detachment(client, seed_detachment)
        entry = client.post(
            f"/api/rosters/{roster['id']}/detachments/{det['id']}/entries",
            json={"unit_id": seed_units[0].id, "quantity": 5},
        ).json()
        r = client.patch(
            f"/api/rosters/{roster['id']}/detachments/{det['id']}/entries/{entry['id']}",
            json={"quantity": 10},
        )
        assert r.status_code == 200
        assert r.json()["quantity"] == 10
        # 100pts * 10 models
        assert r.json()["total_cost"] == 1000

    def test_update_entry_below_model_min(self, client, seed_units, seed_detachment):
        roster, det = self._setup_roster_with_detachment(client, seed_detachment)
        entry = client.post(
            f"/api/rosters/{roster['id']}/detachments/{det['id']}/entries",
            json={"unit_id": seed_units[0].id, "quantity": 5},
        ).json()
        r = client.patch(
            f"/api/rosters/{roster['id']}/detachments/{det['id']}/entries/{entry['id']}",
            json={"quantity": 0},
        )
        assert r.status_code == 422

    def test_points_updated_after_add(self, client, seed_units, seed_detachment):
        """Roster total_points should reflect added entries."""
        roster, det = self._setup_roster_with_detachment(client, seed_detachment)
        client.post(
            f"/api/rosters/{roster['id']}/detachments/{det['id']}/entries",
            json={"unit_id": seed_units[0].id, "quantity": 10},
        )
        r = client.get(f"/api/rosters/{roster['id']}")
        assert r.json()["total_points"] == 1000


# ── Validation ───────────────────────────────────────────────────────

class TestValidation:
    def test_validate_empty_roster(self, client, seed_detachment):
        roster = client.post("/api/rosters", json={"name": "Empty", "points_limit": 3000}).json()
        r = client.post(f"/api/rosters/{roster['id']}/validate")
        assert r.status_code == 200
        data = r.json()
        # Empty roster is invalid: "Roster must have a Primary Detachment"
        assert data["is_valid"] is False
        assert any("Primary" in e for e in data["errors"])

    def test_validate_underfilled_detachment(self, client, seed_units, seed_detachment):
        roster = client.post("/api/rosters", json={"name": "L", "points_limit": 3000}).json()
        client.post(
            f"/api/rosters/{roster['id']}/detachments",
            json={"detachment_id": seed_detachment.id, "detachment_type": "Primary"},
        )
        # Detachment has min=1 Command, min=2 Line, but we added nothing
        r = client.post(f"/api/rosters/{roster['id']}/validate")
        assert r.status_code == 200
        data = r.json()
        assert data["is_valid"] is False
        assert len(data["errors"]) > 0


# ── Doctrines ────────────────────────────────────────────────────────

class TestDoctrines:
    def test_list_doctrines(self, client):
        r = client.get("/api/doctrines")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_set_doctrine(self, client):
        roster = client.post("/api/rosters", json={"name": "L", "points_limit": 3000}).json()
        r = client.patch(
            f"/api/rosters/{roster['id']}/doctrine",
            json={"doctrine_id": "some-doctrine-id"},
        )
        assert r.status_code == 200
        assert r.json()["doctrine"] == "some-doctrine-id"

    def test_clear_doctrine(self, client):
        roster = client.post("/api/rosters", json={"name": "L", "points_limit": 3000}).json()
        # Set then clear
        client.patch(f"/api/rosters/{roster['id']}/doctrine", json={"doctrine_id": "abc"})
        r = client.patch(f"/api/rosters/{roster['id']}/doctrine", json={"doctrine_id": None})
        assert r.status_code == 200
        assert r.json()["doctrine"] is None


# ── Display Groups ───────────────────────────────────────────────────

class TestDisplayGroups:
    def test_display_groups(self, client):
        r = client.get("/api/display-groups")
        assert r.status_code == 200
        assert isinstance(r.json(), dict)


# ── Meta ─────────────────────────────────────────────────────────────

class TestMeta:
    def test_meta_stats(self, client, seed_units):
        r = client.get("/api/meta/stats")
        assert r.status_code == 200
        data = r.json()
        assert data["status"] == "operational"
        assert data["catalogue"]["units"] == 6
