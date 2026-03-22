from datetime import datetime, timezone
from types import SimpleNamespace
from typing import Any, cast

import pytest
from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from backend.models import (
    AccountTypeEnum,
    AddMoneyRequest,
    BankProviderEnum,
    CreateBankAccountsRequest,
    ImpulseZoneCreate,
    ImpulseZoneUpdate,
    PromotePossibleImpulseRequest,
    SetupBankAccountDetails,
    SetupBankAccountsRequest,
    TransferBetweenAccountsRequest,
    TransactionCreate,
    TransactionDateRangeQuery,
    TransactionWebhookCreate,
    UserDB,
    UserGoalSetRequest,
    UserTypeEnum,
)
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
        provider=BankProviderEnum.REV_O_TROT,
        current=SetupBankAccountDetails(
            account_number="12345678",
            sort_code="112233",
        ),
        saving=SetupBankAccountDetails(
            account_number="87654321",
            sort_code="112233",
        ),
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
        provider=BankProviderEnum.REV_O_TROT,
        current=SetupBankAccountDetails(
            account_number="12345678",
            sort_code="112233",
        ),
        saving=SetupBankAccountDetails(
            account_number="87654321",
            sort_code="445566",
        ),
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


def test_create_bank_accounts_for_user_creates_requested_type(monkeypatch) -> None:
    payload = CreateBankAccountsRequest(
        provider=BankProviderEnum.REV_O_TROT,
        type=AccountTypeEnum.SAVING,
        account_number="87654321",
        sort_code="445566",
        amount=1200,
    )
    calls = {}

    class FakeBankAccountRepository:
        def __init__(self, db):
            calls["db"] = db

        def create_account(
            self,
            *,
            user_id,
            account_number,
            sort_code,
            name,
            provider,
            account_type,
            initial_amount,
        ):
            calls["create_args"] = {
                "user_id": user_id,
                "account_number": account_number,
                "sort_code": sort_code,
                "name": name,
                "provider": provider,
                "account_type": account_type,
                "initial_amount": initial_amount,
            }
            return {
                "id": 3,
                "user_id": user_id,
                "bank_account_id": "x",
                "account_number": account_number,
                "sort_code": sort_code,
                "name": name,
                "provider": provider,
                "type": account_type,
                "amount": initial_amount,
                "created_at": datetime(2026, 1, 1, 12, 0, 0),
                "updated_at": datetime(2026, 1, 1, 12, 0, 0),
            }

    marker_db = cast(Session, object())
    monkeypatch.setattr(
        bank_service,
        "BankAccountRepository",
        FakeBankAccountRepository,
    )

    result = bank_service.create_bank_accounts_for_user(
        db=marker_db,
        current_user=cast(UserDB, SimpleNamespace(id=42)),
        payload=payload,
    )

    assert calls["db"] is marker_db
    assert calls["create_args"] == {
        "user_id": 42,
        "account_number": "87654321",
        "sort_code": "445566",
        "name": "REV-O-TROT Saving Account",
        "provider": BankProviderEnum.REV_O_TROT,
        "account_type": AccountTypeEnum.SAVING,
        "initial_amount": 1200,
    }
    assert result.type == AccountTypeEnum.SAVING
    assert result.amount == 1200


def test_create_bank_accounts_for_user_rejects_duplicate_account_identifiers(
    monkeypatch,
) -> None:
    payload = CreateBankAccountsRequest(
        provider=BankProviderEnum.REV_O_TROT,
        type=AccountTypeEnum.CURRENT,
        account_number="12345678",
        sort_code="112233",
        amount=999,
    )

    class FakeBankAccountRepository:
        def __init__(self, db):
            pass

        def create_account(self, **kwargs):
            raise IntegrityError("insert", kwargs, Exception("duplicate"))

    monkeypatch.setattr(
        bank_service,
        "BankAccountRepository",
        FakeBankAccountRepository,
    )

    with pytest.raises(HTTPException) as exc_info:
        bank_service.create_bank_accounts_for_user(
            db=cast(Session, object()),
            current_user=cast(UserDB, SimpleNamespace(id=42)),
            payload=payload,
        )

    assert exc_info.value.status_code == 409
    assert (
        exc_info.value.detail
        == "Bank account with this account number and sort code already exists"
    )


def test_add_money_to_account_rejects_missing_account(monkeypatch) -> None:
    payload = AddMoneyRequest(sort_code="112233", account_number="12345678", amount=100)

    class FakeBankAccountRepository:
        def __init__(self, db):
            pass

        def get_by_account_number_and_sort_code(self, *, account_number, sort_code):
            return None

    monkeypatch.setattr(
        bank_service,
        "BankAccountRepository",
        FakeBankAccountRepository,
    )

    with pytest.raises(HTTPException) as exc_info:
        bank_service.add_money_to_account(
            db=cast(Session, object()),
            current_user=cast(
                UserDB,
                SimpleNamespace(id=42, roles=[UserTypeEnum.USER]),
            ),
            payload=payload,
        )

    assert exc_info.value.status_code == 404
    assert (
        exc_info.value.detail
        == "Bank account not found for provided account number and sort code"
    )


