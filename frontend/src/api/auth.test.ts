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
  listUsernames,
  login,
  loginOauth2Compat,
  logout,
  logoutDeleteCompat,
  me,
  refreshTokens,
  refreshTokensCompat,
  register,
} from "@/api/auth";
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

  describe("loginOauth2Compat", () => {
    it("calls token endpoint with x-www-form-urlencoded body and persists tokens", async () => {
      const tokenPayload = {
        access_token: "acc2",
        refresh_token: "ref2",
        token_type: "bearer",
        expires_in: 3600,
      };
      mockApiRequest.mockResolvedValue(tokenPayload);

      const result = await loginOauth2Compat("user@example.com", "secret", "profile");

      expect(mockApiRequest).toHaveBeenCalledWith(
        "/api/auth/token",
        expect.objectContaining({
          method: "POST",
          skipAuthRefresh: true,
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        }),
      );

      const calledOptions = mockApiRequest.mock.calls[0][1];
      expect(calledOptions?.form).toBeInstanceOf(URLSearchParams);
      expect(calledOptions?.form?.get("username")).toBe("user@example.com");
      expect(calledOptions?.form?.get("password")).toBe("secret");
      expect(calledOptions?.form?.get("scope")).toBe("profile");
      expect(mockTokenStore.setTokens).toHaveBeenCalledWith(tokenPayload);
      expect(result).toEqual(tokenPayload);
    });
  });

  describe("listUsernames", () => {
    it("calls GET /api/auth/users", async () => {
      mockApiRequest.mockResolvedValue(["alice", "bob"]);
      await listUsernames();
      expect(mockApiRequest).toHaveBeenCalledWith("/api/auth/users");
    });
  });

  describe("refreshTokens", () => {
    it("calls refresh endpoint with retry disabled and persists tokens", async () => {
      const tokenPayload = {
        access_token: "new-acc",
        refresh_token: "new-ref",
        token_type: "bearer",
        expires_in: 3600,
      };
      mockApiRequest.mockResolvedValue(tokenPayload);

      const result = await refreshTokens();

      expect(mockApiRequest).toHaveBeenCalledWith(
        "/api/auth/refresh",
        expect.objectContaining({
          method: "POST",
          skipAuthRefresh: true,
          retryOn401: false,
        }),
      );
      expect(mockTokenStore.setTokens).toHaveBeenCalledWith(tokenPayload);
      expect(result).toEqual(tokenPayload);
    });
  });

  describe("refreshTokensCompat", () => {
    it("calls compat refresh endpoint with body and persists tokens", async () => {
      const tokenPayload = {
        access_token: "compat-acc",
        refresh_token: "compat-ref",
        token_type: "bearer",
        expires_in: 3600,
      };
      const body = { refresh_token: "old-ref", access_token: "old-acc" };
      mockApiRequest.mockResolvedValue(tokenPayload);

      const result = await refreshTokensCompat(body);

      expect(mockApiRequest).toHaveBeenCalledWith(
        "/api/auth/refresh/token",
        expect.objectContaining({
          method: "POST",
          body,
          skipAuthRefresh: true,
          retryOn401: false,
        }),
      );
      expect(mockTokenStore.setTokens).toHaveBeenCalledWith(tokenPayload);
      expect(result).toEqual(tokenPayload);
    });
  });

  describe("logout", () => {
    it("calls POST /api/auth/logout and clears tokens", async () => {
      mockApiRequest.mockResolvedValue({});
      await logout();
      expect(mockApiRequest).toHaveBeenCalledWith(
        "/api/auth/logout",
        expect.objectContaining({
          method: "POST",
          skipAuthRefresh: true,
          retryOn401: false,
        }),
      );
      expect(mockTokenStore.clear).toHaveBeenCalled();
    });
  });

  describe("logoutDeleteCompat", () => {
    it("calls DELETE /api/auth/logout and clears tokens", async () => {
      mockApiRequest.mockResolvedValue({});
      await logoutDeleteCompat();
      expect(mockApiRequest).toHaveBeenCalledWith(
        "/api/auth/logout",
        expect.objectContaining({
          method: "DELETE",
          skipAuthRefresh: true,
          retryOn401: false,
        }),
      );
      expect(mockTokenStore.clear).toHaveBeenCalled();
    });
  });
});
