from enum import Enum


class UserTypeEnum(str, Enum):
    ADMIN = "ADMIN"
    USER = "USER"


class BankProviderEnum(str, Enum):
    REV_O_TROT = "REV-O-TROT"
    HAY_CHSBC = "HAY-CHSBC"
    MANE_ZO = "MANE-ZO"
    BUCK_LAYS = "BUCK-LAYS"


class AccountTypeEnum(str, Enum):
    CURRENT = "CURRENT"
    SAVING = "SAVING"
