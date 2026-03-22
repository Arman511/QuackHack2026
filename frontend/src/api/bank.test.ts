import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("@/api/http", () => ({
  apiRequest: vi.fn(),
  tokenStore: {
    setTokens: vi.fn(),
    clear: vi.fn(),
    getAccessToken: vi.fn().mockReturnValue(null),
    getRefreshToken: vi.fn().mockReturnValue(null),
  },
  refreshAccessToken: vi.fn().mockResolvedValue(null),
}));

import {
  adminSearchTransactions,
  addMoney,
  createTransactionFromWebhook,
  listAccounts,
  listMyTransactionPunishments,
  createTransaction,
  listMyTransactions,
  searchMyTransactions,
  createBankAccounts,
  setupBankAccounts,
  transferBetweenAccounts,
  adminSummary,
} from "@/api/bank";
import { apiRequest } from "@/api/http";

const mockApiRequest = vi.mocked(apiRequest);

describe("bank API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApiRequest.mockResolvedValue([]);
  });

  it("listAccounts calls GET /api/bank/accounts", async () => {
    await listAccounts();
    expect(mockApiRequest).toHaveBeenCalledWith("/api/bank/accounts");
  });

  it("createTransaction calls POST /api/bank/transactions", async () => {
    const body: Parameters<typeof createTransaction>[0] = {
      source_account_id: 1,
      amount: 10,
      timestamp: "2026-01-01T00:00:00Z",
      merchant: "test",
    };
    await createTransaction(body);
    expect(mockApiRequest).toHaveBeenCalledWith(
      "/api/bank/transactions",
      expect.objectContaining({ method: "POST", body }),
    );
  });

  it("listMyTransactions calls GET /api/bank/transactions/me", async () => {
    await listMyTransactions();
    expect(mockApiRequest).toHaveBeenCalledWith("/api/bank/transactions/me");
  });

  it("searchMyTransactions builds correct query string", async () => {
    await searchMyTransactions("2026-01-01", "2026-01-31");
    expect(mockApiRequest).toHaveBeenCalledWith(
      expect.stringContaining("/api/bank/transactions/search?"),
    );
  });

  it("searchMyTransactions serializes Date values and custom pagination", async () => {
    const start = new Date("2026-02-01T00:00:00.000Z");
    const end = new Date("2026-02-28T23:59:59.000Z");

    await searchMyTransactions(start, end, 3, 25);

    const url = String(mockApiRequest.mock.calls.at(-1)?.[0] ?? "");
    expect(url).toContain("/api/bank/transactions/search?");
    expect(url).toContain(`start=${encodeURIComponent(start.toISOString())}`);
    expect(url).toContain(`end=${encodeURIComponent(end.toISOString())}`);
    expect(url).toContain("page=3");
    expect(url).toContain("page_size=25");
  });

  it("createBankAccounts calls POST /api/bank/accounts/create", async () => {
    const body: Parameters<typeof createBankAccounts>[0] = {
      provider: "REV-O-TROT",
      type: "CURRENT",
      account_number: "12345678",
      sort_code: "112233",
      amount: 100,
    };
    await createBankAccounts(body);
    expect(mockApiRequest).toHaveBeenCalledWith(
      "/api/bank/accounts/create",
      expect.objectContaining({ method: "POST", body }),
    );
  });

  it("setupBankAccounts calls POST /api/bank/accounts/setup", async () => {
    const body = {} as Parameters<typeof setupBankAccounts>[0];
    await setupBankAccounts(body);
    expect(mockApiRequest).toHaveBeenCalledWith(
      "/api/bank/accounts/setup",
      expect.objectContaining({ method: "POST", body }),
    );
  });

  it("addMoney calls POST /api/bank/accounts/add-money", async () => {
    const body = {
      sort_code: "112233",
      account_number: "12345678",
      amount: 50,
    } as Parameters<typeof addMoney>[0];
    await addMoney(body);
    expect(mockApiRequest).toHaveBeenCalledWith(
      "/api/bank/accounts/add-money",
      expect.objectContaining({ method: "POST", body }),
    );
  });

  it("adminSummary calls correct endpoint with pagination", async () => {
    await adminSummary(2, 50);
    expect(mockApiRequest).toHaveBeenCalledWith(expect.stringContaining("page=2"));
    expect(mockApiRequest).toHaveBeenCalledWith(expect.stringContaining("page_size=50"));
  });

  it("createTransactionFromWebhook calls webhook endpoint with skipAuthRefresh", async () => {
    const body: Parameters<typeof createTransactionFromWebhook>[0] = {
      user_id: 1,
      source_account_id: 1,
      amount: 12.5,
      timestamp: "2026-01-01T00:00:00Z",
      merchant: "Webhook Merchant",
    };

    await createTransactionFromWebhook(body);

    expect(mockApiRequest).toHaveBeenCalledWith(
      "/api/bank/transactions/webhook",
      expect.objectContaining({ method: "POST", body, skipAuthRefresh: true }),
    );
  });

  it("listMyTransactionPunishments calls punishments endpoint", async () => {
    await listMyTransactionPunishments();
    expect(mockApiRequest).toHaveBeenCalledWith("/api/bank/transactions/punishments/me");
  });

  it("transferBetweenAccounts calls transfer endpoint with POST body", async () => {
    const body: Parameters<typeof transferBetweenAccounts>[0] = {
      source_account_number: "11111111",
      source_sort_code: "112233",
      destination_account_number: "22222222",
      destination_sort_code: "445566",
      amount: 75,
    };

    await transferBetweenAccounts(body);

    expect(mockApiRequest).toHaveBeenCalledWith(
      "/api/bank/accounts/transfer",
      expect.objectContaining({ method: "POST", body }),
    );
  });

  it("adminSearchTransactions builds search endpoint with serialized date params", async () => {
    const start = new Date("2026-03-01T00:00:00.000Z");
    const end = new Date("2026-03-31T23:59:59.000Z");

    await adminSearchTransactions(start, end);

    const url = String(mockApiRequest.mock.calls.at(-1)?.[0] ?? "");
    expect(url).toContain("/api/bank/admin/transactions/search?");
    expect(url).toContain(`start=${encodeURIComponent(start.toISOString())}`);
    expect(url).toContain(`end=${encodeURIComponent(end.toISOString())}`);
  });
});
