from datetime import datetime

from fastapi import APIRouter, Query

from backend.models import (
    BankAccountPublic,
    CreateBankAccountsRequest,
    CreateBankAccountsResponse,
    TransactionDateRangeQuery,
    TransactionCreate,
    TransactionWebhookCreate,
    TransactionHydratedPublic,
    TransactionPublic,
)
from backend.services.bank_service import (
    admin_search_transactions_by_date,
    admin_transaction_summary,
    create_bank_accounts_for_user,
    create_webhook_transaction,
    create_user_transaction,
    list_user_transactions_hydrated,
    list_my_accounts,
    search_user_transactions_by_date,
)
from backend.utils.dependencies import (
    admin_user_dependency,
    current_user_dependency,
    db_dependency,
)

router = APIRouter(prefix="/bank", tags=["bank"])


@router.get("/accounts", response_model=list[BankAccountPublic])
def list_accounts(
    db: db_dependency,
    current_user: current_user_dependency,
):
    """List the authenticated user's linked bank accounts."""
    return list_my_accounts(db, current_user=current_user)


@router.post("/transactions", response_model=TransactionPublic)
def create_transaction(
    payload: TransactionCreate,
    db: db_dependency,
    current_user: current_user_dependency,
):
    """Create a transaction for the authenticated user."""
    return create_user_transaction(db, current_user=current_user, payload=payload)


@router.post("/transactions/webhook", response_model=TransactionPublic)
def create_transaction_from_webhook(
    payload: TransactionWebhookCreate,
    db: db_dependency,
):
    """Create a transaction from an external webhook using account number and sort code."""
    return create_webhook_transaction(db, payload=payload)


@router.get("/transactions/me", response_model=list[TransactionHydratedPublic])
def list_my_transactions(
    db: db_dependency,
    current_user: current_user_dependency,
):
    """List the authenticated user's transactions with impulse labels."""
    return list_user_transactions_hydrated(db, current_user=current_user)


@router.get("/transactions/search", response_model=list[TransactionHydratedPublic])
def search_my_transactions(
    start: datetime,
    end: datetime,
    db: db_dependency,
    current_user: current_user_dependency,
):
    """Search the authenticated user's transactions by date range."""
    return search_user_transactions_by_date(
        db,
        current_user=current_user,
        payload=TransactionDateRangeQuery(start=start, end=end),
    )


@router.post("/accounts/create", response_model=CreateBankAccountsResponse)
def create_bank_accounts(
    payload: CreateBankAccountsRequest,
    db: db_dependency,
    current_user: current_user_dependency,
):
    """Create default current and saving accounts for the authenticated user."""
    return create_bank_accounts_for_user(
        db,
        current_user=current_user,
        provider=payload.provider,
    )


@router.get("/admin/summary", response_model=list[TransactionPublic])
def admin_summary(
    db: db_dependency,
    _: admin_user_dependency,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=100, ge=1, le=500),
):
    """List paginated transaction summaries across all users for admins."""
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
    return admin_search_transactions_by_date(
        db,
        payload=TransactionDateRangeQuery(start=start, end=end),
    )
