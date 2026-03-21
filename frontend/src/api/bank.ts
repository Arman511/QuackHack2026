import { apiRequest } from "@/api/http";
import type {
    BankAccountPublic,
    CreateBankAccountsRequest,
    CreateBankAccountsResponse,
    TransactionCreate,
    TransactionHydratedPublic,
    TransactionPublic,
    TransactionWebhookCreate,
} from "@/api/types";

const asIsoString = (value: string | Date) => (value instanceof Date ? value.toISOString() : value);

export const listAccounts = () => apiRequest<BankAccountPublic[]>("/api/bank/accounts");

export const createTransaction = (body: TransactionCreate) =>
    apiRequest<TransactionPublic>("/api/bank/transactions", {
        method: "POST",
        body,
    });

export const createTransactionFromWebhook = (body: TransactionWebhookCreate) =>
    apiRequest<TransactionPublic>("/api/bank/transactions/webhook", {
        method: "POST",
        body,
        skipAuthRefresh: true,
    });

export const listMyTransactions = () => apiRequest<TransactionHydratedPublic[]>("/api/bank/transactions/me");

export const searchMyTransactions = (start: string | Date, end: string | Date) => {
    const query = new URLSearchParams({
        start: asIsoString(start),
        end: asIsoString(end),
    });
    return apiRequest<TransactionHydratedPublic[]>(`/api/bank/transactions/search?${query.toString()}`);
};

export const createBankAccounts = (body: CreateBankAccountsRequest) =>
    apiRequest<CreateBankAccountsResponse>("/api/bank/accounts/create", {
        method: "POST",
        body,
    });

export const adminSummary = (page = 1, pageSize = 100) => {
    const query = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
    return apiRequest<TransactionPublic[]>(`/api/bank/admin/summary?${query.toString()}`);
};

export const adminSearchTransactions = (start: string | Date, end: string | Date) => {
    const query = new URLSearchParams({
        start: asIsoString(start),
        end: asIsoString(end),
    });
    return apiRequest<TransactionHydratedPublic[]>(
        `/api/bank/admin/transactions/search?${query.toString()}`,
    );
};
