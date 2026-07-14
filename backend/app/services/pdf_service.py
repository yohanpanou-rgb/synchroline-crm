from datetime import date
from pathlib import Path
from typing import Any

from jinja2 import Environment, FileSystemLoader

from app.services.report_service import PeriodComparison

TEMPLATES_DIR = Path(__file__).resolve().parent.parent / "templates"
_env = Environment(loader=FileSystemLoader(TEMPLATES_DIR))


def render_report_pdf(
    period_from: date,
    period_to: date,
    appointments: list[Any],
    comparisons: dict[str, PeriodComparison],
    flags: list[str],
) -> bytes:
    # Imported lazily: WeasyPrint needs native Pango/GObject libraries that aren't
    # always present in every environment (e.g. local dev without GTK installed) —
    # deferring the import means the rest of the app still starts without them.
    from weasyprint import HTML

    template = _env.get_template("report.html")
    html = template.render(
        period_from=period_from,
        period_to=period_to,
        appointments=appointments,
        comparisons=comparisons,
        flags=flags,
        total_revenue=round(sum(a["amount"] if isinstance(a, dict) else a.amount for a in appointments), 2),
        total_count=len(appointments),
    )
    return HTML(string=html).write_pdf()
