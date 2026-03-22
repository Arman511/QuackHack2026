import logging
import random
from datetime import datetime, timedelta, timezone
from urllib.request import urlopen

from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from backend.models import (
    AccountTypeEnum,
    AddMoneyRequest,
    BankAccountPublic,
    CreateBankAccountsRequest,
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
    TransactionPunishmentPublic,
    TransactionPublic,
    UserDB,
    UserGoalSetRequest,
    UserImpulsesBundlePublic,
    UserLimitStatusPublic,
    UserMePublic,
    UserMetadataPublic,
    SetupBankAccountsRequest,
    TransferBetweenAccountsRequest,
    TransferBetweenAccountsResponse,
    PaginatedTransactionSearchResponse,
    TransactionSearchItemPublic,
    UserTypeEnum,
)
from backend.repositories.bank_account_repository import BankAccountRepository
from backend.repositories.impulse_zone_repository import ImpulseZoneRepository
from backend.repositories.transaction_repository import TransactionRepository
from backend.repositories.transaction_punishment_repository import (
    TransactionPunishmentRepository,
)
from backend.repositories.user_metadata_repository import UserMetadataRepository
from backend.utils.config import (
    MACRODROID_OVERSPEND_TRIGGER_SLUGS,
    MACRODROID_TRIGGER_BASE_URL,
)

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
    if source_account.amount - payload.amount < 0:
        logger.warning(
            "Webhook transaction denied due to insufficient funds account_id=%s current_amount=%s transaction_amount=%s",
            source_account.id,
            source_account.amount,
            payload.amount,
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Insufficient funds in the source account for this transaction",
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

    # Deduct transaction amount from source account
    new_source_balance = source_account.amount - payload.amount
    account_repo.update_amount(source_account.id, new_source_balance)
    logger.info(
        "Deducted transaction amount from source account account_id=%s new_balance=%s",
        source_account.id,
        new_source_balance,
    )

    # If user has money remaining, calculate and deduct tax (based on transaction amount) to goal savings account
    if new_source_balance > 0:
        metadata = UserMetadataRepository(db).get_by_user_id(current_user.id)
        if metadata and metadata.tax_percentage and metadata.bank_account_id:
            # Tax is calculated as percentage of transaction amount
            tax_to_collect = int((payload.amount * metadata.tax_percentage) / 100)
            # But take only what's available in the remaining balance
            tax_amount = min(tax_to_collect, new_source_balance)
            if tax_amount > 0:
                # Deduct tax from source account
                tax_deducted_balance = new_source_balance - tax_amount
                account_repo.update_amount(source_account.id, tax_deducted_balance)
                logger.info(
                    "Deducted tax from source account account_id=%s tax_amount=%s new_balance=%s",
                    source_account.id,
                    tax_amount,
                    tax_deducted_balance,
                )

                # Add tax to goal savings account
                goal_account = account_repo.get_by_id(metadata.bank_account_id)
                if goal_account:
                    new_goal_balance = goal_account.amount + tax_amount
                    account_repo.update_amount(goal_account.id, new_goal_balance)
                    logger.info(
                        "Added tax to goal savings account account_id=%s tax_amount=%s new_balance=%s",
                        goal_account.id,
                        tax_amount,
                        new_goal_balance,
                    )
                TransactionPunishmentRepository(db).create_tax_collection(
                    user_id=current_user.id,
                    tax_amount=tax_amount,
                    timestamp=payload.timestamp,
                )
                logger.info(
                    "Recorded transaction punishment user_id=%s tax_amount=%s",
                    current_user.id,
                    tax_amount,
                )

    _maybe_trigger_over_budget_macro(
        db,
        user_id=current_user.id,
        transaction_amount=payload.amount,
        transaction_timestamp=payload.timestamp,
    )
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

    if source_account.amount - payload.amount < 0:
        logger.warning(
            "Webhook transaction denied due to insufficient funds account_id=%s current_amount=%s transaction_amount=%s",
            source_account.id,
            source_account.amount,
            payload.amount,
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Insufficient funds in the source account for this transaction",
        )

    # Use a savepoint to ensure all multi-insert operations are atomic
    savepoint = db.begin_nested()
    try:
        transaction = TransactionRepository(db).create_transaction(
            user_id=source_account.user_id,
            source_account_id=source_account.id,
            amount=payload.amount,
            timestamp=payload.timestamp,
            merchant=payload.merchant,
            impulse_zone_id=payload.impulse_zone_id,
            possible_impulse_zone_id=payload.possible_impulse_zone_id,
            commit=False,
        )
        logger.info(
            "Webhook transaction created transaction_id=%s",
            _id_for_log(transaction),
        )

        # Deduct transaction amount from source account
        new_source_balance = source_account.amount - payload.amount
        account_repo.update_amount(source_account.id, new_source_balance, commit=False)
        logger.info(
            "Deducted transaction amount from source account account_id=%s new_balance=%s",
            source_account.id,
            new_source_balance,
        )

        # If user has money remaining, calculate and deduct tax (based on transaction amount) to goal savings account
        if new_source_balance > 0:
            metadata = UserMetadataRepository(db).get_by_user_id(source_account.user_id)
            if metadata and metadata.tax_percentage and metadata.bank_account_id:
                # Tax is calculated as percentage of transaction amount
                tax_to_collect = int((payload.amount * metadata.tax_percentage) / 100)
                # But take only what's available in the remaining balance
                tax_amount = min(tax_to_collect, new_source_balance)
                if tax_amount > 0:
                    # Deduct tax from source account
                    tax_deducted_balance = new_source_balance - tax_amount
                    account_repo.update_amount(
                        source_account.id, tax_deducted_balance, commit=False
                    )
                    logger.info(
                        "Deducted tax from source account account_id=%s tax_amount=%s new_balance=%s",
                        source_account.id,
                        tax_amount,
                        tax_deducted_balance,
                    )

                    # Add tax to goal savings account
                    goal_account = account_repo.get_by_id(metadata.bank_account_id)
                    if goal_account:
                        new_goal_balance = goal_account.amount + tax_amount
                        account_repo.update_amount(
                            goal_account.id, new_goal_balance, commit=False
                        )
                        logger.info(
                            "Added tax to goal savings account account_id=%s tax_amount=%s new_balance=%s",
                            goal_account.id,
                            tax_amount,
                            new_goal_balance,
                        )
                    TransactionPunishmentRepository(db).create_tax_collection(
                        user_id=source_account.user_id,
                        tax_amount=tax_amount,
                        timestamp=payload.timestamp,
                        commit=False,
                    )
                    logger.info(
                        "Recorded webhook transaction punishment user_id=%s tax_amount=%s",
                        source_account.user_id,
                        tax_amount,
                    )

        savepoint.commit()
    except Exception as e:
        savepoint.rollback()
        logger.error(
            "Webhook transaction failed and rolled back actor_user_id=%s error=%s",
            current_user.id,
            str(e),
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Transaction processing failed and was rolled back",
        ) from e

    # Commit the outer transaction
    db.commit()

    _maybe_trigger_over_budget_macro(
        db,
        user_id=source_account.user_id,
        transaction_amount=payload.amount,
        transaction_timestamp=payload.timestamp,
    )
    return transaction


def add_money_to_account(
    db: Session,
    *,
    current_user: UserDB,
    payload: AddMoneyRequest,
) -> BankAccountPublic:
    logger.info(
        "Adding money for actor_user_id=%s account_number=%s amount=%s",
        current_user.id,
        payload.account_number,
        payload.amount,
    )
    account_repo = BankAccountRepository(db)
    target_account = account_repo.get_by_account_number_and_sort_code(
        account_number=payload.account_number,
        sort_code=payload.sort_code,
    )

    if target_account is None:
        logger.warning(
            "Add money failed account lookup miss account_number=%s",
            payload.account_number,
        )
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bank account not found for provided account number and sort code",
        )

    is_admin = UserTypeEnum.ADMIN in current_user.roles
    if target_account.user_id != current_user.id and not is_admin:
        logger.warning(
            "Add money denied actor_user_id=%s owner_user_id=%s",
            current_user.id,
            target_account.user_id,
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bank account does not belong to the authenticated user",
        )

    updated = account_repo.update_amount(
        target_account.id,
        target_account.amount + payload.amount,
    )
    logger.info(
        "Add money succeeded account_id=%s user_id=%s new_amount=%s",
        updated.id,
        updated.user_id,
        updated.amount,
    )
    return updated


