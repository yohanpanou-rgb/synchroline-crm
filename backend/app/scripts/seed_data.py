"""Seed a local/dev Mongo with a couple of users and sample appointments.

Usage (from backend/):
    python -m app.scripts.seed_data
"""

import asyncio
import random
from datetime import datetime, timedelta

from app.auth.security import hash_password
from app.database import get_db

SERVICES = ["Καθαρισμός προσώπου", "Botox", "Laser αποτρίχωσης", "Peeling", "Mesotherapy"]
STAFF = ["Δρ. Παπαδοπούλου", "Δρ. Νικολάου", "Αικ. Ιωάννου"]


async def seed() -> None:
    db = get_db()

    await db.users.delete_many({"email": {"$in": ["admin@medi360.gr", "manager@medi360.gr", "staff@medi360.gr"]}})
    await db.users.insert_many(
        [
            {
                "email": "admin@medi360.gr",
                "full_name": "Admin User",
                "hashed_password": hash_password("changeme123"),
                "roles": ["admin"],
            },
            {
                "email": "manager@medi360.gr",
                "full_name": "Clinic Manager",
                "hashed_password": hash_password("changeme123"),
                "roles": ["clinic_manager"],
            },
            {
                "email": "staff@medi360.gr",
                "full_name": "Reception Staff",
                "hashed_password": hash_password("changeme123"),
                "roles": ["staff"],
            },
        ]
    )

    await db.appointments.delete_many({})
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    appointments = []
    for days_ago in range(0, 400, 3):
        appt_date = today - timedelta(days=days_ago)
        appointments.append(
            {
                "date": appt_date,
                "customer_name": f"Πελάτης {days_ago}",
                "customer_phone": f"69{random.randint(10000000, 99999999)}",
                "service": random.choice(SERVICES),
                "amount": round(random.uniform(30, 250), 2),
                "staff_name": random.choice(STAFF),
            }
        )
    await db.appointments.insert_many(appointments)

    print(f"Seeded 3 users and {len(appointments)} appointments.")


if __name__ == "__main__":
    asyncio.run(seed())
