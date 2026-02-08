"""CLI commands for BSData integration."""
import click
from rich.console import Console
from rich.table import Table
from rich.panel import Panel

from src.bsdata.repository import (
    clone_or_update_repo,
    list_available_catalogues,
    check_for_updates,
    get_catalogue_path
)
from src.bsdata.catalogue_loader import SolarAuxiliaCatalogue
from src.bsdata.detachment_loader import DetachmentLoader
from src.models import Unit, Weapon, Upgrade, UnitUpgrade, Detachment
from src.config import BSDATA_DIR

console = Console()


@click.group()
def bsdata():
    """BSData repository management and catalogue loading."""
    pass


@bsdata.command()
def update():
    """Clone or update the BSData repository."""
    console.print("[yellow]Updating BSData repository...[/yellow]\n")

    with console.status("[bold green]Cloning/updating repository..."):
        success = clone_or_update_repo()

    if success:
        console.print("[green]✓ Repository updated successfully![/green]")

        # Show available catalogues
        catalogues = list_available_catalogues()
        console.print(f"\n[cyan]Found {len(catalogues)} catalogues[/cyan]")

        if "Solar Auxilia" in catalogues:
            console.print("[green]✓ Solar Auxilia catalogue available[/green]")
        else:
            console.print("[yellow]⚠ Solar Auxilia catalogue not found[/yellow]")

    else:
        console.print("[red]✗ Failed to update repository[/red]")


@bsdata.command()
def list_catalogues():
    """List all available catalogues in BSData repository."""
    catalogues = list_available_catalogues()

    if not catalogues:
        console.print("[yellow]No catalogues found. Run 'auxilia bsdata update' first.[/yellow]")
        return

    console.print(f"\n[bold cyan]Available Catalogues ({len(catalogues)})[/bold cyan]\n")

    for cat in catalogues:
        marker = "✓" if cat == "Solar Auxilia" else " "
        console.print(f"  [{marker}] {cat}")


@bsdata.command()
def load():
    """Load Solar Auxilia catalogue into database."""
    console.print("[yellow]Loading Solar Auxilia catalogue...[/yellow]\n")

    try:
        with console.status("[bold green]Parsing catalogue XML..."):
            catalogue = SolarAuxiliaCatalogue()

        console.print(f"[green]✓ Catalogue loaded (revision {catalogue.catalogue_info['revision']})[/green]")

        # Show unit count
        units = catalogue.load_all_units()
        console.print(f"[cyan]Found {len(units)} units in catalogue[/cyan]\n")

        # Populate database
        with console.status("[bold green]Populating database..."):
            catalogue.populate_database()

        console.print("[green]✓ Database populated successfully![/green]")

        # Show breakdown by category
        console.print("\n[bold cyan]Units by Category:[/bold cyan]")

        categories = {}
        for unit in units:
            cat = unit['unit_type']
            categories[cat] = categories.get(cat, 0) + 1

        for cat, count in sorted(categories.items()):
            console.print(f"  {cat}: {count} units")

    except FileNotFoundError:
        console.print("[red]✗ Solar Auxilia catalogue not found.[/red]")
        console.print("[yellow]Run 'auxilia bsdata update' first.[/yellow]")
    except Exception as e:
        console.print(f"[red]✗ Error loading catalogue: {e}[/red]")
        import traceback
        traceback.print_exc()


@bsdata.command()
@click.argument('unit_name')
def unit(unit_name):
    """Show details for a specific unit from the catalogue."""
    try:
        catalogue = SolarAuxiliaCatalogue()
        unit_data = catalogue.get_unit_by_name(unit_name)

        if not unit_data:
            console.print(f"[yellow]Unit '{unit_name}' not found in catalogue.[/yellow]")

            # Suggest similar units
            matches = catalogue.search_units(unit_name)
            if matches:
                console.print(f"\n[cyan]Did you mean one of these?[/cyan]")
                for match in matches[:5]:
                    console.print(f"  • {match}")

            return

        # Display unit details
        panel_content = []
        panel_content.append(f"[bold]Type:[/bold] {unit_data['unit_type']}")
        panel_content.append(f"[bold]Base Cost:[/bold] {unit_data['base_cost']} points")
        panel_content.append(f"[bold]BS ID:[/bold] {unit_data['bs_id']}")

        # Show profiles (stats)
        if unit_data['profiles']:
            panel_content.append(f"\n[bold yellow]Profiles:[/bold yellow]")
            for profile in unit_data['profiles']:
                panel_content.append(f"\n  [cyan]{profile['name']}[/cyan] ({profile['type']})")

                for char_name, char_value in profile['characteristics'].items():
                    panel_content.append(f"    {char_name}: {char_value}")

        # Show special rules
        if unit_data['rules']:
            panel_content.append(f"\n[bold yellow]Special Rules:[/bold yellow]")
            for rule in unit_data['rules']:
                panel_content.append(f"  • {rule['name']}")

        panel = Panel(
            "\n".join(panel_content),
            title=f"[bold cyan]{unit_data['name']}[/bold cyan]",
            border_style="cyan"
        )

        console.print(panel)

    except FileNotFoundError:
        console.print("[red]Catalogue not loaded. Run 'auxilia bsdata load' first.[/red]")
    except Exception as e:
        console.print(f"[red]Error: {e}[/red]")


