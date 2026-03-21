import { useState } from "react";
import { useApp } from "@/context/AppContext";
import { Button } from "@/components/ui/button";
import { goalPresets, type Goal } from "@/data/mockData";
import { Plus, X } from "lucide-react";

const GoalsPage = () => {
  const { goals, addGoal, setOnboardingStep } = useApp();
  const [showCustom, setShowCustom] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customTarget, setCustomTarget] = useState("");

  const handlePreset = (preset: { name: string; icon: string }) => {
    if (!goals.find((g) => g.name === preset.name)) {
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
      addGoal({
        id: `g-${Date.now()}`,
        name: customName,
        target: Number(customTarget),
        saved: 0,
        icon: "🎯",
      });
      setCustomName("");
      setCustomTarget("");
      setShowCustom(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="text-center">
        <h2 className="text-xl font-bold font-display">What are you saving for?</h2>
        <p className="text-muted-foreground text-sm mt-1">Pick goals or create your own</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {goalPresets.map((preset, i) => {
          const isAdded = goals.some((g) => g.name === preset.name);
          return (
            <button
              key={preset.name}
              onClick={() => handlePreset(preset)}
              className={`card-neigh text-center py-4 animate-fade-up ${isAdded ? "ring-2 ring-primary" : ""}`}
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <span className="text-2xl block mb-1">{preset.icon}</span>
              <span className="text-sm font-medium">{preset.name}</span>
              {isAdded && <span className="text-xs text-primary block mt-1">Added ✓</span>}
            </button>
          );
        })}
        <button
          onClick={() => setShowCustom(true)}
          className="card-neigh text-center py-4 border-dashed"
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
        className="w-full h-11 active:scale-[0.97]"
      >
        Continue 🐴
      </Button>
    </div>
  );
};

export default GoalsPage;
