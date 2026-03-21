from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from backend.models.enums import AccountTypeEnum, BankProviderEnum
from backend.utils.database import Base


class UserORM(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    username: Mapped[str] = mapped_column(
        String, unique=True, nullable=False, index=True
    )
    email: Mapped[str | None] = mapped_column(String, nullable=True)
    full_name: Mapped[str | None] = mapped_column(String, nullable=True)
    hashed_password: Mapped[str] = mapped_column(String, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    roles: Mapped[str] = mapped_column(String, default="USER", nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=False), server_default=func.now(), nullable=False
    )


class BankAccountORM(Base):
    __tablename__ = "bank_accounts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=False, index=True
    )
    bank_account_id: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    account_number: Mapped[str] = mapped_column(String, nullable=False)
    sort_code: Mapped[str] = mapped_column(String, nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    provider: Mapped[BankProviderEnum] = mapped_column(String, nullable=False)
    type: Mapped[AccountTypeEnum] = mapped_column(String, nullable=False)
    amount: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=False), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=False),
        server_default=func.now(),
        nullable=False,
        onupdate=func.now(),
    )


class ImpulseZoneORM(Base):
    __tablename__ = "impulse_zones"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=False), server_default=func.now(), nullable=False
    )


class PossibleImpulseZoneORM(Base):
    __tablename__ = "possible_impulse_zones"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("users.id"),
        nullable=True,
        index=True,
    )
    name: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=False), server_default=func.now(), nullable=False
    )


class UserImpulseORM(Base):
    __tablename__ = "user_impulses"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=False, index=True
    )
    impulse_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("impulse_zones.id"), nullable=False, index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=False), server_default=func.now(), nullable=False
    )


class TransactionORM(Base):
    __tablename__ = "transactions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=False, index=True
    )
    source_account_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("bank_accounts.id"), nullable=True, index=True
    )
    amount: Mapped[int] = mapped_column(Integer, nullable=False)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=False), nullable=False, index=True
    )
    merchant: Mapped[str] = mapped_column(String, nullable=False)
    impulse_zone_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("impulse_zones.id"), nullable=True, index=True
    )
    possible_impulse_zone_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("possible_impulse_zones.id"), nullable=True, index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=False), server_default=func.now(), nullable=False
    )


class UserMetadataORM(Base):
    __tablename__ = "user_metadata"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id"), unique=True, nullable=False, index=True
    )
    goal: Mapped[str | None] = mapped_column(Text, nullable=True)
    bank_account_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("bank_accounts.id"), nullable=True
    )
    impulse_limit: Mapped[int | None] = mapped_column(Integer, nullable=True)
    tax_percentage: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=False), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=False),
        server_default=func.now(),
        nullable=False,
        onupdate=func.now(),
    )
