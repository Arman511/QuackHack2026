import { useApp } from "@/context/AppContext";
import { Button } from "@/components/ui/button";
import { bankOptions } from "@/data/mockData";
import { Check } from "lucide-react";

const ConnectBankPage = () => {
  const { connectedBank, connectBank, setOnboardingStep } = useApp();

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="text-center">
        <h2 className="text-xl font-bold">Connect your bank</h2>
        <p className="text-muted-foreground text-sm mt-1">
          We analyze your transactions to detect impulse spending.
        </p>
      </div>

      <div className="grid gap-3">
        {bankOptions.map((bank, i) => {
          const isConnected = connectedBank === bank.name;
          return (
            <button
              key={bank.name}
              onClick={() => connectBank(bank.name)}
              className={`card-neigh flex items-center justify-between animate-fade-up transition-all duration-200 ${
                isConnected
                  ? "ring-2 ring-primary bg-primary/5 shadow-lg shadow-primary/20"
                  : "hover:shadow-md"
              }`}
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center ${bank.name === "Mane-zo" ? "overflow-hidden" : "p-1.5"}`}
                  style={{
                    backgroundColor: bank.name === "Rev-o-trot" ? "#ffffff" : bank.color + "18",
                  }}
                >
                  <img
                    src={bank.icon}
                    alt={bank.name}
                    className={`w-full h-full ${bank.name === "Mane-zo" ? "object-cover" : "object-contain"}`}
                  />
                </div>
                <span className="font-medium">{bank.name}</span>
              </div>
              {isConnected ? (
                <span className="flex items-center gap-1 text-xs font-medium text-primary">
                  <Check size={14} /> Connected
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">Connect</span>
              )}
            </button>
          );
        })}
      </div>

      <Button
        onClick={() => setOnboardingStep(2)}
        disabled={!connectedBank}
        className="w-full h-11 active:scale-[0.97] flex items-center gap-2 justify-center"
      >
        <span>Continue</span>
        <img src="/blonde-horse-head.png" alt="Horse" className="w-5 h-5 object-contain" />
      </Button>
    </div>
  );
};

export default ConnectBankPage;
