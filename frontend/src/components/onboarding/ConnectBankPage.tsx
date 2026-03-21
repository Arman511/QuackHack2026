import { useApp } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { bankOptions } from '@/data/mockData';
import { Check } from 'lucide-react';

const ConnectBankPage = () => {
  const { connectedBank, connectBank, setOnboardingStep } = useApp();

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="text-center">
        <h2 className="text-xl font-bold font-display">Connect your bank</h2>
        <p className="text-muted-foreground text-sm mt-1">
          We analyze your transactions to detect impulse spending.
        </p>
      </div>

      <div className="grid gap-3">
        {bankOptions.map((bank, i) => (
          <button
            key={bank.name}
            onClick={() => connectBank(bank.name)}
            className="card-neigh flex items-center justify-between animate-fade-up"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold"
                style={{ backgroundColor: bank.color + '18', color: bank.color }}
              >
                {bank.name[0]}
              </div>
              <span className="font-medium">{bank.name}</span>
            </div>
            {connectedBank === bank.name ? (
              <span className="flex items-center gap-1 text-xs font-medium text-primary">
                <Check size={14} /> Connected
              </span>
            ) : (
              <span className="text-xs text-muted-foreground">Connect</span>
            )}
          </button>
        ))}
      </div>

      <Button
        onClick={() => setOnboardingStep(2)}
        disabled={!connectedBank}
        className="w-full h-11 active:scale-[0.97]"
      >
        Continue 🐴
      </Button>
    </div>
  );
};

export default ConnectBankPage;
