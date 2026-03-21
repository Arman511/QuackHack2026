import { useState } from "react";
import { useApp } from "@/context/AppContext";
import { Button } from "@/components/ui/button";
import { impulseCategories } from "@/data/mockData";
import { Plus } from "lucide-react";

const ImpulseZonesPage = () => {
  const {
    impulseCategories: selected,
    toggleImpulseCategory,
    addCustomCategory,
    setOnboardingStep,
  } = useApp();
  const [customInput, setCustomInput] = useState("");

  const addCustom = () => {
    if (customInput.trim() && !selected.includes(customInput.trim())) {
      addCustomCategory(customInput.trim());
      setCustomInput("");
    }
  };

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="text-center">
        <h2 className="text-xl font-bold">So… what do you impulse buy?</h2>
        <div className="flex items-center gap-1 justify-center mt-1">
          <p className="text-muted-foreground text-sm">Select your weak spots</p>
          <img src="/horse-head.png" alt="Horse" className="w-4 h-4 object-contain inline" />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {impulseCategories.map((cat, i) => (
          <button
            key={cat}
            className="bubble-tag animate-fade-up"
            data-selected={selected.includes(cat)}
            onClick={() => toggleImpulseCategory(cat)}
            style={{ animationDelay: `${i * 50}ms` }}
          >
            {cat}
          </button>
        ))}
        {selected
          .filter((c) => !impulseCategories.includes(c))
          .map((cat) => (
            <button
              key={cat}
              className="bubble-tag"
              data-selected="true"
              onClick={() => toggleImpulseCategory(cat)}
            >
              {cat}
            </button>
          ))}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={customInput}
          onChange={(e) => setCustomInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addCustom()}
          placeholder="Add custom category…"
          className="flex-1 h-10 px-4 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <Button size="icon" variant="outline" onClick={addCustom} className="active:scale-[0.95]">
          <Plus size={16} />
        </Button>
      </div>

      <Button
        onClick={() => setOnboardingStep(3)}
        disabled={selected.length === 0}
        className="w-full h-11 active:scale-[0.97] flex items-center gap-2 justify-center"
      >
        <span>Continue</span>
        <img src="/blonde-horse-head.png" alt="Horse" className="w-5 h-5 object-contain" />
      </Button>
    </div>
  );
};

export default ImpulseZonesPage;
