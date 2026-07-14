from datetime import date

from app.services.report_service import (
    compute_comparisons,
    generate_flags,
    get_period_totals,
)


def appt(d: date, amount: float) -> dict:
    return {"date": d, "amount": amount}


def test_get_period_totals():
    appointments = [appt(date(2024, 6, 10), 100.0), appt(date(2024, 6, 11), 50.5)]
    totals = get_period_totals(appointments)
    assert totals.count == 2
    assert totals.revenue == 150.5


def test_wow_comparison_detects_large_increase():
    # Anchor: Sat 2024-06-15 -> current ISO week Mon 06-10..Sun 06-16, previous week Mon 06-03..Sun 06-09
    anchor = date(2024, 6, 15)
    appointments = [
        appt(date(2024, 6, 11), 100.0),
        appt(date(2024, 6, 12), 100.0),  # current week total: 200
        appt(date(2024, 6, 5), 100.0),  # previous week total: 100
    ]
    comparisons = compute_comparisons(appointments, anchor)
    wow = comparisons["wow"]
    assert wow.current.revenue == 200.0
    assert wow.previous.revenue == 100.0
    assert wow.pct_change == 100.0


def test_mom_comparison():
    anchor = date(2024, 6, 15)
    appointments = [
        appt(date(2024, 6, 20), 300.0),  # current month (June)
        appt(date(2024, 5, 20), 200.0),  # previous month (May)
    ]
    comparisons = compute_comparisons(appointments, anchor)
    mom = comparisons["mom"]
    assert mom.current.revenue == 300.0
    assert mom.previous.revenue == 200.0
    assert mom.pct_change == 50.0


def test_ytd_comparison():
    anchor = date(2024, 6, 15)
    appointments = [
        appt(date(2024, 3, 1), 400.0),  # this year YTD
        appt(date(2023, 3, 1), 500.0),  # same span last year
    ]
    comparisons = compute_comparisons(appointments, anchor)
    ytd = comparisons["ytd"]
    assert ytd.current.revenue == 400.0
    assert ytd.previous.revenue == 500.0
    assert ytd.pct_change == -20.0


def test_generate_flags_flags_large_changes():
    anchor = date(2024, 6, 15)
    appointments = [
        appt(date(2024, 6, 11), 200.0),
        appt(date(2024, 6, 5), 50.0),  # WoW: +300% -> should flag
    ]
    comparisons = compute_comparisons(appointments, anchor)
    flags = generate_flags(comparisons)
    assert any("WoW" in f for f in flags)


def test_generate_flags_no_significant_change():
    # Baseline data provided for all three comparisons (WoW, MoM, YTD) so none crosses
    # the +/-20% threshold -- unlike the "flags" test above, this isn't just missing
    # previous-period data (which would itself read as a 100% jump from zero).
    anchor = date(2024, 6, 15)
    appointments = [
        appt(date(2024, 6, 11), 105.0),  # WoW current week / MoM current month / YTD current
        appt(date(2024, 6, 5), 100.0),  # WoW previous week / MoM current month / YTD current
        appt(date(2024, 5, 20), 200.0),  # MoM previous month / YTD current
        appt(date(2023, 6, 10), 400.0),  # YTD previous year
    ]
    comparisons = compute_comparisons(appointments, anchor)
    assert comparisons["wow"].pct_change == 5.0
    assert comparisons["mom"].pct_change == 2.5
    assert comparisons["ytd"].pct_change == 1.2  # round(1.25, 1) -> banker's rounding
    flags = generate_flags(comparisons)
    assert flags == ["Καμία σημαντική μεταβολή (>±20%) στα έσοδα σε σχέση με τις προηγούμενες περιόδους."]
