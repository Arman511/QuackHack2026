import { vi, describe, it, expect } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { AppProvider } from "@/context/AppContext";
import ImpulseZonesPage from "@/components/onboarding/ImpulseZonesPage";
import { impulseCategories } from "@/data/mockData";

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
        <ImpulseZonesPage />
      </AppProvider>,
    );
  });
  return result!;
};

describe("ImpulseZonesPage", () => {
  it("renders heading", async () => {
    await renderPage();
    expect(screen.getByText(/what do you impulse buy/i)).toBeInTheDocument();
  });

  it("renders all impulse categories", async () => {
    await renderPage();
    impulseCategories.forEach((cat) => {
      expect(screen.getByText(cat)).toBeInTheDocument();
    });
  });

  it("Continue button is disabled when no categories selected", async () => {
    await renderPage();
    const btn = screen.getByRole("button", { name: /Continue/i });
    expect(btn).toBeDisabled();
  });

  it("Continue button is enabled after selecting a category", async () => {
    await renderPage();
    fireEvent.click(screen.getByText("Coffee"));
    const btn = screen.getByRole("button", { name: /Continue/i });
    expect(btn).not.toBeDisabled();
  });

  it("clicking a category sets data-selected to true", async () => {
    await renderPage();
    const coffeeBtn = screen.getByText("Coffee").closest("button")!;
    expect(coffeeBtn).toHaveAttribute("data-selected", "false");
    fireEvent.click(coffeeBtn);
    expect(coffeeBtn).toHaveAttribute("data-selected", "true");
  });

  it("clicking a selected category deselects it", async () => {
    await renderPage();
    const coffeeBtn = screen.getByText("Coffee").closest("button")!;
    fireEvent.click(coffeeBtn);
    expect(coffeeBtn).toHaveAttribute("data-selected", "true");
    fireEvent.click(coffeeBtn);
    expect(coffeeBtn).toHaveAttribute("data-selected", "false");
  });

  it("custom category can be added via input", async () => {
    await renderPage();
    const input = screen.getByPlaceholderText(/Add custom category/i);
    fireEvent.change(input, { target: { value: "Shoes" } });
    fireEvent.click(screen.getByRole("button", { name: "" })); // Plus icon button
    expect(screen.getByText("Shoes")).toBeInTheDocument();
  });
});
