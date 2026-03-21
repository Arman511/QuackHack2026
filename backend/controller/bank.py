from fastapi import APIRouter, Query

from backend.models import (
    BankAccountPublic,
    CreateBankAccountsRequest,
    CreateBankAccountsResponse,
    SetupBankAccountsRequest,
    TransactionDateRangeQuery,
    TransactionCreate,
    TransactionWebhookCreate,
    TransactionHydratedPublic,
    TransactionPublic,
)
from backend.services.bank_service import (
    admin_transaction_summary,
    create_bank_accounts_for_user,
    create_webhook_transaction,
    create_user_transaction,
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

@router.post("/accounts/setup", response_model=CreateBankAccountsResponse)
def setup_bank_accounts(
    payload: SetupBankAccountsRequest,
    db: db_dependency,
    current_user: current_user_dependency,
):
    """Set up one current and one saving account for the authenticated user."""
    return setup_bank_accounts_for_user(
        db,
        current_user=current_user,
        payload=payload,
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