def transfer_between_my_accounts(
    db: Session,
    *,
    current_user: UserDB,
    payload: TransferBetweenAccountsRequest,
) -> TransferBetweenAccountsResponse:
    logger.info(
        "Transfer requested user_id=%s source_account_id=%s destination_account_id=%s amount=%s",
        current_user.id,
        payload.source_account_id,
        payload.destination_account_id,
        payload.amount,
    )
    if payload.source_account_id == payload.destination_account_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Source and destination accounts must be different",
        )

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

    destination_account = account_repo.get_by_id_and_user_id(
        account_id=payload.destination_account_id,
        user_id=current_user.id,
    )
    if destination_account is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Destination account does not belong to the authenticated user",
        )

    if source_account.amount < payload.amount:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Insufficient funds in source account",
        )

    try:
        updated_source, updated_destination = account_repo.transfer_between_accounts(
            source_account_id=payload.source_account_id,
            destination_account_id=payload.destination_account_id,
            amount=payload.amount,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    logger.info(
        "Transfer completed user_id=%s source_new_amount=%s destination_new_amount=%s",
        current_user.id,
        updated_source.amount,
        updated_destination.amount,
    )
    return TransferBetweenAccountsResponse(
        source_account=updated_source,
        destination_account=updated_destination,
        transferred_amount=payload.amount,
    )


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


def list_user_transaction_punishments(
    db: Session,
    *,
    current_user: UserDB,
) -> list[TransactionPunishmentPublic]:
    rows = TransactionPunishmentRepository(db).list_by_user_id(current_user.id)
    logger.debug(
        "Fetched %s transaction punishments for user_id=%s",
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
    items, total = TransactionRepository(
        db
    ).get_by_user_id_and_date_range_search_paginated(
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
    payload: CreateBankAccountsRequest,
) -> BankAccountPublic:
    logger.info(
        "Creating single bank account for user_id=%s provider=%s type=%s",
        current_user.id,
        payload.provider.value,
        payload.type.value,
    )
    account_repo = BankAccountRepository(db)

    account_name_suffix = (
        "Current Account"
        if payload.type == AccountTypeEnum.CURRENT
        else "Saving Account"
    )
    try:
        created_account = account_repo.create_account(
            user_id=current_user.id,
            account_number=payload.account_number,
            sort_code=payload.sort_code,
            name=f"{payload.provider.value} {account_name_suffix}",
            provider=payload.provider,
            account_type=payload.type,
            initial_amount=payload.amount,
        )
    except IntegrityError as exc:
        logger.warning(
            "Create account duplicate conflict user_id=%s account_number=%s sort_code=%s",
            current_user.id,
            payload.account_number,
            payload.sort_code,
        )
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Bank account with this account number and sort code already exists",
        ) from exc

    logger.info(
        "Bank account created account_id=%s user_id=%s type=%s",
        _id_for_log(created_account),
        current_user.id,
        payload.type.value,
    )
    return BankAccountPublic.model_validate(created_account)


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


def delete_user_possible_impulse_zone(
    db: Session,
    *,
    current_user: UserDB,
    zone_id: int,
) -> dict[str, bool]:
    repo = ImpulseZoneRepository(db)
    zone = repo.get_possible_impulse_zone_by_id(zone_id)
    if zone is None:
        logger.warning(
            "User possible impulse delete not found user_id=%s zone_id=%s",
            current_user.id,
            zone_id,
        )
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Possible impulse zone not found",
        )

    if zone.user_id != current_user.id:
        logger.warning(
            "User possible impulse delete denied user_id=%s zone_id=%s owner_id=%s",
            current_user.id,
            zone_id,
            zone.user_id,
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Possible impulse zone does not belong to the authenticated user",
        )

    deleted = repo.delete_possible_impulse_zone(zone_id)
    if not deleted:
        logger.warning(
            "User possible impulse delete failed user_id=%s zone_id=%s",
            current_user.id,
            zone_id,
        )
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Possible impulse zone not found",
        )

    logger.info(
        "User deleted possible impulse user_id=%s zone_id=%s",
        current_user.id,
        zone_id,
    )
    return {"deleted": True}


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


