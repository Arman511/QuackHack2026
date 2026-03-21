import { useApp } from "@/context/AppContext";

interface HorseProgressBarProps {
  totalSteps: number;
}

const HorseProgressBar = ({ totalSteps }: HorseProgressBarProps) => {
  const { onboardingStep } = useApp();
  const progress = (onboardingStep / totalSteps) * 100;

  return (
    <div className="w-full px-4 py-3">
      <div className="relative w-full h-4 bg-gradient-to-b from-gray-600 to-gray-700 rounded-full overflow-visible border-2 border-gray-800">
        {/* Lane divider lines */}
        <div className="absolute inset-0 flex items-center">
          <div className="w-full h-px border-t-2 border-dashed border-yellow-400 opacity-60" />
        </div>

        {/* Progress fill with grass/track texture */}
        <div
          className="h-full rounded-full transition-all duration-700 ease-out relative overflow-hidden"
          style={{
            width: `${progress}%`,
            background: "linear-gradient(to bottom, hsl(25, 50%, 45%) 0%, hsl(20, 45%, 35%) 100%)",
          }}
        >
          {/* Subtle track texture overlay */}
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                "repeating-linear-gradient(90deg, transparent, transparent 10px, rgba(0,0,0,0.1) 10px, rgba(0,0,0,0.1) 20px)",
            }}
          />
        </div>

        {/* Horse galloping */}
        <div
          className="absolute top-1/2 -translate-y-1/2 transition-all duration-700 ease-out"
          style={{ left: `${progress}%`, transform: `translateX(-50%) translateY(-50%)` }}
        >
          <img
            src="/horse-gallop.png"
            alt="Horse"
            className="w-16 h-16 animate-gallop object-contain drop-shadow-lg"
          />
        </div>
      </div>
      <p className="text-xs text-muted-foreground mt-2 text-center">
        Step {onboardingStep} of {totalSteps}
      </p>
    </div>
  );
};

export default HorseProgressBar;
