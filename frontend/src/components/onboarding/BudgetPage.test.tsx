import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import React from "react";
import BudgetPage from "./BudgetPage";
import { AppProvider, useApp } from "@/context/AppContext";

const OnboardedDisplay = () => {
  const { isOnboarded } = useApp();
  return <div data-testid="onboarded">{isOnboarded ? "yes" : "no"}</div>;
};

const renderWithProvider = (ui: React.ReactElement) => render(<AppProvider>{ui}</AppProvider>);

describe("BudgetPage", () => {
  it("renders the heading", () => {
    renderWithProvider(<BudgetPage />);
    expect(screen.getByText(/Set your impulse budget/i)).toBeInTheDocument();
  });

  it("shows the default budget of £100", () => {
    renderWithProvider(<BudgetPage />);
    expect(screen.getByText("£100")).toBeInTheDocument();
  });

  it("updates displayed budget when slider changes", () => {
    renderWithProvider(<BudgetPage />);
    const slider = screen.getByRole("slider");
    fireEvent.change(slider, { target: { value: "250" } });
    expect(screen.getByText("£250")).toBeInTheDocument();
  });

  it("renders all four Neigh-Tax rate buttons", () => {
    renderWithProvider(<BudgetPage />);
    expect(screen.getByRole("button", { name: "None" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "50%" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "100%" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "200%" })).toBeInTheDocument();
  });

  it("100% tax button is active by default (default state)", () => {
    renderWithProvider(<BudgetPage />);
    const btn100 = screen.getByRole("button", { name: "100%" });
    expect(btn100.className).toContain("bg-primary");
  });

  it("clicking a tax button updates the selection", () => {
    renderWithProvider(<BudgetPage />);
    const btn50 = screen.getByRole("button", { name: "50%" });
    fireEvent.click(btn50);
    expect(btn50.className).toContain("bg-primary");
  });

  it("renders the Start Saving button", () => {
    renderWithProvider(<BudgetPage />);
    expect(screen.getByRole("button", { name: /Start Saving/i })).toBeInTheDocument();
  });

  it("clicking Start Saving completes onboarding", () => {
    render(
      <AppProvider>
        <OnboardedDisplay />
        <BudgetPage />
      </AppProvider>,
    );
    expect(screen.getByTestId("onboarded")).toHaveTextContent("no");
    fireEvent.click(screen.getByRole("button", { name: /Start Saving/i }));
    expect(screen.getByTestId("onboarded")).toHaveTextContent("yes");
  });
});
