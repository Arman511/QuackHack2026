from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from backend.models.enums import AccountTypeEnum, BankProviderEnum, UserTypeEnum


class UserPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    email: str | None = None
    full_name: str | None = None
    is_active: bool
    roles: list[UserTypeEnum] = Field(default_factory=lambda: [UserTypeEnum.USER])

    @field_validator("roles", mode="before")
    @classmethod
    def parse_roles(cls, value):
        if value is None:
            return [UserTypeEnum.USER]
        if isinstance(value, str):
            return [
                UserTypeEnum(role.strip())
                for role in value.split(",")
                if role and role.strip()
            ]
        return value


class UserDB(UserPublic):
    hashed_password: str
    created_at: datetime


class UserRead(UserPublic):
    created_at: datetime


class UserCreate(BaseModel):
    username: str
    password: str
    email: str | None = None
    full_name: str | None = None


class UserUpdate(BaseModel):
    email: str | None = None
    password: str | None = None
    full_name: str | None = None


class UserAdminPatch(BaseModel):
    username: str | None = None
    password: str | None = None
    is_active: bool | None = None
    roles: list[UserTypeEnum] | None = None


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


class TransactionCreate(BaseModel):
    source_account_id: int
    amount: int
    timestamp: datetime
    merchant: str
    impulse_zone_id: int | None = None
    possible_impulse_zone_id: int | None = None


class TransactionPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    source_account_id: int | None = None
    amount: int
    timestamp: datetime
    merchant: str
    impulse_zone_id: int | None = None
    possible_impulse_zone_id: int | None = None
    created_at: datetime


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
    scopes: list[str] = Field(default_factory=list)


class RefreshTokensCompatRequest(BaseModel):
    refresh_token: str
    access_token: str | None = None
