from enum import Enum


class UserTypeEnum(str, Enum):
    ADMIN = "ADMIN"
    USER = "USER"


class BankProviderEnum(str, Enum):
    REVOLITE = "REVOLITE"
    HAYSBC = "HAYSBC"


class AccountTypeEnum(str, Enum):
    CURRENT = "CURRENT"
    SAVING = "SAVING"