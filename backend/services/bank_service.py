import random
from datetime import datetime, timedelta

from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from backend.models import (
    AccountTypeEnum,
    BankProviderEnum,
    CreateBankAccountsResponse,
    ImpulseZoneCreate,
    ImpulseZonePublic,
    ImpulseZoneUpdate,
    PossibleImpulseZonePublic,
    PromotePossibleImpulseRequest,
    TransactionDateRangeQuery,
    TransactionCreate,
    TransactionHydratedPublic,
    TransactionPublic,
    UserDB,
    UserGoalSetRequest,
    UserImpulsesBundlePublic,
    UserLimitStatusPublic,
    UserMePublic,
    UserMetadataPublic,
)
from backend.repositories.bank_account_repository import BankAccountRepository
from backend.repositories.impulse_zone_repository import ImpulseZoneRepository
from backend.repositories.transaction_repository import TransactionRepository
from backend.repositories.user_metadata_repository import UserMetadataRepository


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


def list_user_transactions_hydrated(
    db: Session,
    *,
    current_user: UserDB,
) -> list[TransactionHydratedPublic]:
    return TransactionRepository(db).get_by_user_id_hydrated(current_user.id)


def search_user_transactions_by_date(
    db: Session,
    *,
    current_user: UserDB,
    payload: TransactionDateRangeQuery,
) -> list[TransactionHydratedPublic]:
    if payload.start > payload.end:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="start must be before or equal to end",
        )
    return TransactionRepository(db).get_by_user_id_and_date_range_hydrated(
        user_id=current_user.id,
        start=payload.start,
        end=payload.end,
    )


def admin_search_transactions_by_date(
    db: Session,
    *,
    payload: TransactionDateRangeQuery,
) -> list[TransactionHydratedPublic]:
    if payload.start > payload.end:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="start must be before or equal to end",
        )
    return TransactionRepository(db).get_all_by_date_range_hydrated(
        start=payload.start,
        end=payload.end,
    )


def admin_transaction_summary(db: Session, *, page: int = 1, page_size: int = 100):
    return TransactionRepository(db).get_all_paginated(page=page, page_size=page_size)


def create_bank_accounts_for_user(
    db: Session,
    *,
    current_user: UserDB,
    provider: BankProviderEnum,
) -> CreateBankAccountsResponse:
    account_repo = BankAccountRepository(db)
    current_account, saving_account = account_repo.create_default_accounts_for_user(
        user_id=current_user.id,
        provider=provider,
    )

    # Bias around 1000 while respecting the requested [500, 10000] bounds.
    current_amount = int(round(random.triangular(500, 10000, 1000)))
    saving_amount = random.randint(100, 5000)

    current_account = account_repo.update_amount(current_account.id, current_amount)
    saving_account = account_repo.update_amount(saving_account.id, saving_amount)

    return CreateBankAccountsResponse(current=current_account, saving=saving_account)


def get_user_impulses_bundle(
    db: Session,
    *,
    current_user: UserDB,
) -> UserImpulsesBundlePublic:
    repo = ImpulseZoneRepository(db)
    return UserImpulsesBundlePublic(
        impulses=repo.get_user_impulses(current_user.id),
        possible=repo.get_all_possible_impulse_zones(),
    )


def set_user_impulses(
    db: Session,
    *,
    current_user: UserDB,
    impulse_ids: list[int],
) -> UserImpulsesBundlePublic:
    repo = ImpulseZoneRepository(db)
    all_impulses = repo.get_all_impulse_zones()
    known_ids = {zone.id for zone in all_impulses}
    unknown_ids = sorted(set(impulse_ids) - known_ids)
    if unknown_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown impulse IDs: {unknown_ids}",
        )

    repo.replace_user_impulses(user_id=current_user.id, impulse_ids=impulse_ids)
    return get_user_impulses_bundle(db, current_user=current_user)


def create_possible_impulse_zone(
    db: Session,
    *,
    payload: ImpulseZoneCreate,
) -> PossibleImpulseZonePublic:
    try:
        return ImpulseZoneRepository(db).create_possible_impulse_zone(payload.name)
    except IntegrityError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Possible impulse zone already exists",
        ) from exc


def admin_create_impulse_zone(
    db: Session,
    *,
    payload: ImpulseZoneCreate,
) -> ImpulseZonePublic:
    try:
        return ImpulseZoneRepository(db).create_impulse_zone(payload.name)
    except IntegrityError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Impulse zone already exists",
        ) from exc


def admin_list_impulse_zones(db: Session) -> list[ImpulseZonePublic]:
    return ImpulseZoneRepository(db).get_all_impulse_zones()


def list_all_impulse_zones(db: Session) -> list[ImpulseZonePublic]:
    return ImpulseZoneRepository(db).get_all_impulse_zones()


def admin_update_impulse_zone(
    db: Session,
    *,
    zone_id: int,
    payload: ImpulseZoneUpdate,
) -> ImpulseZonePublic:
    try:
        updated = ImpulseZoneRepository(db).update_impulse_zone(zone_id, payload.name)
    except IntegrityError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Impulse zone already exists",
        ) from exc
    if updated is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Impulse zone not found",
        )
    return updated


