"""HH3 catalogue loader — wraps existing SolarAuxiliaCatalogue."""
from typing import Optional
from src.gamesystems.base import BaseCatalogueLoader


class HH3CatalogueLoader(BaseCatalogueLoader):
    """Adapter wrapping existing SolarAuxiliaCatalogue for the plugin interface."""

    def get_game_system_id(self) -> str:
        return "hh3"

    def populate_database(self, faction: Optional[str] = None) -> dict:
        from src.bsdata.catalogue_loader import SolarAuxiliaCatalogue

        catalogue = SolarAuxiliaCatalogue()
        catalogue.populate_database()

        from src.models.catalogue import Unit, Weapon, Upgrade, UnitUpgrade, Detachment
        return {
            "units": Unit.select().where(Unit.game_system == "hh3").count(),
            "weapons": Weapon.select().where(Weapon.game_system == "hh3").count(),
            "upgrades": Upgrade.select().where(Upgrade.game_system == "hh3").count(),
            "detachments": Detachment.select().where(Detachment.game_system == "hh3").count(),
        }
