from dataclasses import asdict
from datetime import date, datetime, time, timedelta

from fastapi import APIRouter, Depends, Query

from app.auth.dependencies import require_roles, require_roles_or_cron_secret
from app.database import get_db
from app.models.appointment import AppointmentOut
from app.models.user import REPORT_ROLES
from app.services.email_service import send_email_with_attachment
from app.services.pdf_service import render_report_pdf
from app.services.report_service import compute_comparisons, generate_flags

router = APIRouter(prefix="/api/reports", tags=["reports"])


async def _fetch_appointments(period_from: date, period_to: date) -> list[AppointmentOut]:
    start = datetime.combine(period_from, time.min)
    end = datetime.combine(period_to, time.max)
    cursor = get_db().appointments.find({"date": {"$gte": start, "$lte": end}}).sort("date", 1)
    docs = await cursor.to_list(length=None)
    appointments = []
    for doc in docs:
        doc["_id"] = str(doc["_id"])
        doc["date"] = doc["date"].date() if isinstance(doc["date"], datetime) else doc["date"]
        appointments.append(AppointmentOut.model_validate(doc))
    return appointments


async def _fetch_appointments_for_comparisons(anchor_date: date) -> list[AppointmentOut]:
    # Widest span any comparison needs: from Jan 1 of the previous year through the anchor date.
    return await _fetch_appointments(date(anchor_date.year - 1, 1, 1), anchor_date)


@router.get("/appointments")
async def get_appointments_report(
    from_: date = Query(..., alias="from"),
    to: date = Query(...),
    _user=Depends(require_roles(*REPORT_ROLES)),
):
    appointments = await _fetch_appointments(from_, to)
    comparison_pool = await _fetch_appointments_for_comparisons(to)
    comparisons = compute_comparisons(comparison_pool, to)
    flags = generate_flags(comparisons)

    return {
        "period_from": from_,
        "period_to": to,
        "appointments": appointments,
        "comparisons": {key: asdict(value) for key, value in comparisons.items()},
        "flags": flags,
        "total_count": len(appointments),
        "total_revenue": round(sum(a.amount for a in appointments), 2),
    }


@router.post("/send")
async def send_report(
    to: str = Query(..., description="Recipient email address"),
    from_: date | None = Query(default=None, alias="from"),
    to_date: date | None = Query(default=None),
    _user=Depends(require_roles_or_cron_secret(*REPORT_ROLES)),
):
    period_to = to_date or date.today()
    period_from = from_ or (period_to - timedelta(days=7))

    appointments = await _fetch_appointments(period_from, period_to)
    comparison_pool = await _fetch_appointments_for_comparisons(period_to)
    comparisons = compute_comparisons(comparison_pool, period_to)
    flags = generate_flags(comparisons)

    pdf_bytes = render_report_pdf(period_from, period_to, appointments, comparisons, flags)
    filename = f"medi360-report-{period_from.isoformat()}-{period_to.isoformat()}.pdf"

    send_email_with_attachment(
        to=to,
        subject=f"medi360 — Αναφορά ραντεβού {period_from.isoformat()} έως {period_to.isoformat()}",
        body="Επισυνάπτεται η αναφορά ραντεβού της περιόδου. Δείτε το PDF για λεπτομέρειες.",
        attachment_bytes=pdf_bytes,
        attachment_filename=filename,
    )

    return {"status": "sent", "to": to, "period_from": period_from, "period_to": period_to}
