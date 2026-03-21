from sqlalchemy import text
from sqlalchemy.orm import Session

from backend.models import BankAccountPublic, UserDB, UserTypeEnum, BankProviderEnum
from backend.repositories.bank_account_repository import BankAccountRepository


class UserRepository:
    """Repository for user-related SQL operations."""

    SQL_INSERT_USER = text("""
        INSERT INTO users (username, email, full_name, hashed_password, is_active, type)
        VALUES (:username, :email, :full_name, :hashed_password, :is_active, :type)
        RETURNING id, username, email, full_name, hashed_password, is_active, type, created_at
        """)

    SQL_SELECT_BY_USERNAME = text("""
        SELECT id, username, email, full_name, hashed_password, is_active, type, created_at
        FROM users
        WHERE username = :username
        """)

    SQL_SELECT_BY_ID = text("""
        SELECT id, username, email, full_name, hashed_password, is_active, type, created_at
        FROM users
        WHERE id = :user_id
        """)

    SQL_SELECT_ALL_USERNAMES = text("""
        SELECT username
        FROM users
        ORDER BY created_at DESC, id DESC
        LIMIT :limit OFFSET :offset
        """)

    def __init__(self, db: Session):
        self.db = db

    def get_by_username(self, username: str) -> UserDB | None:
        row = (
            self.db.execute(self.SQL_SELECT_BY_USERNAME, {"username": username})
            .mappings()
            .first()
        )
        return UserDB(**row) if row else None

    def get_by_id(self, user_id: int) -> UserDB | None:
        row = (
            self.db.execute(self.SQL_SELECT_BY_ID, {"user_id": user_id})
            .mappings()
            .first()
        )
        return UserDB(**row) if row else None

    def create_user(
        self,
        *,
        username: str,
        email: str | None,
        full_name: str | None,
        hashed_password: str,
        is_active: bool = True,
        user_type: UserTypeEnum = UserTypeEnum.USER,
    ) -> UserDB:
        """Create a new user."""
        row = (
            self.db.execute(
                self.SQL_INSERT_USER,
                {
                    "username": username,
                    "email": email,
                    "full_name": full_name,
                    "hashed_password": hashed_password,
                    "is_active": is_active,
                    "type": user_type.value,
                },
            )
            .mappings()
            .first()
        )
        self.db.commit()
        if row is None:
            raise RuntimeError("Failed to create user")
        return UserDB(**row)

    def create_user_with_default_accounts(
        self,
        *,
        username: str,
        email: str | None,
        full_name: str | None,
        hashed_password: str,
        is_active: bool = True,
        user_type: UserTypeEnum = UserTypeEnum.USER,
        bank_provider: BankProviderEnum = BankProviderEnum.REVOLITE,
    ) -> tuple[UserDB, BankAccountPublic, BankAccountPublic]:
        """
        Create a new user and automatically create their default bank accounts.

        Returns:
            Tuple of (UserDB, current_account, saving_account)
        """
        # Create the user first
        user = self.create_user(
            username=username,
            email=email,
            full_name=full_name,
            hashed_password=hashed_password,
            is_active=is_active,
            user_type=user_type,
        )

        # Create default bank accounts (CURRENT and SAVING)
        bank_repo = BankAccountRepository(self.db)
        current_account, saving_account = bank_repo.create_default_accounts_for_user(
            user_id=user.id,
            provider=bank_provider,
        )

        return user, current_account, saving_account

    def list_usernames(self, *, page: int = 1, page_size: int = 100) -> list[str]:
        offset = (page - 1) * page_size
        rows = (
            self.db.execute(
                self.SQL_SELECT_ALL_USERNAMES,
                {"limit": page_size, "offset": offset},
            )
            .mappings()
            .all()
        )
        return [str(row["username"]) for row in rows]
