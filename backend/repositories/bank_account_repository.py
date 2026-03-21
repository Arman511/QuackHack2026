import random
import string
import uuid

from sqlalchemy import text
from sqlalchemy.orm import Session

from backend.models import (
    BankAccountPublic,
    BankProviderEnum,
    AccountTypeEnum,
)


class BankAccountRepository:
    """Repository for bank account operations."""

    SQL_CREATE_BANK_ACCOUNT = text("""
        INSERT INTO bank_accounts (user_id, bank_account_id, account_number, sort_code, name, provider, type, amount)
        VALUES (:user_id, :bank_account_id, :account_number, :sort_code, :name, :provider, :type, :amount)
        RETURNING id, user_id, bank_account_id, account_number, sort_code, name, provider, type, amount, created_at, updated_at
        """)

    SQL_SELECT_BY_USER_ID = text("""
        SELECT id, user_id, bank_account_id, account_number, sort_code, name, provider, type, amount, created_at, updated_at
        FROM bank_accounts
        WHERE user_id = :user_id
        ORDER BY created_at DESC
        """)

    SQL_SELECT_BY_ID = text("""
        SELECT id, user_id, bank_account_id, account_number, sort_code, name, provider, type, amount, created_at, updated_at
        FROM bank_accounts
        WHERE id = :account_id
        """)

    SQL_SELECT_BY_ID_AND_USER_ID = text("""
        SELECT id, user_id, bank_account_id, account_number, sort_code, name, provider, type, amount, created_at, updated_at
        FROM bank_accounts
        WHERE id = :account_id AND user_id = :user_id
        """)

    SQL_UPDATE_AMOUNT = text("""
        UPDATE bank_accounts
        SET amount = :amount, updated_at = CURRENT_TIMESTAMP
        WHERE id = :account_id
        RETURNING id, user_id, bank_account_id, account_number, sort_code, name, provider, type, amount, created_at, updated_at
        """)

    SQL_SELECT_BY_ACCOUNT_NUMBER_AND_SORT_CODE = text("""
        SELECT id, user_id, bank_account_id, account_number, sort_code, name, provider, type, amount, created_at, updated_at
        FROM bank_accounts
        WHERE account_number = :account_number AND sort_code = :sort_code
        """)

    def __init__(self, db: Session):
        self.db = db

    def create_account(
        self,
        *,
        user_id: int,
        account_number: str,
        sort_code: str,
        name: str,
        provider: BankProviderEnum,
        account_type: AccountTypeEnum,
        initial_amount: int = 0,
    ) -> BankAccountPublic:
        """Create a new bank account for a user."""
        row = (
            self.db.execute(
                self.SQL_CREATE_BANK_ACCOUNT,
                {
                    "user_id": user_id,
                    "bank_account_id": str(uuid.uuid4()),
                    "account_number": account_number,
                    "sort_code": sort_code,
                    "name": name,
                    "provider": provider.value,
                    "type": account_type.value,
                    "amount": initial_amount,
                },
            )
            .mappings()
            .first()
        )
        self.db.commit()
        if row is None:
            raise RuntimeError("Failed to create bank account")
        return BankAccountPublic(**row)

    def create_default_accounts_for_user(
        self,
        user_id: int,
        provider: BankProviderEnum,
    ) -> tuple[BankAccountPublic, BankAccountPublic]:
        """
        Automatically create CURRENT and SAVING accounts for a new user.
        Both accounts share the same bank provider.
        """
        current_account = self.create_account(
            user_id=user_id,
            account_number=self._generate_account_number(),
            sort_code=self._generate_sort_code(),
            name=f"{provider.value} Current Account",
            provider=provider,
            account_type=AccountTypeEnum.CURRENT,
            initial_amount=500,
        )

        saving_account = self.create_account(
            user_id=user_id,
            account_number=self._generate_account_number(),
            sort_code=self._generate_sort_code(),
            name=f"{provider.value} Saving Account",
            provider=provider,
            account_type=AccountTypeEnum.SAVING,
            initial_amount=100,
        )

        return current_account, saving_account

    @staticmethod
    def _generate_account_number() -> str:
        """Generate a random account number (digit string)."""
        return "".join(random.choices(string.digits, k=8))

    @staticmethod
    def _generate_sort_code() -> str:
        """Generate a random 6-digit sort code."""
        return "".join(random.choices(string.digits, k=6))

    def get_by_id(self, account_id: int) -> BankAccountPublic | None:
        """Get a bank account by ID."""
        row = (
            self.db.execute(
                self.SQL_SELECT_BY_ID,
                {"account_id": account_id},
            )
            .mappings()
            .first()
        )
        return BankAccountPublic(**row) if row else None

    def get_by_user_id(self, user_id: int) -> list[BankAccountPublic]:
        """Get all bank accounts for a user."""
        rows = (
            self.db.execute(
                self.SQL_SELECT_BY_USER_ID,
                {"user_id": user_id},
            )
            .mappings()
            .all()
        )
        return [BankAccountPublic(**row) for row in rows]

    def get_by_id_and_user_id(
        self, *, account_id: int, user_id: int
    ) -> BankAccountPublic | None:
        """Get a bank account by ID and owner ID."""
        row = (
            self.db.execute(
                self.SQL_SELECT_BY_ID_AND_USER_ID,
                {"account_id": account_id, "user_id": user_id},
            )
            .mappings()
            .first()
        )
        return BankAccountPublic(**row) if row else None

    def get_by_account_number_and_sort_code(
        self, account_number: str, sort_code: str
    ) -> BankAccountPublic | None:
        """Get a bank account by account number and sort code."""
        row = (
            self.db.execute(
                self.SQL_SELECT_BY_ACCOUNT_NUMBER_AND_SORT_CODE,
                {"account_number": account_number, "sort_code": sort_code},
            )
            .mappings()
            .first()
        )
        return BankAccountPublic(**row) if row else None

    def update_amount(self, account_id: int, new_amount: int) -> BankAccountPublic:
        """Update the balance of a bank account."""
        row = (
            self.db.execute(
                self.SQL_UPDATE_AMOUNT,
                {"account_id": account_id, "amount": new_amount},
            )
            .mappings()
            .first()
        )
        self.db.commit()
        if row is None:
            raise RuntimeError("Failed to update account amount")
        return BankAccountPublic(**row)
