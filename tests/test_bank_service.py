from datetime import datetime
from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from backend.models import TransactionDateRangeQuery
from backend.services import bank_service


def test_search_user_transactions_by_date_rejects_inverted_range() -> None:
    payload = TransactionDateRangeQuery(
        start=datetime(2026, 1, 10, 12, 0, 0),
        end=datetime(2026, 1, 1, 12, 0, 0),
    )

    with pytest.raises(HTTPException) as exc_info:
        bank_service.search_user_transactions_by_date(
            db=object(),
            current_user=SimpleNamespace(id=7),
            payload=payload,
        )

    assert exc_info.value.status_code == 400
    assert exc_info.value.detail == "start must be before or equal to end"


def test_search_user_transactions_by_date_delegates_to_repository(monkeypatch) -> None:
    payload = TransactionDateRangeQuery(
        start=datetime(2026, 1, 1, 12, 0, 0),
        end=datetime(2026, 1, 31, 12, 0, 0),
    )
    expected = [
        {
            "id": 1,
            "merchant": "bookstore",
            "amount": 42,
        }
    ]
    calls = {}

    class FakeTransactionRepository:
        def __init__(self, db):
            calls["db"] = db

        def get_by_user_id_and_date_range_hydrated(self, user_id, start, end):
            calls["args"] = {
                "user_id": user_id,
                "start": start,
                "end": end,
            }
            return expected

    marker_db = object()
    monkeypatch.setattr(
        bank_service, "TransactionRepository", FakeTransactionRepository
    )

    result = bank_service.search_user_transactions_by_date(
        db=marker_db,
        current_user=SimpleNamespace(id=11),
        payload=payload,
    )

    assert result == expected
    assert calls["db"] is marker_db
    assert calls["args"] == {
        "user_id": 11,
        "start": payload.start,
        "end": payload.end,
    }
