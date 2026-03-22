import random
import string
import uuid
import logging

from sqlalchemy import text
from sqlalchemy.orm import Session

from backend.models import (
    BankAccountPublic,
    BankProviderEnum,
    AccountTypeEnum,
)

logger = logging.getLogger(__name__)


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

    SQL_SELECT_FIRST_BY_USER_ID_AND_TYPE = text("""
        SELECT id, user_id, bank_account_id, account_number, sort_code, name, provider, type, amount, created_at, updated_at
        FROM bank_accounts
        WHERE user_id = :user_id AND type = :type
        ORDER BY created_at ASC
        LIMIT 1
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

    SQL_DEBIT_ACCOUNT = text("""
        UPDATE bank_accounts
        SET amount = amount - :amount, updated_at = CURRENT_TIMESTAMP
        WHERE id = :account_id AND amount >= :amount
        RETURNING id, user_id, bank_account_id, account_number, sort_code, name, provider, type, amount, created_at, updated_at
        """)

    SQL_CREDIT_ACCOUNT = text("""
        UPDATE bank_accounts
        SET amount = amount + :amount, updated_at = CURRENT_TIMESTAMP
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
        commit: bool = True,
    ) -> BankAccountPublic:
        """Create a new bank account for a user."""
        logger.info(
            "Creating bank account user_id=%s provider=%s type=%s",
            user_id,
            provider.value,
            account_type.value,
        )
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
        if commit:
            self.db.commit()
        if row is None:
            logger.error("Bank account create failed user_id=%s", user_id)
            raise RuntimeError("Failed to create bank account")
        account = BankAccountPublic(**row)
        logger.info(
            "Bank account created account_id=%s user_id=%s", account.id, user_id
        )
        return account

    def create_default_accounts_for_user(
        self,
        user_id: int,
        provider: BankProviderEnum,
    ) -> tuple[BankAccountPublic, BankAccountPublic]:
        """
        Automatically create CURRENT and SAVING accounts for a new user.
        Both accounts share the same bank provider.
        """
        logger.info("Creating default accounts for user_id=%s", user_id)
        sort_code = self._generate_sort_code()
        current_account = self.create_account(
            user_id=user_id,
            account_number=self._generate_account_number(),
            sort_code=sort_code,
            name=f"{provider.value} Current Account",
            provider=provider,
            account_type=AccountTypeEnum.CURRENT,
            initial_amount=500,
        )

        saving_account = self.create_account(
            user_id=user_id,
            account_number=self._generate_account_number(),
            sort_code=sort_code,
            name=f"{provider.value} Saving Account",
            provider=provider,
            account_type=AccountTypeEnum.SAVING,
            initial_amount=100,
        )

        return current_account, saving_account

    def create_accounts_for_user(
        self,
        *,
        user_id: int,
        provider: BankProviderEnum,
        current_account_number: str,
        current_sort_code: str,
        saving_account_number: str,
        saving_sort_code: str,
    ) -> tuple[BankAccountPublic, BankAccountPublic]:
        """Create CURRENT and SAVING accounts for a user using explicit details.

        Both accounts are created in a single transaction. If the saving account
        creation fails, the current account creation is rolled back.
        """
        logger.info("Creating explicit accounts for user_id=%s", user_id)
        current_initial_amount = 100000
        saving_initial_amount = 0

        try:
            current_account = self.create_account(
                user_id=user_id,
                account_number=current_account_number,
                sort_code=current_sort_code,
                name=f"{provider.value} Current Account",
                provider=provider,
                account_type=AccountTypeEnum.CURRENT,
                initial_amount=current_initial_amount,
                commit=False,
            )
            saving_account = self.create_account(
                user_id=user_id,
                account_number=saving_account_number,
                sort_code=saving_sort_code,
                name=f"{provider.value} Saving Account",
                provider=provider,
                account_type=AccountTypeEnum.SAVING,
                initial_amount=saving_initial_amount,
                commit=False,
            )
            self.db.commit()
        except Exception as e:
            logger.error(
                "Failed to create accounts for user_id=%s: %s", user_id, str(e)
            )
            self.db.rollback()
            raise

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
        if row is None:
            logger.debug("Bank account not found account_id=%s", account_id)
            return None
        return BankAccountPublic(**row)

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
        accounts = [BankAccountPublic(**row) for row in rows]
        logger.debug("Fetched %s bank accounts for user_id=%s", len(accounts), user_id)
        return accounts

    def get_first_by_user_id_and_type(
        self,
        *,
        user_id: int,
        account_type: AccountTypeEnum,
    ) -> BankAccountPublic | None:
        """Get the earliest created account for a user by account type."""
        row = (
            self.db.execute(
                self.SQL_SELECT_FIRST_BY_USER_ID_AND_TYPE,
                {
                    "user_id": user_id,
                    "type": account_type.value,
                },
            )
            .mappings()
            .first()
        )
        if row is None:
            logger.debug(
                "No bank account found user_id=%s type=%s", user_id, account_type.value
            )
            return None
        return BankAccountPublic(**row)

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
        if row is None:
            logger.debug(
                "Bank account not found for ownership account_id=%s user_id=%s",
                account_id,
                user_id,
            )
            return None
        return BankAccountPublic(**row)

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
        if row is None:
            logger.debug("Bank account lookup miss account_number=%s", account_number)
            return None
        return BankAccountPublic(**row)

    def update_amount(
        self, account_id: int, new_amount: int, commit: bool = True
    ) -> BankAccountPublic:
        """Update the balance of a bank account."""
        logger.info(
            "Updating bank account amount account_id=%s amount=%s",
            account_id,
            new_amount,
        )
        row = (
            self.db.execute(
                self.SQL_UPDATE_AMOUNT,
                {"account_id": account_id, "amount": new_amount},
            )
            .mappings()
            .first()
        )
        if commit:
            self.db.commit()
        if row is None:
            logger.error("Bank account amount update failed account_id=%s", account_id)
            raise RuntimeError("Failed to update account amount")
        account = BankAccountPublic(**row)
        logger.debug("Updated bank account amount account_id=%s", account.id)
        return account

    def transfer_between_accounts(
        self,
        *,
        source_account_id: int,
        destination_account_id: int,
        amount: int,
    ) -> tuple[BankAccountPublic, BankAccountPublic]:
        """Transfer funds atomically between two accounts."""
        logger.info(
            "Transferring funds source_account_id=%s destination_account_id=%s amount=%s",
            source_account_id,
            destination_account_id,
            amount,
        )
        if source_account_id == destination_account_id:
            raise ValueError("Source and destination accounts must be different")

        try:
            source_row = (
                self.db.execute(
                    self.SQL_DEBIT_ACCOUNT,
                    {"account_id": source_account_id, "amount": amount},
                )
                .mappings()
                .first()
            )
            if source_row is None:
                self.db.rollback()
                raise ValueError("Insufficient funds in source account")

            destination_row = (
                self.db.execute(
                    self.SQL_CREDIT_ACCOUNT,
                    {"account_id": destination_account_id, "amount": amount},
                )
                .mappings()
                .first()
            )
            if destination_row is None:
                self.db.rollback()
                raise RuntimeError("Destination account was not found")

            self.db.commit()
            return BankAccountPublic(**source_row), BankAccountPublic(**destination_row)
        except Exception:
            self.db.rollback()
            raise
