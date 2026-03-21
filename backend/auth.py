from datetime import UTC, datetime, timedelta
from typing import Annotated
from uuid import uuid4

from fastapi.params import Depends
from fastapi.security import OAuth2PasswordRequestForm
import jwt
from jwt.exceptions import PyJWTError
from fastapi import APIRouter, Cookie, HTTPException, Response, status
from pwdlib import PasswordHash
from sqlalchemy.orm import Session

from backend.config import (
    ACCESS_EXPIRES,
    JWT_ACCESS_COOKIE_NAME,
    JWT_ALGORITHM,
    JWT_COOKIE_SECURE,
    JWT_REFRESH_COOKIE_NAME,
    REFRESH_EXPIRES,
    SECRET_KEY,
)
from backend.dependencies import db_dependency
from backend.models import (
    TokenPayload,
    UserDB,
    UserLoginRequest,
    UserPublic,
    UserRegisterRequest,
)
from backend.repositories.token_denylist_repository import TokenDenylistRepository
from backend.repositories.user_repository import UserRepository


router = APIRouter(prefix="/auth", tags=["auth"])
password_hash = PasswordHash.recommended()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return password_hash.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return password_hash.hash(password)


def authenticate_user(db: Session, username: str, password: str) -> UserDB | None:
    user_repo = UserRepository(db)
    user = user_repo.get_by_username(username)
    if user is None:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user


def _encode_token(
    *, subject: str, token_type: str, expires_delta: timedelta, fresh: bool
) -> str:
    now = datetime.now(UTC)
    payload = {
        "sub": subject,
        "type": token_type,
        "fresh": fresh,
        "jti": str(uuid4()),
        "iat": int(now.timestamp()),
        "exp": int((now + expires_delta).timestamp()),
    }
    token = jwt.encode(payload, SECRET_KEY, algorithm=JWT_ALGORITHM)  # type: ignore[attr-defined]
    if isinstance(token, bytes):
        return token.decode("utf-8")
    return token


def _decode_token(token: str, expected_type: str) -> dict:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[JWT_ALGORITHM])  # type: ignore[attr-defined]
    except PyJWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token"
        ) from exc

    token_type = payload.get("type")
    if token_type != expected_type:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token type"
        )
    return dict(payload)


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
    payload = _decode_token(token, "access")
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
    payload = _decode_token(token, "refresh")
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
    user_repo = UserRepository(db)
    existing_user = user_repo.get_by_username(payload.username)
    if existing_user is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Username already exists"
        )

    user = user_repo.create_user(
        username=payload.username,
        email=payload.email,
        full_name=payload.full_name,
        hashed_password=get_password_hash(payload.password),
    )
    return UserPublic.model_validate(user)


@router.post("/login", response_model=TokenPayload)
def login(form_data: Annotated[OAuth2PasswordRequestForm, Depends()], response: Response, db: db_dependency):
    user = authenticate_user(db, form_data.username, form_data.password)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Bad username or password"
        )

    access_token = _encode_token(
        subject=user.username,
        token_type="access",
        expires_delta=ACCESS_EXPIRES,
        fresh=True,
    )
    refresh_token = _encode_token(
        subject=user.username,
        token_type="refresh",
        expires_delta=REFRESH_EXPIRES,
        fresh=False,
    )
    _set_auth_cookies(response, access_token, refresh_token)

    return TokenPayload(access_token=access_token, refresh_token=refresh_token, expires_in=int(ACCESS_EXPIRES.total_seconds()))


@router.get("/me", response_model=UserPublic)
def me(
    response: Response,
    db: db_dependency,
    access_token: str | None = Cookie(default=None, alias=JWT_ACCESS_COOKIE_NAME),
):
    payload = _require_access_token_payload(response, access_token, db)
    subject = payload.get("sub")
    if not isinstance(subject, str):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token subject"
        )

    user_repo = UserRepository(db)
    user = user_repo.get_by_username(str(subject))
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )
    return UserPublic.model_validate(user)


@router.get("/users", response_model=list[str])
def list_usernames(
    response: Response,
    db: db_dependency,
    access_token: str | None = Cookie(default=None, alias=JWT_ACCESS_COOKIE_NAME),
):
    _require_access_token_payload(response, access_token, db)
    return UserRepository(db).list_usernames()


@router.post("/freshness")
def refresh_fresh_access_token(
    response: Response,
    db: db_dependency,
    refresh_token: str | None = Cookie(default=None, alias=JWT_REFRESH_COOKIE_NAME),
):
    payload = _require_refresh_token_payload(response, refresh_token, db)
    subject = payload.get("sub")
    if not isinstance(subject, str):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token subject"
        )

    new_access_token = _encode_token(
        subject=subject,
        token_type="access",
        expires_delta=ACCESS_EXPIRES,
        fresh=True,
    )
    _set_access_cookie(response, new_access_token)
    return {"msg": "Fresh access token issued"}


def _revoke_payload(db: Session, payload: dict) -> None:
    jti = str(payload.get("jti", ""))
    exp = payload.get("exp")
    token_type = str(payload.get("type", "access"))
    if not jti or exp is None:
        return

    expires_at = datetime.fromtimestamp(int(exp), tz=UTC)
    TokenDenylistRepository(db).revoke_token(
        jti=jti,
        token_type=token_type,
        expires_at=expires_at,
    )


@router.delete("/logout")
def logout(
    response: Response,
    db: db_dependency,
    access_token: str | None = Cookie(default=None, alias=JWT_ACCESS_COOKIE_NAME),
    refresh_token: str | None = Cookie(default=None, alias=JWT_REFRESH_COOKIE_NAME),
):
    if access_token:
        try:
            payload = _decode_token(access_token, "access")
            _revoke_payload(db, payload)
        except HTTPException:
            pass

    if refresh_token:
        try:
            payload = _decode_token(refresh_token, "refresh")
            _revoke_payload(db, payload)
        except HTTPException:
            pass

    _clear_auth_cookies(response)
    return {"msg": "Successfully logout"}
