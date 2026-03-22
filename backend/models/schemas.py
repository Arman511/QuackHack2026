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


class UserMePublic(UserPublic):
    goal: str | None = None
    impulse_limit: int | None = None
    tax_percentage: int | None = None
    current_month_expenditure: int = 0
    is_passed_limit: bool = False


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


class CreateBankAccountsRequest(BaseModel):
    provider: BankProviderEnum
    type: AccountTypeEnum
    account_number: str
    sort_code: str
    amount: int = Field(ge=0)


class SetupBankAccountDetails(BaseModel):
    account_number: str
    sort_code: str


class SetupBankAccountsRequest(BaseModel):
    provider: BankProviderEnum
    current: SetupBankAccountDetails
    saving: SetupBankAccountDetails


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
    user_id: int | None = None
    name: str
    created_at: datetime


class ImpulseZoneCreate(BaseModel):
    name: str


class ImpulseZoneUpdate(BaseModel):
    name: str


class PromotePossibleImpulseRequest(BaseModel):
    name: str | None = None


class UserImpulseSetRequest(BaseModel):
    impulse_ids: list[int] = Field(default_factory=list)


class UserImpulsesBundlePublic(BaseModel):
    impulses: list[ImpulseZonePublic]
    possible: list[PossibleImpulseZonePublic]


class CreateBankAccountsResponse(BaseModel):
    current: BankAccountPublic
    saving: BankAccountPublic


class TransactionCreate(BaseModel):
    source_account_id: int
    amount: int
    timestamp: datetime
    merchant: str
    impulse_zone_id: int | None = None
    possible_impulse_zone_id: int | None = None


class TransactionWebhookCreate(BaseModel):
    sort_code: str
    account_number: str
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


class TransactionHydratedPublic(TransactionPublic):
    impulse_zone_name: str | None = None
    possible_impulse_zone_name: str | None = None


class TransactionSearchItemPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    source_account_number: str | None = None
    source_sort_code: str | None = None
    amount: int
    timestamp: datetime
    merchant: str
    impulse_zone_id: int | None = None
    possible_impulse_zone_id: int | None = None
    created_at: datetime
    impulse_zone_name: str | None = None
    possible_impulse_zone_name: str | None = None


class PaginatedTransactionSearchResponse(BaseModel):
    items: list[TransactionSearchItemPublic]
    page: int
    page_size: int
    total: int
    total_pages: int


class TransactionDateRangeQuery(BaseModel):
    start: datetime
    end: datetime


class UserMetadataCreate(BaseModel):
    goal: str | None = None
    bank_account_id: int | None = None
    impulse_limit: int | None = None
    tax_percentage: int | None = None


class UserGoalSetRequest(BaseModel):
    goal: str | None = None
    bank_account_id: int | None = None
    impulse_limit: int | None = None
    tax_percentage: int | None = None


class UserLimitStatusPublic(BaseModel):
    current_month_expenditure: int
    impulse_limit: int | None = None
    is_passed_limit: bool


class UserMetadataPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    goal: str | None = None
    bank_account_id: int | None = None
    impulse_limit: int | None = None
    tax_percentage: int | None = None
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


class DeletedResponse(BaseModel):
    deleted: bool
