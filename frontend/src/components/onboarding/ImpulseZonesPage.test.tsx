import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import React from "react";
import ImpulseZonesPage from "./ImpulseZonesPage";
import { AppProvider } from "@/context/AppContext";
import { impulseCategories } from "@/data/mockData";

const renderWithProvider = (ui: React.ReactElement) =>
  render(<AppProvider>{ui}</AppProvider>);

describe("ImpulseZonesPage", () => {
  it("renders the heading", () => {
    renderWithProvider(<ImpulseZonesPage />);
    expect(screen.getByText(/what do you impulse buy/i)).toBeInTheDocument();
  });

  it("renders all preset impulse categories", () => {
    renderWithProvider(<ImpulseZonesPage />);
    impulseCategories.forEach((cat) => {
      expect(screen.getByText(cat)).toBeInTheDocument();
    });
  });

  it("Continue button is disabled when nothing is selected", () => {
    renderWithProvider(<ImpulseZonesPage />);
    expect(screen.getByRole("button", { name: /Continue/i })).toBeDisabled();
  });

  it("selecting a category enables the Continue button", () => {
    renderWithProvider(<ImpulseZonesPage />);
    fireEvent.click(screen.getByText(impulseCategories[0]));
    expect(screen.getByRole("button", { name: /Continue/i })).not.toBeDisabled();
  });

  it("selected category gets data-selected=true", () => {
    renderWithProvider(<ImpulseZonesPage />);
    const btn = screen.getByText(impulseCategories[0]).closest("button")!;
    expect(btn).toHaveAttribute("data-selected", "false");
    fireEvent.click(btn);
    expect(btn).toHaveAttribute("data-selected", "true");
  });

  it("deselecting a category removes it", () => {
    renderWithProvider(<ImpulseZonesPage />);
    const btn = screen.getByText(impulseCategories[0]).closest("button")!;
    fireEvent.click(btn);
    fireEvent.click(btn);
    expect(btn).toHaveAttribute("data-selected", "false");
  });

  it("adds a custom category via input and button", () => {
    renderWithProvider(<ImpulseZonesPage />);
    fireEvent.change(screen.getByPlaceholderText(/Add custom category/i), {
      target: { value: "Candles" },
    });
    fireEvent.click(screen.getByRole("button", { name: "" })); // Plus icon button
    expect(screen.getByText("Candles")).toBeInTheDocument();
  });

  it("adds a custom category via Enter key", () => {
    renderWithProvider(<ImpulseZonesPage />);
    const input = screen.getByPlaceholderText(/Add custom category/i);
    fireEvent.change(input, { target: { value: "Stationery" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(screen.getByText("Stationery")).toBeInTheDocument();
  });

  it("does not add a duplicate custom category", () => {
    renderWithProvider(<ImpulseZonesPage />);
    // Coffee is already a preset — try to add it as custom
    const input = screen.getByPlaceholderText(/Add custom category/i);
    fireEvent.change(input, { target: { value: "Coffee" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(screen.getAllByText("Coffee")).toHaveLength(1);
  });
});
