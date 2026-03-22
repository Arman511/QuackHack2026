import { vi, describe, it, expect } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { AppProvider } from "@/context/AppContext";
import { useApp } from "@/hooks/useApp";
import AddBankFlow from "@/components/onboarding/AddBankFlow";
import { bankOptions } from "@/data/mockData";

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

const WithStep = ({ step }: { step?: number }) => {
  const { setAddBankStep } = useApp();
  return (
    <>
      {step !== undefined && (
        <button onClick={() => setAddBankStep(step)} data-testid="set-step">
          Set Step
        </button>
      )}
      <AddBankFlow />
    </>
  );
};

const renderFlow = async (step?: number) => {
  let result: ReturnType<typeof render>;
  await act(async () => {
    result = render(
      <AppProvider>
        <WithStep step={step} />
      </AppProvider>,
    );
  });

  if (step !== undefined) {
    const btn = result!.container.querySelector('[data-testid="set-step"]') as HTMLElement;
    await act(async () => {
      btn.click();
    });
  }

  return result!;
};

describe("AddBankFlow", () => {
  it("renders header, progress, and bank options at step 1", async () => {
    await renderFlow();
    expect(screen.getByText("Add New Bank")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Back to Profile/i })).toBeInTheDocument();
    expect(screen.getByText(/Step 1 of 2/i)).toBeInTheDocument();
    bankOptions.forEach((bank) => {
      expect(screen.getByText(bank.name)).toBeInTheDocument();
    });
  });

  it("returns to step 1 when Back to Profile is clicked from step 2", async () => {
    await renderFlow(2);
    expect(screen.getByRole("button", { name: /Connect Accounts/i })).toBeInTheDocument();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Back to Profile/i }));
    });
    expect(screen.getByText("Connect your bank")).toBeInTheDocument();
  });
});
