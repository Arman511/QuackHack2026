import random
import logging
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
    TransactionWebhookCreate,
    TransactionHydratedPublic,
    TransactionPublic,
    UserDB,
    UserGoalSetRequest,
    UserImpulsesBundlePublic,
    UserLimitStatusPublic,
    UserMePublic,
    UserMetadataPublic,
    SetupBankAccountsRequest,
    PaginatedTransactionSearchResponse,
    TransactionSearchItemPublic,
)
from backend.repositories.bank_account_repository import BankAccountRepository
from backend.repositories.impulse_zone_repository import ImpulseZoneRepository
from backend.repositories.transaction_repository import TransactionRepository
from backend.repositories.user_metadata_repository import UserMetadataRepository

logger = logging.getLogger(__name__)


def _id_for_log(entity: object) -> object:
    if isinstance(entity, dict):
        return entity.get("id")
    return getattr(entity, "id", None)


def list_my_accounts(db: Session, *, current_user: UserDB):
    accounts = BankAccountRepository(db).get_by_user_id(current_user.id)
    logger.debug("Fetched %s accounts for user_id=%s", len(accounts), current_user.id)
    return accounts


def create_user_transaction(
    db: Session, *, current_user: UserDB, payload: TransactionCreate
) -> TransactionPublic:
    logger.info(
        "Creating transaction for user_id=%s source_account_id=%s",
        current_user.id,
        payload.source_account_id,
    )
    account_repo = BankAccountRepository(db)
    source_account = account_repo.get_by_id_and_user_id(
        account_id=payload.source_account_id,
        user_id=current_user.id,
    )
    if source_account is None:
        logger.warning(
            "Transaction denied: source account not owned user_id=%s source_account_id=%s",
            current_user.id,
            payload.source_account_id,
        )
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
    logger.info("Transaction created transaction_id=%s", _id_for_log(transaction))
    return transaction


def create_webhook_transaction(
    db: Session,
    *,
    current_user: UserDB,
    payload: TransactionWebhookCreate,
) -> TransactionPublic:
    logger.info(
        "Processing webhook transaction for user_id=%s account_number=%s",
        current_user.id,
        payload.account_number,
    )
    account_repo = BankAccountRepository(db)
    source_account = account_repo.get_by_account_number_and_sort_code(
        account_number=payload.account_number,
        sort_code=payload.sort_code,
    )
    if source_account is not None and source_account.user_id != current_user.id:
        logger.warning(
            "Webhook transaction denied due to ownership mismatch actor_user_id=%s owner_user_id=%s",
            current_user.id,
            source_account.user_id,
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bank account does not belong to the authenticated user",
        )
    if source_account is None:
        logger.warning(
            "Webhook transaction account not found account_number=%s",
            payload.account_number,
        )
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bank account not found for provided account number and sort code",
        )

    transaction = TransactionRepository(db).create_transaction(
        user_id=source_account.user_id,
        source_account_id=source_account.id,
        amount=payload.amount,
        timestamp=payload.timestamp,
        merchant=payload.merchant,
        impulse_zone_id=payload.impulse_zone_id,
        possible_impulse_zone_id=payload.possible_impulse_zone_id,
    )
    logger.info(
        "Webhook transaction created transaction_id=%s",
        _id_for_log(transaction),
    )
    return transaction


def list_user_transactions_hydrated(
    db: Session,
    *,
    current_user: UserDB,
) -> list[TransactionHydratedPublic]:
    rows = TransactionRepository(db).get_by_user_id_hydrated(current_user.id)
    logger.debug(
        "Fetched %s hydrated transactions for user_id=%s",
        len(rows),
        current_user.id,
    )
    return rows


def search_user_transactions_by_date(
    db: Session,
    *,
    current_user: UserDB,
    payload: TransactionDateRangeQuery,
    page: int,
    page_size: int,
) -> PaginatedTransactionSearchResponse:
    if payload.start > payload.end:
        logger.warning(
            "Invalid transaction search range user_id=%s start=%s end=%s",
            current_user.id,
            payload.start,
            payload.end,
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="start must be before or equal to end",
        )
    items, total = TransactionRepository(db).get_by_user_id_and_date_range_search_paginated(
        user_id=current_user.id,
        start=payload.start,
        end=payload.end,
        page=page,
        page_size=page_size,
    )
    total_pages = (total + page_size - 1) // page_size if total > 0 else 0
    logger.info(
        "User transaction search returned count=%s total=%s user_id=%s page=%s page_size=%s",
        len(items),
        total,
        current_user.id,
        page,
        page_size,
    )
    return PaginatedTransactionSearchResponse(
        items=[TransactionSearchItemPublic.model_validate(item) for item in items],
        page=page,
        page_size=page_size,
        total=total,
        total_pages=total_pages,
    )


