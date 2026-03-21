from datetime import datetime

from pydantic import BaseModel, ConfigDict
from sqlalchemy import Boolean, DateTime, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from backend.database import Base


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
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=False), server_default=func.now(), nullable=False
    )


class UserRegisterRequest(BaseModel):
    username: str
    password: str
    email: str | None = None
    full_name: str | None = None


class UserLoginRequest(BaseModel):
    username: str
    password: str


class UserPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    email: str | None = None
    full_name: str | None = None
    is_active: bool


class UserDB(UserPublic):
    hashed_password: str
    created_at: datetime


class TokenPayload(BaseModel):
    access_token: str
    refresh_token: str
