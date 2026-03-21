from sqlalchemy import text
from sqlalchemy.orm import Session

from backend.models import UserMetadataPublic


class UserMetadataRepository:
    """Repository for user metadata operations."""

    SQL_SELECT_BY_USER_ID = text("""
        SELECT id, user_id, goal, bank_account_id, impulse_limit, tax_percentage, created_at, updated_at
        FROM user_metadata
        WHERE user_id = :user_id
        """)

    SQL_UPSERT_USER_GOAL = text("""
        INSERT INTO user_metadata (user_id, goal, bank_account_id, impulse_limit, tax_percentage)
        VALUES (:user_id, :goal, :bank_account_id, :impulse_limit, :tax_percentage)
        ON CONFLICT (user_id)
        DO UPDATE SET
            goal = EXCLUDED.goal,
            bank_account_id = EXCLUDED.bank_account_id,
            impulse_limit = EXCLUDED.impulse_limit,
            tax_percentage = EXCLUDED.tax_percentage,
            updated_at = CURRENT_TIMESTAMP
        RETURNING id, user_id, goal, bank_account_id, impulse_limit, tax_percentage, created_at, updated_at
        """)

    def __init__(self, db: Session):
        self.db = db

    def get_by_user_id(self, user_id: int) -> UserMetadataPublic | None:
        row = (
            self.db.execute(self.SQL_SELECT_BY_USER_ID, {"user_id": user_id})
            .mappings()
            .first()
        )
        return UserMetadataPublic(**row) if row else None

    def set_goal(
        self,
        *,
        user_id: int,
        goal: str | None,
        bank_account_id: int | None,
        impulse_limit: int | None,
        tax_percentage: int | None,
    ) -> UserMetadataPublic:
        row = (
            self.db.execute(
                self.SQL_UPSERT_USER_GOAL,
                {
                    "user_id": user_id,
                    "goal": goal,
                    "bank_account_id": bank_account_id,
                    "impulse_limit": impulse_limit,
                    "tax_percentage": tax_percentage,
                },
            )
            .mappings()
            .first()
        )
        self.db.commit()
        if row is None:
            raise RuntimeError("Failed to upsert user goal")
        return UserMetadataPublic(**row)
