from datetime import date

from pydantic import BaseModel, Field


class AppointmentOut(BaseModel):
    id: str = Field(alias="_id")
    date: date
    customer_name: str
    customer_phone: str
    service: str
    amount: float
    staff_name: str

    model_config = {"populate_by_name": True}
