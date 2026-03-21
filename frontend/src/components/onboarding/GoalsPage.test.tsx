import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import React from "react";
import GoalsPage from "./GoalsPage";
import { AppProvider } from "@/context/AppContext";
import { goalPresets } from "@/data/mockData";

const renderWithProvider = (ui: React.ReactElement) => render(<AppProvider>{ui}</AppProvider>);

describe("GoalsPage", () => {
  it("renders the heading", () => {
    renderWithProvider(<GoalsPage />);
    expect(screen.getByText(/What are you saving for/i)).toBeInTheDocument();
  });

  it("renders all goal presets", () => {
    renderWithProvider(<GoalsPage />);
    goalPresets.forEach((preset) => {
      expect(screen.getByText(preset.name)).toBeInTheDocument();
    });
  });

  it("Continue button is disabled when no goal is selected", () => {
    renderWithProvider(<GoalsPage />);
    expect(screen.getByRole("button", { name: /Continue/i })).toBeDisabled();
  });

  it("selecting a preset enables the Continue button", () => {
    renderWithProvider(<GoalsPage />);
    fireEvent.click(screen.getByText(goalPresets[0].name));
    expect(screen.getByRole("button", { name: /Continue/i })).not.toBeDisabled();
  });

  it("shows 'Added ✓' after selecting a preset", () => {
    renderWithProvider(<GoalsPage />);
    fireEvent.click(screen.getByText(goalPresets[0].name));
    // Selected preset gets ring styling
    const btn = screen.getByText(goalPresets[0].name).closest("button")!;
    expect(btn).toHaveClass("ring-2");
  });

  it("deselecting a preset removes selection", () => {
    renderWithProvider(<GoalsPage />);
    fireEvent.click(screen.getByText(goalPresets[0].name));
    fireEvent.click(screen.getByText(goalPresets[0].name));
    const btn = screen.getByText(goalPresets[0].name).closest("button")!;
    expect(btn).not.toHaveClass("ring-2");
  });

  it("selecting a second preset replaces the first (single goal)", () => {
    renderWithProvider(<GoalsPage />);
    fireEvent.click(screen.getByText(goalPresets[0].name));
    fireEvent.click(screen.getByText(goalPresets[1].name));
    // Only the second preset is highlighted
    const btn0 = screen.getByText(goalPresets[0].name).closest("button")!;
    const btn1 = screen.getByText(goalPresets[1].name).closest("button")!;
    expect(btn0).not.toHaveClass("ring-2");
    expect(btn1).toHaveClass("ring-2");
  });

  it("shows custom goal form when 'Custom Goal' is clicked", () => {
    renderWithProvider(<GoalsPage />);
    fireEvent.click(screen.getByText("Custom Goal"));
    expect(screen.getByPlaceholderText("Goal name")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Target amount (£)")).toBeInTheDocument();
  });

  it("adds a custom goal", () => {
    renderWithProvider(<GoalsPage />);
    fireEvent.click(screen.getByText("Custom Goal"));
    fireEvent.change(screen.getByPlaceholderText("Goal name"), {
      target: { value: "New Car" },
    });
    fireEvent.change(screen.getByPlaceholderText("Target amount (£)"), {
      target: { value: "5000" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add Goal" }));
    expect(screen.getByText("New Car")).toBeInTheDocument();
  });

  it("closes custom goal form after adding", () => {
    renderWithProvider(<GoalsPage />);
    fireEvent.click(screen.getByText("Custom Goal"));
    fireEvent.change(screen.getByPlaceholderText("Goal name"), {
      target: { value: "New Car" },
    });
    fireEvent.change(screen.getByPlaceholderText("Target amount (£)"), {
      target: { value: "5000" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add Goal" }));
    expect(screen.queryByPlaceholderText("Goal name")).not.toBeInTheDocument();
  });
});
