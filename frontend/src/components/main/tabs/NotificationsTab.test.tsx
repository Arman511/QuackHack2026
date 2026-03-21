import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import React from "react";
import NotificationsTab from "./NotificationsTab";
import { AppProvider } from "@/context/AppContext";
import { mockNotifications } from "@/data/mockData";

const renderWithProvider = (ui: React.ReactElement) => render(<AppProvider>{ui}</AppProvider>);

describe("NotificationsTab", () => {
  it("renders the heading", () => {
    renderWithProvider(<NotificationsTab />);
    expect(screen.getByText(/Notifications/i)).toBeInTheDocument();
  });

  it("renders all mock notifications", () => {
    renderWithProvider(<NotificationsTab />);
    mockNotifications.forEach((n) => {
      expect(screen.getByText(n.title)).toBeInTheDocument();
    });
  });

  it("renders notification messages", () => {
    renderWithProvider(<NotificationsTab />);
    mockNotifications.forEach((n) => {
      expect(screen.getByText(n.message)).toBeInTheDocument();
    });
  });

  it("renders notification dates", () => {
    renderWithProvider(<NotificationsTab />);
    // dates may repeat, so just check at least one appears
    expect(screen.getAllByText(mockNotifications[0].date).length).toBeGreaterThanOrEqual(1);
  });

  it("renders the correct icon for each notification type", () => {
    renderWithProvider(<NotificationsTab />);
    // impulse → 🐴, punishment → 💀, savings → 🌾, info → 📢
    expect(screen.getAllByText("🐴").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("💀").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("🌾").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("📢").length).toBeGreaterThanOrEqual(1);
  });

  it("renders the correct number of notification cards", () => {
    const { container } = renderWithProvider(<NotificationsTab />);
    // Each notification is a card-neigh div
    const cards = container.querySelectorAll(".card-neigh");
    expect(cards).toHaveLength(mockNotifications.length);
  });
});
