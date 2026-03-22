from types import SimpleNamespace
from typing import cast

import pytest
from fastapi import HTTPException
from sqlalchemy.orm import Session

from backend.models import UserAdminPatch, UserDB, UserTypeEnum, UserUpdate
from backend.services import user_service


def test_update_current_user_profile_hashes_password_and_updates(monkeypatch) -> None:
    calls = {}

    class FakeUserRepository:
        def __init__(self, db):
            calls["db"] = db

        def update_self(self, **kwargs):
            calls["update_self"] = kwargs
            return {
                "id": kwargs["user_id"],
                "username": "pony",
                "email": kwargs["email"],
                "full_name": kwargs["full_name"],
                "is_active": True,
                "roles": [UserTypeEnum.USER],
                "created_at": "2026-01-01T12:00:00",
            }

    marker_db = cast(Session, object())
    monkeypatch.setattr(user_service, "UserRepository", FakeUserRepository)
    monkeypatch.setattr(user_service, "get_password_hash", lambda _: "hashed-value")

    result = user_service.update_current_user_profile(
        marker_db,
        current_user=cast(UserDB, SimpleNamespace(id=2)),
        payload=UserUpdate(
            email="new@example.com",
            full_name="New Name",
            password="plain-secret",
        ),
    )

    assert calls["db"] is marker_db
    assert calls["update_self"] == {
        "user_id": 2,
        "email": "new@example.com",
        "full_name": "New Name",
        "hashed_password": "hashed-value",
    }
    assert result.email == "new@example.com"


def test_update_current_user_profile_raises_when_missing(monkeypatch) -> None:
    class FakeUserRepository:
        def __init__(self, db):
            pass

        def update_self(self, **kwargs):
            return None

    monkeypatch.setattr(user_service, "UserRepository", FakeUserRepository)

    with pytest.raises(HTTPException) as exc_info:
        user_service.update_current_user_profile(
            cast(Session, object()),
            current_user=cast(UserDB, SimpleNamespace(id=99)),
            payload=UserUpdate(email="nobody@example.com"),
        )

    assert exc_info.value.status_code == 404
    assert exc_info.value.detail == "User not found"


def test_admin_patch_user_rejects_missing_target(monkeypatch) -> None:
    class FakeUserRepository:
        def __init__(self, db):
            pass

        def get_by_id(self, user_id):
            return None

    monkeypatch.setattr(user_service, "UserRepository", FakeUserRepository)

    with pytest.raises(HTTPException) as exc_info:
        user_service.admin_patch_user(
            cast(Session, object()),
            actor=cast(UserDB, SimpleNamespace(id=1, roles=[UserTypeEnum.ADMIN])),
            user_id=2,
            payload=UserAdminPatch(username="new-name"),
        )

    assert exc_info.value.status_code == 404


def test_admin_patch_user_prevents_self_demotion(monkeypatch) -> None:
    class FakeUserRepository:
        def __init__(self, db):
            pass

        def get_by_id(self, user_id):
            return {"id": user_id}

    monkeypatch.setattr(user_service, "UserRepository", FakeUserRepository)

    with pytest.raises(HTTPException) as exc_info:
        user_service.admin_patch_user(
            cast(Session, object()),
            actor=cast(UserDB, SimpleNamespace(id=7, roles=[UserTypeEnum.ADMIN])),
            user_id=7,
            payload=UserAdminPatch(roles=[UserTypeEnum.USER]),
        )

    assert exc_info.value.status_code == 403
    assert exc_info.value.detail == "Admins cannot remove their own ADMIN role"


