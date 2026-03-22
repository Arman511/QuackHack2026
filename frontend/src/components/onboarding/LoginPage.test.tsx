import { vi, describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { AppProvider } from "@/context/AppContext";
import LoginPage from "@/components/onboarding/LoginPage";

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

import { login as apiLogin, register as apiRegister } from "@/api/auth";

const renderPage = async () => {
  let result: ReturnType<typeof render>;
  await act(async () => {
    result = render(
      <AppProvider>
        <LoginPage />
      </AppProvider>,
    );
  });
  return result!;
};

describe("LoginPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the heading and subtitle", async () => {
    await renderPage();
    expect(screen.getByText("Neigh-ver Go Broke!!")).toBeInTheDocument();
    expect(screen.getByText(/Stop horsing around/i)).toBeInTheDocument();
  });

  it("defaults to login mode with Login button", async () => {
    await renderPage();
    expect(screen.getByRole("button", { name: "Login" })).toBeInTheDocument();
    expect(screen.queryByLabelText(/First Name/i)).not.toBeInTheDocument();
  });

  it("shows signup toggle text in login mode", async () => {
    await renderPage();
    expect(screen.getByText(/Don't have an account/i)).toBeInTheDocument();
  });

  it("switches to signup mode on toggle click", async () => {
    await renderPage();
    fireEvent.click(screen.getByText(/Sign up/i));
    expect(screen.getByRole("button", { name: /Create Account/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/First Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Confirm Password/i)).toBeInTheDocument();
  });

  it("shows 'Already have an account?' in signup mode", async () => {
    await renderPage();
    fireEvent.click(screen.getByText(/Sign up/i));
    expect(screen.getByText(/Already have an account/i)).toBeInTheDocument();
  });

  it("switches back to login mode from signup", async () => {
    await renderPage();
    fireEvent.click(screen.getByText(/Sign up/i));
    fireEvent.click(screen.getByText(/Login/i));
    expect(screen.getByRole("button", { name: "Login" })).toBeInTheDocument();
  });

  it("shows validation error when email is empty", async () => {
    await renderPage();
    fireEvent.click(screen.getByRole("button", { name: "Login" }));
    expect(await screen.findByText(/Email is required/i)).toBeInTheDocument();
  });

  it("shows validation error for invalid email", async () => {
    await renderPage();
    fireEvent.change(screen.getByPlaceholderText("cowboy@ranch.com"), {
      target: { value: "notanemail" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Login" }));
    expect(await screen.findByText(/valid email/i)).toBeInTheDocument();
  });

  it("shows validation error for short password", async () => {
    await renderPage();
    fireEvent.change(screen.getByPlaceholderText("cowboy@ranch.com"), {
      target: { value: "user@test.com" },
    });
    fireEvent.change(screen.getAllByPlaceholderText("••••••••")[0], {
      target: { value: "abc" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Login" }));
    expect(await screen.findByText(/at least 6 characters/i)).toBeInTheDocument();
  });

  it("calls login on valid login form submission", async () => {
    vi.mocked(apiLogin).mockResolvedValue({
      access_token: "tok",
      refresh_token: "ref",
      token_type: "bearer",
      expires_in: 3600,
    });
    await renderPage();
    fireEvent.change(screen.getByPlaceholderText("cowboy@ranch.com"), {
      target: { value: "user@test.com" },
    });
    fireEvent.change(screen.getAllByPlaceholderText("••••••••")[0], {
      target: { value: "password123" },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Login" }));
    });
    expect(apiLogin).toHaveBeenCalledWith({
      username: "user@test.com",
      password: "password123",
    });
  });

  it("shows passwords do not match error in signup mode", async () => {
    await renderPage();
    fireEvent.click(screen.getByText(/Sign up/i));
    fireEvent.change(screen.getByLabelText(/First Name/i), { target: { value: "John" } });
    fireEvent.change(screen.getByLabelText(/Last Name/i), { target: { value: "Doe" } });
    fireEvent.change(screen.getByPlaceholderText("cowboy@ranch.com"), {
      target: { value: "user@test.com" },
    });
    const passwordFields = screen.getAllByPlaceholderText("••••••••");
    fireEvent.change(passwordFields[0], { target: { value: "password123" } });
    fireEvent.change(passwordFields[1], { target: { value: "different456" } });
    fireEvent.click(screen.getByRole("button", { name: /Create Account/i }));
    expect(await screen.findByText(/Passwords do not match/i)).toBeInTheDocument();
  });

  it("calls register on valid signup form submission", async () => {
    vi.mocked(apiRegister).mockResolvedValue({
      id: 1,
      username: "user@test.com",
      email: "user@test.com",
      is_active: true,
      is_superuser: false,
      full_name: "Jane Doe",
    });
    await renderPage();
    fireEvent.click(screen.getByText(/Sign up/i));
    fireEvent.change(screen.getByLabelText(/First Name/i), { target: { value: "Jane" } });
    fireEvent.change(screen.getByLabelText(/Last Name/i), { target: { value: "Doe" } });
    fireEvent.change(screen.getByPlaceholderText("cowboy@ranch.com"), {
      target: { value: "jane@test.com" },
    });
    const passwordFields = screen.getAllByPlaceholderText("••••••••");
    fireEvent.change(passwordFields[0], { target: { value: "secret123" } });
    fireEvent.change(passwordFields[1], { target: { value: "secret123" } });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Create Account/i }));
    });
    expect(apiRegister).toHaveBeenCalledWith(
      expect.objectContaining({
        username: "jane@test.com",
        password: "secret123",
        email: "jane@test.com",
        full_name: "Jane Doe",
      }),
    );
    expect(await screen.findByText(/Account created successfully/i)).toBeInTheDocument();
  });
});
