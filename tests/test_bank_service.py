from datetime import datetime
from types import SimpleNamespace
from typing import cast

import pytest
from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from backend.models import (
    AccountTypeEnum,
    AddMoneyRequest,
    BankProviderEnum,
    CreateBankAccountsRequest,
    SetupBankAccountDetails,
    SetupBankAccountsRequest,
    TransferBetweenAccountsRequest,
    TransactionDateRangeQuery,
    UserDB,
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
