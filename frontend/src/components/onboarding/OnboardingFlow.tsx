import { useApp } from "@/context/AppContext";
import HorseProgressBar from "@/components/HorseProgressBar";
import LoginPage from "./LoginPage";
import ConnectBankPage from "./ConnectBankPage";
import BankDetailsPage from "./BankDetailsPage";
import ImpulseZonesPage from "./ImpulseZonesPage";
import GoalsPage from "./GoalsPage";
import BudgetPage from "./BudgetPage";

const steps = [ConnectBankPage, BankDetailsPage, ImpulseZonesPage, GoalsPage, BudgetPage];

const OnboardingFlow = () => {
  const { onboardingStep } = useApp();

  if (onboardingStep === 0) return <LoginPage />;

  const StepComponent = steps[onboardingStep - 1];

  return (
    <div className="min-h-screen flex flex-col">
      <div className="pt-4 px-4">
        <div className="flex items-center gap-2 mb-2">
          <img src="/horse-head.png" alt="Horse" className="w-6 h-6 object-contain" />
          <span className="font-bold text-sm">Neigh-ver Go Broke!</span>
        </div>
        <HorseProgressBar totalSteps={5} />
      </div>
      <div className="flex-1 flex items-start justify-center px-4 py-6">
        <div className="w-full max-w-md">
          <StepComponent />
        </div>
      </div>
    </div>
  );
};

export default OnboardingFlow;
