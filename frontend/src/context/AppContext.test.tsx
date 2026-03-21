import { renderHook, act } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import React from "react";
import { AppProvider, useApp } from "./AppContext";

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AppProvider>{children}</AppProvider>
);

describe("AppContext", () => {
  describe("initial state", () => {
    it("starts not onboarded", () => {
      const { result } = renderHook(() => useApp(), { wrapper });
      expect(result.current.isOnboarded).toBe(false);
    });

    it("starts at onboarding step 0", () => {
      const { result } = renderHook(() => useApp(), { wrapper });
      expect(result.current.onboardingStep).toBe(0);
    });

    it("has default impulse budget of £100", () => {
      const { result } = renderHook(() => useApp(), { wrapper });
      expect(result.current.impulseBudget).toBe(100);
    });

    it("has default neigh tax of 100%", () => {
      const { result } = renderHook(() => useApp(), { wrapper });
      expect(result.current.neighTaxPercent).toBe(100);
    });

    it("has no goals initially", () => {
      const { result } = renderHook(() => useApp(), { wrapper });
      expect(result.current.goals).toHaveLength(0);
    });

    it("has no impulse categories initially", () => {
      const { result } = renderHook(() => useApp(), { wrapper });
      expect(result.current.impulseCategories).toHaveLength(0);
    });
  });

  describe("onboarding", () => {
    it("setOnboardingStep updates the step", () => {
      const { result } = renderHook(() => useApp(), { wrapper });
      act(() => result.current.setOnboardingStep(2));
      expect(result.current.onboardingStep).toBe(2);
    });

    it("completeOnboarding marks as onboarded", () => {
      const { result } = renderHook(() => useApp(), { wrapper });
      act(() => result.current.completeOnboarding());
      expect(result.current.isOnboarded).toBe(true);
    });

    it("logout resets onboarding state", () => {
      const { result } = renderHook(() => useApp(), { wrapper });
      act(() => {
        result.current.completeOnboarding();
        result.current.setOnboardingStep(3);
      });
      act(() => result.current.logout());
      expect(result.current.isOnboarded).toBe(false);
      expect(result.current.onboardingStep).toBe(0);
    });
  });

  describe("email and bank", () => {
    it("setEmail stores the email", () => {
      const { result } = renderHook(() => useApp(), { wrapper });
      act(() => result.current.setEmail("test@example.com"));
      expect(result.current.email).toBe("test@example.com");
    });

    it("connectBank stores the bank name", () => {
      const { result } = renderHook(() => useApp(), { wrapper });
      act(() => result.current.connectBank("Monzo"));
      expect(result.current.connectedBank).toBe("Monzo");
    });
  });

  describe("goals", () => {
    const testGoal = { id: "g-1", name: "Travel", target: 1000, saved: 0, icon: "✈️" };

    it("addGoal adds a goal", () => {
      const { result } = renderHook(() => useApp(), { wrapper });
      act(() => result.current.addGoal(testGoal));
      expect(result.current.goals).toHaveLength(1);
      expect(result.current.goals[0].name).toBe("Travel");
    });

    it("removeGoal removes a goal by id", () => {
      const { result } = renderHook(() => useApp(), { wrapper });
      act(() => result.current.addGoal(testGoal));
      act(() => result.current.removeGoal("g-1"));
      expect(result.current.goals).toHaveLength(0);
    });

    it("clearGoals removes all goals", () => {
      const { result } = renderHook(() => useApp(), { wrapper });
      act(() => {
        result.current.addGoal(testGoal);
        result.current.addGoal({ ...testGoal, id: "g-2", name: "Laptop" });
      });
      act(() => result.current.clearGoals());
      expect(result.current.goals).toHaveLength(0);
    });

    it("updateGoal updates fields on a goal", () => {
      const { result } = renderHook(() => useApp(), { wrapper });
      act(() => result.current.addGoal(testGoal));
      act(() => result.current.updateGoal("g-1", { saved: 250 }));
      expect(result.current.goals[0].saved).toBe(250);
    });
  });

  describe("impulse categories", () => {
    it("toggleImpulseCategory adds a new category", () => {
      const { result } = renderHook(() => useApp(), { wrapper });
      act(() => result.current.toggleImpulseCategory("coffee"));
      expect(result.current.impulseCategories).toContain("coffee");
    });

    it("toggleImpulseCategory removes an existing category", () => {
      const { result } = renderHook(() => useApp(), { wrapper });
      act(() => result.current.toggleImpulseCategory("coffee"));
      act(() => result.current.toggleImpulseCategory("coffee"));
      expect(result.current.impulseCategories).not.toContain("coffee");
    });

    it("addCustomCategory appends a new category", () => {
      const { result } = renderHook(() => useApp(), { wrapper });
      act(() => result.current.addCustomCategory("vintage records"));
      expect(result.current.impulseCategories).toContain("vintage records");
    });
  });

  describe("budget and tax", () => {
    it("setImpulseBudget updates the budget", () => {
      const { result } = renderHook(() => useApp(), { wrapper });
      act(() => result.current.setImpulseBudget(250));
      expect(result.current.impulseBudget).toBe(250);
    });

    it("setNeighTaxPercent updates the tax", () => {
      const { result } = renderHook(() => useApp(), { wrapper });
      act(() => result.current.setNeighTaxPercent(200));
      expect(result.current.neighTaxPercent).toBe(200);
    });
  });

  describe("notifications", () => {
    it("toggleNotifications flips the flag", () => {
      const { result } = renderHook(() => useApp(), { wrapper });
      const initial = result.current.notificationsEnabled;
      act(() => result.current.toggleNotifications());
      expect(result.current.notificationsEnabled).toBe(!initial);
    });

    it("toggleHorseNeighAlerts flips the flag", () => {
      const { result } = renderHook(() => useApp(), { wrapper });
      const initial = result.current.horseNeighAlertsEnabled;
      act(() => result.current.toggleHorseNeighAlerts());
      expect(result.current.horseNeighAlertsEnabled).toBe(!initial);
    });
  });

  describe("useApp outside provider", () => {
    it("throws if used outside AppProvider", () => {
      expect(() => renderHook(() => useApp())).toThrow("useApp must be inside AppProvider");
    });
  });
});
