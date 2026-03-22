import { vi, describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { AppProvider } from "@/context/AppContext";

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

import { login as apiLogin, logout as apiLogout } from "@/api/auth";
import { useApp } from "@/hooks/useApp";

const renderWithProvider = (ui: React.ReactElement) => render(<AppProvider>{ui}</AppProvider>);

// Helper component to expose context state
const StateDisplay = () => {
  const state = useApp();
  return (
    <div>
      <span data-testid="authenticated">{String(state.isAuthenticated)}</span>
      <span data-testid="onboarded">{String(state.isOnboarded)}</span>
      <span data-testid="step">{state.onboardingStep}</span>
      <span data-testid="budget">{state.impulseBudget}</span>
      <span data-testid="notif">{String(state.notificationsEnabled)}</span>
      <span data-testid="horse">{String(state.horseNeighAlertsEnabled)}</span>
      <span data-testid="categories">{state.impulseCategories.join(",")}</span>
      <span data-testid="goals">{state.goals.length}</span>
    </div>
  );
};

const ControlDisplay = () => {
  const {
    setOnboardingStep,
    completeOnboarding,
    toggleNotifications,
    toggleHorseNeighAlerts,
    toggleImpulseCategory,
    addCustomCategory,
    setImpulseBudget,
    addGoal,
    removeGoal,
    clearGoals,
    logout,
  } = useApp();
  return (
    <div>
      <button onClick={() => setOnboardingStep(3)}>setStep3</button>
      <button onClick={completeOnboarding}>complete</button>
      <button onClick={toggleNotifications}>toggleNotif</button>
      <button onClick={toggleHorseNeighAlerts}>toggleHorse</button>
      <button onClick={() => toggleImpulseCategory("Coffee")}>toggleCoffee</button>
      <button onClick={() => addCustomCategory("Shoes")}>addShoes</button>
      <button onClick={() => setImpulseBudget(200)}>setBudget200</button>
      <button
        onClick={() =>
          addGoal({ id: "g1", name: "Travel", target: 1000, saved: 0, icon: "travel" })
        }
      >
        addGoal
      </button>
      <button onClick={() => removeGoal("g1")}>removeGoal</button>
      <button onClick={clearGoals}>clearGoals</button>
      <button onClick={logout}>logout</button>
    </div>
  );
};

describe("AppContext / AppProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("provides default state", async () => {
    await act(async () => {
      renderWithProvider(<StateDisplay />);
    });
    expect(screen.getByTestId("authenticated").textContent).toBe("false");
    expect(screen.getByTestId("onboarded").textContent).toBe("false");
    expect(screen.getByTestId("step").textContent).toBe("0");
    expect(screen.getByTestId("budget").textContent).toBe("100");
    expect(screen.getByTestId("notif").textContent).toBe("true");
    expect(screen.getByTestId("horse").textContent).toBe("true");
  });

  it("setOnboardingStep updates step", async () => {
    await act(async () => {
      renderWithProvider(
        <>
          <StateDisplay />
          <ControlDisplay />
        </>,
      );
    });
    fireEvent.click(screen.getByText("setStep3"));
    expect(screen.getByTestId("step").textContent).toBe("3");
  });

  it("completeOnboarding sets isOnboarded to true", async () => {
    await act(async () => {
      renderWithProvider(
        <>
          <StateDisplay />
          <ControlDisplay />
        </>,
      );
    });
    fireEvent.click(screen.getByText("complete"));
    expect(screen.getByTestId("onboarded").textContent).toBe("true");
  });

  it("toggleNotifications flips notificationsEnabled", async () => {
    await act(async () => {
      renderWithProvider(
        <>
          <StateDisplay />
          <ControlDisplay />
        </>,
      );
    });
    expect(screen.getByTestId("notif").textContent).toBe("true");
    fireEvent.click(screen.getByText("toggleNotif"));
    expect(screen.getByTestId("notif").textContent).toBe("false");
    fireEvent.click(screen.getByText("toggleNotif"));
    expect(screen.getByTestId("notif").textContent).toBe("true");
  });

  it("toggleHorseNeighAlerts flips horseNeighAlertsEnabled", async () => {
    await act(async () => {
      renderWithProvider(
        <>
          <StateDisplay />
          <ControlDisplay />
        </>,
      );
    });
    fireEvent.click(screen.getByText("toggleHorse"));
    expect(screen.getByTestId("horse").textContent).toBe("false");
  });

  it("toggleImpulseCategory adds then removes category", async () => {
    await act(async () => {
      renderWithProvider(
        <>
          <StateDisplay />
          <ControlDisplay />
        </>,
      );
    });
    fireEvent.click(screen.getByText("toggleCoffee"));
    expect(screen.getByTestId("categories").textContent).toContain("Coffee");
    fireEvent.click(screen.getByText("toggleCoffee"));
    expect(screen.getByTestId("categories").textContent).not.toContain("Coffee");
  });

  it("addCustomCategory appends to impulseCategories", async () => {
    await act(async () => {
      renderWithProvider(
        <>
          <StateDisplay />
          <ControlDisplay />
        </>,
      );
    });
    fireEvent.click(screen.getByText("addShoes"));
    expect(screen.getByTestId("categories").textContent).toContain("Shoes");
  });

  it("setImpulseBudget updates impulseBudget", async () => {
    await act(async () => {
      renderWithProvider(
        <>
          <StateDisplay />
          <ControlDisplay />
        </>,
      );
    });
    fireEvent.click(screen.getByText("setBudget200"));
    expect(screen.getByTestId("budget").textContent).toBe("200");
  });

  it("addGoal and removeGoal manage goals array", async () => {
    await act(async () => {
      renderWithProvider(
        <>
          <StateDisplay />
          <ControlDisplay />
        </>,
      );
    });
    fireEvent.click(screen.getByText("addGoal"));
    expect(screen.getByTestId("goals").textContent).toBe("1");
    fireEvent.click(screen.getByText("removeGoal"));
    expect(screen.getByTestId("goals").textContent).toBe("0");
  });

  it("clearGoals empties the goals array", async () => {
    await act(async () => {
      renderWithProvider(
        <>
          <StateDisplay />
          <ControlDisplay />
        </>,
      );
    });
    fireEvent.click(screen.getByText("addGoal"));
    fireEvent.click(screen.getByText("clearGoals"));
    expect(screen.getByTestId("goals").textContent).toBe("0");
  });

  it("logout calls apiLogout and resets auth state", async () => {
    vi.mocked(apiLogout).mockResolvedValue({});
    await act(async () => {
      renderWithProvider(
        <>
          <StateDisplay />
          <ControlDisplay />
        </>,
      );
    });
    await act(async () => {
      fireEvent.click(screen.getByText("logout"));
    });
    expect(apiLogout).toHaveBeenCalled();
    expect(screen.getByTestId("authenticated").textContent).toBe("false");
  });

  it("throws if useApp is used outside AppProvider", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<StateDisplay />)).toThrow();
    consoleSpy.mockRestore();
  });

  it("login calls apiLogin and updates auth state on success", async () => {
    const tokenPayload = {
      access_token: "tok",
      refresh_token: "ref",
      token_type: "bearer",
      expires_in: 3600,
    };
    vi.mocked(apiLogin).mockResolvedValue(tokenPayload);

    const { me: apiMe } = await import("@/api/auth");
    vi.mocked(apiMe).mockResolvedValue({
      id: 1,
      email: "user@test.com",
      username: "user@test.com",
      is_active: true,
      is_superuser: false,
      full_name: "Test User",
    });

    const LoginControl = () => {
      const { login } = useApp();
      return (
        <button onClick={() => login({ username: "user@test.com", password: "pass123" })}>
          doLogin
        </button>
      );
    };

    await act(async () => {
      renderWithProvider(
        <>
          <StateDisplay />
          <LoginControl />
        </>,
      );
    });

    await act(async () => {
      fireEvent.click(screen.getByText("doLogin"));
    });

    expect(apiLogin).toHaveBeenCalledWith({ username: "user@test.com", password: "pass123" });
    expect(screen.getByTestId("authenticated").textContent).toBe("true");
  });
});
