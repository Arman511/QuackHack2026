import { vi, describe, it, expect } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { AppProvider } from "@/context/AppContext";
import OnboardingFlow from "@/components/onboarding/OnboardingFlow";

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

import { useApp } from "@/hooks/useApp";

// Component to set the onboarding step before rendering OnboardingFlow
const WithStep = ({ step }: { step: number }) => {
  const { setOnboardingStep } = useApp();
  // Render a trigger to set the step, then render the flow
  return (
    <>
      <button onClick={() => setOnboardingStep(step)} data-testid="set-step">
        Set Step
      </button>
      <OnboardingFlow />
    </>
  );
};

const renderWithStep = async (step: number) => {
  let result: ReturnType<typeof render>;
  await act(async () => {
    result = render(
      <AppProvider>
        <WithStep step={step} />
      </AppProvider>,
    );
  });
  // Trigger step change
  const btn = result!.container.querySelector('[data-testid="set-step"]') as HTMLElement;
  await act(async () => {
    btn.click();
  });
  return result!;
};

describe("OnboardingFlow", () => {
  it("renders LoginPage at step 0", async () => {
    let result: ReturnType<typeof render>;
    await act(async () => {
      result = render(
        <AppProvider>
          <OnboardingFlow />
        </AppProvider>,
      );
    });
    expect(screen.getByText("Neigh-ver Go Broke!!")).toBeInTheDocument();
  });

  it("renders ConnectBankPage at step 1", async () => {
    await renderWithStep(1);
    expect(screen.getByText("Connect your bank")).toBeInTheDocument();
  });

  it("renders BankDetailsPage at step 2", async () => {
    await renderWithStep(2);
    expect(screen.getByRole("button", { name: /Connect Accounts/i })).toBeInTheDocument();
  });

  it("renders ImpulseZonesPage at step 3", async () => {
    await renderWithStep(3);
    expect(screen.getByText(/what do you impulse buy/i)).toBeInTheDocument();
  });

  it("renders GoalsPage at step 4", async () => {
    await renderWithStep(4);
    expect(screen.getByText(/What are you saving for/i)).toBeInTheDocument();
  });

  it("renders BudgetPage at step 5", async () => {
    await renderWithStep(5);
    expect(screen.getByText(/Set your impulse budget/i)).toBeInTheDocument();
  });

  it("shows HorseProgressBar for steps > 0", async () => {
    await renderWithStep(1);
    expect(screen.getByText(/Step 1 of 5/)).toBeInTheDocument();
  });

  it("shows app branding in header for steps > 0", async () => {
    await renderWithStep(1);
    expect(screen.getByText("Neigh-ver Go Broke!")).toBeInTheDocument();
  });
});
