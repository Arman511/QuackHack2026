import { describe, it, expect, beforeEach } from "vitest";
import { tokenStore, ApiError } from "@/api/http";

describe("tokenStore", () => {
  beforeEach(() => {
    localStorage.clear();
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
