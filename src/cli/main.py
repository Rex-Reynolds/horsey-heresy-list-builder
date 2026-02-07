"""Main CLI entry point."""
import asyncio
import logging
import sys

import click
from rich.console import Console
from rich.logging import RichHandler

from src.models import initialize_database, db
from src.config import DB_PATH

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(message)s",
    handlers=[RichHandler(rich_tracebacks=True, show_path=False)]
)
logger = logging.getLogger(__name__)

console = Console()


@click.group()
@click.option('--debug', is_flag=True, help='Enable debug logging')
def cli(debug):
    """Solar Auxilia Tournament-Informed List Builder."""
    if debug:
        logging.getLogger().setLevel(logging.DEBUG)

    # Initialize database on first run
    if not DB_PATH.exists():
        console.print("[yellow]Initializing database...[/yellow]")
        initialize_database()
        console.print("[green]✓ Database initialized[/green]")


@cli.group()
def tournament():
    """Tournament data management commands."""
    pass


@tournament.command()
@click.option('--cache/--no-cache', default=True, help='Use cached data')
@click.option('--limit', type=int, default=20, help='Maximum tournaments to scrape')
def update(cache, limit):
    """Scrape and update tournament data from Best Coast Pairings."""
    from src.scrapers.bcp_scraper import BCPScraper, scrape_and_store_tournaments
    from src.scrapers.parsers import parse_army_list
    from src.models import ArmyList, UnitEntry

    console.print("[bold cyan]Starting tournament data update...[/bold cyan]\n")

    scraper = BCPScraper(cache_enabled=cache)

    # Run async scraping
    try:
        asyncio.run(scrape_and_store_tournaments(scraper))
    except KeyboardInterrupt:
        console.print("\n[yellow]Scraping interrupted by user[/yellow]")
        return
    except Exception as e:
        console.print(f"\n[red]Error during scraping: {e}[/red]")
        logger.exception("Scraping failed")
        return

    # Parse all lists that haven't been parsed yet
    console.print("\n[yellow]Parsing army lists...[/yellow]")

    unparsed_lists = ArmyList.select().where(
        (ArmyList.faction == "Solar Auxilia") &
        (ArmyList.parse_confidence == 0.0)
    )

    parsed_count = 0
    with db.atomic():
        for army_list in unparsed_lists:
            units, confidence = parse_army_list(army_list.list_text)

            # Update parse confidence
            army_list.parse_confidence = confidence
            army_list.save()

            # Create unit entries
            for unit_data in units:
                UnitEntry.create(
                    army_list=army_list,
                    unit_name=unit_data["name"],
                    quantity=unit_data["quantity"],
                    points=unit_data["points"],
                    category=unit_data["category"],
                    upgrades=unit_data["upgrades"]
                )

            parsed_count += 1

    console.print(f"[green]✓ Parsed {parsed_count} army lists[/green]")
    console.print(f"[green]✓ Tournament data update complete![/green]")


@tournament.command()
@click.option('--points', type=int, default=2000, help='Points level for analysis')
def stats(points):
    """View meta statistics and analysis."""
    from src.analytics.reports import generate_meta_report

    try:
        generate_meta_report(faction="Solar Auxilia", points_level=points, console=console)
    except Exception as e:
        console.print(f"[red]Error generating report: {e}[/red]")
        logger.exception("Report generation failed")


@tournament.command()
@click.argument('unit_name')
def unit(unit_name):
    """View detailed statistics for a specific unit."""
    from src.analytics.reports import print_unit_details

    try:
        print_unit_details(unit_name, faction="Solar Auxilia", console=console)
    except Exception as e:
        console.print(f"[red]Error: {e}[/red]")
        logger.exception("Unit details failed")


@tournament.command()
@click.option('--output', '-o', help='Output file path')
@click.option('--points', type=int, default=2000, help='Points level')
def export(output, points):
    """Export meta analysis report to file."""
    from src.analytics.reports import export_meta_report_text
    from src.config import EXPORT_DIR

    if not output:
        output = EXPORT_DIR / f"meta_report_{points}pts.txt"

    try:
        export_meta_report_text(
            faction="Solar Auxilia",
            points_level=points,
            filepath=str(output)
        )
        console.print(f"[green]✓ Report exported to {output}[/green]")
    except Exception as e:
        console.print(f"[red]Error exporting report: {e}[/red]")
        logger.exception("Export failed")


@cli.group()
def list():
    """Army list building commands."""
    pass


@list.command()
def new():
    """Create a new army list."""
    console.print("[yellow]List builder coming in Phase 3![/yellow]")
    console.print("[dim]Use 'auxilia tournament stats' to view meta data[/dim]")


@list.command()
@click.argument('list_id', type=int)
def open(list_id):
    """Open and edit an existing list."""
    console.print("[yellow]List builder coming in Phase 3![/yellow]")


@list.command()
@click.argument('list_id', type=int)
@click.option('--format', type=click.Choice(['text', 'html', 'pdf']), default='text')
def export_list(list_id, format):
    """Export a list to file."""
    console.print("[yellow]Export functionality coming in Phase 3![/yellow]")


# Import and register collection commands
from src.cli.collection_menu import collection
cli.add_command(collection)

# Import and register BSData commands
from src.cli.bsdata_menu import bsdata
cli.add_command(bsdata)

# Import and register streamlined commands
from src.cli.streamlined import init, add, list_collection, build, info
cli.add_command(init)
cli.add_command(add)
cli.add_command(list_collection, name='show')  # Avoid conflict with 'list' group
cli.add_command(build)
cli.add_command(info)


if __name__ == '__main__':
    cli()
