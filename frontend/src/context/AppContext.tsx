import React, { createContext, useContext, useState, ReactNode, useEffect } from "react";
import {
  mockTransactions,
  mockPunishments,
  mockNotifications,
  Transaction,
  Punishment,
  Goal,
  Notification,
} from "@/data/mockData";
import { login, register, me, logout as apiLogout } from "@/api/auth";
import { tokenStore } from "@/api/http";
import type { UserLoginRequest, UserRegisterRequest, UserMePublic } from "@/api/types";

interface BankDetails {
  bank: string;
  sortCode: string;
  checkingAccount: {
    number: string;
    name: string;
  };
  savingsAccount: {
    number: string;
    name: string;
  };
}

interface AppState {
  // Authentication state
  isAuthenticated: boolean;
  user: UserMePublic | null;
  authLoading: boolean;
  authError: string | null;

  // Existing state
  isOnboarded: boolean;
  onboardingStep: number;
  email: string;
  connectedBank: string | null;
  bankDetails: BankDetails | null;
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
  // Authentication functions
  login: (credentials: UserLoginRequest) => Promise<void>;
  register: (credentials: UserRegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  clearAuthError: () => void;

  // Existing functions
  setOnboardingStep: (s: number) => void;
  completeOnboarding: () => void;
  setEmail: (e: string) => void;
  connectBank: (b: string) => void;
  saveBankDetails: (details: BankDetails) => void;
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
}

const AppContext = createContext<AppContextType | null>(null);

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be inside AppProvider");
  return ctx;
};

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<AppState>({
    // Authentication state
    isAuthenticated: false,
    user: null,
    authLoading: false,
    authError: null,

    // Existing state
    isOnboarded: false,
    onboardingStep: 0,
    email: "",
    connectedBank: null,
    bankDetails: null,
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

  // Check for existing authentication on mount
  useEffect(() => {
    const checkExistingAuth = async () => {
      const tokens = tokenStore.getTokens();
      if (tokens?.access_token) {
        try {
          update({ authLoading: true, authError: null });
          const userData = await me();
          update({
            isAuthenticated: true,
            user: userData,
            email: userData.email || "",
            authLoading: false,
          });
        } catch (error) {
          console.error("Auth check failed:", error);
          tokenStore.clear();
          update({
            isAuthenticated: false,
            user: null,
            authLoading: false,
          });
        }
      } else {
        update({ authLoading: false });
      }
    };

    checkExistingAuth();
  }, []);

  // Authentication functions
  const handleLogin = async (credentials: UserLoginRequest) => {
    try {
      update({ authLoading: true, authError: null });
      const tokenData = await login(credentials);
      const userData = await me();
      update({
        isAuthenticated: true,
        user: userData,
        email: userData.email || "",
        authLoading: false,
        onboardingStep: userData.total_impulse_spent !== undefined ? 0 : 1, // Skip onboarding if user has data
      });
    } catch (error: any) {
      const errorMessage = error.message || "Login failed. Please try again.";
      update({
        isAuthenticated: false,
        user: null,
        authLoading: false,
        authError: errorMessage,
      });
      throw error;
    }
  };

  const handleRegister = async (credentials: UserRegisterRequest) => {
    try {
      update({ authLoading: true, authError: null });
      await register(credentials);
      // Registration successful - don't auto-login
      update({
        authLoading: false,
        authError: null,
      });
    } catch (error: any) {
      const errorMessage = error.message || "Registration failed. Please try again.";
      update({
        authLoading: false,
        authError: errorMessage,
      });
      throw error;
    }
  };

  const handleLogout = async () => {
    try {
      await apiLogout();
    } catch (error) {
      console.error("Logout API call failed:", error);
    } finally {
      update({
        isAuthenticated: false,
        user: null,
        isOnboarded: false,
        onboardingStep: 0,
        email: "",
        authError: null,
      });
    }
  };

  const checkAuth = async () => {
    try {
      update({ authLoading: true });
      const userData = await me();
      update({
        isAuthenticated: true,
        user: userData,
        authLoading: false,
      });
    } catch (error) {
      update({
        isAuthenticated: false,
        user: null,
        authLoading: false,
      });
      throw error;
    }
  };

  const ctx: AppContextType = {
    ...state,
    // Authentication functions
    login: handleLogin,
    register: handleRegister,
    logout: handleLogout,
    checkAuth,
    clearAuthError: () => update({ authError: null }),

    // Existing functions
    setOnboardingStep: (s) => update({ onboardingStep: s }),
    completeOnboarding: () => update({ isOnboarded: true }),
    setEmail: (e) => update({ email: e }),
    connectBank: (b) => update({ connectedBank: b }),
    saveBankDetails: (details) => update({ bankDetails: details }),
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
  };

  return <AppContext.Provider value={ctx}>{children}</AppContext.Provider>;
};
