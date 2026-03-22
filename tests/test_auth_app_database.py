import asyncio
import importlib
import sys
from datetime import timedelta
from pathlib import Path
from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from backend.models import UserPublic, UserTypeEnum
from backend.services import auth_service

pytestmark = pytest.mark.filterwarnings(
    "ignore:Accessing argon2.__version__ is deprecated.*:DeprecationWarning"
)


def test_password_hash_and_verify_roundtrip() -> None:
    hashed = auth_service.get_password_hash("super-secret")
    assert hashed != "super-secret"
    assert auth_service.verify_password("super-secret", hashed)
    assert not auth_service.verify_password("wrong", hashed)


def test_roles_to_csv_deduplicates_and_sorts() -> None:
    value = auth_service.roles_to_csv(
        [UserTypeEnum.USER, UserTypeEnum.ADMIN, UserTypeEnum.USER]
    )
    assert value == "ADMIN,USER"


def test_parse_roles_handles_none_and_strings() -> None:
    assert auth_service.parse_roles(None) == [UserTypeEnum.USER]
    assert auth_service.parse_roles(" ") == [UserTypeEnum.USER]
    assert auth_service.parse_roles("ADMIN,USER") == [
        UserTypeEnum.ADMIN,
        UserTypeEnum.USER,
    ]


def test_build_scopes_for_user_always_contains_user_scope() -> None:
    user = SimpleNamespace(roles=[UserTypeEnum.ADMIN])
    scopes = auth_service.build_scopes_for_user(user)
    assert scopes == ["ADMIN", "USER"]


def test_encode_and_decode_token_roundtrip() -> None:
    token = auth_service.encode_token(
        subject="42",
        token_type="access",
        expires_delta=timedelta(minutes=1),
        fresh=True,
        scopes=["USER"],
    )

    payload = auth_service.decode_token(token, expected_type="access")
    assert payload["sub"] == "42"
    assert payload["type"] == "access"
    assert payload["fresh"] is True
    assert payload["scopes"] == ["USER"]


def test_decode_token_rejects_invalid_or_wrong_type() -> None:
    with pytest.raises(HTTPException) as invalid_exc:
        auth_service.decode_token("definitely-not-a-jwt", expected_type="access")

    assert invalid_exc.value.status_code == 401
    assert invalid_exc.value.detail == "Invalid or expired token"

    refresh_token = auth_service.encode_token(
        subject="42",
        token_type="refresh",
        expires_delta=timedelta(minutes=1),
        fresh=False,
        scopes=["USER"],
    )

    with pytest.raises(HTTPException) as type_exc:
        auth_service.decode_token(refresh_token, expected_type="access")

    assert type_exc.value.status_code == 401
    assert type_exc.value.detail == "Invalid token type"


def _reload_database(monkeypatch, **config_values):
    import backend.utils.config as config
    import backend.utils.database as database

    for key, value in config_values.items():
        monkeypatch.setattr(config, key, value)

    return importlib.reload(database)


def test_database_uses_database_url_when_provided(monkeypatch, tmp_path) -> None:
    db_url = f"sqlite:///{tmp_path / 'priority.db'}"
    database = _reload_database(
        monkeypatch,
        DATABASE_URL=db_url,
        DB_DIALECT="postgresql",
        SQLITE_DB_PATH=":memory:",
        DB_POOL_SIZE=1,
        DB_MAX_OVERFLOW=1,
        DB_POOL_TIMEOUT=1,
        DB_POOL_RECYCLE=1,
    )
    try:
        assert database.URL_DATABASE == db_url
    finally:
        database.engine.dispose()


def test_database_builds_sqlite_file_url(monkeypatch, tmp_path) -> None:
    sqlite_path = tmp_path / "nested" / "stables.db"
    database = _reload_database(
        monkeypatch,
        DATABASE_URL=None,
        DB_DIALECT="sqlite",
        SQLITE_DB_PATH=str(sqlite_path),
        DB_POOL_SIZE=1,
        DB_MAX_OVERFLOW=1,
        DB_POOL_TIMEOUT=1,
        DB_POOL_RECYCLE=1,
    )

    try:
        assert database.URL_DATABASE.endswith(str(sqlite_path.resolve()))
        assert sqlite_path.exists()
    finally:
        database.engine.dispose()


def test_user_public_parses_roles_from_csv_and_none() -> None:
    parsed = UserPublic.model_validate(
        {
            "id": 1,
            "username": "pony",
            "email": "pony@example.com",
            "full_name": "Pony",
            "is_active": True,
            "roles": "ADMIN,USER",
        }
    )
    assert parsed.roles == [UserTypeEnum.ADMIN, UserTypeEnum.USER]

    defaulted = UserPublic.model_validate(
        {
            "id": 2,
            "username": "foal",
            "email": None,
            "full_name": None,
            "is_active": True,
            "roles": None,
        }
    )
    assert defaulted.roles == [UserTypeEnum.USER]


def test_app_health_route(monkeypatch) -> None:
    import backend.utils.sql_migration as sql_migration

    monkeypatch.setattr(
        sql_migration, "run_sql_migrations", lambda *_args, **_kwargs: None
    )
    sys.modules.pop("backend.app", None)

    import backend.app as app_module

    app_module = importlib.reload(app_module)
    try:
        payload = asyncio.run(app_module.health_check())
        route_paths = {route.path for route in app_module.app.routes}
    finally:
        app_module.engine.dispose()

    assert payload == {"status": "healthy"}
    assert "/api/health" in route_paths
