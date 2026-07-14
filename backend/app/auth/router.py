from fastapi import APIRouter, Depends, HTTPException, status

from app.auth.dependencies import get_current_user
from app.auth.security import create_access_token, verify_password
from app.database import get_db
from app.models.user import LoginRequest, TokenResponse, UserInDB, UserPublic

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest) -> TokenResponse:
    user_doc = await get_db().users.find_one({"email": payload.email})
    if user_doc is None or not verify_password(payload.password, user_doc["hashed_password"]):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid email or password")

    user_doc["_id"] = str(user_doc["_id"])
    user = UserInDB.model_validate(user_doc)
    token = create_access_token(subject=user.id, roles=[r.value for r in user.roles])
    return TokenResponse(
        access_token=token,
        user=UserPublic(id=user.id, email=user.email, full_name=user.full_name, roles=user.roles),
    )


@router.get("/me", response_model=UserPublic)
async def me(user: UserInDB = Depends(get_current_user)) -> UserPublic:
    return UserPublic(id=user.id, email=user.email, full_name=user.full_name, roles=user.roles)
