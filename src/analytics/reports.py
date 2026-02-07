"""Meta analysis reporting with Rich formatting."""
import logging
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich.text import Text

from src.analytics.unit_popularity import calculate_unit_popularity, get_top_units
from src.analytics.point_distribution import (
    analyze_point_distribution,
    identify_efficient_units,
    get_category_guidelines
)
from src.analytics.combo_detector import detect_unit_combos

logger = logging.getLogger(__name__)


def generate_meta_report(
    faction: str = "Solar Auxilia",
    points_level: int = 2000,
    console: Console = None
) -> None:
    """
    Generate and display comprehensive meta analysis report.

    Args:
        faction: Faction to analyze
        points_level: Points level for distribution analysis
        console: Rich Console instance (creates new if None)
    """
    if console is None:
        console = Console()

    console.print(f"\n[bold cyan]═══ {faction} Meta Analysis ═══[/bold cyan]\n")

    # Section 1: Top Units
    console.print("[bold yellow]📊 Most Popular Units[/bold yellow]")
    top_units = get_top_units(faction=faction, limit=10)

    if top_units:
        units_table = Table(show_header=True, header_style="bold magenta")
        units_table.add_column("Rank", style="dim", width=6)
        units_table.add_column("Unit Name", style="cyan", width=35)
        units_table.add_column("Inclusion %", justify="right", width=12)
        units_table.add_column("Avg Qty", justify="right", width=8)
        units_table.add_column("Trend", justify="center", width=6)
        units_table.add_column("Lists", justify="right", width=8)

        for idx, unit in enumerate(top_units, 1):
            trend_color = {
                "↑": "green",
                "↓": "red",
                "→": "yellow"
            }.get(unit["trend"], "white")

            units_table.add_row(
                f"#{idx}",
                unit["unit_name"],
                f"{unit['inclusion_rate']:.1f}%",
                f"{unit['avg_quantity']:.1f}",
                f"[{trend_color}]{unit['trend']}[/{trend_color}]",
                str(unit["count"])
            )

        console.print(units_table)
    else:
        console.print("[yellow]No data available[/yellow]")

    console.print()

    # Section 2: Point Distribution
    console.print(f"[bold yellow]💰 Points Allocation (~{points_level}pts)[/bold yellow]")
    distribution = analyze_point_distribution(faction=faction, points_level=points_level)

    if distribution:
        dist_table = Table(show_header=True, header_style="bold magenta")
        dist_table.add_column("Category", style="cyan", width=20)
        dist_table.add_column("Median Points", justify="right", width=15)
        dist_table.add_column("Median %", justify="right", width=12)
        dist_table.add_column("Mean Points", justify="right", width=15)
        dist_table.add_column("Sample Size", justify="right", width=12)

        # Sort by median percentage descending
        sorted_categories = sorted(
            distribution.items(),
            key=lambda x: x[1]["median_percentage"],
            reverse=True
        )

        for category, stats in sorted_categories:
            dist_table.add_row(
                category,
                str(stats["median_points"]),
                f"{stats['median_percentage']:.1f}%",
                str(stats["mean_points"]),
                str(stats["sample_size"])
            )

        console.print(dist_table)

        # Guidelines
        guidelines = get_category_guidelines(points_level=points_level, faction=faction)
        if guidelines:
            console.print(f"\n[dim]Recommended allocations for {points_level}pts:[/dim]")
            for category, guide in guidelines.items():
                console.print(
                    f"  [cyan]{category}:[/cyan] {guide['min_points']}-{guide['max_points']}pts "
                    f"[dim]({guide['recommended_percentage']:.1f}%)[/dim]"
                )
    else:
        console.print("[yellow]No data available[/yellow]")

    console.print()

    # Section 3: Efficient Units
    console.print("[bold yellow]⚡ Most Efficient Units[/bold yellow]")
    console.print("[dim]High popularity, relatively low point cost[/dim]\n")

    efficient = identify_efficient_units(faction=faction, min_inclusion=25.0)

    if efficient:
        eff_table = Table(show_header=True, header_style="bold magenta")
        eff_table.add_column("Rank", style="dim", width=6)
        eff_table.add_column("Unit Name", style="cyan", width=35)
        eff_table.add_column("Inclusion %", justify="right", width=12)
        eff_table.add_column("Avg Points", justify="right", width=12)
        eff_table.add_column("Efficiency", justify="right", width=12)

        for idx, unit in enumerate(efficient[:5], 1):
            eff_table.add_row(
                f"#{idx}",
                unit["unit_name"],
                f"{unit['inclusion_rate']:.1f}%",
                str(unit["avg_points"]),
                f"[green]{unit['efficiency_score']:.2f}[/green]"
            )

        console.print(eff_table)
    else:
        console.print("[yellow]No data available[/yellow]")

    console.print()

    # Section 4: Popular Combinations
    console.print("[bold yellow]🔗 Common Unit Combinations[/bold yellow]")
    console.print("[dim]Units frequently paired together in tournament lists[/dim]\n")

    combos = detect_unit_combos(faction=faction, min_support=0.15, min_confidence=0.50)

    if combos:
        combo_table = Table(show_header=True, header_style="bold magenta")
        combo_table.add_column("If you have...", style="cyan", width=25)
        combo_table.add_column("...also include", style="green", width=25)
        combo_table.add_column("Confidence", justify="right", width=12)
        combo_table.add_column("Support", justify="right", width=10)

        for combo in combos[:8]:
            combo_table.add_row(
                combo["unit_a"],
                combo["unit_b"],
                f"{combo['confidence']:.1f}%",
                f"{combo['support']:.1f}%"
            )

        console.print(combo_table)
    else:
        console.print("[yellow]No significant combinations detected[/yellow]")

    console.print("\n[bold cyan]═══════════════════════════════[/bold cyan]\n")


def print_unit_details(unit_name: str, faction: str = "Solar Auxilia", console: Console = None):
    """Print detailed statistics for a specific unit."""
    if console is None:
        console = Console()

    from src.analytics.unit_popularity import get_unit_stats
    from src.analytics.combo_detector import get_synergies_for_unit

    stats = get_unit_stats(unit_name, faction=faction)

    panel_content = Text()
    panel_content.append(f"Inclusion Rate: ", style="bold")
    panel_content.append(f"{stats['inclusion_rate']:.1f}%\n")
    panel_content.append(f"Average Quantity: ", style="bold")
    panel_content.append(f"{stats['avg_quantity']:.1f}\n")
    panel_content.append(f"Trend: ", style="bold")
    panel_content.append(f"{stats['trend']}\n")
    panel_content.append(f"Tournament Lists: ", style="bold")
    panel_content.append(f"{stats['count']}")

    panel = Panel(panel_content, title=f"[bold cyan]{unit_name}[/bold cyan]", border_style="cyan")
    console.print(panel)

    # Show synergies
    synergies = get_synergies_for_unit(unit_name, faction=faction)
    if synergies:
        console.print("\n[bold yellow]Frequently Paired With:[/bold yellow]")
        for syn in synergies:
            console.print(f"  • [cyan]{syn['paired_unit']}[/cyan] ({syn['confidence']:.0f}% confidence)")


def export_meta_report_text(
    faction: str = "Solar Auxilia",
    points_level: int = 2000,
    filepath: str = None
) -> str:
    """
    Export meta report as plain text.

    Args:
        faction: Faction to analyze
        points_level: Points level for analysis
        filepath: Optional file path to save report

    Returns:
        Report text content
    """
    from io import StringIO
    from rich.console import Console

    # Create console that writes to string
    output = StringIO()
    console = Console(file=output, force_terminal=True, width=100)

    generate_meta_report(faction=faction, points_level=points_level, console=console)

    report_text = output.getvalue()

    if filepath:
        with open(filepath, 'w') as f:
            f.write(report_text)
        logger.info(f"Meta report exported to {filepath}")

    return report_text
