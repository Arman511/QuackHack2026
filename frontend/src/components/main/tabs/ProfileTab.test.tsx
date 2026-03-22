import { vi, describe, it, expect } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { AppProvider } from "@/context/AppContext";
import { useApp } from "@/hooks/useApp";
import ProfileTab from "@/components/main/tabs/ProfileTab";

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

import { logout as apiLogout } from "@/api/auth";

const SetEmailAndRender = () => {
  const { setEmail, connectBank } = useApp();
  return (
    <>
      <button onClick={() => setEmail("rider@ranch.com")}>setEmail</button>
      <button onClick={() => connectBank("Mane-zo")}>setBank</button>
      <ProfileTab />
    </>
  );
};

const renderTab = async ({ setEmail = false, setBank = false } = {}) => {
  let result: ReturnType<typeof render>;
  await act(async () => {
    result = render(
      <AppProvider>
        <SetEmailAndRender />
      </AppProvider>,
    );
  });
  if (setEmail) fireEvent.click(screen.getByText("setEmail"));
  if (setBank) fireEvent.click(screen.getByText("setBank"));
  return result!;
};

describe("ProfileTab", () => {
  it("renders Profile heading", async () => {
    await renderTab();
    expect(screen.getByRole("heading", { name: "Profile" })).toBeInTheDocument();
  });

  it("renders Account section", async () => {
    await renderTab();
    expect(screen.getByText("Account")).toBeInTheDocument();
  });

  it("shows default name fields when no user set", async () => {
    await renderTab();
    expect(screen.getByText("Impulse")).toBeInTheDocument();
    expect(screen.getByText("Cowboy")).toBeInTheDocument();
  });

  it("shows fallback email when no user set", async () => {
    await renderTab();
    expect(screen.getByText("cowboy@ranch.com")).toBeInTheDocument();
  });

  it("shows set email when email is provided via context", async () => {
    await renderTab({ setEmail: true });
    expect(screen.getByText("rider@ranch.com")).toBeInTheDocument();
  });

  it("shows 'No banks connected' when no bank set", async () => {
    await renderTab();
    expect(screen.getByText("No banks connected")).toBeInTheDocument();
  });

  it("shows connected bank when bank is set", async () => {
    await renderTab({ setBank: true });
    expect(screen.getByText("Mane-zo")).toBeInTheDocument();
    expect(screen.getByText("Connected")).toBeInTheDocument();
  });

  it("renders Notifications toggle", async () => {
    await renderTab();
    expect(screen.getByText("Notifications")).toBeInTheDocument();
  });

  it("renders Horse Neigh Alerts toggle", async () => {
    await renderTab();
    expect(screen.getByText("Horse Neigh Alerts")).toBeInTheDocument();
  });

  it("renders Log Out button", async () => {
    await renderTab();
    expect(screen.getByRole("button", { name: /Log Out/i })).toBeInTheDocument();
  });

  it("calls logout when Log Out button clicked", async () => {
    vi.mocked(apiLogout).mockResolvedValue({});
    await renderTab();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Log Out/i }));
    });
    expect(apiLogout).toHaveBeenCalled();
  });

  it("toggles notifications when toggle is clicked", async () => {
    await renderTab();
    // Find the notifications toggle div (not a button, it's a div with onClick)
    const notifLabel = screen.getByText("Notifications");
    const toggleRow = notifLabel.closest("div.flex");
    const toggle = toggleRow?.querySelector("[class*='rounded-full']") as HTMLElement;
    expect(toggle).toHaveClass("bg-primary"); // enabled by default
    fireEvent.click(toggle);
    expect(toggle).toHaveClass("bg-muted");
  });
});