@bsdata.command()
@click.argument('category')
def category(category):
    """List all units in a specific category (HQ, Troops, etc.)."""
    try:
        catalogue = SolarAuxiliaCatalogue()
        units = catalogue.get_category_units(category)

        if not units:
            console.print(f"[yellow]No units found in category '{category}'.[/yellow]")
            console.print("\n[cyan]Available categories:[/cyan] HQ, Troops, Elites, Fast Attack, Heavy Support, Lord of War")
            return

        console.print(f"\n[bold cyan]{category} Units ({len(units)})[/bold cyan]\n")

        for unit_name in units:
            console.print(f"  • {unit_name}")

    except FileNotFoundError:
        console.print("[red]Catalogue not loaded. Run 'auxilia bsdata load' first.[/red]")
    except Exception as e:
        console.print(f"[red]Error: {e}[/red]")


@bsdata.command()
def status():
    """Show BSData repository status."""
    if not BSDATA_DIR.exists():
        console.print("[yellow]BSData repository not cloned.[/yellow]")
        console.print("\nRun: [cyan]auxilia bsdata update[/cyan]")
        return

    console.print("[green]✓ Repository cloned[/green]")

    # Check for updates
    update_info = check_for_updates()

    if update_info['has_updates']:
        console.print(f"[yellow]⚠ {update_info['commits_behind']} updates available[/yellow]")
        console.print("\nRun: [cyan]auxilia bsdata update[/cyan]")
    else:
        console.print("[green]✓ Repository up to date[/green]")

    # Check if catalogue is loaded in database
    unit_count = Unit.select().count()
    weapon_count = Weapon.select().count()
    upgrade_count = Upgrade.select().count()
    unit_upgrade_count = UnitUpgrade.select().count()

    if unit_count > 0:
        console.print(f"[green]✓ Database populated:[/green]")
        console.print(f"  - {unit_count} units")
        console.print(f"  - {weapon_count} weapons")
        console.print(f"  - {upgrade_count} upgrades")
        console.print(f"  - {unit_upgrade_count} unit-upgrade links")
    else:
        console.print("[yellow]⚠ Database empty[/yellow]")
        console.print("\nRun: [cyan]auxilia bsdata load[/cyan]")


@bsdata.command()
@click.option('--limit', default=50, help='Maximum number of weapons to display')
def weapons(limit):
    """List all available weapons."""
    weapon_count = Weapon.select().count()

    if weapon_count == 0:
        console.print("[yellow]No weapons in database. Run 'auxilia bsdata load' first.[/yellow]")
        return

    console.print(f"\n[bold cyan]Weapons ({weapon_count} total, showing {min(limit, weapon_count)})[/bold cyan]\n")

    table = Table(show_header=True, header_style="bold cyan")
    table.add_column("Name", style="white")
    table.add_column("Range", style="yellow")
    table.add_column("Str", style="green")
    table.add_column("AP", style="red")
    table.add_column("Type", style="blue")
    table.add_column("Cost", style="magenta")

    weapons_query = Weapon.select().order_by(Weapon.name).limit(limit)

    for weapon in weapons_query:
        table.add_row(
            weapon.name,
            weapon.range_value or "-",
            weapon.strength or "-",
            weapon.ap or "-",
            weapon.weapon_type or "-",
            str(weapon.cost) if weapon.cost else "0",
        )

    console.print(table)

    if weapon_count > limit:
        console.print(f"\n[dim]Showing {limit} of {weapon_count} weapons. Use --limit to see more.[/dim]")


