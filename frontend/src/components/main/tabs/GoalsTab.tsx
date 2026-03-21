import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/ui/button';

const GoalsTab = () => {
  const { goals, updateGoal, neighTaxPercent, setNeighTaxPercent } = useApp();
  const [justifyModal, setJustifyModal] = useState<string | null>(null);
  const [justification, setJustification] = useState('');
  const [pendingTax, setPendingTax] = useState<number | null>(null);

  const handleTaxChange = (newTax: number) => {
    if (newTax < neighTaxPercent) {
      setPendingTax(newTax);
      setJustifyModal('tax');
    } else {
      setNeighTaxPercent(newTax);
    }
  };

  const submitJustification = () => {
    if (justification.trim() && pendingTax !== null) {
      setNeighTaxPercent(pendingTax);
      setJustifyModal(null);
      setJustification('');
      setPendingTax(null);
    }
  };

  return (
    <div className="p-4 space-y-5">
      <h1 className="text-lg font-bold font-display animate-fade-up">Savings Goals 💰</h1>

      <div className="space-y-3">
        {goals.map((goal, i) => {
          const percent = Math.min((goal.saved / goal.target) * 100, 100);
          return (
            <div key={goal.id} className="card-neigh animate-fade-up" style={{ animationDelay: `${i * 80}ms` }}>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl">{goal.icon}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium">{goal.name}</p>
                  <p className="text-xs text-muted-foreground tabular-nums">£{goal.saved} of £{goal.target}</p>
                </div>
                <span className="text-sm font-bold text-primary tabular-nums">{percent.toFixed(0)}%</span>
              </div>
              <div className="w-full h-2.5 bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${percent}%` }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Neigh-Tax Rate */}
      <div className="card-neigh animate-fade-up" style={{ animationDelay: '300ms' }}>
        <p className="text-sm font-medium mb-1">Current Neigh-Tax Rate</p>
        <p className="text-xs text-muted-foreground mb-3">Lowering this requires justification 🐴</p>
        <div className="grid grid-cols-3 gap-2">
          {[50, 100, 200].map(pct => (
            <button
              key={pct}
              onClick={() => handleTaxChange(pct)}
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

      {/* Justification Modal */}
      {justifyModal && (
        <div className="fixed inset-0 bg-foreground/40 flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="card-neigh w-full max-w-sm animate-fade-up">
            <h3 className="text-lg font-bold font-display mb-2">Explain yourself 🐴</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Why are you reducing your Neigh-Tax? The horse demands answers.
            </p>
            <textarea
              value={justification}
              onChange={e => setJustification(e.target.value)}
              placeholder="I swear it's for a good reason..."
              className="w-full h-24 px-4 py-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
            <div className="flex gap-2 mt-3">
              <Button variant="outline" onClick={() => { setJustifyModal(null); setPendingTax(null); }} className="flex-1 active:scale-[0.97]">
                Cancel
              </Button>
              <Button onClick={submitJustification} disabled={!justification.trim()} className="flex-1 active:scale-[0.97]">
                Submit
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GoalsTab;
