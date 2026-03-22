import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
  useCallback,
  useRef,
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
import { listAccounts, listMyTransactionPunishments, listMyTransactions } from "@/api/bank";
import {
  createPossibleImpulse,
  getAllImpulses,
  getMyImpulses,
  removeMyPossibleImpulse,
  replaceMyImpulses,
} from "@/api/impulses";
import { setMyGoal } from "@/api/users";
import { tokenStore } from "@/api/http";
import { formatPounds, penceToPounds } from "@/utils/currency";
import type {
  UserLoginRequest,
  UserRegisterRequest,
  UserMePublic,
  BankAccountPublic,
  TransactionHydratedPublic,
  TransactionPunishmentPublic,
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

  // Goals & Settings API functions
  updateTaxPercentage: (percentage: number) => Promise<void>;
  updateImpulseBudget: (budget: number) => Promise<void>;
  updateGoalSetting: (goalName: string | null) => Promise<void>;
  updateImpulseCategories: (categories: string[]) => Promise<void>;

  // Existing functions
  setOnboardingStep: (s: number) => void;
  completeOnboarding: () => Promise<void>;
  setEmail: (e: string) => void;
  connectBank: (b: string) => void;
  saveBankDetails: (details: BankDetails) => void;
  toggleImpulseCategory: (c: string) => Promise<void>;
  addCustomCategory: (c: string) => Promise<void>;
  // Real-time API-integrated impulse category functions
  toggleImpulseCategoryWithApi: (category: string) => Promise<void>;
  addCustomCategoryWithApi: (category: string) => Promise<void>;
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
  const IMPULSE_DESELECT_DELETE_DELAY_MS = 5000;

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

  const impulseCategoriesRef = useRef<string[]>(state.impulseCategories);
  const pendingRealRemovalTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const pendingPossibleRemovalTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    impulseCategoriesRef.current = state.impulseCategories;
  }, [state.impulseCategories]);

  useEffect(() => {
    return () => {
      Object.values(pendingRealRemovalTimersRef.current).forEach((timerId) => {
        clearTimeout(timerId);
      });
      Object.values(pendingPossibleRemovalTimersRef.current).forEach((timerId) => {
        clearTimeout(timerId);
      });
    };
  }, []);

  const update = (partial: Partial<AppState>) => setState((prev) => ({ ...prev, ...partial }));

  const calculateTotalSavedFromAccounts = useCallback((accounts: BankAccountPublic[]): number => {
    const totalSavingsInPence = accounts
      .filter((account) => account.type === "SAVING")
      .reduce((sum, account) => sum + account.amount, 0);

    return penceToPounds(totalSavingsInPence);
  }, []);

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

    const getGoalIcon = (goalName: string) => {
      const name = goalName.toLowerCase();

      if (name.includes("shopping") || name.includes("clothes") || name.includes("fashion")) {
        return "shopping";
      }
      if (name.includes("travel") || name.includes("holiday") || name.includes("vacation")) {
        return "travel";
      }
      if (name.includes("emergency") || name.includes("security") || name.includes("fund")) {
        return "shield";
      }
      if (name.includes("house") || name.includes("home") || name.includes("deposit")) {
        return "house";
      }
      if (name.includes("debt") || name.includes("loan") || name.includes("credit")) {
        return "debt";
      }

      // Default fallback
      return "target";
    };

    update({
      goals: goalName
        ? [
            {
              id: `server-goal-${userData.id}`,
              name: goalName,
              target: 1000,
              saved: 0,
              icon: getGoalIcon(goalName),
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
      snapshot.impulseCategories
        .map((name) => name.trim())
        .filter(Boolean)
        .map((name) => name.toLowerCase()),
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
      const totalSavedCalculated = calculateTotalSavedFromAccounts(accounts);

      setState((prev) => ({
        ...prev,
        bankAccounts: accounts,
        totalSaved: totalSavedCalculated,
        goals: prev.goals.map((goal) => ({ ...goal, saved: totalSavedCalculated })),
        bankAccountsLoading: false,
      }));
    } catch (error) {
      console.error("Failed to fetch bank accounts:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to load bank accounts";
      update({
        bankAccountsLoading: false,
        bankAccountsError: errorMessage,
      });
    }
  }, [calculateTotalSavedFromAccounts]);

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
      `Whoa there cowboy! ${merchant} just galloped away with £${formatPounds(amount)}!`,
      `*Horse snort* Another ${merchant} splurge? Really?`,
      `Giddy up to the savings coral instead of ${merchant}!`,
      `That ${merchant} purchase wasn't very stable financial behavior!`,
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  }, []);

  const transformApiTransaction = useCallback(
    (apiTx: TransactionHydratedPublic): Transaction => {
      const hasExplicitImpulseClassification =
        apiTx.impulse_zone_id != null ||
        apiTx.possible_impulse_zone_id != null ||
        !!apiTx.impulse_zone_name ||
        !!apiTx.possible_impulse_zone_name;

      // Fallback for providers that do not tag impulse metadata yet:
      // treat generic purchase/debit-like transactions as impulse so dashboard
      // metrics and poor-choices list still reflect real activity.
      const merchant = (apiTx.merchant || "").toLowerCase();
      const isLikelyNonImpulseTransfer =
        merchant.includes("salary") ||
        merchant.includes("payroll") ||
        merchant.includes("transfer") ||
        merchant.includes("refund") ||
        merchant.includes("deposit");
      const inferredImpulse = !hasExplicitImpulseClassification && !isLikelyNonImpulseTransfer;
      const isImpulse = hasExplicitImpulseClassification || inferredImpulse;
      const amountInPounds = penceToPounds(apiTx.amount);

      return {
        id: apiTx.id.toString(),
        date: apiTx.timestamp.split("T")[0],
        description: apiTx.merchant,
        amount: amountInPounds,
        category: apiTx.impulse_zone_name || apiTx.possible_impulse_zone_name || "Purchase",
        isImpulse,
        horseMessage: isImpulse ? generateHorseMessage(apiTx.merchant, amountInPounds) : "",
      };
    },
    [generateHorseMessage],
  );

  const transformApiPunishment = useCallback(
    (apiPunishment: TransactionPunishmentPublic): Punishment => {
      const taxInPounds = penceToPounds(apiPunishment.tax_amount);

      return {
        id: apiPunishment.id.toString(),
        date: apiPunishment.timestamp.split("T")[0],
        transactionId: `tax-${apiPunishment.id}`,
        transactionDesc: `Neigh-Tax: £${formatPounds(taxInPounds)} collected`,
        transactionAmount: taxInPounds,
        punishment: "Automatic tax transfer to your savings goal",
      };
    },
    [],
  );

  const fetchTransactions = useCallback(async () => {
    try {
      update({ realTransactionsLoading: true, realTransactionsError: null });
      const [transactionsResponse, accountsResponse, punishmentsResponse] = await Promise.all([
        listMyTransactions(),
        listAccounts(),
        listMyTransactionPunishments(),
      ]);

      const apiTransactions = transactionsResponse;
      const accounts = accountsResponse ?? [];
      const apiPunishments = punishmentsResponse ?? [];
      const transformedTransactions = apiTransactions.map(transformApiTransaction);
      const transformedPunishments = apiPunishments.map(transformApiPunishment);

      // Calculate totals from real data
      const impulseTotal = transformedTransactions
        .filter((tx) => tx.isImpulse)
        .reduce((sum, tx) => sum + tx.amount, 0);

      // Money locked away is the sum of all savings account balances.
      const totalSavedCalculated = calculateTotalSavedFromAccounts(accounts);

      setState((prev) => ({
        ...prev,
        realTransactions: transformedTransactions,
        realTransactionsLoading: false,
        bankAccounts: accounts,
        punishments: transformedPunishments,
        impulseSpent: impulseTotal,
        totalSaved: totalSavedCalculated,
        goals: prev.goals.map((goal) => ({ ...goal, saved: totalSavedCalculated })),
        // Update transactions array for backward compatibility
        transactions: transformedTransactions,
      }));
    } catch (error) {
      console.error("Failed to fetch transactions:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to load transactions";
      update({
        realTransactionsLoading: false,
        realTransactionsError: errorMessage,
      });
    }
  }, [calculateTotalSavedFromAccounts, transformApiPunishment, transformApiTransaction]);

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

  // Goals & Settings API functions
  const updateTaxPercentage = useCallback(
    async (percentage: number) => {
      try {
        // Update local state immediately for responsive UI
        update({ neighTaxPercent: percentage });

        // Persist to API
        await setMyGoal({
          goal: state.goals[0]?.name?.trim() || null,
          impulse_limit: state.impulseBudget,
          tax_percentage: percentage,
        });
      } catch (error) {
        console.error("Failed to update tax percentage:", error);
        // Revert local state on error
        // We could show an error message here
        throw error;
      }
    },
    [state.goals, state.impulseBudget],
  );

  const updateImpulseBudget = useCallback(
    async (budget: number) => {
      try {
        // Update local state immediately for responsive UI
        update({ impulseBudget: budget });

        // Persist to API
        await setMyGoal({
          goal: state.goals[0]?.name?.trim() || null,
          impulse_limit: budget,
          tax_percentage: state.neighTaxPercent,
        });
      } catch (error) {
        console.error("Failed to update impulse budget:", error);
        // Revert local state on error
        throw error;
      }
    },
    [state.goals, state.neighTaxPercent],
  );

  const updateGoalSetting = useCallback(
    async (goalName: string | null) => {
      try {
        // Update local state immediately for responsive UI
        const newGoals = goalName
          ? [
              {
                id: `server-goal-${state.user?.id || "temp"}`,
                name: goalName,
                target: 1000,
                saved: 0,
                icon: "target",
              },
            ]
          : [];

        update({ goals: newGoals });

        // Persist to API
        await setMyGoal({
          goal: goalName,
          impulse_limit: state.impulseBudget,
          tax_percentage: state.neighTaxPercent,
        });
      } catch (error) {
        console.error("Failed to update goal setting:", error);
        // Revert local state on error
        throw error;
      }
    },
    [state.impulseBudget, state.neighTaxPercent, state.user?.id],
  );

  const updateImpulseCategories = useCallback(async (newCategories: string[]) => {
    try {
      // Update local state immediately for responsive UI
      update({ impulseCategories: newCategories });

      // Persist to API using the same logic as onboarding
      const [allImpulsesResponse, currentBundleResponse] = await Promise.all([
        getAllImpulses(),
        getMyImpulses(),
      ]);
      const allImpulses = allImpulsesResponse ?? [];
      const currentBundle = currentBundleResponse ?? { impulses: [], possible: [] };

      const selectedByLowerName = new Set(
        newCategories
          .map((name) => name.trim())
          .filter(Boolean)
          .map((name) => name.toLowerCase()),
      );
      const realImpulseIds = allImpulses
        .filter((zone) => selectedByLowerName.has(zone.name.toLowerCase()))
        .map((zone) => zone.id);

      await replaceMyImpulses({ impulse_ids: realImpulseIds });

      const knownNames = new Set(allImpulses.map((zone) => zone.name.toLowerCase()));
      const existingPossibleNames = new Set(
        currentBundle.possible.map((zone) => zone.name.toLowerCase()),
      );

      const newPossibleNames = newCategories
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
    } catch (error) {
      console.error("Failed to update impulse categories:", error);
      // Revert local state on error
      throw error;
    }
  }, []);

  const syncRealImpulses = useCallback(async (categories: string[]) => {
    const allImpulses = (await getAllImpulses()) ?? [];
    const selectedByLowerName = new Set(
      categories
        .map((name) => name.trim())
        .filter(Boolean)
        .map((name) => name.toLowerCase()),
    );

    const realImpulseIds = allImpulses
      .filter((zone) => selectedByLowerName.has(zone.name.toLowerCase()))
      .map((zone) => zone.id);

    await replaceMyImpulses({ impulse_ids: realImpulseIds });
  }, []);

  // Real-time API-integrated impulse category functions
  const toggleImpulseCategoryWithApi = useCallback(
    async (category: string) => {
      const newCategories = state.impulseCategories.includes(category)
        ? state.impulseCategories.filter((x) => x !== category)
        : [...state.impulseCategories, category];

      await updateImpulseCategories(newCategories);
    },
    [state.impulseCategories, updateImpulseCategories],
  );

  const addCustomCategoryWithApi = useCallback(
    async (category: string) => {
      const newCategories = [...state.impulseCategories, category];
      await updateImpulseCategories(newCategories);
    },
    [state.impulseCategories, updateImpulseCategories],
  );

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

    // Goals & Settings API functions
    updateTaxPercentage,
    updateImpulseBudget,
    updateGoalSetting,
    updateImpulseCategories,

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
    toggleImpulseCategory: async (c) => {
      const category = c.trim();
      if (!category) {
        return;
      }

      const categoryKey = category.toLowerCase();
      const wasSelected = state.impulseCategories.includes(category);
      const newCategories = wasSelected
        ? state.impulseCategories.filter((x) => x !== category)
        : [...state.impulseCategories, category];

      // Update local state immediately for responsive UI.
      update({ impulseCategories: newCategories });

      if (!state.isAuthenticated) {
        return;
      }

      if (!wasSelected) {
        // Re-enable: cancel any pending deletions.
        const pendingRealTimer = pendingRealRemovalTimersRef.current[categoryKey];
        if (pendingRealTimer) {
          clearTimeout(pendingRealTimer);
          delete pendingRealRemovalTimersRef.current[categoryKey];
        }

        const pendingPossibleTimer = pendingPossibleRemovalTimersRef.current[categoryKey];
        if (pendingPossibleTimer) {
          clearTimeout(pendingPossibleTimer);
          delete pendingPossibleRemovalTimersRef.current[categoryKey];
        }

        try {
          const [allImpulsesResponse, currentBundleResponse] = await Promise.all([
            getAllImpulses(),
            getMyImpulses(),
          ]);
          const allImpulses = allImpulsesResponse ?? [];
          const currentBundle = currentBundleResponse ?? { impulses: [], possible: [] };

          const isRealImpulse = allImpulses.some((zone) => zone.name.toLowerCase() === categoryKey);

          if (isRealImpulse) {
            await syncRealImpulses(newCategories);
            return;
          }

          const possibleExists = currentBundle.possible.some(
            (zone) => zone.name.toLowerCase() === categoryKey,
          );

          if (!possibleExists) {
            await createPossibleImpulse({ name: category });
          }
        } catch (error) {
          console.error("Failed to persist impulse category re-enable:", error);
        }

        return;
      }

      try {
        const [allImpulsesResponse, currentBundleResponse] = await Promise.all([
          getAllImpulses(),
          getMyImpulses(),
        ]);
        const allImpulses = allImpulsesResponse ?? [];
        const currentBundle = currentBundleResponse ?? { impulses: [], possible: [] };

        const isRealImpulse = allImpulses.some((zone) => zone.name.toLowerCase() === categoryKey);

        if (isRealImpulse) {
          const existingTimer = pendingRealRemovalTimersRef.current[categoryKey];
          if (existingTimer) {
            clearTimeout(existingTimer);
          }

          pendingRealRemovalTimersRef.current[categoryKey] = setTimeout(async () => {
            delete pendingRealRemovalTimersRef.current[categoryKey];

            const latestCategories = impulseCategoriesRef.current;
            const wasReenabled = latestCategories.includes(category);
            if (wasReenabled) {
              return;
            }

            try {
              await syncRealImpulses(latestCategories);
            } catch (error) {
              console.error("Failed to remove real impulse category:", error);
            }
          }, IMPULSE_DESELECT_DELETE_DELAY_MS);

          return;
        }

        const possibleZone = currentBundle.possible.find(
          (zone) => zone.name.toLowerCase() === categoryKey,
        );

        if (!possibleZone) {
          return;
        }

        const existingTimer = pendingPossibleRemovalTimersRef.current[categoryKey];
        if (existingTimer) {
          clearTimeout(existingTimer);
        }

        pendingPossibleRemovalTimersRef.current[categoryKey] = setTimeout(async () => {
          delete pendingPossibleRemovalTimersRef.current[categoryKey];

          const latestCategories = impulseCategoriesRef.current;
          const wasReenabled = latestCategories.includes(category);
          if (wasReenabled) {
            return;
          }

          try {
            await removeMyPossibleImpulse(possibleZone.id);
          } catch (error) {
            console.error("Failed to remove possible impulse category:", error);
          }
        }, IMPULSE_DESELECT_DELETE_DELAY_MS);
      } catch (error) {
        console.error("Failed to schedule impulse category removal:", error);
      }
    },
    addCustomCategory: async (c) => {
      // Update local state immediately for responsive UI
      setState((prev) => ({
        ...prev,
        impulseCategories: [...prev.impulseCategories, c],
      }));

      // If user is authenticated, persist changes immediately
      if (state.isAuthenticated) {
        try {
          const newCategories = [...state.impulseCategories, c];
          await updateImpulseCategories(newCategories);
        } catch (error) {
          console.error("Failed to persist custom category:", error);
          // Could revert local state here if needed
        }
      }
    },
    // Real-time API-integrated impulse category functions
    toggleImpulseCategoryWithApi,
    addCustomCategoryWithApi,
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
