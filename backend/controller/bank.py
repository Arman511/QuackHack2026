from datetime import datetime
import logging

from fastapi import APIRouter, Query

from backend.models import (
    AddMoneyRequest,
    BankAccountPublic,
    CreateBankAccountsRequest,
    CreateBankAccountsResponse,
    SetupBankAccountsRequest,
    PaginatedTransactionSearchResponse,
    TransactionDateRangeQuery,
    TransactionCreate,
    TransactionWebhookCreate,
    TransactionHydratedPublic,
    TransactionPublic,
)
from backend.services.bank_service import (
    add_money_to_account,
    admin_search_transactions_by_date,
    admin_transaction_summary,
    create_bank_accounts_for_user,
    create_webhook_transaction,
    create_user_transaction,
    list_user_transactions_hydrated,
    list_my_accounts,
    search_user_transactions_by_date,
    setup_bank_accounts_for_user,
)
from backend.utils.dependencies import (
    admin_user_dependency,
    current_user_dependency,
    db_dependency,
)

router = APIRouter(prefix="/bank", tags=["bank"])
logger = logging.getLogger(__name__)


@router.get("/accounts", response_model=list[BankAccountPublic])
def list_accounts(
    db: db_dependency,
    current_user: current_user_dependency,
):
    """List the authenticated user's linked bank accounts."""
    logger.debug("Listing bank accounts for user_id=%s", current_user.id)
    return list_my_accounts(db, current_user=current_user)


@router.post("/transactions", response_model=TransactionPublic)
def create_transaction(
    payload: TransactionCreate,
    db: db_dependency,
    current_user: current_user_dependency,
):
    """Create a transaction for the authenticated user."""
    logger.info(
        "Creating user transaction user_id=%s source_account_id=%s",
        current_user.id,
        payload.source_account_id,
    )
    return create_user_transaction(db, current_user=current_user, payload=payload)


@router.post("/transactions/webhook", response_model=TransactionPublic)
def create_transaction_from_webhook(
    payload: TransactionWebhookCreate,
    db: db_dependency,
    current_user: current_user_dependency,
):
    """Create a transaction from an external webhook using account number and sort code."""
    logger.info(
        "Creating webhook transaction user_id=%s account_number=%s",
        current_user.id,
        payload.account_number,
    )
    return create_webhook_transaction(db, payload=payload, current_user=current_user)


@router.get("/transactions/me", response_model=list[TransactionHydratedPublic])
def list_my_transactions(
    db: db_dependency,
    current_user: current_user_dependency,
):
    """List the authenticated user's transactions with impulse labels."""
    logger.debug("Listing hydrated transactions for user_id=%s", current_user.id)
    return list_user_transactions_hydrated(db, current_user=current_user)


@router.get("/transactions/search", response_model=PaginatedTransactionSearchResponse)
def search_my_transactions(
    start: datetime,
    end: datetime,
    db: db_dependency,
    current_user: current_user_dependency,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=500),
):
    """Search the authenticated user's transactions by date range."""
    logger.info(
        "Searching user transactions user_id=%s start=%s end=%s",
        current_user.id,
        start,
        end,
    )
    return search_user_transactions_by_date(
        db,
        current_user=current_user,
        payload=TransactionDateRangeQuery(start=start, end=end),
        page=page,
        page_size=page_size,
    )


@router.post("/accounts/create", response_model=BankAccountPublic)
def create_bank_accounts(
    payload: CreateBankAccountsRequest,
    db: db_dependency,
    current_user: current_user_dependency,
):
    """Create one bank account for the authenticated user."""
    logger.info(
        "Creating bank account user_id=%s provider=%s type=%s",
        current_user.id,
        payload.provider.value,
        payload.type.value,
    )
    return create_bank_accounts_for_user(
        db,
        current_user=current_user,
        payload=payload,
    )


@router.post("/accounts/setup", response_model=CreateBankAccountsResponse)
def setup_bank_accounts(
    payload: SetupBankAccountsRequest,
    db: db_dependency,
    current_user: current_user_dependency,
):
    """Set up one current and one saving account for the authenticated user."""
    logger.info(
        "Setting up explicit bank accounts user_id=%s provider=%s",
        current_user.id,
        payload.provider.value,
    )
    return setup_bank_accounts_for_user(
        db,
        current_user=current_user,
        payload=payload,
    )


@router.post("/accounts/add-money", response_model=BankAccountPublic)
def add_money(
    payload: AddMoneyRequest,
    db: db_dependency,
    current_user: current_user_dependency,
):
    """Add money to a bank account identified by sort code and account number."""
    logger.info(
        "Add money request actor_user_id=%s account_number=%s amount=%s",
        current_user.id,
        payload.account_number,
        payload.amount,
    )
    return add_money_to_account(db, current_user=current_user, payload=payload)


@router.get("/admin/summary", response_model=list[TransactionPublic])
def admin_summary(
    db: db_dependency,
    _: admin_user_dependency,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=100, ge=1, le=500),
):
    """List paginated transaction summaries across all users for admins."""
    logger.info("Admin transaction summary page=%s page_size=%s", page, page_size)
    return admin_transaction_summary(db, page=page, page_size=page_size)


@router.get(
    "/admin/transactions/search",
    response_model=list[TransactionHydratedPublic],
)
def admin_search_transactions(
    start: datetime,
    end: datetime,
    db: db_dependency,
    _: admin_user_dependency,
):
    """Search all transactions by date range for admins."""
    logger.info("Admin transaction search start=%s end=%s", start, end)
    return admin_search_transactions_by_date(
        db,
        payload=TransactionDateRangeQuery(start=start, end=end),
    )
