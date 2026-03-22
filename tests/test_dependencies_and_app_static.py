import asyncio
import importlib
import shutil
import sys
from pathlib import Path
from types import SimpleNamespace
from typing import cast

import pytest
from fastapi import HTTPException
from sqlalchemy.orm import Session

from backend.models import UserDB
from backend.utils import dependencies


def test_get_db_yields_and_closes_session(monkeypatch) -> None:
    calls = {"closed": False}

    class FakeSession:
        def close(self):
            calls["closed"] = True

    monkeypatch.setattr(dependencies, "SessionLocal", lambda: FakeSession())

    generator = dependencies.get_db()
    yielded = next(generator)

    assert isinstance(yielded, FakeSession)

    with pytest.raises(StopIteration):
        next(generator)

    assert calls["closed"] is True


def test_get_current_access_payload_requires_token() -> None:
    with pytest.raises(HTTPException) as exc_info:
        dependencies.get_current_access_payload(
            db=cast(Session, object()),
            bearer_token=None,
            access_cookie=None,
        )

    assert exc_info.value.status_code == 401
    assert exc_info.value.detail == "Missing access token"


def test_get_current_access_payload_rejects_revoked_token(monkeypatch) -> None:
    class FakeTokenDenylistRepository:
        def __init__(self, db):
            pass

        def is_token_revoked(self, jti):
            return True

    monkeypatch.setattr(
        dependencies,
        "decode_token",
        lambda token, expected: {"sub": "pony", "jti": "deadbeef"},
    )
    monkeypatch.setattr(
        dependencies,
        "TokenDenylistRepository",
        FakeTokenDenylistRepository,
    )

    with pytest.raises(HTTPException) as exc_info:
        dependencies.get_current_access_payload(
            db=cast(Session, object()),
            bearer_token="bearer-token",
            access_cookie=None,
        )

    assert exc_info.value.status_code == 401
    assert exc_info.value.detail == "Token has been revoked"


def test_get_current_access_payload_accepts_cookie_token(monkeypatch) -> None:
    class FakeTokenDenylistRepository:
        def __init__(self, db):
            pass

        def is_token_revoked(self, jti):
            return False

    monkeypatch.setattr(
        dependencies,
        "decode_token",
        lambda token, expected: {"sub": "pony", "jti": "ok-jti"},
    )
    monkeypatch.setattr(
        dependencies,
        "TokenDenylistRepository",
        FakeTokenDenylistRepository,
    )

    payload = dependencies.get_current_access_payload(
        db=cast(Session, object()),
        bearer_token=None,
        access_cookie="cookie-token",
    )

    assert payload["sub"] == "pony"
    assert payload["jti"] == "ok-jti"


def test_get_current_active_user_validates_subject_type(monkeypatch) -> None:
    with pytest.raises(HTTPException) as exc_info:
        dependencies.get_current_active_user(
            db=cast(Session, object()),
            payload={"sub": 42},
        )

    assert exc_info.value.status_code == 401
    assert exc_info.value.detail == "Invalid token subject"


def test_get_current_active_user_handles_missing_and_inactive(monkeypatch) -> None:
    class MissingUserRepo:
        def __init__(self, db):
            pass

        def get_by_username(self, username):
            return None

    monkeypatch.setattr(dependencies, "UserRepository", MissingUserRepo)

    with pytest.raises(HTTPException) as missing_exc:
        dependencies.get_current_active_user(
            db=cast(Session, object()),
            payload={"sub": "ghost"},
        )

    assert missing_exc.value.status_code == 404

    class InactiveUserRepo:
        def __init__(self, db):
            pass

        def get_by_username(self, username):
            return SimpleNamespace(id=8, is_active=False)

    monkeypatch.setattr(dependencies, "UserRepository", InactiveUserRepo)

    with pytest.raises(HTTPException) as inactive_exc:
        dependencies.get_current_active_user(
            db=cast(Session, object()),
            payload={"sub": "sleepy"},
        )

    assert inactive_exc.value.status_code == 403
    assert inactive_exc.value.detail == "Inactive account"


