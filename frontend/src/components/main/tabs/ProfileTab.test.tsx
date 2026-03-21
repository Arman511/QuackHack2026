import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import React from "react";
import ProfileTab from "./ProfileTab";
import { AppProvider, useApp } from "@/context/AppContext";
import { renderHook, act } from "@testing-library/react";

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AppProvider>{children}</AppProvider>
);

describe("ProfileTab", () => {
  it("renders the heading", () => {
    render(
      <AppProvider>
        <ProfileTab />
      </AppProvider>,
    );
    expect(screen.getByText(/Profile/i)).toBeInTheDocument();
  });

  it("shows default email placeholder when no email set", () => {
    render(
      <AppProvider>
        <ProfileTab />
      </AppProvider>,
    );
    expect(screen.getByText("cowboy@ranch.com")).toBeInTheDocument();
  });

  it("shows the user's email when set", () => {
    const { result } = renderHook(() => useApp(), { wrapper });
    act(() => result.current.setEmail("test@example.com"));
    render(
      <AppProvider>
        <ProfileTab />
      </AppProvider>,
    );
    // Each AppProvider is independent — test via OnboardingFlow instead
    // Directly render with pre-seeded state via a wrapper
    const Wrapper = () => {
      const { setEmail } = useApp();
      React.useEffect(() => {
        setEmail("test@example.com");
      }, []);
      return <ProfileTab />;
    };
    render(
      <AppProvider>
        <Wrapper />
      </AppProvider>,
    );
    expect(screen.getByText("test@example.com")).toBeInTheDocument();
  });

  it("shows 'No banks connected' when no bank is set", () => {
    render(
      <AppProvider>
        <ProfileTab />
      </AppProvider>,
    );
    expect(screen.getByText("No banks connected")).toBeInTheDocument();
  });

  it("shows the connected bank name when a bank is set", () => {
    const Wrapper = () => {
      const { connectBank } = useApp();
      React.useEffect(() => {
        connectBank("Mane-zo");
      }, []);
      return <ProfileTab />;
    };
    render(
      <AppProvider>
        <Wrapper />
      </AppProvider>,
    );
    expect(screen.getByText("Mane-zo")).toBeInTheDocument();
    expect(screen.getByText("Connected ✓")).toBeInTheDocument();
  });

  it("renders Notifications and Horse Neigh Alerts toggles", () => {
    render(
      <AppProvider>
        <ProfileTab />
      </AppProvider>,
    );
    expect(screen.getByText("Notifications")).toBeInTheDocument();
    expect(screen.getByText("Horse Neigh Alerts")).toBeInTheDocument();
  });

  it("renders the Add Bank button", () => {
    render(
      <AppProvider>
        <ProfileTab />
      </AppProvider>,
    );
    expect(screen.getByRole("button", { name: /Add Bank/i })).toBeInTheDocument();
  });

  it("renders the Log Out button", () => {
    render(
      <AppProvider>
        <ProfileTab />
      </AppProvider>,
    );
    expect(screen.getByRole("button", { name: /Log Out/i })).toBeInTheDocument();
  });

  it("clicking Log Out resets onboarding state", () => {
    const IsOnboardedDisplay = () => {
      const { isOnboarded, completeOnboarding } = useApp();
      React.useEffect(() => {
        completeOnboarding();
      }, []);
      return (
        <>
          <div data-testid="onboarded">{isOnboarded ? "yes" : "no"}</div>
          <ProfileTab />
        </>
      );
    };
    render(
      <AppProvider>
        <IsOnboardedDisplay />
      </AppProvider>,
    );
    expect(screen.getByTestId("onboarded")).toHaveTextContent("yes");
    fireEvent.click(screen.getByRole("button", { name: /Log Out/i }));
    expect(screen.getByTestId("onboarded")).toHaveTextContent("no");
  });
});
