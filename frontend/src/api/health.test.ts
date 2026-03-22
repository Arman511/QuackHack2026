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

import { healthCheck } from "@/api/health";
import { apiRequest } from "@/api/http";

const mockApiRequest = vi.mocked(apiRequest);

describe("healthCheck", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls GET /api/health with skipAuthRefresh", async () => {
    mockApiRequest.mockResolvedValue({});
    await healthCheck();
    expect(mockApiRequest).toHaveBeenCalledWith(
      "/api/health",
      expect.objectContaining({ skipAuthRefresh: true }),
    );
  });

  it("returns the API response", async () => {
    mockApiRequest.mockResolvedValue({ status: "ok" });
    const result = await healthCheck();
    expect(result).toEqual({ status: "ok" });
  });
});