def test_get_current_active_user_returns_active_user(monkeypatch) -> None:
    active_user = SimpleNamespace(id=9, is_active=True)

    class ActiveUserRepo:
        def __init__(self, db):
            pass

        def get_by_username(self, username):
            return active_user

    monkeypatch.setattr(dependencies, "UserRepository", ActiveUserRepo)

    result = dependencies.get_current_active_user(
        db=cast(Session, object()),
        payload={"sub": "active"},
    )

    assert result is active_user


def test_check_admin_privileges_rejects_when_scope_missing() -> None:
    with pytest.raises(HTTPException) as exc_info:
        dependencies.check_admin_privileges(
            current_user=cast(UserDB, SimpleNamespace(id=3)),
            payload={"scopes": ["USER"]},
        )

    assert exc_info.value.status_code == 403
    assert exc_info.value.detail == "Insufficient permissions"


def test_check_admin_privileges_accepts_admin_scope() -> None:
    current_user = cast(UserDB, SimpleNamespace(id=3))
    result = dependencies.check_admin_privileges(
        current_user=current_user,
        payload={"scopes": ["USER", "ADMIN"]},
    )

    assert result is current_user


def test_app_static_routes_and_fallback(monkeypatch) -> None:
    import backend.utils.sql_migration as sql_migration

    monkeypatch.setattr(
        sql_migration, "run_sql_migrations", lambda *_args, **_kwargs: None
    )

    repo_root = Path(__file__).resolve().parents[1]
    static_dir = repo_root / "static"
    index_path = static_dir / "index.html"
    asset_path = static_dir / "asset.js"

    static_dir.mkdir(parents=True, exist_ok=True)
    index_path.write_text("<html><body>ok</body></html>", encoding="utf-8")
    asset_path.write_text("console.log('ok')", encoding="utf-8")

    sys.modules.pop("backend.app", None)
    import backend.app as app_module

    app_module = importlib.reload(app_module)
    try:
        served_index = asyncio.run(app_module.serve_index())

        async def call_next_404(_request):
            return SimpleNamespace(status_code=404)

        spa_request = SimpleNamespace(
            method="GET",
            url=SimpleNamespace(path="/dashboard"),
        )
        spa_response = asyncio.run(
            app_module.fallback_to_index(spa_request, call_next_404)
        )

        asset_request = SimpleNamespace(
            method="GET",
            url=SimpleNamespace(path="/asset.js"),
        )
        asset_response = asyncio.run(
            app_module.fallback_to_index(asset_request, call_next_404)
        )

        api_request = SimpleNamespace(
            method="GET",
            url=SimpleNamespace(path="/api/health"),
        )
        api_response = asyncio.run(
            app_module.fallback_to_index(api_request, call_next_404)
        )

        class StatusRaises:
            @property
            def status_code(self):
                raise RuntimeError("bad response")

        bad_response = StatusRaises()

        async def call_next_bad(_request):
            return bad_response

        passthrough_response = asyncio.run(
            app_module.fallback_to_index(spa_request, call_next_bad)
        )
    finally:
        app_module.engine.dispose()
        shutil.rmtree(static_dir, ignore_errors=True)

    assert str(served_index.path).endswith("index.html")
    assert str(spa_response.path).endswith("index.html")
    assert str(asset_response.path).endswith("asset.js")
    assert getattr(api_response, "status_code") == 404
    assert passthrough_response is bad_response


def test_serve_index_raises_when_index_missing(monkeypatch) -> None:
    import backend.utils.sql_migration as sql_migration

    monkeypatch.setattr(
        sql_migration, "run_sql_migrations", lambda *_args, **_kwargs: None
    )

    repo_root = Path(__file__).resolve().parents[1]
    static_dir = repo_root / "static"
    static_dir.mkdir(parents=True, exist_ok=True)

    sys.modules.pop("backend.app", None)
    import backend.app as app_module

    app_module = importlib.reload(app_module)
    try:
        with pytest.raises(HTTPException) as exc_info:
            asyncio.run(app_module.serve_index())
    finally:
        app_module.engine.dispose()
        shutil.rmtree(static_dir, ignore_errors=True)

    assert exc_info.value.status_code == 404
    assert exc_info.value.detail == "Index file not found"