def admin_search_transactions_by_date(
    db: Session,
    *,
    payload: TransactionDateRangeQuery,
) -> list[TransactionHydratedPublic]:
    if payload.start > payload.end:
        logger.warning(
            "Invalid admin transaction search range start=%s end=%s",
            payload.start,
            payload.end,
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="start must be before or equal to end",
        )
    rows = TransactionRepository(db).get_all_by_date_range_hydrated(
        start=payload.start,
        end=payload.end,
    )
    logger.info("Admin transaction search returned count=%s", len(rows))
    return rows


def admin_transaction_summary(db: Session, *, page: int = 1, page_size: int = 100):
    rows = TransactionRepository(db).get_all_paginated(page=page, page_size=page_size)
    logger.info(
        "Admin summary returned count=%s page=%s page_size=%s",
        len(rows),
        page,
        page_size,
    )
    return rows


def create_bank_accounts_for_user(
    db: Session,
    *,
    current_user: UserDB,
    provider: BankProviderEnum,
) -> CreateBankAccountsResponse:
    logger.info(
        "Creating default bank accounts for user_id=%s provider=%s",
        current_user.id,
        provider.value,
    )
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

    logger.info(
        "Default accounts created current_id=%s saving_id=%s user_id=%s",
        _id_for_log(current_account),
        _id_for_log(saving_account),
        current_user.id,
    )
    return CreateBankAccountsResponse(current=current_account, saving=saving_account)


def setup_bank_accounts_for_user(
    db: Session,
    *,
    current_user: UserDB,
    payload: SetupBankAccountsRequest,
) -> CreateBankAccountsResponse:
    logger.info(
        "Setting up explicit bank accounts for user_id=%s provider=%s",
        current_user.id,
        payload.provider.value,
    )
    account_repo = BankAccountRepository(db)
    existing_current = account_repo.get_first_by_user_id_and_type(
        user_id=current_user.id,
        account_type=AccountTypeEnum.CURRENT,
    )
    existing_saving = account_repo.get_first_by_user_id_and_type(
        user_id=current_user.id,
        account_type=AccountTypeEnum.SAVING,
    )
    if existing_current is not None or existing_saving is not None:
        logger.warning("Setup accounts conflict for user_id=%s", current_user.id)
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Bank accounts are already set up for this user",
        )

    current_account, saving_account = account_repo.create_accounts_for_user(
        user_id=current_user.id,
        provider=payload.provider,
        current_account_number=payload.current.account_number,
        current_sort_code=payload.current.sort_code,
        saving_account_number=payload.saving.account_number,
        saving_sort_code=payload.saving.sort_code,
    )

    logger.info(
        "Explicit accounts setup complete current_id=%s saving_id=%s user_id=%s",
        _id_for_log(current_account),
        _id_for_log(saving_account),
        current_user.id,
    )
    return CreateBankAccountsResponse(current=current_account, saving=saving_account)


def get_user_impulses_bundle(
    db: Session,
    *,
    current_user: UserDB,
) -> UserImpulsesBundlePublic:
    repo = ImpulseZoneRepository(db)
    logger.debug("Fetching impulses bundle for user_id=%s", current_user.id)
    return UserImpulsesBundlePublic(
        impulses=repo.get_user_impulses(current_user.id),
        possible=repo.get_possible_impulse_zones_for_user(current_user.id),
    )


def get_user_possible_impulses(
    db: Session,
    *,
    current_user: UserDB,
) -> list[PossibleImpulseZonePublic]:
    rows = ImpulseZoneRepository(db).get_possible_impulse_zones_for_user(
        current_user.id
    )
    logger.debug(
        "Fetched %s possible impulses for user_id=%s",
        len(rows),
        current_user.id,
    )
    return rows


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
        logger.warning(
            "Unknown impulse IDs user_id=%s ids=%s", current_user.id, unknown_ids
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown impulse IDs: {unknown_ids}",
        )

    repo.replace_user_impulses(user_id=current_user.id, impulse_ids=impulse_ids)
    logger.info(
        "Replaced user impulses user_id=%s impulse_count=%s",
        current_user.id,
        len(impulse_ids),
    )
    return get_user_impulses_bundle(db, current_user=current_user)


def create_possible_impulse_zone(
    db: Session,
    *,
    current_user: UserDB,
    payload: ImpulseZoneCreate,
) -> PossibleImpulseZonePublic:
    try:
        zone = ImpulseZoneRepository(db).create_possible_impulse_zone(
            payload.name,
            current_user.id,
        )
        logger.info(
            "Created user-scoped possible impulse zone_id=%s user_id=%s",
            _id_for_log(zone),
            current_user.id,
        )
        return zone
    except IntegrityError as exc:
        logger.warning(
            "Possible impulse conflict for user_id=%s name=%s",
            current_user.id,
            payload.name,
        )
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
        zone = ImpulseZoneRepository(db).create_impulse_zone(payload.name)
        logger.info("Admin created impulse zone_id=%s", _id_for_log(zone))
        return zone
    except IntegrityError as exc:
        logger.warning("Impulse zone create conflict name=%s", payload.name)
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Impulse zone already exists",
        ) from exc


