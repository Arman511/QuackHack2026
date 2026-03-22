import { vi, describe, it, expect } from "vitest";
import { render, screen, act } from "@testing-library/react";
import Index from "@/pages/Index";

vi.mock("@/api/auth", () => ({
  login: vi.fn(),
  register: vi.fn(),
  me: vi.fn().mockResolvedValue(null),
  logout: vi.fn().mockResolvedValue({}),
}));

vi.mock("@/api/http", () => ({
  tokenStore: {
    getTokens: vi.fn().mockReturnValue(null),
    getAccessToken: vi.fn().mockReturnValue(null),
    getRefreshToken: vi.fn().mockReturnValue(null),
    setTokens: vi.fn(),
    clear: vi.fn(),
  },
  ApiError: class extends Error {
    status = 0;
    body = null;
  },
  apiRequest: vi.fn(),
  refreshAccessToken: vi.fn().mockResolvedValue(null),
}));

describe("Index page", () => {
  it("shows LoginPage when not authenticated (default state)", async () => {
    await act(async () => {
      render(<Index />);
    });
    // LoginPage renders "Neigh-ver Go Broke!!" heading
    expect(screen.getByText("Neigh-ver Go Broke!!")).toBeInTheDocument();
  });

  it("shows Login submit button in default state", async () => {
    await act(async () => {
      render(<Index />);
    });
    expect(screen.getByRole("button", { name: /Login/i })).toBeInTheDocument();
  });
});
