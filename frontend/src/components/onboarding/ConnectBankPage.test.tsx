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
    expect(screen.getByRole("button", { name: /Continue/i })).toBeDisabled();
  });

  it("selecting a bank enables the Continue button", () => {
    renderWithProvider(<ConnectBankPage />);
    fireEvent.click(screen.getByText(bankOptions[0].name));
    expect(screen.getByRole("button", { name: /Continue/i })).not.toBeDisabled();
  });

  it("shows 'Connected' after selecting a bank", () => {
    renderWithProvider(<ConnectBankPage />);
    fireEvent.click(screen.getByText(bankOptions[0].name));
    expect(screen.getByText("Connected")).toBeInTheDocument();
  });

  it("switches selection to a different bank", () => {
    renderWithProvider(<ConnectBankPage />);
    fireEvent.click(screen.getByText(bankOptions[0].name));
    fireEvent.click(screen.getByText(bankOptions[1].name));
    // Only one "Connected" label at a time
    expect(screen.getAllByText("Connected")).toHaveLength(1);
  });
});
