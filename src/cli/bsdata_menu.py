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
from src.models import Unit

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
    from src.config import BSDATA_DIR

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

    if unit_count > 0:
        console.print(f"[green]✓ Database populated ({unit_count} units)[/green]")
    else:
        console.print("[yellow]⚠ Database empty[/yellow]")
        console.print("\nRun: [cyan]auxilia bsdata load[/cyan]")
