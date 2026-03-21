from datetime import UTC, datetime, timedelta
import logging
from uuid import uuid4

from fastapi import HTTPException, status
from jose import JWTError, jwt
from passlib.context import CryptContext

from backend.models.enums import UserTypeEnum
from backend.models.schemas import UserDB
from backend.utils.config import JWT_ALGORITHM, SECRET_KEY

pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")
logger = logging.getLogger(__name__)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def roles_to_csv(roles: list[UserTypeEnum]) -> str:
    unique_roles = sorted({role.value for role in roles})
    return ",".join(unique_roles)


def parse_roles(
    value: str | list[str] | list[UserTypeEnum] | None,
) -> list[UserTypeEnum]:
    if value is None:
        return [UserTypeEnum.USER]
    if isinstance(value, str):
        roles = [part.strip() for part in value.split(",") if part and part.strip()]
        if not roles:
            return [UserTypeEnum.USER]
        return [UserTypeEnum(role) for role in roles]
    return [UserTypeEnum(role) for role in value]


def build_scopes_for_user(user: UserDB) -> list[str]:
    roles = parse_roles(user.roles)
    scopes = {role.value for role in roles}
    if UserTypeEnum.USER.value not in scopes:
        scopes.add(UserTypeEnum.USER.value)
    return sorted(scopes)


def encode_token(
    *,
    subject: str,
    token_type: str,
    expires_delta: timedelta,
    fresh: bool,
    scopes: list[str],
) -> str:
    now = datetime.now(UTC)
    payload = {
        "sub": subject,
        "type": token_type,
        "fresh": fresh,
        "jti": str(uuid4()),
        "iat": int(now.timestamp()),
        "exp": int((now + expires_delta).timestamp()),
        "scopes": scopes,
    }
    token = jwt.encode(payload, SECRET_KEY, algorithm=JWT_ALGORITHM)
    logger.debug(
        "Encoded %s token for subject=%s expires_in=%ss scopes=%s",
        token_type,
        subject,
        int(expires_delta.total_seconds()),
        scopes,
    )
    return token


def decode_token(token: str, expected_type: str) -> dict:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[JWT_ALGORITHM])
    except JWTError as exc:
        logger.warning("Token decode failed for expected_type=%s", expected_type)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        ) from exc

    token_type = payload.get("type")
    if token_type != expected_type:
        logger.warning(
            "Token type mismatch expected=%s actual=%s",
            expected_type,
            token_type,
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type",
        )
    logger.debug("Decoded token for subject=%s type=%s", payload.get("sub"), token_type)
    return dict(payload)