def test_transfer_between_my_accounts_rejects_same_account() -> None:
    payload = TransferBetweenAccountsRequest(
        source_account_id=1,
        destination_account_id=1,
        amount=100,
    )

    with pytest.raises(HTTPException) as exc_info:
        bank_service.transfer_between_my_accounts(
            db=cast(Session, object()),
            current_user=cast(UserDB, SimpleNamespace(id=7)),
            payload=payload,
        )

    assert exc_info.value.status_code == 400
    assert exc_info.value.detail == "Source and destination accounts must be different"


def test_transfer_between_my_accounts_rejects_when_destination_not_owned(
    monkeypatch,
) -> None:
    payload = TransferBetweenAccountsRequest(
        source_account_id=1,
        destination_account_id=2,
        amount=250,
    )

    class FakeBankAccountRepository:
        def __init__(self, db):
            pass

        def get_by_id_and_user_id(self, *, account_id, user_id):
            if account_id == 1:
                return SimpleNamespace(id=1, user_id=user_id, amount=1000)
            return None

    monkeypatch.setattr(
        bank_service, "BankAccountRepository", FakeBankAccountRepository
    )

    with pytest.raises(HTTPException) as exc_info:
        bank_service.transfer_between_my_accounts(
            db=cast(Session, object()),
            current_user=cast(UserDB, SimpleNamespace(id=7)),
            payload=payload,
        )

    assert exc_info.value.status_code == 403
    assert (
        exc_info.value.detail
        == "Destination account does not belong to the authenticated user"
    )


def test_transfer_between_my_accounts_succeeds(monkeypatch) -> None:
    payload = TransferBetweenAccountsRequest(
        source_account_id=11,
        destination_account_id=12,
        amount=500,
    )
    calls = {}

    class FakeBankAccountRepository:
        def __init__(self, db):
            calls["db"] = db

        def get_by_id_and_user_id(self, *, account_id, user_id):
            if account_id == 11:
                return SimpleNamespace(id=11, user_id=user_id, amount=2500)
            if account_id == 12:
                return SimpleNamespace(id=12, user_id=user_id, amount=300)
            return None

        def transfer_between_accounts(
            self, *, source_account_id, destination_account_id, amount
        ):
            calls["transfer"] = {
                "source_account_id": source_account_id,
                "destination_account_id": destination_account_id,
                "amount": amount,
            }
            return (
                SimpleNamespace(
                    id=11,
                    user_id=77,
                    bank_account_id="src",
                    account_number="12345678",
                    sort_code="112233",
                    name="Source",
                    provider=BankProviderEnum.REV_O_TROT,
                    type=AccountTypeEnum.CURRENT,
                    amount=2000,
                    created_at=datetime(2026, 1, 1, 12, 0, 0),
                    updated_at=datetime(2026, 1, 1, 12, 5, 0),
                ),
                SimpleNamespace(
                    id=12,
                    user_id=77,
                    bank_account_id="dst",
                    account_number="87654321",
                    sort_code="112233",
                    name="Destination",
                    provider=BankProviderEnum.REV_O_TROT,
                    type=AccountTypeEnum.SAVING,
                    amount=800,
                    created_at=datetime(2026, 1, 1, 12, 0, 0),
                    updated_at=datetime(2026, 1, 1, 12, 5, 0),
                ),
            )

    marker_db = cast(Session, object())
    monkeypatch.setattr(
        bank_service, "BankAccountRepository", FakeBankAccountRepository
    )

    result = bank_service.transfer_between_my_accounts(
        db=marker_db,
        current_user=cast(UserDB, SimpleNamespace(id=77)),
        payload=payload,
    )

    assert calls["db"] is marker_db
    assert calls["transfer"] == {
        "source_account_id": 11,
        "destination_account_id": 12,
        "amount": 500,
    }
    assert result.transferred_amount == 500
    assert result.source_account.id == 11
    assert result.destination_account.id == 12


def test_admin_search_transactions_by_date_rejects_inverted_range() -> None:
    payload = TransactionDateRangeQuery(
        start=datetime(2026, 2, 1, 0, 0, 0),
        end=datetime(2026, 1, 1, 0, 0, 0),
    )

    with pytest.raises(HTTPException) as exc_info:
        bank_service.admin_search_transactions_by_date(
            db=cast(Session, object()),
            payload=payload,
        )

    assert exc_info.value.status_code == 400
    assert exc_info.value.detail == "start must be before or equal to end"


