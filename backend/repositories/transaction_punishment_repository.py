from datetime import datetime
import logging

from sqlalchemy import text
from sqlalchemy.orm import Session

from backend.models import TransactionPunishmentPublic

logger = logging.getLogger(__name__)


class TransactionPunishmentRepository:
    """Repository for Neigh-Tax punishment records."""

    SQL_CREATE = text("""
        INSERT INTO transaction_punishments (user_id, tax_amount, timestamp)
        VALUES (:user_id, :tax_amount, :timestamp)
        RETURNING id, user_id, tax_amount, timestamp
        """)

    SQL_SELECT_BY_USER_ID = text("""
        SELECT id, user_id, tax_amount, timestamp
        FROM transaction_punishments
        WHERE user_id = :user_id
        ORDER BY timestamp DESC, id DESC
        """)

    def __init__(self, db: Session):
        self.db = db

    def create_tax_collection(
        self,
        *,
        user_id: int,
        tax_amount: int,
        timestamp: datetime,
    ) -> TransactionPunishmentPublic:
        row = (
            self.db.execute(
                self.SQL_CREATE,
                {
                    "user_id": user_id,
                    "tax_amount": tax_amount,
                    "timestamp": timestamp,
                },
            )
            .mappings()
            .first()
        )
        self.db.commit()
        if row is None:
            logger.error(
                "Failed to create transaction punishment user_id=%s tax_amount=%s",
                user_id,
                tax_amount,
            )
            raise RuntimeError("Failed to create transaction punishment")
        return TransactionPunishmentPublic(**row)

    def list_by_user_id(self, user_id: int) -> list[TransactionPunishmentPublic]:
        rows = (
            self.db.execute(self.SQL_SELECT_BY_USER_ID, {"user_id": user_id})
            .mappings()
            .all()
        )
        return [TransactionPunishmentPublic(**row) for row in rows]
