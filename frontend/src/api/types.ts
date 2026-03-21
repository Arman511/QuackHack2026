export type UserTypeEnum = "ADMIN" | "USER";

export type AccountTypeEnum = "CURRENT" | "SAVING";

export type BankProviderEnum = "REV-O-TROT" | "HAY-CHSBC" | "MANE-ZO" | "BUCK-LAYS";

export interface TokenPayload {
  access_token: string;
  refresh_token: string;
  token_type?: string;
  expires_in: number;
  scopes?: string[];
}

export interface UserRegisterRequest {
  username: string;
  password: string;
  email?: string | null;
  full_name?: string | null;
}

export interface UserLoginRequest {
  username: string;
  password: string;
}

export interface UserPublic {
  id: number;
  username: string;
  email?: string | null;
  full_name?: string | null;
  is_active: boolean;
  roles?: UserTypeEnum[];
}

export interface UserRead {
  id: number;
  username: string;
  email?: string | null;
  full_name?: string | null;
  is_active: boolean;
  roles?: UserTypeEnum[];
  created_at: string;
}

export interface UserMePublic {
  id: number;
  username: string;
  email?: string | null;
  full_name?: string | null;
  is_active: boolean;
  roles?: UserTypeEnum[];
  goal?: string | null;
  impulse_limit?: number | null;
  tax_percentage?: number | null;
  current_month_expenditure?: number;
  is_passed_limit?: boolean;
}

export interface UserUpdate {
  email?: string | null;
  password?: string | null;
  full_name?: string | null;
}

export interface UserAdminPatch {
  username?: string | null;
  password?: string | null;
  is_active?: boolean | null;
  roles?: UserTypeEnum[] | null;
}

export interface UserGoalSetRequest {
  goal?: string | null;
  bank_account_id?: number | null;
  impulse_limit?: number | null;
  tax_percentage?: number | null;
}

export interface UserMetadataPublic {
  id: number;
  user_id: number;
  goal?: string | null;
  bank_account_id?: number | null;
  impulse_limit?: number | null;
  tax_percentage?: number | null;
  created_at: string;
  updated_at: string;
}

export interface UserLimitStatusPublic {
  current_month_expenditure: number;
  impulse_limit?: number | null;
  is_passed_limit: boolean;
}

export interface UserImpulseSetRequest {
  impulse_ids?: number[];
}

export interface RefreshTokensCompatRequest {
  refresh_token: string;
  access_token?: string | null;
}

export interface BankAccountPublic {
  id: number;
  user_id: number;
  bank_account_id: string;
  account_number: string;
  sort_code: string;
  name: string;
  provider: BankProviderEnum;
  type: AccountTypeEnum;
  amount: number;
  created_at: string;
  updated_at: string;
}

export interface CreateBankAccountsRequest {
  provider: BankProviderEnum;
}

export interface SetupBankAccountDetails {
  account_number: string;
  sort_code: string;
}

export interface SetupBankAccountsRequest {
  provider: BankProviderEnum;
  current: SetupBankAccountDetails;
  saving: SetupBankAccountDetails;
}

export interface CreateBankAccountsResponse {
  current: BankAccountPublic;
  saving: BankAccountPublic;
}

export interface TransactionCreate {
  source_account_id: number;
  amount: number;
  timestamp: string;
  merchant: string;
  impulse_zone_id?: number | null;
  possible_impulse_zone_id?: number | null;
}

export interface TransactionWebhookCreate {
  sort_code: string;
  account_number: string;
  amount: number;
  timestamp: string;
  merchant: string;
  impulse_zone_id?: number | null;
  possible_impulse_zone_id?: number | null;
}

export interface TransactionPublic {
  id: number;
  user_id: number;
  source_account_id?: number | null;
  amount: number;
  timestamp: string;
  merchant: string;
  impulse_zone_id?: number | null;
  possible_impulse_zone_id?: number | null;
  created_at: string;
}

export interface TransactionHydratedPublic extends TransactionPublic {
  impulse_zone_name?: string | null;
  possible_impulse_zone_name?: string | null;
}

export interface TransactionSearchItemPublic {
  id: number;
  user_id: number;
  source_account_number?: string | null;
  source_sort_code?: string | null;
  amount: number;
  timestamp: string;
  merchant: string;
  impulse_zone_id?: number | null;
  possible_impulse_zone_id?: number | null;
  created_at: string;
  impulse_zone_name?: string | null;
  possible_impulse_zone_name?: string | null;
}

export interface PaginatedTransactionSearchResponse {
  items: TransactionSearchItemPublic[];
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

export interface ImpulseZoneCreate {
  name: string;
}

export interface ImpulseZoneUpdate {
  name: string;
}

export interface ImpulseZonePublic {
  id: number;
  name: string;
  created_at: string;
}

export interface PossibleImpulseZonePublic {
  id: number;
  user_id?: number | null;
  name: string;
  created_at: string;
}

export interface UserImpulsesBundlePublic {
  impulses: ImpulseZonePublic[];
  possible: PossibleImpulseZonePublic[];
}

export interface PromotePossibleImpulseRequest {
  name?: string | null;
}

export interface ValidationError {
  loc: Array<string | number>;
  msg: string;
  type: string;
  input?: unknown;
  ctx?: Record<string, unknown>;
}

export interface HTTPValidationError {
  detail?: ValidationError[];
}

export type EmptyResponse = Record<string, never>;
