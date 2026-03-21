from datetime import datetime
from sqlalchemy import text
from sqlalchemy.orm import Session

from backend.models import TransactionPublic


class TransactionRepository:
    """Repository for transaction operations."""

    SQL_CREATE_TRANSACTION = text("""
        INSERT INTO transactions (user_id, source_account_id, amount, timestamp, merchant, impulse_zone_id, possible_impulse_zone_id)
        VALUES (:user_id, :source_account_id, :amount, :timestamp, :merchant, :impulse_zone_id, :possible_impulse_zone_id)
        RETURNING id, user_id, source_account_id, amount, timestamp, merchant, impulse_zone_id, possible_impulse_zone_id, created_at
        """)

    SQL_SELECT_BY_ID = text("""
        SELECT id, user_id, source_account_id, amount, timestamp, merchant, impulse_zone_id, possible_impulse_zone_id, created_at
        FROM transactions
        WHERE id = :transaction_id
        """)

    SQL_SELECT_BY_USER_ID = text("""
        SELECT id, user_id, source_account_id, amount, timestamp, merchant, impulse_zone_id, possible_impulse_zone_id, created_at
        FROM transactions
        WHERE user_id = :user_id
        ORDER BY timestamp DESC
        """)

    SQL_SELECT_BY_USER_ID_PAGINATED = text("""
        SELECT id, user_id, source_account_id, amount, timestamp, merchant, impulse_zone_id, possible_impulse_zone_id, created_at
        FROM transactions
        WHERE user_id = :user_id
        ORDER BY timestamp DESC
        LIMIT :limit OFFSET :offset
        """)

    SQL_SELECT_ALL_PAGINATED = text("""
        SELECT id, user_id, source_account_id, amount, timestamp, merchant, impulse_zone_id, possible_impulse_zone_id, created_at
        FROM transactions
        ORDER BY timestamp DESC
        LIMIT :limit OFFSET :offset
        """)

    SQL_SELECT_BY_IMPULSE_ZONE = text("""
        SELECT id, user_id, source_account_id, amount, timestamp, merchant, impulse_zone_id, possible_impulse_zone_id, created_at
        FROM transactions
        WHERE impulse_zone_id = :impulse_zone_id
        ORDER BY timestamp DESC
        """)

    SQL_SELECT_BY_POSSIBLE_IMPULSE_ZONE = text("""
        SELECT id, user_id, source_account_id, amount, timestamp, merchant, impulse_zone_id, possible_impulse_zone_id, created_at
        FROM transactions
        WHERE possible_impulse_zone_id = :possible_impulse_zone_id
        ORDER BY timestamp DESC
        """)

    def __init__(self, db: Session):
        self.db = db

    def create_transaction(
        self,
        *,
        user_id: int,
        source_account_id: int,
        amount: int,
        timestamp: datetime,
        merchant: str,
        impulse_zone_id: int | None = None,
        possible_impulse_zone_id: int | None = None,
    ) -> TransactionPublic:
        """Create a new transaction."""
        row = (
            self.db.execute(
                self.SQL_CREATE_TRANSACTION,
                {
                    "user_id": user_id,
                    "source_account_id": source_account_id,
                    "amount": amount,
                    "timestamp": timestamp,
                    "merchant": merchant,
                    "impulse_zone_id": impulse_zone_id,
                    "possible_impulse_zone_id": possible_impulse_zone_id,
                },
            )
            .mappings()
            .first()
        )
        self.db.commit()
        if row is None:
            raise RuntimeError("Failed to create transaction")
        return TransactionPublic(**row)

    def get_by_id(self, transaction_id: int) -> TransactionPublic | None:
        """Get a transaction by ID."""
        row = (
            self.db.execute(
                self.SQL_SELECT_BY_ID,
                {"transaction_id": transaction_id},
            )
            .mappings()
            .first()
        )
        return TransactionPublic(**row) if row else None

    def get_by_user_id(self, user_id: int) -> list[TransactionPublic]:
        """Get all transactions for a user."""
        rows = (
            self.db.execute(
                self.SQL_SELECT_BY_USER_ID,
                {"user_id": user_id},
            )
            .mappings()
            .all()
        )
        return [TransactionPublic(**row) for row in rows]

    def get_by_user_id_paginated(
        self, user_id: int, *, page: int = 1, page_size: int = 50
    ) -> list[TransactionPublic]:
        """Get paginated transactions for a user."""
        offset = (page - 1) * page_size
        rows = (
            self.db.execute(
                self.SQL_SELECT_BY_USER_ID_PAGINATED,
                {"user_id": user_id, "limit": page_size, "offset": offset},
            )
            .mappings()
            .all()
        )
        return [TransactionPublic(**row) for row in rows]

    def get_all_paginated(
        self, *, page: int = 1, page_size: int = 50
    ) -> list[TransactionPublic]:
        """Get paginated transactions across all users."""
        offset = (page - 1) * page_size
        rows = (
            self.db.execute(
                self.SQL_SELECT_ALL_PAGINATED,
                {"limit": page_size, "offset": offset},
            )
            .mappings()
            .all()
        )
        return [TransactionPublic(**row) for row in rows]

    def get_by_impulse_zone_id(self, impulse_zone_id: int) -> list[TransactionPublic]:
        """Get all transactions for an impulse zone."""
        rows = (
            self.db.execute(
                self.SQL_SELECT_BY_IMPULSE_ZONE,
                {"impulse_zone_id": impulse_zone_id},
            )
            .mappings()
            .all()
        )
        return [TransactionPublic(**row) for row in rows]

    def get_by_possible_impulse_zone_id(
        self, possible_impulse_zone_id: int
    ) -> list[TransactionPublic]:
        """Get all transactions for a possible impulse zone."""
        rows = (
            self.db.execute(
                self.SQL_SELECT_BY_POSSIBLE_IMPULSE_ZONE,
                {"possible_impulse_zone_id": possible_impulse_zone_id},
            )
            .mappings()
            .all()
        )
        return [TransactionPublic(**row) for row in rows]
