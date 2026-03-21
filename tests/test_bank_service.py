from datetime import datetime
from types import SimpleNamespace
from typing import cast

import pytest
from fastapi import HTTPException
from sqlalchemy.orm import Session

from backend.models import SetupBankAccountsRequest, TransactionDateRangeQuery, UserDB
from backend.services import bank_service


def test_search_user_transactions_by_date_rejects_inverted_range() -> None:
    payload = TransactionDateRangeQuery(
        start=datetime(2026, 1, 10, 12, 0, 0),
        end=datetime(2026, 1, 1, 12, 0, 0),
    )

    with pytest.raises(HTTPException) as exc_info:
        bank_service.search_user_transactions_by_date(
            db=cast(Session, object()),
            current_user=cast(UserDB, SimpleNamespace(id=7)),
            payload=payload,
            page=1,
            page_size=50,
        )

    assert exc_info.value.status_code == 400
    assert exc_info.value.detail == "start must be before or equal to end"


def test_search_user_transactions_by_date_delegates_to_repository(monkeypatch) -> None:
    payload = TransactionDateRangeQuery(
        start=datetime(2026, 1, 1, 12, 0, 0),
        end=datetime(2026, 1, 31, 12, 0, 0),
    )
    expected_items = [
        {
            "id": 1,
            "user_id": 11,
            "source_account_number": "12345678",
            "source_sort_code": "112233",
            "merchant": "bookstore",
            "amount": 42,
            "timestamp": datetime(2026, 1, 3, 12, 0, 0),
            "impulse_zone_id": None,
            "possible_impulse_zone_id": None,
            "created_at": datetime(2026, 1, 3, 12, 0, 0),
            "impulse_zone_name": None,
            "possible_impulse_zone_name": None,
        }
    ]
    expected_total = 1
    calls = {}

    class FakeTransactionRepository:
        def __init__(self, db):
            calls["db"] = db

        def get_by_user_id_and_date_range_search_paginated(
            self, *, user_id, start, end, page, page_size
        ):
            calls["args"] = {
                "user_id": user_id,
                "start": start,
                "end": end,
                "page": page,
                "page_size": page_size,
            }
            return expected_items, expected_total

    marker_db = cast(Session, object())
    monkeypatch.setattr(
        bank_service, "TransactionRepository", FakeTransactionRepository
    )

    result = bank_service.search_user_transactions_by_date(
        db=marker_db,
        current_user=cast(UserDB, SimpleNamespace(id=11)),
        payload=payload,
        page=2,
        page_size=10,
    )

    assert result.items[0].source_account_number == "12345678"
    assert result.page == 2
    assert result.page_size == 10
    assert result.total == 1
    assert result.total_pages == 1
    assert calls["db"] is marker_db
    assert calls["args"] == {
        "user_id": 11,
        "start": payload.start,
        "end": payload.end,
        "page": 2,
        "page_size": 10,
    }


def test_setup_bank_accounts_for_user_rejects_when_already_configured(
    monkeypatch,
) -> None:
    payload = SetupBankAccountsRequest(
        provider="REV-O-TROT",
        current={"account_number": "12345678", "sort_code": "112233"},
        saving={"account_number": "87654321", "sort_code": "112233"},
    )

    class FakeBankAccountRepository:
        def __init__(self, db):
            pass

        def get_first_by_user_id_and_type(self, *, user_id, account_type):
            return {"id": 1}

    monkeypatch.setattr(
        bank_service,
        "BankAccountRepository",
        FakeBankAccountRepository,
    )

    with pytest.raises(HTTPException) as exc_info:
        bank_service.setup_bank_accounts_for_user(
            db=cast(Session, object()),
            current_user=cast(UserDB, SimpleNamespace(id=42)),
            payload=payload,
        )

    assert exc_info.value.status_code == 409
    assert exc_info.value.detail == "Bank accounts are already set up for this user"


def test_setup_bank_accounts_for_user_creates_current_and_saving(monkeypatch) -> None:
    payload = SetupBankAccountsRequest(
        provider="REV-O-TROT",
        current={"account_number": "12345678", "sort_code": "112233"},
        saving={"account_number": "87654321", "sort_code": "445566"},
    )
    calls = {}

    class FakeBankAccountRepository:
        def __init__(self, db):
            calls["db"] = db

        def get_first_by_user_id_and_type(self, *, user_id, account_type):
            return None

        def create_accounts_for_user(
            self,
            *,
            user_id,
            provider,
            current_account_number,
            current_sort_code,
            saving_account_number,
            saving_sort_code,
        ):
            calls["create_args"] = {
                "user_id": user_id,
                "provider": provider,
                "current_account_number": current_account_number,
                "current_sort_code": current_sort_code,
                "saving_account_number": saving_account_number,
                "saving_sort_code": saving_sort_code,
            }
            return (
                {
                    "id": 1,
                    "user_id": user_id,
                    "bank_account_id": "a",
                    "account_number": current_account_number,
                    "sort_code": current_sort_code,
                    "name": "current",
                    "provider": provider,
                    "type": "CURRENT",
                    "amount": 0,
                    "created_at": datetime(2026, 1, 1, 12, 0, 0),
                    "updated_at": datetime(2026, 1, 1, 12, 0, 0),
                },
                {
                    "id": 2,
                    "user_id": user_id,
                    "bank_account_id": "b",
                    "account_number": saving_account_number,
                    "sort_code": saving_sort_code,
                    "name": "saving",
                    "provider": provider,
                    "type": "SAVING",
                    "amount": 0,
                    "created_at": datetime(2026, 1, 1, 12, 0, 0),
                    "updated_at": datetime(2026, 1, 1, 12, 0, 0),
                },
            )

    marker_db = cast(Session, object())
    monkeypatch.setattr(
        bank_service,
        "BankAccountRepository",
        FakeBankAccountRepository,
    )

    result = bank_service.setup_bank_accounts_for_user(
        db=marker_db,
        current_user=cast(UserDB, SimpleNamespace(id=42)),
        payload=payload,
    )

    assert calls["db"] is marker_db
    assert calls["create_args"] == {
        "user_id": 42,
        "provider": payload.provider,
        "current_account_number": "12345678",
        "current_sort_code": "112233",
        "saving_account_number": "87654321",
        "saving_sort_code": "445566",
    }
    assert result.current.account_number == "12345678"
    assert result.saving.account_number == "87654321"
