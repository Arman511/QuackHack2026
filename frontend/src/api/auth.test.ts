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

import { login, register, me, logout } from "@/api/auth";
import { apiRequest, tokenStore } from "@/api/http";

const mockApiRequest = vi.mocked(apiRequest);
const mockTokenStore = tokenStore as ReturnType<typeof vi.mocked<typeof tokenStore>>;

describe("auth API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("register", () => {
    it("calls POST /api/auth/register with body", async () => {
      mockApiRequest.mockResolvedValue({ id: 1, username: "test@example.com" });
      const body = {
        username: "test@example.com",
        password: "secret123",
        email: "test@example.com",
        full_name: "Test User",
      };
      await register(body);
      expect(mockApiRequest).toHaveBeenCalledWith(
        "/api/auth/register",
        expect.objectContaining({ method: "POST", body }),
      );
    });
  });

  describe("login", () => {
    it("calls POST /api/auth/login and persists tokens", async () => {
      const tokenPayload = {
        access_token: "acc",
        refresh_token: "ref",
        token_type: "bearer",
        expires_in: 3600,
      };
      mockApiRequest.mockResolvedValue(tokenPayload);
      const result = await login({ username: "user", password: "pass" });
      expect(mockApiRequest).toHaveBeenCalledWith(
        "/api/auth/login",
        expect.objectContaining({ method: "POST" }),
      );
      expect(mockTokenStore.setTokens).toHaveBeenCalledWith(tokenPayload);
      expect(result).toEqual(tokenPayload);
    });
  });

  describe("me", () => {
    it("calls GET /api/auth/me", async () => {
      mockApiRequest.mockResolvedValue({ id: 1, email: "x@y.com" });
      await me();
      expect(mockApiRequest).toHaveBeenCalledWith("/api/auth/me");
    });
  });

  describe("logout", () => {
    it("calls POST /api/auth/logout and clears tokens", async () => {
      mockApiRequest.mockResolvedValue({});
      await logout();
      expect(mockApiRequest).toHaveBeenCalledWith(
        "/api/auth/logout",
        expect.objectContaining({ method: "POST" }),
      );
      expect(mockTokenStore.clear).toHaveBeenCalled();
    });
  });
});
