import { useApp } from "@/hooks/useApp";
import { useMemo, useEffect } from "react";
import { Vault, AlertTriangle, Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

const DashboardTab = () => {
  const {
    totalSaved,
    impulseBudget,
    impulseSpent,
    transactions,
    realTransactions,
    realTransactionsLoading,
    realTransactionsError,
    fetchTransactions,
    clearTransactionsError,
    punishments,
    user,
  } = useApp();

  // Fetch transactions when component mounts
  useEffect(() => {
    if (user) {
      fetchTransactions();
    }
  }, [user]);

  // Use real transactions if available, otherwise fallback to mock data
  const displayTransactions = realTransactions.length > 0 ? realTransactions : transactions;

  const budgetPercent = Math.min((impulseSpent / impulseBudget) * 100, 100);
  const impulseTransactions = displayTransactions.filter((t) => t.isImpulse);

  // Build heatmap for the last 28 days
  const heatmapDays = useMemo(() => {
    const days: { date: string; total: number; txs: typeof displayTransactions }[] = [];
    for (let i = 27; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const dayTxs = impulseTransactions.filter((t) => t.date === dateStr);
      const total = dayTxs.reduce((s, t) => s + t.amount, 0);
      days.push({ date: dateStr, total, txs: dayTxs });
    }
    return days;
  }, [impulseTransactions, displayTransactions]);

  const maxSpend = Math.max(...heatmapDays.map((d) => d.total), 1);

  return (
    <div className="p-4 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-2 animate-fade-up">
        <img src="/horse-head.png" alt="Horse" className="w-10 h-10 object-contain" />
        <h1 className="text-lg font-bold">Neigh-ver Go Broke!</h1>
      </div>

      {/* Transaction Loading State */}
      {realTransactionsLoading && (
        <div
          className="card-neigh animate-fade-up flex items-center gap-2 justify-center py-4"
          style={{ animationDelay: "50ms" }}
        >
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm text-muted-foreground">Loading your transactions...</span>
        </div>
      )}

      {/* Transaction Error State */}
      {realTransactionsError && (
        <Alert variant="destructive" className="animate-fade-up" style={{ animationDelay: "50ms" }}>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>{realTransactionsError}</span>
            <div className="flex gap-2">
              <Button
                variant="link"
                size="sm"
                className="h-auto p-0 text-destructive underline"
                onClick={fetchTransactions}
              >
                Retry
              </Button>
              <Button
                variant="link"
                size="sm"
                className="h-auto p-0 text-destructive underline"
                onClick={clearTransactionsError}
              >
                Dismiss
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Savings Vault */}
      <div className="card-neigh text-center animate-fade-up" style={{ animationDelay: "100ms" }}>
        <div className="flex items-center justify-center gap-2 mb-2">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
            Savings Vault
          </p>
          <Vault size={16} className="text-muted-foreground" />
        </div>
        <div className="relative w-24 h-24 mx-auto mb-3">
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
            <circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              stroke="var(--color-border)"
              strokeWidth="8"
            />
            <circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              stroke="var(--color-savings)"
              strokeWidth="8"
              strokeDasharray={`${(totalSaved / 2000) * 264} 264`}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xl font-bold">£{totalSaved}</span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">saved so far</p>
      </div>

      {/* Impulse Budget */}
      <div className="card-neigh animate-fade-up" style={{ animationDelay: "200ms" }}>
        <div className="flex justify-between items-center mb-3">
          <span className="text-sm font-medium">Impulse Budget</span>
          <span className="text-sm font-bold tabular-nums">
            £{impulseSpent} / £{impulseBudget}
          </span>
        </div>
        <div className="w-full h-3 bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500 ease-out"
            style={{
              width: `${budgetPercent}%`,
              backgroundColor:
                budgetPercent > 80
                  ? "var(--color-impulse)"
                  : budgetPercent > 50
                    ? "var(--color-warning)"
                    : "var(--color-savings)",
            }}
          />
        </div>
        {budgetPercent > 80 && (
          <div className="flex items-center gap-1 text-xs text-impulse mt-2">
            <AlertTriangle size={12} />
            <span>Whoa there cowboy, budget nearly gone!</span>
          </div>
        )}
      </div>

      {/* Spending Heatmap */}
      <div className="card-neigh animate-fade-up" style={{ animationDelay: "300ms" }}>
        <p className="text-sm font-medium mb-3">Impulse Spending Heatmap</p>
        <div className="grid grid-cols-7 gap-1.5">
          {heatmapDays.map((day) => {
            const intensity = day.total / maxSpend;
            return (
              <div
                key={day.date}
                className="aspect-square rounded-sm transition-colors cursor-pointer group relative"
                style={{
                  backgroundColor:
                    day.total === 0
                      ? "var(--color-secondary)"
                      : `color-mix(in srgb, var(--color-primary) ${(0.2 + intensity * 0.8) * 100}%, transparent)`,
                }}
                title={`${day.date}: £${day.total.toFixed(2)}`}
              />
            );
          })}
        </div>
        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
          <span>Less</span>
          <div className="flex gap-1">
            {[0.1, 0.3, 0.6, 1].map((opacity) => (
              <div
                key={opacity}
                className="w-3 h-3 rounded-sm"
                style={{
                  backgroundColor: `color-mix(in srgb, var(--color-primary) ${opacity * 100}%, transparent)`,
                }}
              />
            ))}
          </div>
          <span>More</span>
        </div>
      </div>

      {/* Recent Impulse Purchases */}
      <div className="card-neigh animate-fade-up" style={{ animationDelay: "400ms" }}>
        <p className="text-sm font-medium mb-3">Recent Impulse Buys</p>
        <div className="space-y-3">
          {impulseTransactions.slice(0, 5).map((tx, i) => (
            <div
              key={tx.id}
              className="flex items-start justify-between animate-fade-up"
              style={{ animationDelay: `${450 + i * 60}ms` }}
            >
              <div>
                <p className="text-sm font-medium">{tx.description}</p>
                <p className="text-xs text-muted-foreground italic">{tx.horseMessage}</p>
              </div>
              <span className="text-sm font-bold text-impulse tabular-nums whitespace-nowrap ml-3">
                -£{tx.amount.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Punishment History */}
      <div className="card-neigh animate-fade-up" style={{ animationDelay: "500ms" }}>
        <div className="flex items-center gap-2 mb-3">
          <p className="text-sm font-medium">Punishment History</p>
          <img src="/horse-head.png" alt="Horse" className="w-6 h-6 object-contain inline" />
        </div>
        <div className="space-y-3">
          {punishments.map((p, i) => (
            <div
              key={p.id}
              className="rounded-xl bg-secondary p-3 animate-fade-up"
              style={{ animationDelay: `${550 + i * 80}ms` }}
            >
              <p className="text-xs text-muted-foreground mb-1">{p.transactionDesc}</p>
              <p className="text-sm">{p.punishment}</p>
              <p className="text-xs text-muted-foreground mt-1">{p.date}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DashboardTab;
