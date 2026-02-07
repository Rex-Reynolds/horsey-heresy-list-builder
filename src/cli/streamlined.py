"""Streamlined CLI commands - simpler workflow."""
import click
from rich.console import Console
from rich.panel import Panel

from src.bsdata.repository import clone_or_update_repo, get_catalogue_path
from src.bsdata.catalogue_loader import SolarAuxiliaCatalogue
from src.builder.collection_builder import CollectionManager, ListGenerator
from src.models import Collection, Unit, initialize_database

console = Console()


@click.command()
def init():
    """Initialize the app (first-time setup)."""
    console.print("[bold cyan]Initializing Solar Auxilia List Builder...[/bold cyan]\n")

    # Initialize database
    with console.status("[green]Setting up database..."):
        initialize_database()

    console.print("[green]✓[/green] Database ready")

    # Clone/update BSData
    console.print("\n[yellow]Downloading official unit data...[/yellow]")
    with console.status("[green]Cloning BSData repository..."):
        success = clone_or_update_repo()

    if not success:
        console.print("[red]✗ Failed to download BSData[/red]")
        return

    console.print("[green]✓[/green] BSData downloaded")

    # Load catalogue
    console.print("\n[yellow]Loading Solar Auxilia catalogue...[/yellow]")

    try:
        with console.status("[green]Parsing unit data..."):
            catalogue = SolarAuxiliaCatalogue()
            catalogue.populate_database()

        unit_count = Unit.select().count()
        console.print(f"[green]✓[/green] Loaded {unit_count} units")

        console.print("\n[bold green]Setup complete![/bold green]")
        console.print("\nNext steps:")
        console.print("  [cyan]auxilia add \"Legate Marshall\" 1[/cyan]  - Add units to your collection")
        console.print("  [cyan]auxilia list[/cyan]                      - View your collection")
        console.print("  [cyan]auxilia build[/cyan]                     - Generate army lists")

    except Exception as e:
        console.print(f"[red]✗ Error loading catalogue: {e}[/red]")


@click.command()
@click.argument('unit_name')
@click.argument('quantity', type=int)
@click.option('--notes', help='Notes (painted, NiB, etc.)')
def add(unit_name, quantity, notes):
    """Add units to your collection."""
    manager = CollectionManager()

    # Verify unit exists in BSData
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

        # Add to collection
        manager.add_unit(unit_name, quantity, notes)

        console.print(f"[green]✓[/green] Added {quantity}x [cyan]{unit_name}[/cyan]")
        console.print(f"  Category: {unit_data['unit_type']}")
        console.print(f"  Base Cost: {unit_data['base_cost']} points each")

        if notes:
            console.print(f"  Notes: [dim]{notes}[/dim]")

    except FileNotFoundError:
        console.print("[red]Catalogue not loaded. Run 'auxilia init' first.[/red]")


@click.command(name='list')
def list_collection():
    """Show your collection."""
    from src.cli.collection_menu import show
    from click import Context

    # Reuse existing show command
    ctx = Context(show)
    ctx.invoke(show)


@click.command()
@click.option('--count', '-n', default=3, help='Number of lists to generate')
def build(count):
    """Generate army lists from your collection."""
    from src.cli.collection_menu import generate
    from click import Context

    # Reuse existing generate command
    ctx = Context(generate)
    ctx.invoke(generate, count=count)


@click.command()
@click.argument('unit_name')
def info(unit_name):
    """Show detailed unit information."""
    try:
        catalogue = SolarAuxiliaCatalogue()
        unit_data = catalogue.get_unit_by_name(unit_name)

        if not unit_data:
            console.print(f"[yellow]Unit '{unit_name}' not found.[/yellow]")

            matches = catalogue.search_units(unit_name)
            if matches:
                console.print(f"\n[cyan]Did you mean one of these?[/cyan]")
                for match in matches[:5]:
                    console.print(f"  • {match}")
            return

        # Display info
        panel_content = []
        panel_content.append(f"[bold]Category:[/bold] {unit_data['unit_type']}")
        panel_content.append(f"[bold]Base Cost:[/bold] {unit_data['base_cost']} points")

        # Show profiles
        if unit_data['profiles']:
            panel_content.append(f"\n[bold yellow]Profiles:[/bold yellow]")
            for profile in unit_data['profiles']:
                panel_content.append(f"\n  [cyan]{profile['name']}[/cyan]")

                # Show key stats
                chars = profile['characteristics']
                if 'WS' in chars:  # Infantry/Character
                    panel_content.append(f"    WS:{chars.get('WS')} BS:{chars.get('BS')} S:{chars.get('S')} T:{chars.get('T')} W:{chars.get('W')}")
                    panel_content.append(f"    I:{chars.get('I')} A:{chars.get('A')} LD:{chars.get('LD')} SAV:{chars.get('SAV')}")
                elif 'Front Armour' in chars:  # Vehicle
                    panel_content.append(f"    Armour: F:{chars.get('Front Armour')} S:{chars.get('Side Armour')} R:{chars.get('Rear Armour')}")
                    panel_content.append(f"    HP:{chars.get('HP')} BS:{chars.get('BS')}")

        panel = Panel(
            "\n".join(panel_content),
            title=f"[bold cyan]{unit_data['name']}[/bold cyan]",
            border_style="cyan"
        )

        console.print(panel)

    except FileNotFoundError:
        console.print("[red]Catalogue not loaded. Run 'auxilia init' first.[/red]")
