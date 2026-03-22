import { vi, describe, it, expect } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { AppProvider } from "@/context/AppContext";
import { useApp } from "@/hooks/useApp";
import GoalsTab from "@/components/main/tabs/GoalsTab";

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

const WithGoal = () => {
  const { addGoal } = useApp();
  return (
    <>
      <button
        onClick={() =>
          addGoal({ id: "g1", name: "Travel", target: 1000, saved: 300, icon: "travel" })
        }
      >
        addGoal
      </button>
      <GoalsTab logout={vi.fn()} />
    </>
  );
};

const renderTab = async ({ withGoal = false } = {}) => {
  let result: ReturnType<typeof render>;
  await act(async () => {
    result = render(
      <AppProvider>{withGoal ? <WithGoal /> : <GoalsTab logout={vi.fn()} />}</AppProvider>,
    );
  });
  if (withGoal) {
    fireEvent.click(screen.getByText("addGoal"));
  }
  return result!;
};

describe("GoalsTab", () => {
  it("renders Savings Goals heading", async () => {
    await renderTab();
    expect(screen.getByText("Savings Goals")).toBeInTheDocument();
  });

  it("renders Neigh-Tax Rate section", async () => {
    await renderTab();
    expect(screen.getByText("Current Neigh-Tax Rate")).toBeInTheDocument();
  });

  it("renders tax rate buttons: 50%, 100%, 200%", async () => {
    await renderTab();
    expect(screen.getByRole("button", { name: "50%" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "100%" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "200%" })).toBeInTheDocument();
  });

  it("shows goal card when a goal exists", async () => {
    await renderTab({ withGoal: true });
    expect(screen.getByText("Travel")).toBeInTheDocument();
    expect(screen.getByText(/£300 of £1000/)).toBeInTheDocument();
  });

  it("shows justification modal when neigh-tax is lowered", async () => {
    await renderTab();
    // Default is 100%, click 50% (lower)
    fireEvent.click(screen.getByRole("button", { name: "50%" }));
    expect(screen.getByText("Explain yourself")).toBeInTheDocument();
  });

  it("does not show modal when neigh-tax is increased", async () => {
    await renderTab();
    // Default is 100%, click 200% (higher)
    fireEvent.click(screen.getByRole("button", { name: "200%" }));
    expect(screen.queryByText("Explain yourself")).not.toBeInTheDocument();
  });

  it("modal Cancel button closes the modal", async () => {
    await renderTab();
    fireEvent.click(screen.getByRole("button", { name: "50%" }));
    expect(screen.getByText("Explain yourself")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByText("Explain yourself")).not.toBeInTheDocument();
  });

  it("modal Submit requires justification text", async () => {
    await renderTab();
    fireEvent.click(screen.getByRole("button", { name: "50%" }));
    const submitBtn = screen.getByRole("button", { name: "Submit" });
    expect(submitBtn).toBeDisabled();
    fireEvent.change(screen.getByPlaceholderText(/I swear/i), {
      target: { value: "Good reason" },
    });
    expect(submitBtn).not.toBeDisabled();
  });
});
