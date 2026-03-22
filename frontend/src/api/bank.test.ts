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
  addMoney,
  listAccounts,
  createTransaction,
  listMyTransactions,
  searchMyTransactions,
  createBankAccounts,
  setupBankAccounts,
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
});
