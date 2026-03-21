import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import React from "react";
import GoalsTab from "./GoalsTab";
import { AppProvider, useApp } from "@/context/AppContext";

const renderWithGoals= () => {
  const Wrapper = () => {
    const { addGoal } = useApp();
    React.useEffect(() => {
      addGoal({ id: "g-1", name: "Travel", target: 1000, saved: 250, icon: "✈️" });
    }, []);
    return <GoalsTab />;
  };
  return render(<AppProvider><Wrapper /></AppProvider>);
};

describe("GoalsTab", () => {
  it("renders the heading", () => {
    render(<AppProvider><GoalsTab /></AppProvider>);
    expect(screen.getByText(/Savings Goals/i)).toBeInTheDocument();
  });

  it("shows empty state when no goals", () => {
    render(<AppProvider><GoalsTab /></AppProvider>);
    // No goal cards — just the Neigh-Tax section
    expect(screen.getByText(/Current Neigh-Tax Rate/i)).toBeInTheDocument();
    expect(screen.queryByText("Travel")).not.toBeInTheDocument();
  });

  it("renders a goal card with name and amounts", () => {
    renderWithGoals();
    expect(screen.getByText("Travel")).toBeInTheDocument();
    expect(screen.getByText("£250 of £1000")).toBeInTheDocument();
  });

  it("shows correct completion percentage for a goal", () => {
    renderWithGoals();
    expect(screen.getByText("25%")).toBeInTheDocument();
  });

  it("renders the Neigh-Tax rate buttons", () => {
    render(<AppProvider><GoalsTab /></AppProvider>);
    expect(screen.getByRole("button", { name: "50%" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "100%" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "200%" })).toBeInTheDocument();
  });

  it("increasing the tax applies immediately without a modal", () => {
    render(<AppProvider><GoalsTab /></AppProvider>);
    // Default is 100% — clicking 200% is an increase
    fireEvent.click(screen.getByRole("button", { name: "200%" }));
    expect(screen.queryByText(/Explain yourself/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "200%" }).className).toContain("bg-primary");
  });

  it("decreasing the tax opens the justification modal", () => {
    render(<AppProvider><GoalsTab /></AppProvider>);
    // Default is 100% — clicking 50% is a decrease
    fireEvent.click(screen.getByRole("button", { name: "50%" }));
    expect(screen.getByText(/Explain yourself/i)).toBeInTheDocument();
  });

  it("Submit button in modal is disabled when justification is empty", () => {
    render(<AppProvider><GoalsTab /></AppProvider>);
    fireEvent.click(screen.getByRole("button", { name: "50%" }));
    expect(screen.getByRole("button", { name: "Submit" })).toBeDisabled();
  });

  it("submitting a justification applies the lower tax and closes modal", () => {
    render(<AppProvider><GoalsTab /></AppProvider>);
    fireEvent.click(screen.getByRole("button", { name: "50%" }));
    fireEvent.change(screen.getByPlaceholderText(/I swear it's for a good reason/i), {
      target: { value: "I genuinely need to lower it" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Submit" }));
    expect(screen.queryByText(/Explain yourself/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "50%" }).className).toContain("bg-primary");
  });

  it("Cancel button closes the modal without changing the tax", () => {
    render(<AppProvider><GoalsTab /></AppProvider>);
    fireEvent.click(screen.getByRole("button", { name: "50%" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByText(/Explain yourself/i)).not.toBeInTheDocument();
    // Tax should still be 100%
    expect(screen.getByRole("button", { name: "100%" }).className).toContain("bg-primary");
  });
});
