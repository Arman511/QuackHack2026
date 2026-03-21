import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import React from "react";
import LoginPage from "./LoginPage";
import { AppProvider, useApp } from "@/context/AppContext";

const renderWithProvider = (ui: React.ReactElement) =>
  render(<AppProvider>{ui}</AppProvider>);

// Helper that exposes context state alongside the component under test
const StepDisplay = () => {
  const { onboardingStep } = useApp();
  return <div data-testid="step">{onboardingStep}</div>;
};

describe("LoginPage", () => {
  it("renders the welcome heading", () => {
    renderWithProvider(<LoginPage />);
    expect(screen.getByText(/Neigh-ver Go Broke!!/i)).toBeInTheDocument();
  });

  it("shows email and password fields", () => {
    renderWithProvider(<LoginPage />);
    expect(screen.getByPlaceholderText("cowboy@ranch.com")).toBeInTheDocument();
    expect(screen.getAllByPlaceholderText("••••••••").length).toBeGreaterThanOrEqual(1);
  });

  it("shows only one password field in login mode by default", () => {
    renderWithProvider(<LoginPage />);
    expect(screen.getAllByPlaceholderText("••••••••")).toHaveLength(1);
  });

  it("shows confirm password field after switching to signup mode", () => {
    renderWithProvider(<LoginPage />);
    fireEvent.click(screen.getByText(/Don't have an account\?/i));
    expect(screen.getAllByPlaceholderText("••••••••")).toHaveLength(2);
  });

  it("shows 'Login' button by default", () => {
    renderWithProvider(<LoginPage />);
    expect(screen.getByRole("button", { name: /^Login$/i })).toBeInTheDocument();
  });

  it("shows 'Create Account' button after switching to signup mode", () => {
    renderWithProvider(<LoginPage />);
    fireEvent.click(screen.getByText(/Don't have an account\?/i));
    expect(screen.getByRole("button", { name: /Create Account/i })).toBeInTheDocument();
  });

  it("advances to step 1 on form submit", () => {
    const { container } = render(
      <AppProvider>
        <StepDisplay />
        <LoginPage />
      </AppProvider>
    );
    expect(screen.getByTestId("step")).toHaveTextContent("0");
    fireEvent.change(screen.getByPlaceholderText("cowboy@ranch.com"), {
      target: { value: "test@example.com" },
    });
    fireEvent.submit(container.querySelector("form")!);
    expect(screen.getByTestId("step")).toHaveTextContent("1");
  });
});
