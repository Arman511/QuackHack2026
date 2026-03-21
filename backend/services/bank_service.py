from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from backend.models import TransactionCreate, TransactionPublic, UserDB
from backend.repositories.bank_account_repository import BankAccountRepository
from backend.repositories.transaction_repository import TransactionRepository


def list_my_accounts(db: Session, *, current_user: UserDB):
    return BankAccountRepository(db).get_by_user_id(current_user.id)


def create_user_transaction(
    db: Session, *, current_user: UserDB, payload: TransactionCreate
) -> TransactionPublic:
    account_repo = BankAccountRepository(db)
    source_account = account_repo.get_by_id_and_user_id(
        account_id=payload.source_account_id,
        user_id=current_user.id,
    )
    if source_account is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Source account does not belong to the authenticated user",
        )

    transaction = TransactionRepository(db).create_transaction(
        user_id=current_user.id,
        source_account_id=payload.source_account_id,
        amount=payload.amount,
        timestamp=payload.timestamp,
        merchant=payload.merchant,
        impulse_zone_id=payload.impulse_zone_id,
        possible_impulse_zone_id=payload.possible_impulse_zone_id,
    )
    return transaction


def admin_transaction_summary(db: Session, *, page: int = 1, page_size: int = 100):
    return TransactionRepository(db).get_all_paginated(page=page, page_size=page_size)
