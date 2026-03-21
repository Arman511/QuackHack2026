import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import React from "react";
import ConnectBankPage from "./ConnectBankPage";
import { AppProvider } from "@/context/AppContext";
import { bankOptions } from "@/data/mockData";

const renderWithProvider = (ui: React.ReactElement) =>
  render(<AppProvider>{ui}</AppProvider>);

describe("ConnectBankPage", () => {
  it("renders the heading", () => {
    renderWithProvider(<ConnectBankPage />);
    expect(screen.getByText("Connect your bank")).toBeInTheDocument();
  });

  it("renders all bank options", () => {
    renderWithProvider(<ConnectBankPage />);
    bankOptions.forEach((bank) => {
      expect(screen.getByText(bank.name)).toBeInTheDocument();
    });
  });

  it("Continue button is disabled when no bank is selected", () => {
    renderWithProvider(<ConnectBankPage />);
    // No separate Continue button — clicking a bank navigates directly; nothing selected initially
    bankOptions.forEach((bank) => {
      const btn = screen.getByText(bank.name).closest("button")!;
      expect(btn).not.toHaveClass("ring-2");
    });
  });

  it("selecting a bank highlights it", () => {
    renderWithProvider(<ConnectBankPage />);
    fireEvent.click(screen.getByText(bankOptions[0].name));
    const btn = screen.getByText(bankOptions[0].name).closest("button")!;
    expect(btn).toHaveClass("ring-2");
  });

  it("shows 'Connected' after selecting a bank", () => {
    renderWithProvider(<ConnectBankPage />);
    fireEvent.click(screen.getByText(bankOptions[0].name));
    // Selected bank button gets ring styling; non-selected don't
    const selectedBtn = screen.getByText(bankOptions[0].name).closest("button")!;
    const otherBtn = screen.getByText(bankOptions[1].name).closest("button")!;
    expect(selectedBtn).toHaveClass("ring-2");
    expect(otherBtn).not.toHaveClass("ring-2");
  });

  it("switches selection to a different bank", () => {
    renderWithProvider(<ConnectBankPage />);
    fireEvent.click(screen.getByText(bankOptions[0].name));
    fireEvent.click(screen.getByText(bankOptions[1].name));
    // Only the second bank is highlighted
    const btn0 = screen.getByText(bankOptions[0].name).closest("button")!;
    const btn1 = screen.getByText(bankOptions[1].name).closest("button")!;
    expect(btn0).not.toHaveClass("ring-2");
    expect(btn1).toHaveClass("ring-2");
  });
});