def _macrodroid_trigger_slugs() -> list[str]:
    if not MACRODROID_OVERSPEND_TRIGGER_SLUGS:
        return []
    return [
        slug.strip().strip("/")
        for slug in MACRODROID_OVERSPEND_TRIGGER_SLUGS.split(",")
        if slug.strip().strip("/")
    ]


def _pick_macrodroid_trigger_slug() -> str:
    slugs = _macrodroid_trigger_slugs()
    if not slugs:
        raise ValueError("MacroDroid trigger URL is not configured")
    return random.choice(slugs)


def _build_macrodroid_trigger_url(slug: str) -> str:
    base = MACRODROID_TRIGGER_BASE_URL.rstrip("/")
    slug = slug.strip("/")
    if not base or not slug:
        raise ValueError("MacroDroid trigger URL is not configured")
    return f"{base}/{slug}"


def _trigger_over_budget_macro(url: str) -> None:
    logger.info("Triggering MacroDroid over-budget url=%s", url)
    with urlopen(url, timeout=5) as response:
        logger.info(
            "MacroDroid over-budget trigger response status=%s",
            response.getcode(),
        )


def _maybe_trigger_over_budget_macro(
    db: Session,
    *,
    user_id: int,
    transaction_amount: int,
    transaction_timestamp: datetime,
) -> None:
    metadata = UserMetadataRepository(db).get_by_user_id(user_id)
    limit_value = metadata.impulse_limit if metadata else None
    if limit_value is None:
        return

    now = datetime.now(timezone.utc)
    start, end = _month_window(now)
    if transaction_timestamp < start or transaction_timestamp > end:
        return

    total = TransactionRepository(db).get_user_total_by_date_range(
        user_id=user_id,
        start=start,
        end=end,
    )

    previous_total = total - transaction_amount
    if previous_total <= limit_value < total:
        slug = _pick_macrodroid_trigger_slug()
        url = _build_macrodroid_trigger_url(slug)
        _trigger_over_budget_macro(url)


def get_user_limit_status(
    db: Session, *, current_user: UserDB
) -> UserLimitStatusPublic:
    now = datetime.now(timezone.utc)
    start, end = _month_window(now)

    txn_repo = TransactionRepository(db)
    metadata = UserMetadataRepository(db).get_by_user_id(current_user.id)
    total = txn_repo.get_user_total_by_date_range(
        user_id=current_user.id,
        start=start,
        end=end,
    )

    limit_value = metadata.impulse_limit if metadata else None
    passed = bool(limit_value is not None and total > limit_value * 100)
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
