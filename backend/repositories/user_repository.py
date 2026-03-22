from typing import Any
import logging

from sqlalchemy import text
from sqlalchemy.orm import Session

from backend.models import BankAccountPublic, UserDB, UserTypeEnum, BankProviderEnum
from backend.repositories.bank_account_repository import BankAccountRepository

logger = logging.getLogger(__name__)


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

    SQL_DELETE_USER_BY_ID = text("""
        DELETE FROM users
        WHERE id = :user_id
        RETURNING id
        """)

    def __init__(self, db: Session):
        self.db = db

    def get_by_username(self, username: str) -> UserDB | None:
        row = (
            self.db.execute(self.SQL_SELECT_BY_USERNAME, {"username": username})
            .mappings()
            .first()
        )
        if row is None:
            logger.debug("User not found username=%s", username)
            return None
        return UserDB(**row)

    def get_by_id(self, user_id: int) -> UserDB | None:
        row = (
            self.db.execute(self.SQL_SELECT_BY_ID, {"user_id": user_id})
            .mappings()
            .first()
        )
        if row is None:
            logger.debug("User not found user_id=%s", user_id)
            return None
        return UserDB(**row)

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
        logger.info("Creating user username=%s user_type=%s", username, user_type.value)
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
            logger.error("User create failed username=%s", username)
            raise RuntimeError("Failed to create user")
        user = UserDB(**row)
        logger.info("User created user_id=%s username=%s", user.id, user.username)
        return user

    def create_user_with_default_accounts(
        self,
        *,
        username: str,
        email: str | None,
        full_name: str | None,
        hashed_password: str,
        is_active: bool = True,
        user_type: UserTypeEnum = UserTypeEnum.USER,
        bank_provider: BankProviderEnum,
    ) -> tuple[UserDB, BankAccountPublic, BankAccountPublic]:
        """
        Create a new user and automatically create their default bank accounts.

        Returns:
            Tuple of (UserDB, current_account, saving_account)
        """
        # Create the user first
        logger.info("Creating user with default accounts username=%s", username)
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

        logger.info(
            "Created default accounts for new user user_id=%s current_id=%s saving_id=%s",
            user.id,
            current_account.id,
            saving_account.id,
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
        usernames = [str(row["username"]) for row in rows]
        logger.debug(
            "Listed usernames page=%s page_size=%s count=%s",
            page,
            page_size,
            len(usernames),
        )
        return usernames

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
        users = [UserDB(**row) for row in rows]
        logger.debug(
            "Listed users page=%s page_size=%s count=%s", page, page_size, len(users)
        )
        return users

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
            logger.debug("No profile fields to update user_id=%s", user_id)
            return self.get_by_id(user_id)

        query = text(
            "UPDATE users "
            f"SET {', '.join(fields)} "
            "WHERE id = :user_id "
            "RETURNING id, username, email, full_name, hashed_password, is_active, roles, created_at"
        )
        row = self.db.execute(query, params).mappings().first()
        self.db.commit()
        if row is None:
            logger.warning("Self update target missing user_id=%s", user_id)
            return None
        logger.info("Updated user profile user_id=%s", user_id)
        return UserDB(**row)

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
            logger.debug("No admin patch fields provided user_id=%s", user_id)
            return self.get_by_id(user_id)

        query = text(
            "UPDATE users "
            f"SET {', '.join(fields)} "
            "WHERE id = :user_id "
            "RETURNING id, username, email, full_name, hashed_password, is_active, roles, created_at"
        )
        row = self.db.execute(query, params).mappings().first()
        self.db.commit()
        if row is None:
            logger.warning("Admin update target missing user_id=%s", user_id)
            return None
        logger.info("Admin updated user user_id=%s", user_id)
        return UserDB(**row)

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
        if row is None:
            logger.debug("Admin user lookup miss user_id=%s", user_id)
            return None
        return UserDB(**row)

    def delete_user_by_id(self, user_id: int) -> bool:
        """Delete a user by ID."""
        row = (
            self.db.execute(
                self.SQL_DELETE_USER_BY_ID,
                {"user_id": user_id},
            )
            .mappings()
            .first()
        )
        self.db.commit()
        deleted = row is not None
        if deleted:
            logger.info("Deleted user user_id=%s", user_id)
        else:
            logger.debug("Delete user miss user_id=%s", user_id)
        return deleted