def test_admin_search_transactions_by_date_returns_rows(monkeypatch) -> None:
    payload = TransactionDateRangeQuery(
        start=datetime(2026, 1, 1, 0, 0, 0),
        end=datetime(2026, 1, 31, 23, 59, 59),
    )

    expected_rows = [SimpleNamespace(id=1), SimpleNamespace(id=2)]

    class FakeTransactionRepository:
        def __init__(self, db):
            pass

        def get_all_by_date_range_hydrated(self, *, start, end):
            assert start == payload.start
            assert end == payload.end
            return expected_rows

    monkeypatch.setattr(
        bank_service, "TransactionRepository", FakeTransactionRepository
    )

    rows = bank_service.admin_search_transactions_by_date(
        db=cast(Session, object()),
        payload=payload,
    )

    assert rows == expected_rows


def test_admin_transaction_summary_delegates_with_pagination(monkeypatch) -> None:
    expected_rows = [SimpleNamespace(id=10)]

    class FakeTransactionRepository:
        def __init__(self, db):
            pass

        def get_all_paginated(self, *, page, page_size):
            assert page == 3
            assert page_size == 25
            return expected_rows

    monkeypatch.setattr(
        bank_service, "TransactionRepository", FakeTransactionRepository
    )

    result = bank_service.admin_transaction_summary(
        db=cast(Session, object()),
        page=3,
        page_size=25,
    )

    assert result == expected_rows


def test_set_user_impulses_rejects_unknown_ids(monkeypatch) -> None:
    class FakeImpulseZoneRepository:
        def __init__(self, db):
            pass

        def get_all_impulse_zones(self):
            return [SimpleNamespace(id=1), SimpleNamespace(id=2)]

    monkeypatch.setattr(
        bank_service, "ImpulseZoneRepository", FakeImpulseZoneRepository
    )

    with pytest.raises(HTTPException) as exc_info:
        bank_service.set_user_impulses(
            db=cast(Session, object()),
            current_user=cast(UserDB, SimpleNamespace(id=99)),
            impulse_ids=[1, 3, 5],
        )

    assert exc_info.value.status_code == 400
    assert exc_info.value.detail == "Unknown impulse IDs: [3, 5]"


def test_set_user_impulses_replaces_and_returns_bundle(monkeypatch) -> None:
    calls = {}
    expected_bundle = SimpleNamespace(impulses=["a"], possible=["b"])

    class FakeImpulseZoneRepository:
        def __init__(self, db):
            pass

        def get_all_impulse_zones(self):
            return [SimpleNamespace(id=1), SimpleNamespace(id=2)]

        def replace_user_impulses(self, *, user_id, impulse_ids):
            calls["replace"] = {"user_id": user_id, "impulse_ids": impulse_ids}

    monkeypatch.setattr(
        bank_service, "ImpulseZoneRepository", FakeImpulseZoneRepository
    )
    monkeypatch.setattr(
        bank_service,
        "get_user_impulses_bundle",
        lambda db, current_user: expected_bundle,
    )

    result = bank_service.set_user_impulses(
        db=cast(Session, object()),
        current_user=cast(UserDB, SimpleNamespace(id=88)),
        impulse_ids=[1, 2],
    )

    assert calls["replace"] == {"user_id": 88, "impulse_ids": [1, 2]}
    assert result is expected_bundle


def test_delete_user_possible_impulse_zone_rejects_missing_zone(monkeypatch) -> None:
    class FakeImpulseZoneRepository:
        def __init__(self, db):
            pass

        def get_possible_impulse_zone_by_id(self, zone_id):
            return None

    monkeypatch.setattr(
        bank_service, "ImpulseZoneRepository", FakeImpulseZoneRepository
    )

    with pytest.raises(HTTPException) as exc_info:
        bank_service.delete_user_possible_impulse_zone(
            db=cast(Session, object()),
            current_user=cast(UserDB, SimpleNamespace(id=7)),
            zone_id=1,
        )

    assert exc_info.value.status_code == 404


def test_delete_user_possible_impulse_zone_rejects_foreign_zone(monkeypatch) -> None:
    class FakeImpulseZoneRepository:
        def __init__(self, db):
            pass

        def get_possible_impulse_zone_by_id(self, zone_id):
            return SimpleNamespace(id=zone_id, user_id=999)

    monkeypatch.setattr(
        bank_service, "ImpulseZoneRepository", FakeImpulseZoneRepository
    )

    with pytest.raises(HTTPException) as exc_info:
        bank_service.delete_user_possible_impulse_zone(
            db=cast(Session, object()),
            current_user=cast(UserDB, SimpleNamespace(id=7)),
            zone_id=1,
        )

    assert exc_info.value.status_code == 403


