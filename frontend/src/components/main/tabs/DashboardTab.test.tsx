import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import React from "react";
import DashboardTab from "./DashboardTab";
import { AppProvider } from "@/context/AppContext";
import { mockTransactions, mockPunishments } from "@/data/mockData";

const renderWithProvider = (ui: React.ReactElement) =>
  render(<AppProvider>{ui}</AppProvider>);

describe("DashboardTab", () => {
  it("renders the main heading", () => {
    renderWithProvider(<DashboardTab />);
    expect(screen.getByText("Neigh-ver Go Broke")).toBeInTheDocument();
  });

  it("shows the Savings Vault section", () => {
    renderWithProvider(<DashboardTab />);
    expect(screen.getByText(/Savings Vault/i)).toBeInTheDocument();
  });

  it("displays the total saved amount", () => {
    renderWithProvider(<DashboardTab />);
    expect(screen.getByText("£240")).toBeInTheDocument();
  });

  it("displays the impulse budget as spent / limit", () => {
    renderWithProvider(<DashboardTab />);
    expect(screen.getByText("£45 / £100")).toBeInTheDocument();
  });

  it("renders the spending heatmap section", () => {
    renderWithProvider(<DashboardTab />);
    expect(screen.getByText("Impulse Spending Heatmap")).toBeInTheDocument();
  });

  it("renders 28 heatmap cells", () => {
    const { container } = renderWithProvider(<DashboardTab />);
    // heatmap grid has 28 days × 1 cell each
    const grid = container.querySelector(".grid-cols-7")!;
    expect(grid.children).toHaveLength(28);
  });

  it("shows the Recent Impulse Buys section", () => {
    renderWithProvider(<DashboardTab />);
    expect(screen.getByText("Recent Impulse Buys")).toBeInTheDocument();
  });

  it("renders up to 5 impulse transactions", () => {
    renderWithProvider(<DashboardTab />);
    const impulse = mockTransactions.filter((t) => t.isImpulse).slice(0, 5);
    impulse.forEach((tx) => {
      expect(screen.getByText(tx.description)).toBeInTheDocument();
    });
  });

  it("shows negative amounts for impulse buys", () => {
    renderWithProvider(<DashboardTab />);
    expect(screen.getByText("-£5.40")).toBeInTheDocument();
  });

  it("renders Punishment History section", () => {
    renderWithProvider(<DashboardTab />);
    expect(screen.getByText("Punishment History")).toBeInTheDocument();
  });

  it("renders all mock punishments", () => {
    renderWithProvider(<DashboardTab />);
    mockPunishments.forEach((p) => {
      expect(screen.getByText(p.punishment)).toBeInTheDocument();
    });
  });

  it("does not show the budget warning when under 80%", () => {
    // default: £45 spent of £100 = 45% — under threshold
    renderWithProvider(<DashboardTab />);
    // The warning text is specifically "⚠️ Whoa there cowboy, budget nearly gone!"
    // (distinct from the horse message "Whoa there cowboy… another impulse buy")
    expect(screen.queryByText(/budget nearly gone/i)).not.toBeInTheDocument();
  });
});
