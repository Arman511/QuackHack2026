import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, apiRequest, refreshAccessToken, tokenStore } from "@/api/http";

describe("tokenStore", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("getAccessToken returns null when nothing stored", () => {
    expect(tokenStore.getAccessToken()).toBeNull();
  });

  it("getRefreshToken returns null when nothing stored", () => {
    expect(tokenStore.getRefreshToken()).toBeNull();
  });

  it("setTokens persists both tokens", () => {
    tokenStore.setTokens({ access_token: "access123", refresh_token: "refresh456" });
    expect(tokenStore.getAccessToken()).toBe("access123");
    expect(tokenStore.getRefreshToken()).toBe("refresh456");
  });

  it("clear removes both tokens", () => {
    tokenStore.setTokens({ access_token: "access123", refresh_token: "refresh456" });
    tokenStore.clear();
    expect(tokenStore.getAccessToken()).toBeNull();
    expect(tokenStore.getRefreshToken()).toBeNull();
  });

  it("overwrites existing tokens on setTokens", () => {
    tokenStore.setTokens({ access_token: "old", refresh_token: "oldref" });
    tokenStore.setTokens({ access_token: "new", refresh_token: "newref" });
    expect(tokenStore.getAccessToken()).toBe("new");
    expect(tokenStore.getRefreshToken()).toBe("newref");
  });
});

describe("ApiError", () => {
  it("is an instance of Error and ApiError", () => {
    const err = new ApiError(404, "Not Found", { detail: "missing" });
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(ApiError);
  });

  it("exposes status, message, and body", () => {
    const body = { detail: "forbidden" };
    const err = new ApiError(403, "Forbidden", body);
    expect(err.status).toBe(403);
    expect(err.message).toBe("Forbidden");
    expect(err.body).toBe(body);
    expect(err.name).toBe("ApiError");
  });

  it("works with null body", () => {
    const err = new ApiError(500, "Server Error", null);
    expect(err.body).toBeNull();
  });
});

describe("refreshAccessToken", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("returns null without fetch when token is not near expiration", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    tokenStore.setTokens({ access_token: "not-a-jwt", refresh_token: "refresh" });

    const result = await refreshAccessToken(false);

    expect(result).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("refreshes using cookie endpoint when forced", async () => {
    const payload = {
      access_token: "new-access",
      refresh_token: "new-refresh",
      token_type: "bearer",
      expires_in: 3600,
    };
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify(payload), { status: 200 }));

    tokenStore.setTokens({ access_token: "access", refresh_token: "refresh" });

    const result = await refreshAccessToken(true);

    expect(result).toEqual(payload);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenCalledWith("/api/auth/refresh", expect.any(Object));
    expect(tokenStore.getAccessToken()).toBe("new-access");
    expect(tokenStore.getRefreshToken()).toBe("new-refresh");
  });

  it("falls back to token endpoint when cookie refresh fails", async () => {
    const compatPayload = {
      access_token: "compat-access",
      refresh_token: "compat-refresh",
      token_type: "bearer",
      expires_in: 3600,
    };

    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response("", { status: 401 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(compatPayload), { status: 200 }));

    tokenStore.setTokens({ access_token: "old-access", refresh_token: "old-refresh" });

    const result = await refreshAccessToken(true);

    expect(result).toEqual(compatPayload);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(fetchSpy).toHaveBeenNthCalledWith(2, "/api/auth/refresh/token", expect.any(Object));
    expect(tokenStore.getAccessToken()).toBe("compat-access");
  });

  it("clears tokens when both refresh attempts fail", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response("", { status: 401 }))
      .mockResolvedValueOnce(new Response("", { status: 401 }));

    tokenStore.setTokens({ access_token: "old-access", refresh_token: "old-refresh" });

    const result = await refreshAccessToken(true);

    expect(result).toBeNull();
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(tokenStore.getAccessToken()).toBeNull();
    expect(tokenStore.getRefreshToken()).toBeNull();
  });

  it("deduplicates concurrent forced refresh requests", async () => {
    const payload = {
      access_token: "shared-access",
      refresh_token: "shared-refresh",
      token_type: "bearer",
      expires_in: 3600,
    };

    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify(payload), { status: 200 }));

    tokenStore.setTokens({ access_token: "old-access", refresh_token: "old-refresh" });

    const [first, second] = await Promise.all([refreshAccessToken(true), refreshAccessToken(true)]);

    expect(first).toEqual(payload);
    expect(second).toEqual(payload);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});

describe("apiRequest", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("sends JSON body with auth header when access token exists", async () => {
    tokenStore.setTokens({ access_token: "access-123", refresh_token: "refresh-123" });

    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response("", { status: 401 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            access_token: "new-access",
            refresh_token: "new-refresh",
            token_type: "bearer",
            expires_in: 3600,
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }));

    const result = await apiRequest<{ ok: boolean }>("/api/secure", {
      method: "POST",
      body: { hello: "world" },
    });

    expect(result).toEqual({ ok: true });
    expect(fetchSpy).toHaveBeenCalledTimes(3);
    expect(fetchSpy).toHaveBeenNthCalledWith(
      1,
      "/api/secure",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ hello: "world" }),
        headers: expect.objectContaining({
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: "Bearer access-123",
        }),
      }),
    );
    expect(fetchSpy).toHaveBeenNthCalledWith(
      3,
      "/api/secure",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("sends form-encoded body and does not force JSON content type", async () => {
    const form = new URLSearchParams({ a: "1", b: "2" });
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }));

    await apiRequest<{ ok: boolean }>("/api/form", {
      method: "POST",
      form,
      skipAuthRefresh: true,
    });

    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/form",
      expect.objectContaining({
        method: "POST",
        body: "a=1&b=2",
        headers: expect.not.objectContaining({ "Content-Type": "application/json" }),
      }),
    );
  });

  it("throws ApiError with detail message from JSON error body", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ detail: "Nope" }), { status: 403 }),
    );

    await expect(apiRequest("/api/fail", { skipAuthRefresh: true })).rejects.toMatchObject({
      status: 403,
      message: "Nope",
    });
  });

  it("throws ApiError with fallback message when error body has no detail", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ reason: "bad" }), { status: 500 }),
    );

    await expect(apiRequest("/api/fail2", { skipAuthRefresh: true })).rejects.toMatchObject({
      status: 500,
      message: "Request failed with status 500",
    });
  });

  it("parses plain text response when payload is not JSON", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response("plain", { status: 200 }));

    const result = await apiRequest<string>("/api/text", { skipAuthRefresh: true });

    expect(result).toBe("plain");
  });

  it("returns empty object for successful empty response body", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response("", { status: 200 }));

    const result = await apiRequest<Record<string, never>>("/api/empty", {
      skipAuthRefresh: true,
    });

    expect(result).toEqual({});
  });
});
