from datetime import UTC, datetime
from typing import Annotated
import logging

from fastapi.params import Depends
from fastapi.security import OAuth2PasswordRequestForm
from fastapi import APIRouter, Cookie, HTTPException, Response, status
from sqlalchemy.orm import Session

from backend.utils.config import (
    ACCESS_EXPIRES,
    JWT_ACCESS_COOKIE_NAME,
    JWT_COOKIE_SECURE,
    JWT_REFRESH_COOKIE_NAME,
    REFRESH_EXPIRES,
)
from backend.utils.dependencies import db_dependency, get_current_active_user
from backend.models import (
    TokenPayload,
    UserDB,
    UserLoginRequest,
    UserMePublic,
    UserPublic,
    UserRegisterRequest,
    RefreshTokensCompatRequest,
)
from backend.repositories.token_denylist_repository import TokenDenylistRepository
from backend.repositories.user_repository import UserRepository
from backend.services.auth_service import (
    build_scopes_for_user,
    decode_token,
    encode_token,
    get_password_hash,
    verify_password,
)
from backend.services.bank_service import get_user_me_payload

router = APIRouter(prefix="/auth", tags=["auth"])
logger = logging.getLogger(__name__)


def authenticate_user(db: Session, username: str, password: str) -> UserDB | None:
    user_repo = UserRepository(db)
    user = user_repo.get_by_username(username)
    if user is None:
        logger.info("Authentication failed: unknown username=%s", username)
        return None
    if not verify_password(password, user.hashed_password):
        logger.info("Authentication failed: invalid password username=%s", username)
        return None
    logger.debug("Authentication succeeded user_id=%s", user.id)
    return user


def _set_auth_cookies(
    response: Response, access_token: str, refresh_token: str
) -> None:
    response.set_cookie(
        key=JWT_ACCESS_COOKIE_NAME,
        value=access_token,
        httponly=True,
        secure=JWT_COOKIE_SECURE,
        samesite="lax",
        path="/",
    )
    response.set_cookie(
        key=JWT_REFRESH_COOKIE_NAME,
        value=refresh_token,
        httponly=True,
        secure=JWT_COOKIE_SECURE,
        samesite="lax",
        path="/",
    )


def _set_access_cookie(response: Response, access_token: str) -> None:
    response.set_cookie(
        key=JWT_ACCESS_COOKIE_NAME,
        value=access_token,
        httponly=True,
        secure=JWT_COOKIE_SECURE,
        samesite="lax",
        path="/",
    )


def _clear_auth_cookies(response: Response) -> None:
    response.delete_cookie(JWT_ACCESS_COOKIE_NAME, path="/")
    response.delete_cookie(JWT_REFRESH_COOKIE_NAME, path="/")


def _require_access_token_payload(
    response: Response, token: str | None, db: Session
) -> dict:
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing access token"
        )
    payload = decode_token(token, "access")
    jti = str(payload.get("jti", ""))
    if jti and TokenDenylistRepository(db).is_token_revoked(jti):
        _clear_auth_cookies(response)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Token has been revoked"
        )
    return payload


def _require_refresh_token_payload(
    response: Response, token: str | None, db: Session
) -> dict:
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing refresh token"
        )
    payload = decode_token(token, "refresh")
    jti = str(payload.get("jti", ""))
    if jti and TokenDenylistRepository(db).is_token_revoked(jti):
        _clear_auth_cookies(response)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Token has been revoked"
        )
    return payload


@router.post(
    "/register", response_model=UserPublic, status_code=status.HTTP_201_CREATED
)
def register(payload: UserRegisterRequest, db: db_dependency):
    """Register a new user account."""
    user_repo = UserRepository(db)
    existing_user = user_repo.get_by_username(payload.username)
    if existing_user is not None:
        logger.warning("Registration conflict for username=%s", payload.username)
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Username already exists"
        )

    user = user_repo.create_user(
        username=payload.username,
        email=payload.email,
        full_name=payload.full_name,
        hashed_password=get_password_hash(payload.password),
    )
    logger.info("Registered new user user_id=%s username=%s", user.id, user.username)
    return UserPublic.model_validate(user)


@router.post("/login", response_model=TokenPayload)
def login(payload: UserLoginRequest, response: Response, db: db_dependency):
    """Authenticate a user and issue fresh access/refresh tokens."""
    user = authenticate_user(db, payload.username, payload.password)
    if user is None:
        logger.warning("Login denied for username=%s", payload.username)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Bad username or password"
        )
    if not user.is_active:
        logger.warning("Login denied for inactive account user_id=%s", user.id)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive account",
        )

    scopes = build_scopes_for_user(user)

    access_token = encode_token(
        subject=user.username,
        token_type="access",
        expires_delta=ACCESS_EXPIRES,
        fresh=True,
        scopes=scopes,
    )
    refresh_token = encode_token(
        subject=user.username,
        token_type="refresh",
        expires_delta=REFRESH_EXPIRES,
        fresh=False,
        scopes=scopes,
    )
    _set_auth_cookies(response, access_token, refresh_token)
    logger.info("Login succeeded user_id=%s scopes=%s", user.id, scopes)

    return TokenPayload(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=int(ACCESS_EXPIRES.total_seconds()),
        scopes=scopes,
    )