def test_delete_user_possible_impulse_zone_returns_deleted(monkeypatch) -> None:
    class FakeImpulseZoneRepository:
        def __init__(self, db):
            pass

        def get_possible_impulse_zone_by_id(self, zone_id):
            return SimpleNamespace(id=zone_id, user_id=7)

        def delete_possible_impulse_zone(self, zone_id):
            return True

    monkeypatch.setattr(
        bank_service, "ImpulseZoneRepository", FakeImpulseZoneRepository
    )

    result = bank_service.delete_user_possible_impulse_zone(
        db=cast(Session, object()),
        current_user=cast(UserDB, SimpleNamespace(id=7)),
        zone_id=11,
    )

    assert result == {"deleted": True}


def test_month_window_for_december_rolls_to_next_year() -> None:
    start, end = bank_service._month_window(
        datetime(2026, 12, 15, 8, 30, 0, tzinfo=timezone.utc)
    )

    assert start == datetime(2026, 12, 1, 0, 0, 0, tzinfo=timezone.utc)
    assert end == datetime(2026, 12, 31, 23, 59, 59, 999999, tzinfo=timezone.utc)


def test_macrodroid_slug_helpers_and_build_url(monkeypatch) -> None:
    monkeypatch.setattr(
        bank_service,
        "MACRODROID_OVERSPEND_TRIGGER_SLUGS",
        " first , /second/ ,, third/ ",
    )

    slugs = bank_service._macrodroid_trigger_slugs()
    assert slugs == ["first", "second", "third"]

    monkeypatch.setattr(
        bank_service, "random", SimpleNamespace(choice=lambda items: items[1])
    )
    assert bank_service._pick_macrodroid_trigger_slug() == "second"

    monkeypatch.setattr(bank_service, "MACRODROID_TRIGGER_BASE_URL", "https://x/y/")
    assert (
        bank_service._build_macrodroid_trigger_url("/second/") == "https://x/y/second"
    )


def test_pick_trigger_slug_raises_when_unconfigured(monkeypatch) -> None:
    monkeypatch.setattr(bank_service, "MACRODROID_OVERSPEND_TRIGGER_SLUGS", "")
    with pytest.raises(ValueError):
        bank_service._pick_macrodroid_trigger_slug()


def test_maybe_trigger_over_budget_macro_triggers_on_threshold_cross(
    monkeypatch,
) -> None:
    calls = {}

    class FakeUserMetadataRepository:
        def __init__(self, db):
            pass

        def get_by_user_id(self, user_id):
            return SimpleNamespace(impulse_limit=5)

    class FakeTransactionRepository:
        def __init__(self, db):
            pass

        def get_user_total_by_date_range(self, *, user_id, start, end):
            calls["total_args"] = {"user_id": user_id, "start": start, "end": end}
            return 600

    monkeypatch.setattr(
        bank_service, "UserMetadataRepository", FakeUserMetadataRepository
    )
    monkeypatch.setattr(
        bank_service, "TransactionRepository", FakeTransactionRepository
    )
    monkeypatch.setattr(
        bank_service,
        "_month_window",
        lambda now: (
            datetime(2026, 1, 1, 0, 0, 0, tzinfo=timezone.utc),
            datetime(2026, 1, 31, 23, 59, 59, tzinfo=timezone.utc),
        ),
    )
    monkeypatch.setattr(bank_service, "_pick_macrodroid_trigger_slug", lambda: "slug-1")
    monkeypatch.setattr(
        bank_service,
        "_build_macrodroid_trigger_url",
        lambda slug: f"https://trigger/{slug}",
    )
    monkeypatch.setattr(
        bank_service,
        "_trigger_over_budget_macro",
        lambda url: calls.setdefault("trigger_url", url),
    )

    bank_service._maybe_trigger_over_budget_macro(
        db=cast(Session, object()),
        user_id=77,
        transaction_amount=100,
        transaction_timestamp=datetime(2026, 1, 15, 12, 0, 0, tzinfo=timezone.utc),
    )

    assert calls["total_args"]["user_id"] == 77
    assert calls["trigger_url"] == "https://trigger/slug-1"


