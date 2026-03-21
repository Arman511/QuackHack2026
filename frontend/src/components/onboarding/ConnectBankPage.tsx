import { useApp } from "@/hooks/useApp";
import { bankOptions } from "@/data/mockData";

const ConnectBankPage = () => {
  const { connectedBank, connectBank, setOnboardingStep } = useApp();

  const handleBankSelect = (bankName: string) => {
    connectBank(bankName);
    // Navigate to bank details page (step 2)
    setOnboardingStep(2);
  };

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="text-center">
        <h2 className="text-xl font-bold">Connect your bank</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Choose your bank to connect your accounts.
        </p>
      </div>

      <div className="grid gap-3">
        {bankOptions.map((bank, i) => {
          const isConnected = connectedBank === bank.name;
          return (
            <button
              key={bank.name}
              onClick={() => handleBankSelect(bank.name)}
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
              <span className="text-xs text-muted-foreground">Select →</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ConnectBankPage;
