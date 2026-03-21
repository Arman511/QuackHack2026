import { useState } from "react";
import { useApp } from "@/context/AppContext";
import { Button } from "@/components/ui/button";
import { goalPresets, type Goal } from "@/data/mockData";
import { Plus, X, Plane, Shield, Laptop, Home, CreditCard, Target } from "lucide-react";

const GoalsPage = () => {
  const { goals, addGoal, removeGoal, clearGoals, setOnboardingStep } = useApp();
  const [showCustom, setShowCustom] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customTarget, setCustomTarget] = useState("");

  const getIcon = (iconName: string) => {
    const iconMap = {
      plane: Plane,
      shield: Shield,
      laptop: Laptop,
      home: Home,
      "credit-card": CreditCard,
    };
    return iconMap[iconName as keyof typeof iconMap] || Target;
  };

  const handlePreset = (preset: { name: string; icon: string }) => {
    const existing = goals.find((g) => g.name === preset.name);
    if (existing) {
      removeGoal(existing.id);
    } else {
      clearGoals();
      addGoal({
        id: `g-${Date.now()}`,
        name: preset.name,
        target: 1000,
        saved: 0,
        icon: preset.icon,
      });
    }
  };

  const handleCustom = () => {
    if (customName.trim() && customTarget) {
      clearGoals();
      addGoal({
        id: `g-${Date.now()}`,
        name: customName,
        target: Number(customTarget),
        saved: 0,
        icon: "target",
      });
      setCustomName("");
      setCustomTarget("");
      setShowCustom(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="text-center">
        <h2 className="text-xl font-bold">What are you saving for?</h2>
        <p className="text-muted-foreground text-sm mt-1">Pick goals or create your own</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {goalPresets.map((preset, i) => {
          const isAdded = goals.some((g) => g.name === preset.name);
          const IconComponent = getIcon(preset.icon);
          return (
            <button
              key={preset.name}
              onClick={() => handlePreset(preset)}
              className={`card-neigh text-center py-4 animate-fade-up transition-all duration-200 ${
                isAdded
                  ? "ring-2 ring-primary bg-primary/5 shadow-lg shadow-primary/20"
                  : "hover:shadow-md"
              }`}
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <IconComponent size={32} className="mx-auto mb-2 text-muted-foreground" />
              <span className="text-sm font-medium">{preset.name}</span>
              {isAdded && <span className="text-xs text-primary block mt-1">Added ✓</span>}
            </button>
          );
        })}
        {goals
          .filter((g) => !goalPresets.some((p) => p.name === g.name))
          .map((g) => (
            <button
              key={g.id}
              onClick={() => removeGoal(g.id)}
              className="card-neigh text-center py-4 ring-2 ring-primary bg-primary/5 shadow-lg shadow-primary/20 animate-fade-up transition-all duration-200"
            >
              <Target size={32} className="mx-auto mb-2 text-muted-foreground" />
              <span className="text-sm font-medium">{g.name}</span>
              <span className="text-xs text-primary block mt-1">Added ✓</span>
            </button>
          ))}
        <button
          onClick={() => setShowCustom(true)}
          className="card-neigh text-center py-4 border-dashed transition-all duration-200 hover:shadow-md"
        >
          <Plus size={24} className="mx-auto mb-1 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Custom Goal</span>
        </button>
      </div>

      {showCustom && (
        <div className="card-neigh space-y-3 animate-fade-up">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">New Goal</span>
            <button onClick={() => setShowCustom(false)}>
              <X size={16} className="text-muted-foreground" />
            </button>
          </div>
          <input
            type="text"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            placeholder="Goal name"
            className="w-full h-10 px-4 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <input
            type="number"
            value={customTarget}
            onChange={(e) => setCustomTarget(e.target.value)}
            placeholder="Target amount (£)"
            className="w-full h-10 px-4 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <Button onClick={handleCustom} className="w-full active:scale-[0.97]">
            Add Goal
          </Button>
        </div>
      )}

      <Button
        onClick={() => setOnboardingStep(4)}
        disabled={goals.length === 0}
        className="w-full h-11 active:scale-[0.97] flex items-center gap-2 justify-center"
      >
        <span>Continue</span>
        <img src="/horse-head.png" alt="Horse" className="w-5 h-5 object-contain" />
      </Button>
    </div>
  );
};

export default GoalsPage;