def test_get_user_limit_status_and_me_payload(monkeypatch) -> None:
    class FakeUserMetadataRepository:
        def __init__(self, db):
            pass

        def get_by_user_id(self, user_id):
            return SimpleNamespace(goal="Trip", impulse_limit=5, tax_percentage=12)

    class FakeTransactionRepository:
        def __init__(self, db):
            pass

        def get_user_total_by_date_range(self, *, user_id, start, end):
            return 700

    monkeypatch.setattr(
        bank_service, "UserMetadataRepository", FakeUserMetadataRepository
    )
    monkeypatch.setattr(
        bank_service, "TransactionRepository", FakeTransactionRepository
    )
    monkeypatch.setattr(
        bank_service,
        "_month_window",
        lambda now: (
            datetime(2026, 1, 1, 0, 0, 0, tzinfo=timezone.utc),
            datetime(2026, 1, 31, 23, 59, 59, tzinfo=timezone.utc),
        ),
    )

    current_user = cast(
        UserDB,
        SimpleNamespace(
            id=11,
            username="pony",
            email="pony@example.com",
            full_name="Pony",
            is_active=True,
            roles=[UserTypeEnum.USER],
        ),
    )

    status_payload = bank_service.get_user_limit_status(
        db=cast(Session, object()),
        current_user=current_user,
    )
    me_payload = bank_service.get_user_me_payload(
        db=cast(Session, object()),
        current_user=current_user,
    )

    assert status_payload.current_month_expenditure == 700
    assert status_payload.impulse_limit == 5
    assert status_payload.is_passed_limit is True
    assert me_payload.goal == "Trip"
    assert me_payload.tax_percentage == 12
    assert me_payload.current_month_expenditure == 700


def test_add_money_to_account_rejects_non_owner_for_non_admin(monkeypatch) -> None:
    payload = AddMoneyRequest(sort_code="112233", account_number="12345678", amount=80)

    class FakeBankAccountRepository:
        def __init__(self, db):
            pass

        def get_by_account_number_and_sort_code(self, *, account_number, sort_code):
            return SimpleNamespace(id=7, user_id=11, amount=120)

    monkeypatch.setattr(
        bank_service,
        "BankAccountRepository",
        FakeBankAccountRepository,
    )

    with pytest.raises(HTTPException) as exc_info:
        bank_service.add_money_to_account(
            db=cast(Session, object()),
            current_user=cast(
                UserDB,
                SimpleNamespace(id=42, roles=[UserTypeEnum.USER]),
            ),
            payload=payload,
        )

    assert exc_info.value.status_code == 403
    assert (
        exc_info.value.detail
        == "Bank account does not belong to the authenticated user"
    )


def test_add_money_to_account_allows_admin_to_update_other_user_account(
    monkeypatch,
) -> None:
    payload = AddMoneyRequest(sort_code="112233", account_number="12345678", amount=80)
    calls = {}

    class FakeBankAccountRepository:
        def __init__(self, db):
            calls["db"] = db

        def get_by_account_number_and_sort_code(self, *, account_number, sort_code):
            calls["lookup"] = {
                "account_number": account_number,
                "sort_code": sort_code,
            }
            return SimpleNamespace(id=7, user_id=11, amount=120)

        def update_amount(self, account_id, new_amount):
            calls["update"] = {"account_id": account_id, "new_amount": new_amount}
            return SimpleNamespace(
                id=account_id,
                user_id=11,
                bank_account_id="acct-7",
                account_number="12345678",
                sort_code="112233",
                name="REV-O-TROT Current Account",
                provider=BankProviderEnum.REV_O_TROT,
                type=AccountTypeEnum.CURRENT,
                amount=new_amount,
                created_at=datetime(2026, 1, 1, 12, 0, 0),
                updated_at=datetime(2026, 1, 1, 12, 0, 0),
            )

    marker_db = cast(Session, object())
    monkeypatch.setattr(
        bank_service,
        "BankAccountRepository",
        FakeBankAccountRepository,
    )

    result = bank_service.add_money_to_account(
        db=marker_db,
        current_user=cast(
            UserDB,
            SimpleNamespace(id=1, roles=[UserTypeEnum.ADMIN]),
        ),
        payload=payload,
    )

    assert calls["db"] is marker_db
    assert calls["lookup"] == {"account_number": "12345678", "sort_code": "112233"}
    assert calls["update"] == {"account_id": 7, "new_amount": 200}
    assert result.amount == 200


def test_delete_user_possible_impulse_zone_rejects_missing(monkeypatch) -> None:
    class FakeImpulseZoneRepository:
        def __init__(self, db):
            pass

        def get_possible_impulse_zone_by_id(self, zone_id):
            return None

    monkeypatch.setattr(
        bank_service,
        "ImpulseZoneRepository",
        FakeImpulseZoneRepository,
    )

    with pytest.raises(HTTPException) as exc_info:
        bank_service.delete_user_possible_impulse_zone(
            db=cast(Session, object()),
            current_user=cast(UserDB, SimpleNamespace(id=21)),
            zone_id=9,
        )

    assert exc_info.value.status_code == 404
    assert exc_info.value.detail == "Possible impulse zone not found"


