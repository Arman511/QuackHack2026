import React, { createContext, useContext, useState, ReactNode } from "react";
import {
  mockTransactions,
  mockPunishments,
  mockNotifications,
  Transaction,
  Punishment,
  Goal,
  Notification,
} from "@/data/mockData";

interface AppState {
  isOnboarded: boolean;
  onboardingStep: number;
  email: string;
  connectedBank: string | null;
  impulseCategories: string[];
  goals: Goal[];
  impulseBudget: number;
  neighTaxPercent: number;
  transactions: Transaction[];
  punishments: Punishment[];
  notifications: Notification[];
  totalSaved: number;
  impulseSpent: number;
  notificationsEnabled: boolean;
  horseNeighAlertsEnabled: boolean;
}

interface AppContextType extends AppState {
  setOnboardingStep: (s: number) => void;
  completeOnboarding: () => void;
  setEmail: (e: string) => void;
  connectBank: (b: string) => void;
  toggleImpulseCategory: (c: string) => void;
  addCustomCategory: (c: string) => void;
  addGoal: (g: Goal) => void;
  removeGoal: (id: string) => void;
  clearGoals: () => void;
  updateGoal: (id: string, updates: Partial<Goal>) => void;
  setImpulseBudget: (b: number) => void;
  setNeighTaxPercent: (p: number) => void;
  toggleNotifications: () => void;
  toggleHorseNeighAlerts: () => void;
  logout: () => void;
}

const AppContext = createContext<AppContextType | null>(null);

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be inside AppProvider");
  return ctx;
};

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<AppState>({
    isOnboarded: false,
    onboardingStep: 0,
    email: "",
    connectedBank: null,
    impulseCategories: [],
    goals: [],
    impulseBudget: 100,
    neighTaxPercent: 100,
    transactions: mockTransactions,
    punishments: mockPunishments,
    notifications: mockNotifications,
    totalSaved: 240,
    impulseSpent: 45,
    notificationsEnabled: true,
    horseNeighAlertsEnabled: true,
  });

  const update = (partial: Partial<AppState>) => setState((prev) => ({ ...prev, ...partial }));

  const ctx: AppContextType = {
    ...state,
    setOnboardingStep: (s) => update({ onboardingStep: s }),
    completeOnboarding: () => update({ isOnboarded: true }),
    setEmail: (e) => update({ email: e }),
    connectBank: (b) => update({ connectedBank: b }),
    toggleImpulseCategory: (c) => {
      setState((prev) => ({
        ...prev,
        impulseCategories: prev.impulseCategories.includes(c)
          ? prev.impulseCategories.filter((x) => x !== c)
          : [...prev.impulseCategories, c],
      }));
    },
    addCustomCategory: (c) => {
      setState((prev) => ({
        ...prev,
        impulseCategories: [...prev.impulseCategories, c],
      }));
    },
    addGoal: (g) => setState((prev) => ({ ...prev, goals: [...prev.goals, g] })),
    removeGoal: (id) =>
      setState((prev) => ({ ...prev, goals: prev.goals.filter((g) => g.id !== id) })),
    clearGoals: () => setState((prev) => ({ ...prev, goals: [] })),
    updateGoal: (id, updates) =>
      setState((prev) => ({
        ...prev,
        goals: prev.goals.map((g) => (g.id === id ? { ...g, ...updates } : g)),
      })),
    setImpulseBudget: (b) => update({ impulseBudget: b }),
    setNeighTaxPercent: (p) => update({ neighTaxPercent: p }),
    toggleNotifications: () => update({ notificationsEnabled: !state.notificationsEnabled }),
    toggleHorseNeighAlerts: () =>
      update({ horseNeighAlertsEnabled: !state.horseNeighAlertsEnabled }),
    logout: () => update({ isOnboarded: false, onboardingStep: 0 }),
  };

  return <AppContext.Provider value={ctx}>{children}</AppContext.Provider>;
};
