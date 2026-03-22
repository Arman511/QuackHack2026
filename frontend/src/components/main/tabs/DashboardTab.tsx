import { useApp } from "@/hooks/useApp";
import { useMemo, useEffect } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface DashboardTabProps {
  logout: () => void;
}

const DashboardTab = ({ logout }: DashboardTabProps) => {
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
    neighTaxPercent, // Add this to get the tax percentage
  } = useApp();

  // Fetch transactions when component mounts
  useEffect(() => {
    if (user) {
      fetchTransactions();
    }
  }, [user, fetchTransactions]);

  // Use real transactions if available, otherwise fallback to mock data
  const displayTransactions = realTransactions.length > 0 ? realTransactions : transactions;

  const budgetPercent = impulseBudget > 0 ? Math.min((impulseSpent / impulseBudget) * 100, 100) : 0;
  const impulseTransactions = displayTransactions?.filter((t) => t?.isImpulse) || [];

  // Enhanced metrics
  const avgDailySpend =
    impulseTransactions.length > 0
      ? impulseTransactions.reduce((sum, tx) => sum + tx.amount, 0) / 30
      : 0;

  const daysLeft = 30 - new Date().getDate();
  const projectedSpend = avgDailySpend * daysLeft;
  const budgetRemaining = Math.max(impulseBudget - impulseSpent, 0);

  const savingsRate =
    impulseBudget > 0 ? ((impulseBudget - impulseSpent) / impulseBudget) * 100 : 0;

  // Build heatmap for the last 28 days
  const heatmapDays = useMemo(() => {
    const days: {
      date: string;
      total: number;
      txs: typeof displayTransactions;
      isFirstOfMonth: boolean;
      monthName: string;
    }[] = [];
    for (let i = 27; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const dayTxs = impulseTransactions.filter((t) => t.date === dateStr);
      const total = dayTxs.reduce((s, t) => s + t.amount, 0);

      // Check if this is the first day of the month or the first day in our range
      const isFirstOfMonth = d.getDate() === 1 || i === 27;
      const monthName = d.toLocaleDateString("en-GB", { month: "short" });

      days.push({ date: dateStr, total, txs: dayTxs, isFirstOfMonth, monthName });
    }
    return days;
  }, [impulseTransactions]);

  const maxSpend = Math.max(...heatmapDays.map((d) => d.total), 1);

  // Calculate the multiplier based on tax percentage
  const multiplier = 1 + neighTaxPercent / 100; // e.g., 100% tax = 2x, 200% tax = 3x

  return (
    <div className="p-4 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between animate-fade-up">
        <div className="flex items-center gap-2">
          <img src="/horse-head.png" alt="Horse" className="w-10 h-10 object-contain" />
          <h1 className="text-lg font-bold">Neigh-ver Go Broke!</h1>
        </div>
        <Button variant="outline" size="sm" onClick={logout}>
          Log Out
        </Button>
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

      {/* Money Locked Away */}
      <div className="card-neigh text-center animate-fade-up" style={{ animationDelay: "100ms" }}>
        <div className="flex items-center justify-center gap-2 mb-2">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
            Money Locked Away
          </p>
          <img src="/coin.png" alt="Coin" className="w-4 h-4 object-contain" />
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
              stroke="var(--color-impulse)"
              strokeWidth="8"
              strokeDasharray={`${(totalSaved / 2000) * 264} 264`}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xl font-bold text-impulse">£{totalSaved}</span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mb-1">
          Because you cannot be trusted yourself.
        </p>
      </div>

      {/* Impulse Budget */}
      <div className="card-neigh animate-fade-up" style={{ animationDelay: "200ms" }}>
        <div className="flex justify-between items-center mb-3">
          <span className="text-sm font-medium">Impulse Budget Spent</span>
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
            <img src="/coin.png" alt="Coin" className="w-3 h-3 object-contain" />
            <span>We're stepping in — you've proven you can't manage money responsibly.</span>
          </div>
        )}
      </div>

      {/* Spending Heatmap */}
      <div className="card-neigh animate-fade-up" style={{ animationDelay: "300ms" }}>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium">Impulse Spending Heatmap</p>
          <p className="text-xs text-muted-foreground">
            {new Date(heatmapDays[0]?.date).toLocaleDateString("en-GB", { month: "short" })} -{" "}
            {new Date(heatmapDays[heatmapDays.length - 1]?.date).toLocaleDateString("en-GB", {
              month: "short",
              year: "numeric",
            })}
          </p>
        </div>

        {/* Day of week headers */}
        <div className="grid grid-cols-7 gap-1.5 mb-2">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div key={day} className="text-xs text-muted-foreground text-center font-medium py-1">
              {day}
            </div>
          ))}
        </div>

        {/* Month indicators and heatmap grid */}
        <div className="space-y-1">
          {/* Heatmap grid with integrated month indicators */}
          <div className="grid grid-cols-7 gap-1.5">
            {heatmapDays.map((day, index) => {
              const intensity = day.total / maxSpend;
              const dayOfMonth = new Date(day.date).getDate();
              const isNewMonth = day.isFirstOfMonth && index > 0; // Don't show on very first day

              return (
                <div key={day.date} className="relative">
                  {/* Month divider line */}
                  {isNewMonth && (
                    <div className="absolute -top-2 left-0 right-0 h-px bg-primary/30 z-10" />
                  )}

                  {/* Day cell */}
                  <div
                    className="aspect-square rounded-sm transition-all duration-200 cursor-pointer group relative flex items-center justify-center hover:scale-110 hover:z-20"
                    style={{
                      backgroundColor:
                        day.total === 0
                          ? "var(--color-secondary)"
                          : `color-mix(in srgb, var(--color-primary) ${(0.2 + intensity * 0.8) * 100}%, transparent)`,
                    }}
                    title={`${new Date(day.date).toLocaleDateString("en-GB", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}: £${day.total.toFixed(2)}`}
                  >
                    {/* Day number */}
                    <span className="text-xs font-medium text-foreground/80 group-hover:text-foreground">
                      {dayOfMonth}
                    </span>

                    {/* Hover tooltip */}
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-foreground text-background text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-30">
                      {new Date(day.date).toLocaleDateString("en-GB", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                      : £{day.total.toFixed(2)}
                      {day.txs.length > 0 && (
                        <div className="text-xs opacity-75">
                          {day.txs.length} transaction{day.txs.length !== 1 ? "s" : ""}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
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

          {/* Week indicators */}
          <div className="text-xs text-muted-foreground">
            {impulseTransactions.length > 0
              ? `${impulseTransactions.length} impulse buys`
              : "No impulse spending"}
          </div>
        </div>
      </div>

      {/* Recent Impulse Purchases */}
      <div className="card-neigh animate-fade-up" style={{ animationDelay: "400ms" }}>
        <div className="mb-3">
          <p className="text-sm font-medium mb-1">Poor Financial Choices</p>
          <p className="text-xs text-muted-foreground">
            We charged you {((neighTaxPercent / 100) * 100).toFixed(0)}% extra on these purchases
            because you clearly can't control yourself. This money is now protecting your goals
            instead.
          </p>
        </div>
        <div className="space-y-3">
          {impulseTransactions.length > 0 ? (
            impulseTransactions.slice(0, 5).map((tx, i) => (
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
            ))
          ) : (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground">No wasteful spending yet!</p>
              <p className="text-xs text-muted-foreground mt-1">
                You're keeping money for your goals 🐎
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Name and Shame */}
      <div className="card-neigh animate-fade-up" style={{ animationDelay: "500ms" }}>
        <div className="flex items-center gap-2 mb-2">
          <p className="text-sm font-medium">Name and Shame</p>
          <img src="/horse-head.png" alt="Horse" className="w-7 h-7 object-contain inline" />
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          When you exceed your spending limit, we intervene with punishments because you clearly
          need external accountability to protect your financial goals.
        </p>
        <div className="space-y-3">
          {punishments.length > 0 ? (
            punishments.map((p, i) => (
              <div
                key={p.id}
                className="rounded-xl bg-secondary p-3 animate-fade-up"
                style={{ animationDelay: `${550 + i * 80}ms` }}
              >
                <p className="text-xs text-muted-foreground mb-1">{p.transactionDesc}</p>
                <p className="text-sm">{p.punishment}</p>
                <p className="text-xs text-muted-foreground mt-1">{p.date}</p>
              </div>
            ))
          ) : (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground">No intervention needed yet!</p>
              <p className="text-xs text-muted-foreground mt-1">
                Your goals are safe from wasteful spending 🐎
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardTab;
