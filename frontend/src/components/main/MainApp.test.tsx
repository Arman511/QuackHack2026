import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import React from "react";
import MainApp from "./MainApp";
import { AppProvider } from "@/context/AppContext";
import { mockNotifications } from "@/data/mockData";

const renderWithProvider = (ui: React.ReactElement) => render(<AppProvider>{ui}</AppProvider>);

describe("MainApp", () => {
  it("renders the bottom navigation bar", () => {
    renderWithProvider(<MainApp />);
    expect(screen.getByRole("navigation")).toBeInTheDocument();
  });

  it("renders all four nav tab buttons", () => {
    renderWithProvider(<MainApp />);
    expect(screen.getByRole("button", { name: /Dashboard/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Goals/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Alerts/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Profile/i })).toBeInTheDocument();
  });

  it("shows Dashboard tab by default", () => {
    renderWithProvider(<MainApp />);
    expect(screen.getByText("Neigh-ver Go Broke")).toBeInTheDocument();
  });

  it("Dashboard nav button is active by default", () => {
    renderWithProvider(<MainApp />);
    const dashBtn = screen.getByRole("button", { name: /Dashboard/i });
    expect(dashBtn).toHaveAttribute("data-active", "true");
  });

  it("clicking Goals tab shows GoalsTab content", () => {
    renderWithProvider(<MainApp />);
    fireEvent.click(screen.getByRole("button", { name: /Goals/i }));
    expect(screen.getByText(/Savings Goals/i)).toBeInTheDocument();
  });

  it("clicking Alerts tab shows NotificationsTab content", () => {
    renderWithProvider(<MainApp />);
    fireEvent.click(screen.getByRole("button", { name: /Alerts/i }));
    expect(screen.getByText(/Notifications/i)).toBeInTheDocument();
  });

  it("clicking Profile tab shows ProfileTab content", () => {
    renderWithProvider(<MainApp />);
    fireEvent.click(screen.getByRole("button", { name: /Profile/i }));
    expect(screen.getByText(/Profile 👤/i)).toBeInTheDocument();
  });

  it("only one tab's content is shown at a time", () => {
    renderWithProvider(<MainApp />);
    fireEvent.click(screen.getByRole("button", { name: /Goals/i }));
    expect(screen.queryByText("Neigh-ver Go Broke")).not.toBeInTheDocument();
    expect(screen.getByText(/Savings Goals/i)).toBeInTheDocument();
  });

  it("shows an unread badge on Alerts when notifications exist", () => {
    renderWithProvider(<MainApp />);
    const count = mockNotifications.length;
    const expected = count > 9 ? "9+" : String(count);
    expect(screen.getByText(expected)).toBeInTheDocument();
  });

  it("active tab button gets data-active=true", () => {
    renderWithProvider(<MainApp />);
    fireEvent.click(screen.getByRole("button", { name: /Goals/i }));
    expect(screen.getByRole("button", { name: /Goals/i })).toHaveAttribute("data-active", "true");
    expect(screen.getByRole("button", { name: /Dashboard/i })).toHaveAttribute(
      "data-active",
      "false",
    );
  });
});