def test_create_user_transaction_rejects_non_owned_source(monkeypatch) -> None:
    payload = TransactionCreate(
        source_account_id=10,
        amount=20,
        timestamp=datetime(2026, 1, 2, 10, 0, 0),
        merchant="coffee",
    )

    class FakeBankAccountRepository:
        def __init__(self, db):
            pass

        def get_by_id_and_user_id(self, *, account_id, user_id):
            return None

    monkeypatch.setattr(
        bank_service, "BankAccountRepository", FakeBankAccountRepository
    )

    with pytest.raises(HTTPException) as exc_info:
        bank_service.create_user_transaction(
            db=cast(Session, object()),
            current_user=cast(UserDB, SimpleNamespace(id=1)),
            payload=payload,
        )

    assert exc_info.value.status_code == 403


def test_create_user_transaction_happy_path_with_tax(monkeypatch) -> None:
    updates: list[tuple[int, int]] = []
    captured: dict[str, Any] = {}
    payload = TransactionCreate(
        source_account_id=10,
        amount=100,
        timestamp=datetime(2026, 1, 2, 10, 0, 0),
        merchant="bookstore",
    )

    class FakeBankAccountRepository:
        def __init__(self, db):
            pass

        def get_by_id_and_user_id(self, *, account_id, user_id):
            return SimpleNamespace(id=10, user_id=user_id, amount=500)

        def update_amount(self, account_id, new_amount):
            updates.append((account_id, new_amount))
            return None

        def get_by_id(self, account_id):
            return SimpleNamespace(id=99, amount=50)

    class FakeTransactionRepository:
        def __init__(self, db):
            pass

        def create_transaction(self, **kwargs):
            captured["transaction"] = kwargs
            return {"id": 123, **kwargs}

    class FakeMetadataRepository:
        def __init__(self, db):
            pass

        def get_by_user_id(self, user_id):
            return SimpleNamespace(tax_percentage=10, bank_account_id=99)

    class FakePunishmentRepository:
        def __init__(self, db):
            pass

        def create_tax_collection(self, **kwargs):
            captured["punishment"] = kwargs

    monkeypatch.setattr(
        bank_service, "BankAccountRepository", FakeBankAccountRepository
    )
    monkeypatch.setattr(
        bank_service, "TransactionRepository", FakeTransactionRepository
    )
    monkeypatch.setattr(bank_service, "UserMetadataRepository", FakeMetadataRepository)
    monkeypatch.setattr(
        bank_service,
        "TransactionPunishmentRepository",
        FakePunishmentRepository,
    )
    monkeypatch.setattr(
        bank_service,
        "_maybe_trigger_over_budget_macro",
        lambda *args, **kwargs: captured.setdefault("trigger", kwargs),
    )

    result = bank_service.create_user_transaction(
        db=cast(Session, object()),
        current_user=cast(UserDB, SimpleNamespace(id=1)),
        payload=payload,
    )

    assert cast(dict[str, Any], result)["id"] == 123
    assert updates == [(10, 400), (10, 390), (99, 60)]
    assert cast(dict[str, Any], captured["punishment"])["tax_amount"] == 10
    assert cast(dict[str, Any], captured["trigger"])["user_id"] == 1


def test_create_webhook_transaction_rolls_back_on_error(monkeypatch) -> None:
    payload = TransactionWebhookCreate(
        sort_code="112233",
        account_number="12345678",
        amount=100,
        timestamp=datetime(2026, 1, 2, 10, 0, 0),
        merchant="store",
    )
    calls = {"rolled_back": False, "committed": False}

    class Savepoint:
        def commit(self):
            pass

        def rollback(self):
            calls["rolled_back"] = True

    class FakeDB:
        def begin_nested(self):
            return Savepoint()

        def commit(self):
            calls["committed"] = True

    class FakeBankAccountRepository:
        def __init__(self, db):
            pass

        def get_by_account_number_and_sort_code(self, *, account_number, sort_code):
            return SimpleNamespace(id=10, user_id=1, amount=500)

    class FakeTransactionRepository:
        def __init__(self, db):
            pass

        def create_transaction(self, **kwargs):
            raise RuntimeError("boom")

    monkeypatch.setattr(
        bank_service, "BankAccountRepository", FakeBankAccountRepository
    )
    monkeypatch.setattr(
        bank_service, "TransactionRepository", FakeTransactionRepository
    )

    with pytest.raises(HTTPException) as exc_info:
        bank_service.create_webhook_transaction(
            db=cast(Session, FakeDB()),
            current_user=cast(UserDB, SimpleNamespace(id=1)),
            payload=payload,
        )

    assert exc_info.value.status_code == 500
    assert calls["rolled_back"] is True
    assert calls["committed"] is False