@bsdata.command()
@click.argument('name')
def weapon(name):
    """Show detailed weapon profile."""
    weapon = Weapon.get_or_none(Weapon.name == name)

    if not weapon:
        # Try partial match
        matches = Weapon.select().where(Weapon.name.contains(name)).limit(5)
        match_list = list(matches)

        if not match_list:
            console.print(f"[yellow]Weapon '{name}' not found.[/yellow]")
            return

        if len(match_list) == 1:
            weapon = match_list[0]
        else:
            console.print(f"[yellow]Multiple weapons match '{name}':[/yellow]\n")
            for w in match_list:
                console.print(f"  • {w.name}")
            console.print(f"\n[cyan]Use exact name to view details[/cyan]")
            return

    # Display weapon details
    panel_content = []
    panel_content.append(f"[bold]Range:[/bold] {weapon.range_value or 'N/A'}")
    panel_content.append(f"[bold]Strength:[/bold] {weapon.strength or 'N/A'}")
    panel_content.append(f"[bold]AP:[/bold] {weapon.ap or 'N/A'}")
    panel_content.append(f"[bold]Type:[/bold] {weapon.weapon_type or 'N/A'}")
    panel_content.append(f"[bold]Cost:[/bold] {weapon.cost} points")

    if weapon.special_rules:
        import json
        try:
            rules = json.loads(weapon.special_rules)
            if rules:
                panel_content.append(f"\n[bold yellow]Special Rules:[/bold yellow]")
                for rule in rules:
                    panel_content.append(f"  • {rule}")
        except json.JSONDecodeError:
            pass

    panel = Panel(
        "\n".join(panel_content),
        title=f"[bold cyan]{weapon.name}[/bold cyan]",
        border_style="cyan"
    )

    console.print(panel)


@bsdata.command()
@click.argument('unit_name')
def upgrades(unit_name):
    """Show available upgrades for a unit."""
    unit = Unit.get_or_none(Unit.name == unit_name)

    if not unit:
        # Try partial match
        matches = Unit.select().where(Unit.name.contains(unit_name)).limit(5)
        match_list = list(matches)

        if not match_list:
            console.print(f"[yellow]Unit '{unit_name}' not found.[/yellow]")
            return

        if len(match_list) == 1:
            unit = match_list[0]
        else:
            console.print(f"[yellow]Multiple units match '{unit_name}':[/yellow]\n")
            for u in match_list:
                console.print(f"  • {u.name}")
            console.print(f"\n[cyan]Use exact name to view upgrades[/cyan]")
            return

    # Get available upgrades
    unit_upgrades = (UnitUpgrade
                     .select(UnitUpgrade, Upgrade)
                     .join(Upgrade)
                     .where(UnitUpgrade.unit == unit))

    upgrade_list = list(unit_upgrades)

    if not upgrade_list:
        console.print(f"[yellow]No upgrades found for '{unit.name}'.[/yellow]")
        return

    console.print(f"\n[bold cyan]Available Upgrades for {unit.name}[/bold cyan]\n")

    table = Table(show_header=True, header_style="bold cyan")
    table.add_column("Upgrade", style="white")
    table.add_column("Type", style="yellow")
    table.add_column("Cost", style="magenta")
    table.add_column("Qty", style="green")
    table.add_column("Group", style="blue")

    for uu in upgrade_list:
        upgrade = uu.upgrade
        qty_str = f"{uu.min_quantity}-{uu.max_quantity}"
        if uu.min_quantity == uu.max_quantity:
            qty_str = str(uu.min_quantity)

        table.add_row(
            upgrade.name,
            upgrade.upgrade_type or "-",
            str(upgrade.cost),
            qty_str,
            uu.group_name or "-",
        )

    console.print(table)
    console.print(f"\n[dim]Total: {len(upgrade_list)} upgrade options[/dim]")


@bsdata.command()
def detachments():
    """List FOC detachment types."""
    gst_path = BSDATA_DIR / "Horus Heresy 3rd Edition.gst"

    if not gst_path.exists():
        console.print("[yellow]Game system file not found. Run 'auxilia bsdata update' first.[/yellow]")
        return

    try:
        loader = DetachmentLoader(gst_path)
        detachments_list = loader.load_all_detachments()

        if not detachments_list:
            console.print("[yellow]No detachments found in game system file.[/yellow]")
            return

        console.print(f"\n[bold cyan]Force Organization Charts ({len(detachments_list)})[/bold cyan]\n")

        for det in detachments_list:
            console.print(f"\n[bold]{det['name']}[/bold] ({det['detachment_type']})")

            import json
            constraints = json.loads(det['constraints'])

            if constraints:
                table = Table(show_header=True, header_style="cyan", box=None)
                table.add_column("Category", style="white")
                table.add_column("Min", style="green")
                table.add_column("Max", style="yellow")

                for category, limits in constraints.items():
                    table.add_row(
                        category,
                        str(limits.get('min', 0)),
                        str(limits.get('max', '-')),
                    )

                console.print(table)

    except Exception as e:
        console.print(f"[red]Error loading detachments: {e}[/red]")
        import traceback
        traceback.print_exc()
