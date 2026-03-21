import { useApp } from "@/context/AppContext";
import { Button } from "@/components/ui/button";

const BudgetPage = () => {
  const {
    impulseBudget,
    neighTaxPercent,
    setImpulseBudget,
    setNeighTaxPercent,
    completeOnboarding,
  } = useApp();

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="text-center">
        <h2 className="text-xl font-bold">Set your impulse budget</h2>
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
          onChange={(e) => setImpulseBudget(Number(e.target.value))}
          className="w-full h-3 bg-secondary rounded-lg appearance-none cursor-pointer slider"
          style={{
            background: `linear-gradient(to right, hsl(var(--primary)) 0%, hsl(var(--primary)) ${(impulseBudget / 500) * 100}%, hsl(var(--secondary)) ${(impulseBudget / 500) * 100}%, hsl(var(--secondary)) 100%)`
          }}
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>£0</span>
          <span>£500</span>
        </div>
      </div>

      <div className="card-neigh space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Neigh-Tax Rate</span>
          <img src="/horse-head.png" alt="Horse" className="w-5 h-5 object-contain" />
        </div>
        <p className="text-xs text-muted-foreground">
          When you make an impulse purchase, we match part of it and move that money into your
          savings vault.
        </p>
        <div className="grid grid-cols-4 gap-2">
          {[0, 50, 100, 200].map((pct) => (
            <button
              key={pct}
              onClick={() => setNeighTaxPercent(pct)}
              className={`py-3 rounded-xl text-sm font-semibold transition-all duration-200 active:scale-[0.96] border focus:outline-none focus:ring-2 focus:ring-primary/50 ${
                neighTaxPercent === pct
                  ? "bg-primary/5 text-primary border-primary ring-2 ring-primary shadow-lg shadow-primary/20"
                  : "bg-secondary text-secondary-foreground border-border hover:shadow-md"
              }`}
            >
              {pct === 0 ? "None" : `${pct}%`}
            </button>
          ))}
        </div>
      </div>

      <Button
        onClick={completeOnboarding}
        className="w-full h-11 active:scale-[0.97] flex items-center gap-2 justify-center"
      >
        <span>Start Saving</span>
        <img src="/blonde-horse-head.png" alt="Horse" className="w-5 h-5 object-contain" />
      </Button>
    </div>
  );
};

export default BudgetPage;