def test_admin_patch_user_updates_target(monkeypatch) -> None:
    calls = {}

    class FakeUserRepository:
        def __init__(self, db):
            calls["db"] = db

        def get_by_id(self, user_id):
            return {"id": user_id}

        def admin_update_user(self, **kwargs):
            calls["admin_update_user"] = kwargs
            return {
                "id": kwargs["user_id"],
                "username": kwargs["username"] or "target",
                "email": "target@example.com",
                "full_name": "Target",
                "is_active": (
                    kwargs["is_active"] if kwargs["is_active"] is not None else True
                ),
                "roles": [UserTypeEnum.ADMIN, UserTypeEnum.USER],
                "created_at": "2026-01-01T12:00:00",
            }

    marker_db = cast(Session, object())
    monkeypatch.setattr(user_service, "UserRepository", FakeUserRepository)
    monkeypatch.setattr(user_service, "roles_to_csv", lambda roles: "ADMIN,USER")
    monkeypatch.setattr(user_service, "get_password_hash", lambda _: "admin-hash")

    result = user_service.admin_patch_user(
        marker_db,
        actor=cast(UserDB, SimpleNamespace(id=1, roles=[UserTypeEnum.ADMIN])),
        user_id=9,
        payload=UserAdminPatch(
            username="patched",
            password="new-secret",
            is_active=False,
            roles=[UserTypeEnum.ADMIN, UserTypeEnum.USER],
        ),
    )

    assert calls["db"] is marker_db
    assert calls["admin_update_user"] == {
        "user_id": 9,
        "username": "patched",
        "hashed_password": "admin-hash",
        "is_active": False,
        "roles": "ADMIN,USER",
    }
    assert result.username == "patched"


def test_admin_patch_user_raises_when_update_returns_none(monkeypatch) -> None:
    class FakeUserRepository:
        def __init__(self, db):
            pass

        def get_by_id(self, user_id):
            return {"id": user_id}

        def admin_update_user(self, **kwargs):
            return None

    monkeypatch.setattr(user_service, "UserRepository", FakeUserRepository)

    with pytest.raises(HTTPException) as exc_info:
        user_service.admin_patch_user(
            cast(Session, object()),
            actor=cast(UserDB, SimpleNamespace(id=1, roles=[UserTypeEnum.ADMIN])),
            user_id=5,
            payload=UserAdminPatch(username="patched"),
        )

    assert exc_info.value.status_code == 404
    assert exc_info.value.detail == "User not found"


def test_admin_get_user_by_id_requires_admin(monkeypatch) -> None:
    class FakeUserRepository:
        def __init__(self, db):
            pass

    monkeypatch.setattr(user_service, "UserRepository", FakeUserRepository)

    with pytest.raises(HTTPException) as exc_info:
        user_service.admin_get_user_by_id(
            cast(Session, object()),
            actor=cast(UserDB, SimpleNamespace(id=4, roles=[UserTypeEnum.USER])),
            user_id=8,
        )

    assert exc_info.value.status_code == 403


def test_admin_get_user_by_id_returns_target(monkeypatch) -> None:
    class FakeUserRepository:
        def __init__(self, db):
            pass

        def admin_get_user_by_id(self, user_id):
            return {
                "id": user_id,
                "username": "target",
                "email": "target@example.com",
                "full_name": "Target",
                "is_active": True,
                "roles": [UserTypeEnum.USER],
                "created_at": "2026-01-01T12:00:00",
            }

    monkeypatch.setattr(user_service, "UserRepository", FakeUserRepository)

    result = user_service.admin_get_user_by_id(
        cast(Session, object()),
        actor=cast(UserDB, SimpleNamespace(id=1, roles=[UserTypeEnum.ADMIN])),
        user_id=8,
    )

    assert result.id == 8
    assert result.username == "target"


def test_admin_get_user_by_id_raises_when_target_missing(monkeypatch) -> None:
    class FakeUserRepository:
        def __init__(self, db):
            pass

        def admin_get_user_by_id(self, user_id):
            return None

    monkeypatch.setattr(user_service, "UserRepository", FakeUserRepository)

    with pytest.raises(HTTPException) as exc_info:
        user_service.admin_get_user_by_id(
            cast(Session, object()),
            actor=cast(UserDB, SimpleNamespace(id=1, roles=[UserTypeEnum.ADMIN])),
            user_id=999,
        )

    assert exc_info.value.status_code == 404
    assert exc_info.value.detail == "User not found"


