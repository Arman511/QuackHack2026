from typing import Any

from sqlalchemy import text
from sqlalchemy.orm import Session

from backend.models import BankAccountPublic, UserDB, UserTypeEnum, BankProviderEnum
from backend.repositories.bank_account_repository import BankAccountRepository


class UserRepository:
    """Repository for user-related SQL operations."""

    SQL_INSERT_USER = text("""
        INSERT INTO users (username, email, full_name, hashed_password, is_active, roles)
        VALUES (:username, :email, :full_name, :hashed_password, :is_active, :roles)
        RETURNING id, username, email, full_name, hashed_password, is_active, roles, created_at
        """)

    SQL_SELECT_BY_USERNAME = text("""
        SELECT id, username, email, full_name, hashed_password, is_active, roles, created_at
        FROM users
        WHERE username = :username
        """)

    SQL_SELECT_BY_ID = text("""
        SELECT id, username, email, full_name, hashed_password, is_active, roles, created_at
        FROM users
        WHERE id = :user_id
        """)

    SQL_SELECT_ALL_USERNAMES = text("""
        SELECT username
        FROM users
        ORDER BY created_at DESC, id DESC
        LIMIT :limit OFFSET :offset
        """)

    SQL_SELECT_ALL_USERS = text("""
        SELECT id, username, email, full_name, hashed_password, is_active, roles, created_at
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
        roles = "ADMIN,USER" if user_type == UserTypeEnum.ADMIN else "USER"
        row = (
            self.db.execute(
                self.SQL_INSERT_USER,
                {
                    "username": username,
                    "email": email,
                    "full_name": full_name,
                    "hashed_password": hashed_password,
                    "is_active": is_active,
                    "roles": roles,
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

    def list_users(self, *, page: int = 1, page_size: int = 100) -> list[UserDB]:
        offset = (page - 1) * page_size
        rows = (
            self.db.execute(
                self.SQL_SELECT_ALL_USERS,
                {"limit": page_size, "offset": offset},
            )
            .mappings()
            .all()
        )
        return [UserDB(**row) for row in rows]

    def update_self(
        self,
        *,
        user_id: int,
        email: str | None,
        full_name: str | None,
        hashed_password: str | None,
    ) -> UserDB | None:
        fields: list[str] = []
        params: dict[str, Any] = {"user_id": user_id}

        if email is not None:
            fields.append("email = :email")
            params["email"] = email
        if full_name is not None:
            fields.append("full_name = :full_name")
            params["full_name"] = full_name
        if hashed_password is not None:
            fields.append("hashed_password = :hashed_password")
            params["hashed_password"] = hashed_password

        if not fields:
            return self.get_by_id(user_id)

        query = text(
            "UPDATE users "
            f"SET {', '.join(fields)} "
            "WHERE id = :user_id "
            "RETURNING id, username, email, full_name, hashed_password, is_active, roles, created_at"
        )
        row = self.db.execute(query, params).mappings().first()
        self.db.commit()
        return UserDB(**row) if row else None

    def admin_update_user(
        self,
        *,
        user_id: int,
        username: str | None,
        hashed_password: str | None,
        is_active: bool | None,
        roles: str | None,
    ) -> UserDB | None:
        fields: list[str] = []
        params: dict[str, Any] = {"user_id": user_id}

        if username is not None:
            fields.append("username = :username")
            params["username"] = username
        if hashed_password is not None:
            fields.append("hashed_password = :hashed_password")
            params["hashed_password"] = hashed_password
        if is_active is not None:
            fields.append("is_active = :is_active")
            params["is_active"] = is_active
        if roles is not None:
            fields.append("roles = :roles")
            params["roles"] = roles

        if not fields:
            return self.get_by_id(user_id)

        query = text(
            "UPDATE users "
            f"SET {', '.join(fields)} "
            "WHERE id = :user_id "
            "RETURNING id, username, email, full_name, hashed_password, is_active, roles, created_at"
        )
        row = self.db.execute(query, params).mappings().first()
        self.db.commit()
        return UserDB(**row) if row else None
    
    def admin_get_user_by_id(self, user_id: int) -> UserDB | None:
        """Get a user by their ID."""
        row = (
            self.db.execute(
                self.SQL_SELECT_BY_ID,
                {"user_id": user_id},
            )
            .mappings()
            .first()
        )
        return UserDB(**row) if row else None