def test_create_webhook_transaction_success_with_tax(monkeypatch) -> None:
    payload = TransactionWebhookCreate(
        sort_code="112233",
        account_number="12345678",
        amount=200,
        timestamp=datetime(2026, 1, 2, 10, 0, 0),
        merchant="store",
    )
    updates: list[tuple[int, int, bool]] = []
    captured: dict[str, Any] = {}

    class Savepoint:
        def commit(self):
            captured["savepoint_commit"] = True

        def rollback(self):
            captured["savepoint_rollback"] = True

    class FakeDB:
        def begin_nested(self):
            return Savepoint()

        def commit(self):
            captured["db_commit"] = True

    class FakeBankAccountRepository:
        def __init__(self, db):
            pass

        def get_by_account_number_and_sort_code(self, *, account_number, sort_code):
            return SimpleNamespace(id=10, user_id=1, amount=1000)

        def update_amount(self, account_id, new_amount, commit=True):
            updates.append((account_id, new_amount, commit))

        def get_by_id(self, account_id):
            return SimpleNamespace(id=99, amount=300)

    class FakeTransactionRepository:
        def __init__(self, db):
            pass

        def create_transaction(self, **kwargs):
            return {"id": 88}

    class FakeMetadataRepository:
        def __init__(self, db):
            pass

        def get_by_user_id(self, user_id):
            return SimpleNamespace(tax_percentage=10, bank_account_id=99)

    class FakePunishmentRepository:
        def __init__(self, db):
            pass

        def create_tax_collection(self, **kwargs):
            captured["punishment"] = kwargs

    monkeypatch.setattr(
        bank_service, "BankAccountRepository", FakeBankAccountRepository
    )
    monkeypatch.setattr(
        bank_service, "TransactionRepository", FakeTransactionRepository
    )
    monkeypatch.setattr(bank_service, "UserMetadataRepository", FakeMetadataRepository)
    monkeypatch.setattr(
        bank_service,
        "TransactionPunishmentRepository",
        FakePunishmentRepository,
    )
    monkeypatch.setattr(
        bank_service,
        "_maybe_trigger_over_budget_macro",
        lambda *args, **kwargs: captured.setdefault("trigger", kwargs),
    )

    result = bank_service.create_webhook_transaction(
        db=cast(Session, FakeDB()),
        current_user=cast(UserDB, SimpleNamespace(id=1)),
        payload=payload,
    )

    assert cast(dict[str, Any], result)["id"] == 88
    assert captured["savepoint_commit"] is True
    assert captured["db_commit"] is True
    assert updates == [(10, 800, False), (10, 780, False), (99, 320, False)]
    assert cast(dict[str, Any], captured["punishment"])["tax_amount"] == 20


def test_set_user_goal_defaults_to_saving_or_rejects(monkeypatch) -> None:
    payload = UserGoalSetRequest(goal="Bike", bank_account_id=None, impulse_limit=4)

    class FakeBankAccountRepositoryMissing:
        def __init__(self, db):
            pass

        def get_first_by_user_id_and_type(self, *, user_id, account_type):
            return None

    class FakeMetadataRepository:
        def __init__(self, db):
            pass

        def get_by_user_id(self, user_id):
            return None

        def set_goal(self, **kwargs):
            return SimpleNamespace(id=1, user_id=kwargs["user_id"])

    monkeypatch.setattr(
        bank_service, "BankAccountRepository", FakeBankAccountRepositoryMissing
    )
    monkeypatch.setattr(bank_service, "UserMetadataRepository", FakeMetadataRepository)

    with pytest.raises(HTTPException) as exc_info:
        bank_service.set_user_goal(
            db=cast(Session, object()),
            current_user=cast(UserDB, SimpleNamespace(id=2)),
            payload=payload,
        )

    assert exc_info.value.status_code == 404


def test_set_user_goal_uses_explicit_owned_account(monkeypatch) -> None:
    calls = {}
    payload = UserGoalSetRequest(
        goal="Trip",
        bank_account_id=5,
        impulse_limit=None,
        tax_percentage=None,
    )

    class FakeBankAccountRepository:
        def __init__(self, db):
            pass

        def get_by_id_and_user_id(self, *, account_id, user_id):
            return SimpleNamespace(id=account_id, user_id=user_id)

    class FakeMetadataRepository:
        def __init__(self, db):
            pass

        def get_by_user_id(self, user_id):
            return SimpleNamespace(impulse_limit=7, tax_percentage=9)

        def set_goal(self, **kwargs):
            calls["set_goal"] = kwargs
            return SimpleNamespace(id=1, **kwargs)

    monkeypatch.setattr(
        bank_service, "BankAccountRepository", FakeBankAccountRepository
    )
    monkeypatch.setattr(bank_service, "UserMetadataRepository", FakeMetadataRepository)

    result = bank_service.set_user_goal(
        db=cast(Session, object()),
        current_user=cast(UserDB, SimpleNamespace(id=2)),
        payload=payload,
    )

    assert calls["set_goal"]["bank_account_id"] == 5
    assert calls["set_goal"]["impulse_limit"] == 7
    assert calls["set_goal"]["tax_percentage"] == 9
    assert result.goal == "Trip"


