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
    const body = { amount: 10, description: "test", date: "2026-01-01" } as Parameters<
      typeof createTransaction
    >[0];
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
    const body = { accounts: [] } as Parameters<typeof createBankAccounts>[0];
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

  it("adminSummary calls correct endpoint with pagination", async () => {
    await adminSummary(2, 50);
    expect(mockApiRequest).toHaveBeenCalledWith(expect.stringContaining("page=2"));
    expect(mockApiRequest).toHaveBeenCalledWith(expect.stringContaining("page_size=50"));
  });
});
