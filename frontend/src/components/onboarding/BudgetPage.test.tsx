import { vi, describe, it, expect } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { AppProvider } from "@/context/AppContext";
import BudgetPage from "@/components/onboarding/BudgetPage";

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
        <BudgetPage />
      </AppProvider>,
    );
  });
  return result!;
};

describe("BudgetPage", () => {
  it("renders heading", async () => {
    await renderPage();
    expect(screen.getByText(/Set your impulse budget/i)).toBeInTheDocument();
  });

  it("shows default budget value of £100", async () => {
    await renderPage();
    expect(screen.getByText("£100")).toBeInTheDocument();
  });

  it("shows neigh-tax rate section", async () => {
    await renderPage();
    expect(screen.getByText(/Neigh-Tax Rate/i)).toBeInTheDocument();
  });

  it("renders neigh-tax options: None, 50%, 100%, 200%", async () => {
    await renderPage();
    expect(screen.getByRole("button", { name: "None" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "50%" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "100%" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "200%" })).toBeInTheDocument();
  });

  it("selects a neigh-tax rate by clicking", async () => {
    await renderPage();
    const noneBtn = screen.getByRole("button", { name: "None" });
    fireEvent.click(noneBtn);
    expect(noneBtn).toHaveClass("bg-primary/5");
  });

  it("renders Start Saving button", async () => {
    await renderPage();
    expect(screen.getByRole("button", { name: /Start Saving/i })).toBeInTheDocument();
  });

  it("updates displayed budget when slider changes", async () => {
    await renderPage();
    const slider = screen.getByRole("slider");
    fireEvent.change(slider, { target: { value: "200" } });
    expect(screen.getByText("£200")).toBeInTheDocument();
  });
});