def test_admin_impulse_zone_crud_and_promote_errors(monkeypatch) -> None:
    class FakeImpulseZoneRepository:
        def __init__(self, db):
            pass

        def create_impulse_zone(self, name):
            return SimpleNamespace(id=1, name=name)

        def get_all_impulse_zones(self):
            return [SimpleNamespace(id=1)]

        def update_impulse_zone(self, zone_id, name):
            return None

        def delete_impulse_zone(self, zone_id):
            return False

        def create_possible_impulse_zone(self, name, user_id=None):
            return SimpleNamespace(id=2, name=name, user_id=user_id)

        def get_all_possible_impulse_zones(self):
            return [SimpleNamespace(id=2)]

        def update_possible_impulse_zone(self, zone_id, name):
            return None

        def delete_possible_impulse_zone(self, zone_id):
            return False

        def promote_possible_to_impulse_zone(self, zone_id, name):
            raise ValueError("missing")

    monkeypatch.setattr(
        bank_service, "ImpulseZoneRepository", FakeImpulseZoneRepository
    )

    assert (
        bank_service.admin_create_impulse_zone(
            cast(Session, object()), payload=ImpulseZoneCreate(name="x")
        ).id
        == 1
    )
    assert len(bank_service.admin_list_impulse_zones(cast(Session, object()))) == 1
    assert len(bank_service.list_all_impulse_zones(cast(Session, object()))) == 1
    assert (
        bank_service.admin_create_possible_impulse_zone(
            cast(Session, object()), payload=ImpulseZoneCreate(name="p")
        ).id
        == 2
    )
    assert (
        len(bank_service.admin_list_possible_impulse_zones(cast(Session, object())))
        == 1
    )

    with pytest.raises(HTTPException) as update_exc:
        bank_service.admin_update_impulse_zone(
            cast(Session, object()),
            zone_id=1,
            payload=ImpulseZoneUpdate(name="new"),
        )
    assert update_exc.value.status_code == 404

    with pytest.raises(HTTPException) as delete_exc:
        bank_service.admin_delete_impulse_zone(cast(Session, object()), zone_id=1)
    assert delete_exc.value.status_code == 404

    with pytest.raises(HTTPException) as update_possible_exc:
        bank_service.admin_update_possible_impulse_zone(
            cast(Session, object()),
            zone_id=2,
            payload=ImpulseZoneUpdate(name="new"),
        )
    assert update_possible_exc.value.status_code == 404

    with pytest.raises(HTTPException) as delete_possible_exc:
        bank_service.admin_delete_possible_impulse_zone(
            cast(Session, object()), zone_id=2
        )
    assert delete_possible_exc.value.status_code == 404

    with pytest.raises(HTTPException) as promote_exc:
        bank_service.admin_promote_possible_impulse_zone(
            cast(Session, object()),
            zone_id=2,
            payload=PromotePossibleImpulseRequest(name="promoted"),
        )
    assert promote_exc.value.status_code == 404


def test_delete_user_possible_impulse_zone_rejects_other_owner(monkeypatch) -> None:
    class FakeImpulseZoneRepository:
        def __init__(self, db):
            pass

        def get_possible_impulse_zone_by_id(self, zone_id):
            return SimpleNamespace(id=zone_id, user_id=99)

    monkeypatch.setattr(
        bank_service,
        "ImpulseZoneRepository",
        FakeImpulseZoneRepository,
    )

    with pytest.raises(HTTPException) as exc_info:
        bank_service.delete_user_possible_impulse_zone(
            db=cast(Session, object()),
            current_user=cast(UserDB, SimpleNamespace(id=21)),
            zone_id=9,
        )

    assert exc_info.value.status_code == 403
    assert (
        exc_info.value.detail
        == "Possible impulse zone does not belong to the authenticated user"
    )


def test_delete_user_possible_impulse_zone_deletes_owned_zone(monkeypatch) -> None:
    calls = {}

    class FakeImpulseZoneRepository:
        def __init__(self, db):
            calls["db"] = db

        def get_possible_impulse_zone_by_id(self, zone_id):
            calls["looked_up_zone_id"] = zone_id
            return SimpleNamespace(id=zone_id, user_id=21)

        def delete_possible_impulse_zone(self, zone_id):
            calls["deleted_zone_id"] = zone_id
            return True

    marker_db = cast(Session, object())
    monkeypatch.setattr(
        bank_service,
        "ImpulseZoneRepository",
        FakeImpulseZoneRepository,
    )

    result = bank_service.delete_user_possible_impulse_zone(
        db=marker_db,
        current_user=cast(UserDB, SimpleNamespace(id=21)),
        zone_id=12,
    )

    assert result == {"deleted": True}
    assert calls["db"] is marker_db
    assert calls["looked_up_zone_id"] == 12
    assert calls["deleted_zone_id"] == 12