def admin_list_impulse_zones(db: Session) -> list[ImpulseZonePublic]:
    rows = ImpulseZoneRepository(db).get_all_impulse_zones()
    logger.debug("Admin listed impulse zones count=%s", len(rows))
    return rows


def list_all_impulse_zones(db: Session) -> list[ImpulseZonePublic]:
    rows = ImpulseZoneRepository(db).get_all_impulse_zones()
    logger.debug("Listed all impulse zones count=%s", len(rows))
    return rows


def admin_update_impulse_zone(
    db: Session,
    *,
    zone_id: int,
    payload: ImpulseZoneUpdate,
) -> ImpulseZonePublic:
    try:
        updated = ImpulseZoneRepository(db).update_impulse_zone(zone_id, payload.name)
    except IntegrityError as exc:
        logger.warning("Impulse zone update conflict zone_id=%s", zone_id)
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Impulse zone already exists",
        ) from exc
    if updated is None:
        logger.warning("Impulse zone not found zone_id=%s", zone_id)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Impulse zone not found",
        )
    logger.info("Admin updated impulse zone zone_id=%s", zone_id)
    return updated


def admin_delete_impulse_zone(db: Session, *, zone_id: int) -> dict[str, bool]:
    deleted = ImpulseZoneRepository(db).delete_impulse_zone(zone_id)
    if not deleted:
        logger.warning("Impulse zone delete not found zone_id=%s", zone_id)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Impulse zone not found",
        )
    logger.info("Admin deleted impulse zone zone_id=%s", zone_id)
    return {"deleted": True}


def admin_create_possible_impulse_zone(
    db: Session,
    *,
    payload: ImpulseZoneCreate,
) -> PossibleImpulseZonePublic:
    try:
        zone = ImpulseZoneRepository(db).create_possible_impulse_zone(payload.name)
        logger.info("Admin created possible impulse zone_id=%s", _id_for_log(zone))
        return zone
    except IntegrityError as exc:
        logger.warning("Possible impulse create conflict name=%s", payload.name)
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Possible impulse zone already exists",
        ) from exc


def admin_list_possible_impulse_zones(db: Session) -> list[PossibleImpulseZonePublic]:
    rows = ImpulseZoneRepository(db).get_all_possible_impulse_zones()
    logger.debug("Admin listed possible impulse zones count=%s", len(rows))
    return rows


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
        logger.warning("Possible impulse update conflict zone_id=%s", zone_id)
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Possible impulse zone already exists",
        ) from exc
    if updated is None:
        logger.warning("Possible impulse zone not found zone_id=%s", zone_id)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Possible impulse zone not found",
        )
    logger.info("Admin updated possible impulse zone zone_id=%s", zone_id)
    return updated


def admin_delete_possible_impulse_zone(db: Session, *, zone_id: int) -> dict[str, bool]:
    deleted = ImpulseZoneRepository(db).delete_possible_impulse_zone(zone_id)
    if not deleted:
        logger.warning("Possible impulse delete not found zone_id=%s", zone_id)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Possible impulse zone not found",
        )
    logger.info("Admin deleted possible impulse zone zone_id=%s", zone_id)
    return {"deleted": True}


def admin_promote_possible_impulse_zone(
    db: Session,
    *,
    zone_id: int,
    payload: PromotePossibleImpulseRequest,
) -> ImpulseZonePublic:
    try:
        zone = ImpulseZoneRepository(db).promote_possible_to_impulse_zone(
            zone_id,
            payload.name,
        )
        logger.info(
            "Admin promoted possible zone_id=%s into zone_id=%s",
            zone_id,
            _id_for_log(zone),
        )
        return zone
    except ValueError as exc:
        logger.warning("Promote possible impulse not found zone_id=%s", zone_id)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc
    except IntegrityError as exc:
        logger.warning("Promote possible impulse conflict zone_id=%s", zone_id)
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
            logger.warning(
                "Goal update denied: account ownership mismatch user_id=%s account_id=%s",
                current_user.id,
                target_account_id,
            )
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
            logger.warning(
                "Goal update failed: no saving account user_id=%s", current_user.id
            )
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No saving account found for authenticated user",
            )
        target_account_id = default_saving.id

    metadata = metadata_repo.set_goal(
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
    logger.info("Updated goal metadata for user_id=%s", current_user.id)
    return metadata


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
    result = UserLimitStatusPublic(
        current_month_expenditure=total,
        impulse_limit=limit_value,
        is_passed_limit=passed,
    )
    logger.debug(
        "Computed limit status user_id=%s total=%s limit=%s passed=%s",
        current_user.id,
        total,
        limit_value,
        passed,
    )
    return result


def get_user_me_payload(db: Session, *, current_user: UserDB) -> UserMePublic:
    metadata = UserMetadataRepository(db).get_by_user_id(current_user.id)
    limit_status = get_user_limit_status(db, current_user=current_user)
    payload = UserMePublic(
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
    logger.debug("Built /auth/me payload for user_id=%s", current_user.id)
    return payload
