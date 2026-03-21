from datetime import datetime
from enum import Enum
from uuid import UUID

from pydantic import BaseModel, ConfigDict
from sqlalchemy import Boolean, DateTime, Integer, String, Text, func, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from backend.database import Base


# ===== ENUMS =====
class UserTypeEnum(str, Enum):
    ADMIN = "ADMIN"
    USER = "USER"


class BankProviderEnum(str, Enum):
    REVOLITE = "REVOLITE"
    HAYSBC = "HAYSBC"


class AccountTypeEnum(str, Enum):
    CURRENT = "CURRENT"
    SAVING = "SAVING"


# ===== ORM MODELS =====
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
    type: Mapped[UserTypeEnum] = mapped_column(
        String, default=UserTypeEnum.USER, nullable=False
    )
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
    name: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=False), server_default=func.now(), nullable=False
    )


class PossibleImpulseZoneORM(Base):
    __tablename__ = "possible_impulse_zones"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
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
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=False), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=False),
        server_default=func.now(),
        nullable=False,
        onupdate=func.now(),
    )


# ===== PYDANTIC REQUEST/RESPONSE SCHEMAS =====
class UserPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    email: str | None = None
    full_name: str | None = None
    is_active: bool
    type: UserTypeEnum


class UserDB(UserPublic):
    hashed_password: str
    created_at: datetime


# Bank Account Models
class BankAccountCreate(BaseModel):
    account_number: str
    sort_code: str
    name: str
    provider: BankProviderEnum
    type: AccountTypeEnum


class BankAccountPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    bank_account_id: str
    account_number: str
    sort_code: str
    name: str
    provider: BankProviderEnum
    type: AccountTypeEnum
    amount: int
    created_at: datetime
    updated_at: datetime


# Impulse Zone Models
class ImpulseZonePublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    created_at: datetime


class PossibleImpulseZonePublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    created_at: datetime


# Transaction Models
class TransactionCreate(BaseModel):
    amount: int
    timestamp: datetime
    merchant: str
    impulse_zone_id: int | None = None
    possible_impulse_zone_id: int | None = None


class TransactionPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    amount: int
    timestamp: datetime
    merchant: str
    impulse_zone_id: int | None = None
    possible_impulse_zone_id: int | None = None
    created_at: datetime


# User Metadata Models
class UserMetadataCreate(BaseModel):
    goal: str | None = None
    bank_account_id: int | None = None


class UserMetadataPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    goal: str | None = None
    bank_account_id: int | None = None
    created_at: datetime
    updated_at: datetime


# Auth Models
class UserRegisterRequest(BaseModel):
    username: str
    password: str
    email: str | None = None
    full_name: str | None = None


class UserLoginRequest(BaseModel):
    username: str
    password: str


class TokenPayload(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class RefreshTokensCompatRequest(BaseModel):
    refresh_token: str
    access_token: str | None = None
