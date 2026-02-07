"""CLI commands for collection management and list building."""
import click
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich.text import Text

from src.builder.collection_builder import CollectionManager, ListGenerator
from src.models import Collection

console = Console()


@click.group()
def collection():
    """Manage your model collection and generate lists."""
    pass


@collection.command()
@click.argument('unit_name')
@click.argument('quantity', type=int)
@click.option('--notes', help='Notes about the unit (e.g., "painted", "NiB")')
def add(unit_name, quantity, notes):
    """Add units to your collection."""
    manager = CollectionManager()
    manager.add_unit(unit_name, quantity, notes)

    console.print(f"[green]✓[/green] Added {quantity}x [cyan]{unit_name}[/cyan]")

    if notes:
        console.print(f"  Notes: [dim]{notes}[/dim]")


@collection.command()
@click.argument('unit_name')
def remove(unit_name):
    """Remove a unit from your collection."""
    manager = CollectionManager()

    if manager.remove_unit(unit_name):
        console.print(f"[green]✓[/green] Removed [cyan]{unit_name}[/cyan]")
    else:
        console.print(f"[yellow]Unit not found in collection[/yellow]")


@collection.command()
def show():
    """Show your current collection."""
    manager = CollectionManager()
    items = manager.list_collection()

    if not items:
        console.print("[yellow]Your collection is empty[/yellow]")
        console.print("\nAdd units with: [cyan]auxilia collection add \"Unit Name\" <quantity>[/cyan]")
        return

    console.print(f"\n[bold cyan]═══ Your Collection ═══[/bold cyan]\n")

    table = Table(show_header=True, header_style="bold magenta")
    table.add_column("Unit Name", style="cyan", width=35)
    table.add_column("Qty", justify="right", width=5)
    table.add_column("Tournament %", justify="right", width=14)
    table.add_column("Trend", justify="center", width=6)
    table.add_column("Notes", width=20)

    for item in items:
        trend_color = {
            "↑": "green",
            "↓": "red",
            "→": "yellow"
        }.get(item["trend"], "white")

        # Highlight high-value units
        inclusion_style = "green" if item["inclusion_rate"] > 50 else "white"

        table.add_row(
            item["unit_name"],
            str(item["quantity"]),
            f"[{inclusion_style}]{item['inclusion_rate']:.1f}%[/{inclusion_style}]",
            f"[{trend_color}]{item['trend']}[/{trend_color}]",
            item["notes"] or "-"
        )

    console.print(table)
    console.print(f"\nTotal units: [bold]{len(items)}[/bold]")


@collection.command()
@click.option('--count', '-n', default=3, help='Number of lists to generate')
def generate(count):
    """Generate tournament-viable lists from your collection."""
    manager = CollectionManager()
    items = manager.list_collection()

    if not items:
        console.print("[yellow]Your collection is empty![/yellow]")
        console.print("\nAdd units first:")
        console.print('  [cyan]auxilia collection add "Legate Commander" 1[/cyan]')
        console.print('  [cyan]auxilia collection add "Lasrifle Section" 3[/cyan]')
        return

    # Get collection
    coll = Collection.get_or_none(Collection.name == "My Collection")
    if not coll:
        console.print("[red]Collection not found[/red]")
        return

    generator = ListGenerator(coll)
    lists = generator.generate_lists(max_lists=count)

    if not lists:
        console.print("[yellow]Could not generate any lists from your collection[/yellow]")
        return

    console.print(f"\n[bold cyan]═══ Generated Lists from Your Collection ═══[/bold cyan]\n")

    for idx, list_data in enumerate(lists, 1):
        # Create panel for each list
        panel_content = Text()
        panel_content.append(f"{list_data['strategy']}\n\n", style="dim")

        # Add units
        for unit in list_data["units"]:
            panel_content.append(f"{unit['quantity']}x ", style="bold")
            panel_content.append(f"{unit['unit_name']}\n", style="cyan")
            panel_content.append(f"  └─ {unit['reason']}\n", style="dim")

        panel_content.append(f"\nMeta Score: ", style="bold")
        panel_content.append(f"{list_data['score']:.1f}", style="green")

        panel = Panel(
            panel_content,
            title=f"[bold yellow]#{idx}: {list_data['name']}[/bold yellow]",
            border_style="yellow"
        )

        console.print(panel)
        console.print()


@collection.command()
@click.option('--top', '-n', default=5, help='Number of recommendations')
def recommend(top):
    """Get purchase recommendations based on tournament meta."""
    manager = CollectionManager()

    coll = Collection.get_or_none(Collection.name == "My Collection")
    if not coll:
        console.print("[yellow]No collection found, showing general recommendations[/yellow]")
        coll = Collection.create(name="My Collection")

    generator = ListGenerator(coll)
    recommendations = generator.recommend_purchases(top_n=top)

    if not recommendations:
        console.print("[green]You own all the meta units! 🎉[/green]")
        return

    console.print(f"\n[bold cyan]═══ Purchase Recommendations ═══[/bold cyan]\n")
    console.print("[dim]Based on tournament meta analysis[/dim]\n")

    table = Table(show_header=True, header_style="bold magenta")
    table.add_column("Priority", width=8)
    table.add_column("Unit Name", style="cyan", width=35)
    table.add_column("Tournament %", justify="right", width=14)
    table.add_column("Avg Qty", justify="right", width=8)
    table.add_column("Reason", width=40)

    for rec in recommendations:
        priority_style = "red" if rec["priority"] == "HIGH" else "yellow"

        table.add_row(
            f"[{priority_style}]{rec['priority']}[/{priority_style}]",
            rec["unit_name"],
            f"{rec['inclusion_rate']:.1f}%",
            f"{rec['avg_quantity']:.1f}",
            rec["reason"]
        )

    console.print(table)


@collection.command()
def clear():
    """Clear your entire collection."""
    if click.confirm("Are you sure you want to clear your entire collection?"):
        coll = Collection.get_or_none(Collection.name == "My Collection")
        if coll:
            coll.delete_instance(recursive=True)
            console.print("[green]✓ Collection cleared[/green]")
        else:
            console.print("[yellow]Collection already empty[/yellow]")
