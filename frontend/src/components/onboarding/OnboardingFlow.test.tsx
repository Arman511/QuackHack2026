import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import React from "react";
import OnboardingFlow from "./OnboardingFlow";
import { AppProvider } from "@/context/AppContext";
import { bankOptions } from "@/data/mockData";

const renderFlow = () => render(<AppProvider><OnboardingFlow /></AppProvider>);

describe("OnboardingFlow", () => {
  it("shows LoginPage at step 0", () => {
    renderFlow();
    expect(screen.getByText(/Neigh-ver Go Broke!!/i)).toBeInTheDocument();
  });

  it("shows ConnectBankPage after login form submit", () => {
    const { container } = renderFlow();
    fireEvent.change(screen.getByPlaceholderText("cowboy@ranch.com"), {
      target: { value: "test@example.com" },
    });
    fireEvent.submit(container.querySelector("form")!);
    expect(screen.getByText("Connect your bank")).toBeInTheDocument();
  });

  it("shows progress bar after step 0", () => {
    const { container } = renderFlow();
    fireEvent.submit(container.querySelector("form")!);
    expect(screen.getByText(/Step \d+ of 5/i)).toBeInTheDocument();
  });

  it("advances to BankDetailsPage after clicking a bank", () => {
    const { container } = renderFlow();
    // Step 0 → 1: submit login
    fireEvent.submit(container.querySelector("form")!);
    // Step 1 → 2: click bank (goes directly to BankDetailsPage)
    fireEvent.click(screen.getByText(bankOptions[0].name));
    expect(screen.getByText(/Connect to/i)).toBeInTheDocument();
  });
});
