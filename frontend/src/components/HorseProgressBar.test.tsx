import { vi, describe, it, expect } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { AppProvider } from "@/context/AppContext";
import HorseProgressBar from "@/components/HorseProgressBar";

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

describe("HorseProgressBar", () => {
  it("renders step count text", async () => {
    await act(async () => {
      render(
        <AppProvider>
          <HorseProgressBar totalSteps={5} />
        </AppProvider>,
      );
    });
    expect(screen.getByText(/Step 0 of 5/)).toBeInTheDocument();
  });

  it("renders a horse gallop image", async () => {
    await act(async () => {
      render(
        <AppProvider>
          <HorseProgressBar totalSteps={5} />
        </AppProvider>,
      );
    });
    expect(screen.getByAltText("Horse")).toBeInTheDocument();
  });
});