def admin_delete_impulse_zone(db: Session, *, zone_id: int) -> dict[str, bool]:
    deleted = ImpulseZoneRepository(db).delete_impulse_zone(zone_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Impulse zone not found",
        )
    return {"deleted": True}


def admin_create_possible_impulse_zone(
    db: Session,
    *,
    payload: ImpulseZoneCreate,
) -> PossibleImpulseZonePublic:
    try:
        return ImpulseZoneRepository(db).create_possible_impulse_zone(payload.name)
    except IntegrityError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Possible impulse zone already exists",
        ) from exc


def admin_list_possible_impulse_zones(db: Session) -> list[PossibleImpulseZonePublic]:
    return ImpulseZoneRepository(db).get_all_possible_impulse_zones()


def admin_update_possible_impulse_zone(
    db: Session,
    *,
    zone_id: int,
    payload: ImpulseZoneUpdate,
) -> PossibleImpulseZonePublic:
    try:
        updated = ImpulseZoneRepository(db).update_possible_impulse_zone(
            zone_id,
            payload.name,
        )
    except IntegrityError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Possible impulse zone already exists",
        ) from exc
    if updated is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Possible impulse zone not found",
        )
    return updated


def admin_delete_possible_impulse_zone(db: Session, *, zone_id: int) -> dict[str, bool]:
    deleted = ImpulseZoneRepository(db).delete_possible_impulse_zone(zone_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Possible impulse zone not found",
        )
    return {"deleted": True}


def admin_promote_possible_impulse_zone(
    db: Session,
    *,
    zone_id: int,
    payload: PromotePossibleImpulseRequest,
) -> ImpulseZonePublic:
    try:
        return ImpulseZoneRepository(db).promote_possible_to_impulse_zone(
            zone_id,
            payload.name,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc
    except IntegrityError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Impulse zone already exists",
        ) from exc


def set_user_goal(
    db: Session,
    *,
    current_user: UserDB,
    payload: UserGoalSetRequest,
) -> UserMetadataPublic:
    bank_repo = BankAccountRepository(db)
    metadata_repo = UserMetadataRepository(db)
    existing_metadata = metadata_repo.get_by_user_id(current_user.id)

    target_account_id = payload.bank_account_id
    if target_account_id is not None:
        account = bank_repo.get_by_id_and_user_id(
            account_id=target_account_id,
            user_id=current_user.id,
        )
        if account is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bank account does not belong to the authenticated user",
            )
    else:
        default_saving = bank_repo.get_first_by_user_id_and_type(
            user_id=current_user.id,
            account_type=AccountTypeEnum.SAVING,
        )
        if default_saving is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No saving account found for authenticated user",
            )
        target_account_id = default_saving.id

    return metadata_repo.set_goal(
        user_id=current_user.id,
        goal=payload.goal,
        bank_account_id=target_account_id,
        impulse_limit=(
            payload.impulse_limit
            if payload.impulse_limit is not None
            else (existing_metadata.impulse_limit if existing_metadata else None)
        ),
        tax_percentage=(
            payload.tax_percentage
            if payload.tax_percentage is not None
            else (existing_metadata.tax_percentage if existing_metadata else None)
        ),
    )


def _month_window(now: datetime) -> tuple[datetime, datetime]:
    start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    if start.month == 12:
        next_month = start.replace(year=start.year + 1, month=1)
    else:
        next_month = start.replace(month=start.month + 1)
    end = next_month - timedelta(microseconds=1)
    return start, end


def get_user_limit_status(
    db: Session, *, current_user: UserDB
) -> UserLimitStatusPublic:
    now = datetime.now()
    start, end = _month_window(now)

    txn_repo = TransactionRepository(db)
    metadata = UserMetadataRepository(db).get_by_user_id(current_user.id)
    total = txn_repo.get_user_total_by_date_range(
        user_id=current_user.id,
        start=start,
        end=end,
    )

    limit_value = metadata.impulse_limit if metadata else None
    passed = bool(limit_value is not None and total > limit_value)
    return UserLimitStatusPublic(
        current_month_expenditure=total,
        impulse_limit=limit_value,
        is_passed_limit=passed,
    )


def get_user_me_payload(db: Session, *, current_user: UserDB) -> UserMePublic:
    metadata = UserMetadataRepository(db).get_by_user_id(current_user.id)
    limit_status = get_user_limit_status(db, current_user=current_user)
    return UserMePublic(
        id=current_user.id,
        username=current_user.username,
        email=current_user.email,
        full_name=current_user.full_name,
        is_active=current_user.is_active,
        roles=current_user.roles,
        goal=metadata.goal if metadata else None,
        impulse_limit=limit_status.impulse_limit,
        tax_percentage=metadata.tax_percentage if metadata else None,
        current_month_expenditure=limit_status.current_month_expenditure,
        is_passed_limit=limit_status.is_passed_limit,
    )
