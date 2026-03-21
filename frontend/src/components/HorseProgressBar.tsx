import { useApp } from '@/context/AppContext';

interface HorseProgressBarProps {
  totalSteps: number;
}

const HorseProgressBar = ({ totalSteps }: HorseProgressBarProps) => {
  const { onboardingStep } = useApp();
  const progress = ((onboardingStep + 1) / totalSteps) * 100;

  return (
    <div className="w-full px-4 py-3">
      <div className="relative w-full h-3 bg-secondary rounded-full overflow-visible">
        <div
          className="h-full bg-primary rounded-full transition-all duration-700 ease-out"
          style={{ width: `${progress}%` }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 transition-all duration-700 ease-out"
          style={{ left: `${progress}%`, transform: `translateX(-50%) translateY(-50%)` }}
        >
          <span className="text-2xl animate-gallop inline-block">🐴</span>
        </div>
      </div>
      <p className="text-xs text-muted-foreground mt-2 text-center">
        Step {onboardingStep + 1} of {totalSteps}
      </p>
    </div>
  );
};

export default HorseProgressBar;
