import { vi, describe, it, expect } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { AppProvider } from "@/context/AppContext";
import NotificationsTab from "@/components/main/tabs/NotificationsTab";
import { mockNotifications } from "@/data/mockData";

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
        <NotificationsTab />
      </AppProvider>,
    );
  });
  return result!;
};

describe("NotificationsTab", () => {
  it("renders Notifications heading", async () => {
    await renderTab();
    expect(screen.getByText("Notifications")).toBeInTheDocument();
  });

  it("renders all mock notifications", async () => {
    await renderTab();
    mockNotifications.forEach((n) => {
      expect(screen.getByText(n.title)).toBeInTheDocument();
    });
  });

  it("renders notification messages", async () => {
    await renderTab();
    mockNotifications.forEach((n) => {
      expect(screen.getByText(n.message)).toBeInTheDocument();
    });
  });

  it("renders notification dates", async () => {
    await renderTab();
    // Check at least one date is present
    expect(screen.getByText(mockNotifications[0].date)).toBeInTheDocument();
  });
});