@router.post("/token", response_model=TokenPayload)
def login_oauth2_compat(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    response: Response,
    db: db_dependency,
):
    """Compatibility endpoint for OAuth2PasswordRequestForm clients."""
    payload = UserLoginRequest(
        username=form_data.username,
        password=form_data.password,
    )
    return login(payload, response, db)


@router.get("/me", response_model=UserMePublic)
def me(
    current_user: Annotated[UserDB, Depends(get_current_active_user)],
    db: db_dependency,
):
    """Return the authenticated user's profile and spending summary."""
    logger.debug("Fetching /auth/me payload for user_id=%s", current_user.id)
    return get_user_me_payload(db, current_user=current_user)


@router.get("/users", response_model=list[str])
def list_usernames(
    response: Response,
    db: db_dependency,
    access_token: str | None = Cookie(default=None, alias=JWT_ACCESS_COOKIE_NAME),
):
    """List usernames for authenticated sessions validated via access cookie."""
    _require_access_token_payload(response, access_token, db)
    usernames = UserRepository(db).list_usernames()
    logger.info("Listed usernames count=%s", len(usernames))
    return usernames


@router.post("/refresh", response_model=TokenPayload)
def refresh_tokens(
    response: Response,
    db: db_dependency,
    refresh_token: str | None = Cookie(default=None, alias=JWT_REFRESH_COOKIE_NAME),
    access_token: str | None = Cookie(default=None, alias=JWT_ACCESS_COOKIE_NAME),
):
    """Rotate refresh tokens and return a new auth token pair."""
    payload = _require_refresh_token_payload(response, refresh_token, db)
    subject = payload.get("sub")
    if not isinstance(subject, str):
        logger.warning("Refresh token missing subject")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token subject"
        )

    user = UserRepository(db).get_by_username(subject)
    if user is None:
        logger.warning("Refresh denied: user not found subject=%s", subject)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    if not user.is_active:
        logger.warning("Refresh denied: inactive user_id=%s", user.id)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive account",
        )
    scopes = build_scopes_for_user(user)

    # Rotate the current refresh token: revoke old one before issuing a new pair.
    _revoke_payload(db, payload)
    if access_token:
        try:
            access_payload = decode_token(access_token, "access")
            _revoke_payload(db, access_payload)
        except HTTPException:
            pass

    new_access_token = encode_token(
        subject=subject,
        token_type="access",
        expires_delta=ACCESS_EXPIRES,
        fresh=True,
        scopes=scopes,
    )
    new_refresh_token = encode_token(
        subject=subject,
        token_type="refresh",
        expires_delta=REFRESH_EXPIRES,
        fresh=False,
        scopes=scopes,
    )
    _set_auth_cookies(response, new_access_token, new_refresh_token)
    logger.info("Token refresh succeeded user_id=%s", user.id)
    return TokenPayload(
        access_token=new_access_token,
        refresh_token=new_refresh_token,
        expires_in=int(ACCESS_EXPIRES.total_seconds()),
        scopes=scopes,
    )


@router.post("/refresh/token", response_model=TokenPayload)
def refresh_tokens_compat(
    payload: RefreshTokensCompatRequest,
    response: Response,
    db: db_dependency,
):
    """Backward-compatible alias for clients using POST /refresh/token."""
    return refresh_tokens(response, db, payload.refresh_token, payload.access_token)


def _revoke_payload(db: Session, payload: dict) -> None:
    jti = str(payload.get("jti", ""))
    exp = payload.get("exp")
    token_type = str(payload.get("type", "access"))
    if not jti or exp is None:
        logger.debug("Skipping revoke for payload missing jti/exp")
        return

    expires_at = datetime.fromtimestamp(int(exp), tz=UTC)
    TokenDenylistRepository(db).revoke_token(
        jti=jti,
        token_type=token_type,
        expires_at=expires_at,
    )
    logger.info("Revoked token jti=%s type=%s", jti, token_type)


@router.post("/logout")
def logout(
    response: Response,
    db: db_dependency,
    access_token: str | None = Cookie(default=None, alias=JWT_ACCESS_COOKIE_NAME),
    refresh_token: str | None = Cookie(default=None, alias=JWT_REFRESH_COOKIE_NAME),
):
    """Revoke active tokens and clear auth cookies."""
    if access_token:
        try:
            payload = decode_token(access_token, "access")
            _revoke_payload(db, payload)
        except HTTPException:
            pass

    if refresh_token:
        try:
            payload = decode_token(refresh_token, "refresh")
            _revoke_payload(db, payload)
        except HTTPException:
            pass

    _clear_auth_cookies(response)
    logger.info("Logout completed")
    return {"msg": "Successfully logout"}


@router.delete("/logout")
def logout_delete_compat(
    response: Response,
    db: db_dependency,
    access_token: str | None = Cookie(default=None, alias=JWT_ACCESS_COOKIE_NAME),
    refresh_token: str | None = Cookie(default=None, alias=JWT_REFRESH_COOKIE_NAME),
):
    """Backward-compatible alias for clients using DELETE logout."""
    return logout(response, db, access_token, refresh_token)
