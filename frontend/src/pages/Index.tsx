import { AppProvider, useApp } from "@/context/AppContext";
import OnboardingFlow from "@/components/onboarding/OnboardingFlow";
import MainApp from "@/components/main/MainApp";
import LoginPage from "@/components/onboarding/LoginPage";

const AppContent = () => {
  const { isAuthenticated, isOnboarded, authLoading } = useApp();

  // Show loading spinner while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Show login page if not authenticated
  if (!isAuthenticated) {
    return <LoginPage />;
  }

  // Show onboarding if authenticated but not onboarded
  // Show main app if authenticated and onboarded
  return isOnboarded ? <MainApp /> : <OnboardingFlow />;
};

const Index = () => (
  <AppProvider>
    <AppContent />
  </AppProvider>
);

export default Index;
