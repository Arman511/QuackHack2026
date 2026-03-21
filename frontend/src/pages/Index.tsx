import { AppProvider, useApp } from "@/context/AppContext";
import OnboardingFlow from "@/components/onboarding/OnboardingFlow";
import MainApp from "@/components/main/MainApp";

const AppContent = () => {
  const { isOnboarded } = useApp();
  return isOnboarded ? <MainApp /> : <OnboardingFlow />;
};

const Index = () => (
  <AppProvider>
    <AppContent />
  </AppProvider>
);

export default Index;
