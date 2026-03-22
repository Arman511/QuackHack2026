import type { BankProviderEnum, SetupBankAccountsRequest } from "@/api/types";

/**
 * Maps frontend bank display names to backend API enum values
 */
export const BANK_NAME_TO_PROVIDER_MAP = {
  "Mane-zo": "MANE-ZO" as const,
  "Rev-o-trot": "REV-O-TROT" as const,
  "Buck-lays": "BUCK-LAYS" as const,
  "Hay-ch SBC": "HAY-CHSBC" as const,
} as const;

type FrontendBankName = keyof typeof BANK_NAME_TO_PROVIDER_MAP;

/**
 * Maps a frontend bank display name to the backend BankProviderEnum value
 */
export const mapBankNameToProvider = (bankName: string): BankProviderEnum => {
  const provider = BANK_NAME_TO_PROVIDER_MAP[bankName as FrontendBankName];
  if (!provider) {
    throw new Error(`Unknown bank name: ${bankName}`);
  }
  return provider;
};

/**
 * Form data structure from BankDetailsPage
 */
export interface BankDetailsForm {
  sortCode: string;
  checkingAccountNumber: string;
  checkingAccountName: string;
  savingsAccountNumber: string;
  savingsAccountName: string;
}

/**
 * Transforms form data from BankDetailsPage to API payload structure
 */
export const transformFormToApiPayload = (
  bankName: string,
  formData: BankDetailsForm,
): SetupBankAccountsRequest => {
  // Remove dashes from sort code (UI shows "12-34-56", API expects "123456")
  const cleanSortCode = formData.sortCode.replace(/-/g, "");

  return {
    provider: mapBankNameToProvider(bankName),
    current: {
      account_number: formData.checkingAccountNumber,
      sort_code: cleanSortCode,
    },
    saving: {
      account_number: formData.savingsAccountNumber,
      sort_code: cleanSortCode,
    },
  };
};
