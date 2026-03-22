import { useApp } from "@/hooks/useApp";
import HorseProgressBar from "@/components/HorseProgressBar";
import ConnectBankPage from "./ConnectBankPage";
import BankDetailsPage from "./BankDetailsPage";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const AddBankFlow = () => {
  const { addBankStep, cancelAddBankFlow, completeAddBankFlow } = useApp();

  const steps = [ConnectBankPage, BankDetailsPage];
  const StepComponent = steps[addBankStep - 1];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <div className="pt-4 px-4">
        <div className="flex items-center justify-between mb-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={cancelAddBankFlow}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft size={16} />
            Back to Profile
          </Button>
          <div className="flex items-center gap-2">
            <img src="/horse-head.png" alt="Horse" className="w-6 h-6 object-contain" />
            <span className="font-bold text-sm">Add New Bank</span>
          </div>
        </div>
        <HorseProgressBar totalSteps={2} currentStep={addBankStep} />
      </div>

      {/* Step Content */}
      <div className="flex-1 flex items-start justify-center px-4 py-6">
        <div className="w-full max-w-md">{StepComponent && <StepComponent />}</div>
      </div>
    </div>
  );
};

export default AddBankFlow;
