import { useApp } from "@/hooks/useApp";
import HorseProgressBar from "@/components/HorseProgressBar";
import LoginPage from "./LoginPage";
import ConnectBankPage from "./ConnectBankPage";
import BankDetailsPage from "./BankDetailsPage";
import ImpulseZonesPage from "./ImpulseZonesPage";
import GoalsPage from "./GoalsPage";
import BudgetPage from "./BudgetPage";

const allSteps = [ConnectBankPage, BankDetailsPage, ImpulseZonesPage, GoalsPage, BudgetPage];

const OnboardingFlow = () => {
  const { onboardingStep, bankAccounts, bankAccountsLoading } = useApp();

  if (onboardingStep === 0) return <LoginPage />;

  // Determine if user has bank accounts (skip bank connection steps if they do)
  const hasBankAccounts = bankAccounts.length > 0;

  // Calculate which steps to show based on bank account status
  const activeSteps = hasBankAccounts
    ? [ImpulseZonesPage, GoalsPage, BudgetPage] // Skip bank connection steps
    : allSteps; // Show all steps

  // Calculate the current step index and progress
  let currentStepIndex: number;
  let progressStep: number;

  if (hasBankAccounts) {
    // If user has accounts and we're in step 3+, map to the shortened flow
    if (onboardingStep >= 3) {
      currentStepIndex = onboardingStep - 3; // Step 3 -> index 0, Step 4 -> index 1, etc.
      progressStep = onboardingStep - 3 + 1; // Step 3 -> progress step 1, Step 4 -> progress step 2, etc.
    } else {
      // Edge case: shouldn't happen, but fallback to first step
      currentStepIndex = 0;
      progressStep = 1;
    }
  } else {
    // Normal flow - show all steps
    currentStepIndex = onboardingStep - 1;
    progressStep = onboardingStep;
  }

  const StepComponent = activeSteps[currentStepIndex];
  const totalSteps = activeSteps.length;

  // Show loading state while checking bank accounts
  if (bankAccountsLoading && onboardingStep <= 2) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <div className="flex items-center gap-2 mb-4">
          <img src="/horse-head.png" alt="Horse" className="w-8 h-8 object-contain" />
          <span className="font-bold">Checking your account...</span>
        </div>
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="pt-4 px-4">
        <div className="flex items-center gap-2 mb-2">
          <img src="/horse-head.png" alt="Horse" className="w-6 h-6 object-contain" />
          <span className="font-bold text-sm">
            Neigh-ver Go Broke!
            {hasBankAccounts && (
              <span className="text-xs text-muted-foreground ml-2">(Bank accounts detected ✓)</span>
            )}
          </span>
        </div>
        <HorseProgressBar totalSteps={totalSteps} currentStep={progressStep} />
      </div>
      <div className="flex-1 flex items-start justify-center px-4 py-6">
        <div className="w-full max-w-md">{StepComponent && <StepComponent />}</div>
      </div>
    </div>
  );
};

export default OnboardingFlow;
