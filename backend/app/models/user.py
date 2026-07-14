from enum import StrEnum

from pydantic import BaseModel, EmailStr, Field


class Role(StrEnum):
    ADMIN = "admin"
    CLINIC_MANAGER = "clinic_manager"
    STAFF = "staff"


REPORT_ROLES = (Role.ADMIN, Role.CLINIC_MANAGER)


class UserInDB(BaseModel):
    id: str = Field(alias="_id")
    email: EmailStr
    full_name: str
    hashed_password: str
    roles: list[Role] = Field(default_factory=lambda: [Role.STAFF])

    model_config = {"populate_by_name": True}


class UserPublic(BaseModel):
    id: str
    email: EmailStr
    full_name: str
    roles: list[Role]


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserPublic
