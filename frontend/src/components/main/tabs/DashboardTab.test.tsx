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
        <DashboardTab />
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

  it("renders Savings Vault section", async () => {
    await renderTab();
    expect(screen.getByText("Savings Vault")).toBeInTheDocument();
  });

  it("shows total saved amount", async () => {
    await renderTab();
    expect(screen.getByText("£240")).toBeInTheDocument();
  });

  it("renders Impulse Budget section", async () => {
    await renderTab();
    expect(screen.getByText("Impulse Budget")).toBeInTheDocument();
  });

  it("shows budget figures £45 / £100", async () => {
    await renderTab();
    expect(screen.getByText("£45 / £100")).toBeInTheDocument();
  });

  it("renders Recent Impulse Buys section", async () => {
    await renderTab();
    expect(screen.getByText("Recent Impulse Buys")).toBeInTheDocument();
  });

  it("renders Training Sessions section", async () => {
    await renderTab();
    expect(screen.getByText("Training Sessions")).toBeInTheDocument();
  });

  it("renders Spending Heatmap", async () => {
    await renderTab();
    expect(screen.getByText("Impulse Spending Heatmap")).toBeInTheDocument();
  });

  it("shows 'saved so far' label", async () => {
    await renderTab();
    expect(screen.getByText("saved so far")).toBeInTheDocument();
  });
});
