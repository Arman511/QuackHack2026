from datetime import UTC, datetime

from sqlalchemy import text
from sqlalchemy.orm import Session


class TokenDenylistRepository:
    """Repository for revoked-token SQL operations."""

    SQL_INSERT_REVOKED_TOKEN = text("""
        INSERT INTO revoked_tokens (jti, token_type, expires_at)
        VALUES (:jti, :token_type, :expires_at)
        ON CONFLICT (jti) DO UPDATE
        SET token_type = EXCLUDED.token_type,
            expires_at = EXCLUDED.expires_at
        """)

    SQL_SELECT_REVOKED_TOKEN = text("""
        SELECT jti
        FROM revoked_tokens
        WHERE jti = :jti
          AND expires_at > :now
        """)

    SQL_DELETE_EXPIRED = text("""
        DELETE FROM revoked_tokens
        WHERE expires_at <= :now
        """)

    def __init__(self, db: Session):
        self.db = db

    def revoke_token(self, *, jti: str, token_type: str, expires_at: datetime) -> None:
        self.db.execute(
            self.SQL_INSERT_REVOKED_TOKEN,
            {"jti": jti, "token_type": token_type, "expires_at": expires_at},
        )
        self.db.commit()

    def is_token_revoked(self, jti: str) -> bool:
        now = datetime.now(UTC)
        row = self.db.execute(
            self.SQL_SELECT_REVOKED_TOKEN, {"jti": jti, "now": now}
        ).first()
        return row is not None

    def cleanup_expired(self) -> None:
        now = datetime.now(UTC)
        self.db.execute(self.SQL_DELETE_EXPIRED, {"now": now})
        self.db.commit()
