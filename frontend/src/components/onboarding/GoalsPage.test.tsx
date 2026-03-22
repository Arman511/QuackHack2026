import { vi, describe, it, expect } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { AppProvider } from "@/context/AppContext";
import GoalsPage from "@/components/onboarding/GoalsPage";
import { goalPresets } from "@/data/mockData";

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

const renderPage = async () => {
  let result: ReturnType<typeof render>;
  await act(async () => {
    result = render(
      <AppProvider>
        <GoalsPage />
      </AppProvider>,
    );
  });
  return result!;
};

describe("GoalsPage", () => {
  it("renders heading", async () => {
    await renderPage();
    expect(screen.getByText(/What are you saving for/i)).toBeInTheDocument();
  });

  it("renders all goal presets", async () => {
    await renderPage();
    goalPresets.forEach((p) => {
      expect(screen.getByText(p.name)).toBeInTheDocument();
    });
  });

  it("renders Custom Goal button", async () => {
    await renderPage();
    expect(screen.getByText("Custom Goal")).toBeInTheDocument();
  });

  it("Continue button is disabled when no goals selected", async () => {
    await renderPage();
    expect(screen.getByRole("button", { name: /Continue/i })).toBeDisabled();
  });

  it("Continue is enabled after selecting a preset", async () => {
    await renderPage();
    fireEvent.click(screen.getByText("Travel").closest("button")!);
    expect(screen.getByRole("button", { name: /Continue/i })).not.toBeDisabled();
  });

  it("selected preset gets ring-2 class", async () => {
    await renderPage();
    const travelBtn = screen.getByText("Travel").closest("button")!;
    expect(travelBtn).not.toHaveClass("ring-2");
    fireEvent.click(travelBtn);
    expect(travelBtn).toHaveClass("ring-2");
  });

  it("selecting a different preset deselects the previous one", async () => {
    await renderPage();
    const travelBtn = screen.getByText("Travel").closest("button")!;
    const shoppingBtn = screen.getByText("Shopping").closest("button")!;
    fireEvent.click(travelBtn);
    expect(travelBtn).toHaveClass("ring-2");
    fireEvent.click(shoppingBtn);
    expect(travelBtn).not.toHaveClass("ring-2");
    expect(shoppingBtn).toHaveClass("ring-2");
  });

  it("clicking the same preset removes it", async () => {
    await renderPage();
    const travelBtn = screen.getByText("Travel").closest("button")!;
    fireEvent.click(travelBtn);
    expect(travelBtn).toHaveClass("ring-2");
    fireEvent.click(travelBtn);
    expect(travelBtn).not.toHaveClass("ring-2");
  });

  it("shows custom goal form when Custom Goal is clicked", async () => {
    await renderPage();
    fireEvent.click(screen.getByText("Custom Goal"));
    expect(screen.getByPlaceholderText("Goal name")).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Target amount/i)).toBeInTheDocument();
  });

  it("adds custom goal from the form", async () => {
    await renderPage();
    fireEvent.click(screen.getByText("Custom Goal"));
    fireEvent.change(screen.getByPlaceholderText("Goal name"), {
      target: { value: "New Bike" },
    });
    fireEvent.change(screen.getByPlaceholderText(/Target amount/i), {
      target: { value: "500" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Add Goal/i }));
    expect(screen.getByText("New Bike")).toBeInTheDocument();
  });
});
