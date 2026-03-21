from datetime import datetime
import logging
from sqlalchemy import text
from sqlalchemy.orm import Session

from backend.models import TransactionHydratedPublic, TransactionPublic

logger = logging.getLogger(__name__)


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
        logger.info(
            "Creating transaction user_id=%s source_account_id=%s",
            user_id,
            source_account_id,
        )
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
            logger.error(
                "Transaction create failed user_id=%s source_account_id=%s",
                user_id,
                source_account_id,
            )
            raise RuntimeError("Failed to create transaction")
        transaction = TransactionPublic(**row)
        logger.info("Transaction created transaction_id=%s", transaction.id)
        return transaction

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
        if row is None:
            logger.debug("Transaction not found transaction_id=%s", transaction_id)
            return None
        return TransactionPublic(**row)

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
        txns = [TransactionPublic(**row) for row in rows]
        logger.debug("Fetched %s transactions for user_id=%s", len(txns), user_id)
        return txns

    def get_by_user_id_hydrated(self, user_id: int) -> list[TransactionHydratedPublic]:
        """Get all transactions for a user with impulse names included."""
        rows = (
            self.db.execute(
                self.SQL_SELECT_BY_USER_ID_HYDRATED,
                {"user_id": user_id},
            )
            .mappings()
            .all()
        )
        txns = [TransactionHydratedPublic(**row) for row in rows]
        logger.debug(
            "Fetched %s hydrated transactions for user_id=%s", len(txns), user_id
        )
        return txns

    def get_by_user_id_and_date_range_hydrated(
        self,
        *,
        user_id: int,
        start: datetime,
        end: datetime,
    ) -> list[TransactionHydratedPublic]:
        """Get user transactions in date range with impulse names."""
        rows = (
            self.db.execute(
                self.SQL_SELECT_BY_USER_ID_AND_DATE_RANGE_HYDRATED,
                {
                    "user_id": user_id,
                    "start_ts": start,
                    "end_ts": end,
                },
            )
            .mappings()
            .all()
        )
        txns = [TransactionHydratedPublic(**row) for row in rows]
        logger.debug(
            "Fetched %s hydrated transactions for user_id=%s in range",
            len(txns),
            user_id,
        )
        return txns

    def get_all_by_date_range_hydrated(
        self,
        *,
        start: datetime,
        end: datetime,
    ) -> list[TransactionHydratedPublic]:
        """Get all transactions in date range with impulse names."""
        rows = (
            self.db.execute(
                self.SQL_SELECT_ALL_BY_DATE_RANGE_HYDRATED,
                {
                    "start_ts": start,
                    "end_ts": end,
                },
            )
            .mappings()
            .all()
        )
        txns = [TransactionHydratedPublic(**row) for row in rows]
        logger.debug("Fetched %s hydrated transactions globally in range", len(txns))
        return txns

    def get_user_total_by_date_range(
        self,
        *,
        user_id: int,
        start: datetime,
        end: datetime,
    ) -> int:
        """Get sum of user transaction amounts within date range."""
        row = (
            self.db.execute(
                self.SQL_SUM_USER_BY_DATE_RANGE,
                {
                    "user_id": user_id,
                    "start_ts": start,
                    "end_ts": end,
                },
            )
            .mappings()
            .first()
        )
        if row is None:
            logger.debug("No transaction totals found for user_id=%s", user_id)
            return 0
        total = int(row["total"])
        logger.debug("Computed transaction total user_id=%s total=%s", user_id, total)
        return total

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
        txns = [TransactionPublic(**row) for row in rows]
        logger.debug(
            "Fetched paginated user transactions user_id=%s page=%s page_size=%s count=%s",
            user_id,
            page,
            page_size,
            len(txns),
        )
        return txns

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
        txns = [TransactionPublic(**row) for row in rows]
        logger.debug(
            "Fetched paginated transactions page=%s page_size=%s count=%s",
            page,
            page_size,
            len(txns),
        )
        return txns

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
        txns = [TransactionPublic(**row) for row in rows]
        logger.debug(
            "Fetched %s transactions for impulse_zone_id=%s",
            len(txns),
            impulse_zone_id,
        )
        return txns

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
        txns = [TransactionPublic(**row) for row in rows]
        logger.debug(
            "Fetched %s transactions for possible_impulse_zone_id=%s",
            len(txns),
            possible_impulse_zone_id,
        )
        return txns
