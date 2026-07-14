from bson import ObjectId
from fastapi import Depends, Header, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.auth.security import decode_access_token
from app.config import get_settings
from app.database import get_db
from app.models.user import Role, UserInDB

_bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
) -> UserInDB:
    if credentials is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Missing bearer token")
    try:
        payload = decode_access_token(credentials.credentials)
    except ValueError as exc:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, str(exc)) from exc

    user_doc = await get_db().users.find_one({"_id": ObjectId(payload["sub"])})
    if user_doc is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User not found")
    user_doc["_id"] = str(user_doc["_id"])
    return UserInDB.model_validate(user_doc)


def require_roles(*allowed_roles: Role):
    async def _guard(user: UserInDB = Depends(get_current_user)) -> UserInDB:
        if not set(user.roles) & set(allowed_roles):
            raise HTTPException(
                status.HTTP_403_FORBIDDEN,
                "You do not have permission to access this resource",
            )
        return user

    return _guard


def require_roles_or_cron_secret(*allowed_roles: Role):
    """Allow either a logged-in user with an allowed role, or the unattended
    weekly cron job authenticating with a shared secret (no user session)."""

    guard = require_roles(*allowed_roles)

    async def _guard(
        credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
        x_cron_secret: str | None = Header(default=None),
    ) -> UserInDB | None:
        settings = get_settings()
        if x_cron_secret and settings.reports_cron_secret and x_cron_secret == settings.reports_cron_secret:
            return None
        if credentials is None:
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Missing bearer token")
        return await guard(user=await get_current_user(credentials))

    return _guard
