import { vi, describe, it, expect } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { AppProvider } from "@/context/AppContext";
import MainApp from "@/components/main/MainApp";

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

vi.mock("@/api/bank", () => ({
  listAccounts: vi.fn().mockResolvedValue([]),
  listMyTransactions: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/api/impulses", () => ({
  createPossibleImpulse: vi.fn().mockResolvedValue({}),
  getAllImpulses: vi.fn().mockResolvedValue([]),
  getMyImpulses: vi.fn().mockResolvedValue({ impulses: [], possible: [] }),
  replaceMyImpulses: vi.fn().mockResolvedValue({}),
}));

vi.mock("@/api/users", () => ({
  setMyGoal: vi.fn().mockResolvedValue({}),
}));

const renderApp = async () => {
  let result: ReturnType<typeof render>;
  await act(async () => {
    result = render(
      <AppProvider>
        <MainApp />
      </AppProvider>,
    );
  });
  return result!;
};

describe("MainApp", () => {
  it("renders Dashboard tab content by default", async () => {
    await renderApp();
    expect(screen.getByText("Neigh-ver Go Broke!")).toBeInTheDocument();
    expect(screen.getByText("Savings Vault")).toBeInTheDocument();
  });

  it("renders bottom navigation with 4 tabs", async () => {
    await renderApp();
    const tabs = screen
      .getAllByRole("button")
      .filter((b) =>
        ["Dashboard", "Goals", "Alerts", "Profile"].some((label) => b.textContent?.includes(label)),
      );
    expect(tabs.length).toBe(4);
  });

  it("switches to Goals tab", async () => {
    await renderApp();
    fireEvent.click(screen.getByText("Goals"));
    expect(screen.getByText("Savings Goals")).toBeInTheDocument();
  });

  it("switches to Alerts/Notifications tab", async () => {
    await renderApp();
    fireEvent.click(screen.getByText("Alerts"));
    expect(screen.getByText("Notifications")).toBeInTheDocument();
  });

  it("switches to Profile tab", async () => {
    await renderApp();
    fireEvent.click(screen.getByText("Profile"));
    expect(screen.getByRole("heading", { name: "Profile" })).toBeInTheDocument();
  });

  it("shows unread notification badge when notifications exist", async () => {
    await renderApp();
    // mockNotifications has 6 items by default
    const badges = screen.getAllByText("6");
    const notificationBadge = badges.find(
      (badge) => badge.className.includes("bg-impulse") && badge.className.includes("rounded-full"),
    );
    expect(notificationBadge).toBeInTheDocument();
  });

  it("switches back to Dashboard tab", async () => {
    await renderApp();
    fireEvent.click(screen.getByText("Goals"));
    fireEvent.click(screen.getByText("Dashboard"));
    expect(screen.getByText("Savings Vault")).toBeInTheDocument();
  });
});
