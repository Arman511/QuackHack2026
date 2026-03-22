import { vi, describe, it, expect } from "vitest";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import { AppProvider } from "@/context/AppContext";
import { useApp } from "@/hooks/useApp";
import BankDetailsPage from "@/components/onboarding/BankDetailsPage";

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

// Pre-set connectedBank so we can test BankDetailsPage properly
const WrapperWithBank = ({ children }: { children: React.ReactNode }) => {
  return <AppProvider>{children}</AppProvider>;
};

const SetBankAndRender = () => {
  const { connectBank } = useApp();
  return (
    <div>
      <button onClick={() => connectBank("Mane-zo")}>setBank</button>
      <BankDetailsPage />
    </div>
  );
};

const renderPage = async () => {
  let result: ReturnType<typeof render>;
  await act(async () => {
    result = render(
      <WrapperWithBank>
        <SetBankAndRender />
      </WrapperWithBank>,
    );
  });
  fireEvent.click(screen.getByText("setBank"));
  return result!;
};

describe("BankDetailsPage", () => {
  it("renders heading with connected bank name", async () => {
    await renderPage();
    expect(screen.getByText(/Connect to Mane-zo/i)).toBeInTheDocument();
  });

  it("renders sort code, checking, and savings fields", async () => {
    await renderPage();
    expect(screen.getByPlaceholderText("12-34-56")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("My Checking Account")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("My Savings Account")).toBeInTheDocument();
  });

  it("renders Connect Accounts submit button", async () => {
    await renderPage();
    expect(screen.getByRole("button", { name: /Connect Accounts/i })).toBeInTheDocument();
  });

  it("limits account number inputs to 8 digits", async () => {
    await renderPage();

    const checkingInput = screen.getByPlaceholderText("12345678") as HTMLInputElement;
    const savingsInput = screen.getByPlaceholderText("87654321") as HTMLInputElement;

    fireEvent.change(checkingInput, { target: { value: "123456789999" } });
    fireEvent.change(savingsInput, { target: { value: "876543210000" } });

    expect(checkingInput.value).toBe("12345678");
    expect(savingsInput.value).toBe("87654321");
  });

  it("renders Back button", async () => {
    await renderPage();
    expect(screen.getByText(/← Back/i)).toBeInTheDocument();
  });

  it("shows validation errors when form submitted empty", async () => {
    await renderPage();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Connect Accounts/i }));
    });
    await waitFor(() => {
      expect(screen.getByText(/Sort code must be 6 digits/i)).toBeInTheDocument();
    });
  });

  it("submits successfully with valid data", async () => {
    await renderPage();

    // Fill sort code
    fireEvent.change(screen.getByPlaceholderText("12-34-56"), {
      target: { value: "12-34-56" },
    });
    // Fill checking account
    fireEvent.change(screen.getByPlaceholderText("My Checking Account"), {
      target: { value: "Main Checking" },
    });
    fireEvent.change(screen.getByPlaceholderText("12345678"), {
      target: { value: "12345678" },
    });
    // Fill savings account
    fireEvent.change(screen.getByPlaceholderText("My Savings Account"), {
      target: { value: "My Savings" },
    });
    fireEvent.change(screen.getByPlaceholderText("87654321"), {
      target: { value: "87654321" },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Connect Accounts/i }));
    });
    // If form is valid, no validation errors should appear
    expect(screen.queryByText(/Sort code must be 6 digits/i)).not.toBeInTheDocument();
  });
});
