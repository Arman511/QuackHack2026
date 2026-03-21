import { useApp } from '@/context/AppContext';
import { Button } from '@/components/ui/button';

const BudgetPage = () => {
  const { impulseBudget, neighTaxPercent, setImpulseBudget, setNeighTaxPercent, completeOnboarding } = useApp();

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="text-center">
        <h2 className="text-xl font-bold font-display">Set your impulse budget</h2>
        <p className="text-muted-foreground text-sm mt-1">
          How much can you spend on impulse buys each month?
        </p>
      </div>

      <div className="card-neigh space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium">Monthly Impulse Limit</span>
          <span className="text-lg font-bold text-primary">£{impulseBudget}</span>
        </div>
        <input
          type="range"
          min={0}
          max={500}
          step={10}
          value={impulseBudget}
          onChange={e => setImpulseBudget(Number(e.target.value))}
          className="w-full accent-primary h-2"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>£0</span>
          <span>£500</span>
        </div>
      </div>

      <div className="card-neigh space-y-4">
        <span className="text-sm font-medium block">Neigh-Tax Rate 🐴</span>
        <p className="text-xs text-muted-foreground">
          When you make an impulse purchase, we match part of it and move that money into your savings vault.
        </p>
        <div className="grid grid-cols-3 gap-2">
          {[50, 100, 200].map(pct => (
            <button
              key={pct}
              onClick={() => setNeighTaxPercent(pct)}
              className={`py-3 rounded-xl text-sm font-semibold transition-all active:scale-[0.96] border ${
                neighTaxPercent === pct
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-secondary text-secondary-foreground border-border'
              }`}
            >
              {pct}%
            </button>
          ))}
        </div>
      </div>

      <Button
        onClick={completeOnboarding}
        className="w-full h-11 active:scale-[0.97]"
      >
        Start Saving 🏇
      </Button>
    </div>
  );
};

export default BudgetPage;
