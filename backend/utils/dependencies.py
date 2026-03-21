from typing import Annotated

from fastapi import Cookie, Depends, HTTPException, Security, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from backend.models import UserDB
from backend.repositories.token_denylist_repository import TokenDenylistRepository
from backend.repositories.user_repository import UserRepository
from backend.services.auth_service import decode_token
from backend.utils.config import JWT_ACCESS_COOKIE_NAME
from backend.utils.database import SessionLocal


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


db_dependency = Annotated[Session, Depends(get_db)]

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="/api/auth/token",
    scopes={"USER": "Basic authenticated access", "ADMIN": "Administrative access"},
    auto_error=False,
)


def get_current_access_payload(
    db: db_dependency,
    bearer_token: Annotated[str | None, Security(oauth2_scheme)] = None,
    access_cookie: str | None = Cookie(default=None, alias=JWT_ACCESS_COOKIE_NAME),
) -> dict:
    token = bearer_token or access_cookie
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing access token",
        )

    payload = decode_token(token, "access")
    jti = str(payload.get("jti", ""))
    if jti and TokenDenylistRepository(db).is_token_revoked(jti):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has been revoked",
        )
    return payload


def get_current_active_user(
    db: db_dependency,
    payload: dict = Depends(get_current_access_payload),
) -> UserDB:
    subject = payload.get("sub")
    if not isinstance(subject, str):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token subject",
        )

    user = UserRepository(db).get_by_username(subject)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive account",
        )
    return user


def check_admin_privileges(
    current_user: UserDB = Depends(get_current_active_user),
    payload: dict = Depends(get_current_access_payload),
) -> UserDB:
    token_scopes = payload.get("scopes", [])
    if not isinstance(token_scopes, list) or "ADMIN" not in token_scopes:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions",
        )
    return current_user


current_user_dependency = Annotated[UserDB, Depends(get_current_active_user)]
admin_user_dependency = Annotated[UserDB, Depends(check_admin_privileges)]
