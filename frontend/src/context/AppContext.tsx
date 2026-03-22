import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
  useCallback,
} from "react";
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
import { listAccounts, listMyTransactions } from "@/api/bank";
import {
  createPossibleImpulse,
  getAllImpulses,
  getMyImpulses,
  replaceMyImpulses,
} from "@/api/impulses";
import { setMyGoal } from "@/api/users";
import { tokenStore } from "@/api/http";
import type {
  UserLoginRequest,
  UserRegisterRequest,
  UserMePublic,
  BankAccountPublic,
  TransactionHydratedPublic,
} from "@/api/types";

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

  // Bank Account API state
  bankAccounts: BankAccountPublic[];
  bankAccountsLoading: boolean;
  bankAccountsError: string | null;

  // Transaction API state
  realTransactions: Transaction[];
  realTransactionsLoading: boolean;
  realTransactionsError: string | null;

  // Add Bank Mode state
  isAddBankMode: boolean;
  addBankStep: number; // 1 = ConnectBank, 2 = BankDetails

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

  // Bank Account functions
  fetchBankAccounts: () => Promise<void>;
  refreshBankData: () => Promise<void>;
  clearBankAccountsError: () => void;

  // Transaction functions
  fetchTransactions: () => Promise<void>;
  refreshTransactionData: () => Promise<void>;
  clearTransactionsError: () => void;

  // Add Bank Mode functions
  startAddBankFlow: () => void;
  cancelAddBankFlow: () => void;
  setAddBankStep: (step: number) => void;
  completeAddBankFlow: () => void;

  // Existing functions
  setOnboardingStep: (s: number) => void;
  completeOnboarding: () => Promise<void>;
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

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<AppState>({
    // Authentication state
    isAuthenticated: false,
    user: null,
    authLoading: false,
    authError: null,

    // Bank Account API state
    bankAccounts: [],
    bankAccountsLoading: false,
    bankAccountsError: null,

    // Transaction API state
    realTransactions: [],
    realTransactionsLoading: false,
    realTransactionsError: null,

    // Add Bank Mode state
    isAddBankMode: false,
    addBankStep: 1,

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

  const defaultImpulseBudget = 100;
  const defaultTaxPercent = 100;

  const hydrateOnboardingState = useCallback(async (userData: UserMePublic) => {
    let selectedImpulses: string[] = [];

    try {
      const impulseBundle = await getMyImpulses();
      const realImpulses = impulseBundle?.impulses ?? [];
      const possibleImpulses = impulseBundle?.possible ?? [];
      selectedImpulses = [
        ...realImpulses.map((zone) => zone.name),
        ...possibleImpulses.map((zone) => zone.name),
      ];
    } catch (error) {
      console.error("Failed to fetch impulse bundle:", error);
    }

    const goalName = userData.goal?.trim();
    const hasOnboardingData =
      !!goalName ||
      userData.impulse_limit != null ||
      userData.tax_percentage != null ||
      selectedImpulses.length > 0;

    update({
      goals: goalName
        ? [
          {
            id: `server-goal-${userData.id}`,
            name: goalName,
            target: 1000,
            saved: 0,
            icon: "target",
          },
        ]
        : [],
      impulseBudget: userData.impulse_limit ?? defaultImpulseBudget,
      neighTaxPercent: userData.tax_percentage ?? defaultTaxPercent,
      impulseCategories: selectedImpulses,
      isOnboarded: hasOnboardingData,
    });

    return hasOnboardingData;
  }, []);

  const persistOnboardingState = useCallback(async (snapshot: AppState) => {
    const goalName = snapshot.goals[0]?.name?.trim() || null;

    await setMyGoal({
      goal: goalName,
      impulse_limit: snapshot.impulseBudget,
      tax_percentage: snapshot.neighTaxPercent,
    });

    const [allImpulsesResponse, currentBundleResponse] = await Promise.all([
      getAllImpulses(),
      getMyImpulses(),
    ]);
    const allImpulses = allImpulsesResponse ?? [];
    const currentBundle = currentBundleResponse ?? { impulses: [], possible: [] };

    const selectedByLowerName = new Set(
      snapshot.impulseCategories.map((name) => name.trim()).filter(Boolean).map((name) => name.toLowerCase()),
    );
    const realImpulseIds = allImpulses
      .filter((zone) => selectedByLowerName.has(zone.name.toLowerCase()))
      .map((zone) => zone.id);

    await replaceMyImpulses({ impulse_ids: realImpulseIds });

    const knownNames = new Set(allImpulses.map((zone) => zone.name.toLowerCase()));
    const existingPossibleNames = new Set(
      currentBundle.possible.map((zone) => zone.name.toLowerCase()),
    );

    const newPossibleNames = snapshot.impulseCategories
      .map((name) => name.trim())
      .filter(Boolean)
      .filter((name) => {
        const lower = name.toLowerCase();
        return !knownNames.has(lower) && !existingPossibleNames.has(lower);
      });

    await Promise.all(
      newPossibleNames.map(async (name) => {
        try {
          await createPossibleImpulse({ name });
        } catch (error) {
          console.error(`Failed to create possible impulse: ${name}`, error);
        }
      }),
    );
  }, []);

  // Check for existing authentication on mount
  useEffect(() => {
    const checkExistingAuth = async () => {
      const accessToken = tokenStore.getAccessToken();
      if (accessToken) {
        try {
          update({ authLoading: true, authError: null });
          const userData = await me();
          const hasOnboardingData = await hydrateOnboardingState(userData);

          update({
            isAuthenticated: true,
            user: userData,
            email: userData.email || "",
            authLoading: false,
            isOnboarded: hasOnboardingData,
          });

          try {
            const accountsResponse = await listAccounts();
            const accounts = accountsResponse ?? [];
            update({
              bankAccounts: accounts,
              onboardingStep: hasOnboardingData ? 1 : accounts.length > 0 ? 3 : 1,
            });

            await fetchTransactions();
          } catch (error) {
            console.error("Failed to hydrate bank data on auth check:", error);
          }
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
      await login(credentials);
      const userData = await me();
      const hasOnboardingData = await hydrateOnboardingState(userData);

      update({
        isAuthenticated: true,
        user: userData,
        email: userData.email || "",
        authLoading: false,
        isOnboarded: hasOnboardingData,
      });

      // Fetch user's bank accounts and transactions after successful login
      try {
        // Fetch bank accounts first to determine onboarding flow
        const accountsResponse = await listAccounts();
        const accounts = accountsResponse ?? [];

        // Determine appropriate onboarding step based on user data and bank accounts
        let appropriateOnboardingStep = 1; // Default to first step

        if (hasOnboardingData) {
          appropriateOnboardingStep = 1;
        } else if (accounts.length > 0) {
          appropriateOnboardingStep = 3; // Skip bank steps if accounts exist
        }

        // Update with bank accounts and correct onboarding step
        update({
          bankAccounts: accounts,
          onboardingStep: appropriateOnboardingStep,
        });

        await fetchTransactions();
      } catch (error) {
        console.error("Failed to fetch user data after login:", error);
        // If bank fetch fails, still proceed with default onboarding
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Login failed. Please try again.";
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
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Registration failed. Please try again.";
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

  // Bank Account functions
  const fetchBankAccounts = useCallback(async () => {
    try {
      update({ bankAccountsLoading: true, bankAccountsError: null });
      const accounts = await listAccounts();

      update({
        bankAccounts: accounts,
        bankAccountsLoading: false,
      });
    } catch (error) {
      console.error("Failed to fetch bank accounts:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to load bank accounts";
      update({
        bankAccountsLoading: false,
        bankAccountsError: errorMessage,
      });
    }
  }, []);

  const refreshBankData = async () => {
    await fetchBankAccounts();
  };

  const clearBankAccountsError = () => {
    update({ bankAccountsError: null });
  };

  // Transaction functions
  const generateHorseMessage = useCallback((merchant: string, amount: number): string => {
    const messages = [
      `Neighhh! That ${merchant} purchase made your wallet lighter!`,
      `Whoa there cowboy! ${merchant} just galloped away with £${amount}!`,
      `*Horse snort* Another ${merchant} splurge? Really?`,
      `Giddy up to the savings coral instead of ${merchant}!`,
      `That ${merchant} purchase wasn't very stable financial behavior!`,
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  }, []);

  const transformApiTransaction = useCallback(
    (apiTx: TransactionHydratedPublic): Transaction => ({
      id: apiTx.id.toString(),
      date: apiTx.timestamp.split("T")[0],
      description: apiTx.merchant,
      amount: apiTx.amount / 100, // Convert from cents to pounds
      category: apiTx.impulse_zone_name || "Other",
      isImpulse: !!apiTx.impulse_zone_id,
      horseMessage: apiTx.impulse_zone_id
        ? generateHorseMessage(apiTx.merchant, apiTx.amount / 100)
        : "",
    }),
    [generateHorseMessage],
  );

  const fetchTransactions = useCallback(async () => {
    try {
      update({ realTransactionsLoading: true, realTransactionsError: null });
      const apiTransactions = await listMyTransactions();
      const transformedTransactions = apiTransactions.map(transformApiTransaction);

      // Calculate totals from real data
      const impulseTotal = transformedTransactions
        .filter((tx) => tx.isImpulse)
        .reduce((sum, tx) => sum + tx.amount, 0);

      // Calculate total saved based on neigh-tax from impulse spending
      // This is a simplified calculation - in reality you'd want to track actual transfers to savings
      const savedFromImpulses = impulseTotal * (state.neighTaxPercent / 100);
      const totalSavedCalculated = savedFromImpulses + 240; // 240 is base savings

      update({
        realTransactions: transformedTransactions,
        realTransactionsLoading: false,
        impulseSpent: impulseTotal,
        totalSaved: totalSavedCalculated,
        // Update transactions array for backward compatibility
        transactions: transformedTransactions,
      });
    } catch (error) {
      console.error("Failed to fetch transactions:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to load transactions";
      update({
        realTransactionsLoading: false,
        realTransactionsError: errorMessage,
      });
    }
  }, [transformApiTransaction]);

  const refreshTransactionData = async () => {
    await fetchTransactions();
  };

  const clearTransactionsError = () => {
    update({ realTransactionsError: null });
  };

  // Add Bank Mode functions
  const startAddBankFlow = () => {
    update({
      isAddBankMode: true,
      addBankStep: 1,
      connectedBank: null, // Reset bank selection
      bankDetails: null, // Reset bank details
    });
  };

  const cancelAddBankFlow = () => {
    update({
      isAddBankMode: false,
      addBankStep: 1,
      connectedBank: null,
      bankDetails: null,
    });
  };

  const setAddBankStep = (step: number) => {
    update({ addBankStep: step });
  };

  const completeAddBankFlow = async () => {
    // Refresh bank accounts to show the new account
    await fetchBankAccounts();

    // Exit add bank mode
    update({
      isAddBankMode: false,
      addBankStep: 1,
      connectedBank: null,
      bankDetails: null,
    });
  };

  const ctx: AppContextType = {
    ...state,
    // Authentication functions
    login: handleLogin,
    register: handleRegister,
    logout: handleLogout,
    checkAuth,
    clearAuthError: () => update({ authError: null }),

    // Bank Account functions
    fetchBankAccounts,
    refreshBankData,
    clearBankAccountsError,

    // Transaction functions
    fetchTransactions,
    refreshTransactionData,
    clearTransactionsError,

    // Add Bank Mode functions
    startAddBankFlow,
    cancelAddBankFlow,
    setAddBankStep,
    completeAddBankFlow,

    // Existing functions
    setOnboardingStep: (s) => update({ onboardingStep: s }),
    completeOnboarding: async () => {
      update({ isOnboarded: true });
      try {
        await persistOnboardingState(state);
      } catch (error) {
        console.error("Failed to persist onboarding state:", error);
      }
    },
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

export { AppContext };
