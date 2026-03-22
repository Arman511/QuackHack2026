import { useState } from "react";
import { useApp } from "@/hooks/useApp";
import { Button } from "@/components/ui/button";
import { impulseCategories } from "@/data/mockData";
import { Plus } from "lucide-react";

// Function to get category-specific icons
const getCategoryIcon = (category: string): string | null => {
  const lowerCategory = category.toLowerCase();

  if (
    lowerCategory.includes("steam") ||
    lowerCategory.includes("video game") ||
    lowerCategory.includes("gaming")
  ) {
    return "/controller.png";
  }
  if (
    lowerCategory.includes("coffee") ||
    lowerCategory.includes("food") ||
    lowerCategory.includes("takeaway") ||
    lowerCategory.includes("delivery")
  ) {
    return "/carrot.png";
  }
  if (lowerCategory.includes("hobby horsing") || lowerCategory.includes("hobby horse")) {
    return "/hobby-horse.png";
  }
  // Add coin for shopping/money related categories
  if (
    lowerCategory.includes("amazon") ||
    lowerCategory.includes("shopping") ||
    lowerCategory.includes("gadgets")
  ) {
    return "/coin.png";
  }

  return null; // No specific icon, will use default horse
};

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
          <img src="/horse-head.png" alt="Horse" className="w-6 h-6 object-contain inline" />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {impulseCategories.map((cat, i) => (
          <button
            key={cat}
            className="bubble-tag animate-fade-up flex items-center gap-1.5"
            data-selected={selected.includes(cat)}
            onClick={() => toggleImpulseCategory(cat)}
            style={{ animationDelay: `${i * 50}ms` }}
          >
            {(() => {
              const icon = getCategoryIcon(cat);
              return icon ? (
                <img src={icon} alt={`${cat} icon`} className="w-8 h-8 object-contain" />
              ) : (
                <img src="/horse-head.png" alt="Horse" className="w-8 h-8 object-contain" />
              );
            })()}
            {cat}
          </button>
        ))}
        {selected
          .filter((c) => !impulseCategories.includes(c))
          .map((cat) => (
            <button
              key={cat}
              className="bubble-tag flex items-center gap-1.5"
              data-selected="true"
              onClick={() => toggleImpulseCategory(cat)}
            >
              {(() => {
                const icon = getCategoryIcon(cat);
                return icon ? (
                  <img src={icon} alt={`${cat} icon`} className="w-8 h-8 object-contain" />
                ) : (
                  <img src="/horse-head.png" alt="Horse" className="w-8 h-8 object-contain" />
                );
              })()}
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
        onClick={() => setOnboardingStep(4)}
        disabled={selected.length === 0}
        className="w-full h-11 active:scale-[0.97] flex items-center gap-2 justify-center"
      >
        <span>Continue</span>
        <img src="/blonde-horse-head.png" alt="Horse" className="w-7 h-7 object-contain" />
      </Button>
    </div>
  );
};

export default ImpulseZonesPage;
