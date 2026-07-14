"""Pure-Python appointment report calculations.

No LLM calls here: WoW/MoM/YTD are plain arithmetic over appointment
date/amount fields, and the bullet flags are simple threshold rules.
"""

from dataclasses import dataclass
from datetime import date, timedelta
from typing import Any, Iterable

FLAG_THRESHOLD_PCT = 20.0

PERIOD_LABELS = {
    "wow": "Εβδομάδα προς εβδομάδα (WoW)",
    "mom": "Μήνας προς μήνα (MoM)",
    "ytd": "Από την αρχή του έτους (YTD)",
}


@dataclass
class PeriodTotals:
    count: int
    revenue: float


@dataclass
class PeriodComparison:
    label: str
    current: PeriodTotals
    previous: PeriodTotals
    pct_change: float | None  # None when there is no previous-period revenue to compare against


def _amount(appt: Any) -> float:
    return appt["amount"] if isinstance(appt, dict) else appt.amount


def _date(appt: Any) -> date:
    return appt["date"] if isinstance(appt, dict) else appt.date


def get_period_totals(appointments: Iterable[Any]) -> PeriodTotals:
    appts = list(appointments)
    return PeriodTotals(count=len(appts), revenue=round(sum(_amount(a) for a in appts), 2))


def _in_range(appointments: Iterable[Any], start: date, end: date) -> list[Any]:
    return [a for a in appointments if start <= _date(a) <= end]


def _week_range(d: date) -> tuple[date, date]:
    monday = d - timedelta(days=d.weekday())
    return monday, monday + timedelta(days=6)


def _month_range(d: date) -> tuple[date, date]:
    start = d.replace(day=1)
    if d.month == 12:
        next_month_start = date(d.year + 1, 1, 1)
    else:
        next_month_start = date(d.year, d.month + 1, 1)
    return start, next_month_start - timedelta(days=1)


def _same_day_last_year(d: date) -> date:
    try:
        return d.replace(year=d.year - 1)
    except ValueError:  # Feb 29 with no leap year equivalent
        return d.replace(year=d.year - 1, day=28)


def _pct_change(current: float, previous: float) -> float | None:
    if previous == 0:
        return None if current == 0 else 100.0
    return round((current - previous) / previous * 100, 1)


def compute_comparisons(all_appointments: Iterable[Any], anchor_date: date) -> dict[str, PeriodComparison]:
    appts = list(all_appointments)
    comparisons: dict[str, PeriodComparison] = {}

    # WoW: ISO week containing anchor_date vs the prior week
    cur_start, cur_end = _week_range(anchor_date)
    prev_start, prev_end = cur_start - timedelta(days=7), cur_end - timedelta(days=7)
    current = get_period_totals(_in_range(appts, cur_start, cur_end))
    previous = get_period_totals(_in_range(appts, prev_start, prev_end))
    comparisons["wow"] = PeriodComparison(
        PERIOD_LABELS["wow"], current, previous, _pct_change(current.revenue, previous.revenue)
    )

    # MoM: calendar month containing anchor_date vs the prior calendar month
    cur_start, cur_end = _month_range(anchor_date)
    prev_month_anchor = cur_start - timedelta(days=1)
    prev_start, prev_end = _month_range(prev_month_anchor)
    current = get_period_totals(_in_range(appts, cur_start, cur_end))
    previous = get_period_totals(_in_range(appts, prev_start, prev_end))
    comparisons["mom"] = PeriodComparison(
        PERIOD_LABELS["mom"], current, previous, _pct_change(current.revenue, previous.revenue)
    )

    # YTD: Jan 1 - anchor_date this year vs the same span last year
    cur_start = date(anchor_date.year, 1, 1)
    prev_start = date(anchor_date.year - 1, 1, 1)
    prev_end = _same_day_last_year(anchor_date)
    current = get_period_totals(_in_range(appts, cur_start, anchor_date))
    previous = get_period_totals(_in_range(appts, prev_start, prev_end))
    comparisons["ytd"] = PeriodComparison(
        PERIOD_LABELS["ytd"], current, previous, _pct_change(current.revenue, previous.revenue)
    )

    return comparisons


def generate_flags(comparisons: dict[str, PeriodComparison]) -> list[str]:
    flags: list[str] = []
    for comparison in comparisons.values():
        pct = comparison.pct_change
        if pct is None or abs(pct) < FLAG_THRESHOLD_PCT:
            continue
        direction = "αύξηση" if pct > 0 else "μείωση"
        flags.append(
            f"⚠ {comparison.label}: {direction} εσόδων {abs(pct):.1f}% "
            f"({comparison.previous.revenue:.2f}€ → {comparison.current.revenue:.2f}€)"
        )
    if not flags:
        flags.append("Καμία σημαντική μεταβολή (>±20%) στα έσοδα σε σχέση με τις προηγούμενες περιόδους.")
    return flags