def test_delete_user_enforces_permissions(monkeypatch) -> None:
    with pytest.raises(HTTPException) as exc_info:
        user_service.delete_user(
            cast(Session, object()),
            actor=cast(UserDB, SimpleNamespace(id=10, roles=[UserTypeEnum.USER])),
            user_id=11,
        )

    assert exc_info.value.status_code == 403


def test_delete_user_raises_not_found(monkeypatch) -> None:
    class FakeUserRepository:
        def __init__(self, db):
            pass

        def delete_user_by_id(self, user_id):
            return False

    monkeypatch.setattr(user_service, "UserRepository", FakeUserRepository)

    with pytest.raises(HTTPException) as exc_info:
        user_service.delete_user(
            cast(Session, object()),
            actor=cast(UserDB, SimpleNamespace(id=10, roles=[UserTypeEnum.ADMIN])),
            user_id=11,
        )

    assert exc_info.value.status_code == 404


def test_delete_user_returns_deleted_true(monkeypatch) -> None:
    class FakeUserRepository:
        def __init__(self, db):
            pass

        def delete_user_by_id(self, user_id):
            return True

    monkeypatch.setattr(user_service, "UserRepository", FakeUserRepository)

    result = user_service.delete_user(
        cast(Session, object()),
        actor=cast(UserDB, SimpleNamespace(id=10, roles=[UserTypeEnum.ADMIN])),
        user_id=11,
    )

    assert result == {"deleted": True}


def test_patch_current_user_tax_percentage_preserves_existing_metadata(
    monkeypatch,
) -> None:
    calls = {}

    existing_metadata = SimpleNamespace(
        id=9,
        user_id=12,
        goal="New bike",
        bank_account_id=4,
        impulse_limit=180,
        tax_percentage=100,
    )
    patched_metadata = SimpleNamespace(id=9, user_id=12, tax_percentage=200)

    class FakeUserMetadataRepository:
        def __init__(self, db):
            calls["db"] = db

        def get_by_user_id(self, user_id):
            calls["get_by_user_id"] = user_id
            return existing_metadata

        def set_goal(self, **kwargs):
            calls["set_goal"] = kwargs
            return patched_metadata

    marker_db = cast(Session, object())
    monkeypatch.setattr(
        user_service, "UserMetadataRepository", FakeUserMetadataRepository
    )

    result = user_service.patch_current_user_tax_percentage(
        db=marker_db,
        current_user=cast(UserDB, SimpleNamespace(id=12)),
        tax_percentage=200,
    )

    assert calls["db"] is marker_db
    assert calls["get_by_user_id"] == 12
    assert calls["set_goal"] == {
        "user_id": 12,
        "goal": "New bike",
        "bank_account_id": 4,
        "impulse_limit": 180,
        "tax_percentage": 200,
    }
    assert result.tax_percentage == 200


def test_patch_current_user_tax_percentage_creates_metadata_when_missing(
    monkeypatch,
) -> None:
    calls = {}

    patched_metadata = SimpleNamespace(id=13, user_id=77, tax_percentage=50)

    class FakeUserMetadataRepository:
        def __init__(self, db):
            calls["db"] = db

        def get_by_user_id(self, user_id):
            calls["get_by_user_id"] = user_id
            return None

        def set_goal(self, **kwargs):
            calls["set_goal"] = kwargs
            return patched_metadata

    marker_db = cast(Session, object())
    monkeypatch.setattr(
        user_service, "UserMetadataRepository", FakeUserMetadataRepository
    )

    result = user_service.patch_current_user_tax_percentage(
        db=marker_db,
        current_user=cast(UserDB, SimpleNamespace(id=77)),
        tax_percentage=50,
    )

    assert calls["db"] is marker_db
    assert calls["get_by_user_id"] == 77
    assert calls["set_goal"] == {
        "user_id": 77,
        "goal": None,
        "bank_account_id": None,
        "impulse_limit": None,
        "tax_percentage": 50,
    }
    assert result.tax_percentage == 50
