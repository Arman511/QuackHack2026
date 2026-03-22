from types import SimpleNamespace
from typing import cast

from sqlalchemy.orm import Session

from backend.models import UserDB
from backend.services import user_service


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
