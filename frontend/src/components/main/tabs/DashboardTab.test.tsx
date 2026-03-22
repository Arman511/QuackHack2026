import { vi, describe, it, expect } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { AppProvider } from "@/context/AppContext";
import DashboardTab from "@/components/main/tabs/DashboardTab";

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

const renderTab = async () => {
  let result: ReturnType<typeof render>;
  await act(async () => {
    result = render(
      <AppProvider>
        <DashboardTab logout={vi.fn()} />
      </AppProvider>,
    );
  });
  return result!;
};

describe("DashboardTab", () => {
  it("renders the app heading", async () => {
    await renderTab();
    expect(screen.getByText("Neigh-ver Go Broke!")).toBeInTheDocument();
  });

  it("renders Money Locked Away section", async () => {
    await renderTab();
    expect(screen.getByText("Money Locked Away")).toBeInTheDocument();
  });

  it("shows total saved amount", async () => {
    await renderTab();
    expect(screen.getByText("£240")).toBeInTheDocument();
  });

  it("renders Impulse Budget Spent section", async () => {
    await renderTab();
    expect(screen.getByText("Impulse Budget Spent")).toBeInTheDocument();
  });

  it("shows budget figures £45 / £100", async () => {
    await renderTab();
    expect(screen.getByText("£45 / £100")).toBeInTheDocument();
  });

  it("renders Poor Financial Choices section", async () => {
    await renderTab();
    expect(screen.getByText("Poor Financial Choices")).toBeInTheDocument();
  });

  it("renders Name and Shame section", async () => {
    await renderTab();
    expect(screen.getByText("Name and Shame")).toBeInTheDocument();
  });

  it("renders Spending Heatmap", async () => {
    await renderTab();
    expect(screen.getByText("Impulse Spending Heatmap")).toBeInTheDocument();
  });

  it("shows 'Because you cannot be trusted yourself.' message", async () => {
    await renderTab();
    expect(screen.getByText("Because you cannot be trusted yourself.")).toBeInTheDocument();
  });
});
