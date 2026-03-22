import { useApp } from "@/hooks/useApp";
import { Button } from "@/components/ui/button";
import { Check, AlertCircle, Loader2 } from "lucide-react";
import { useEffect } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const ProfileTab = () => {
  const {
    email,
    user,
    connectedBank,
    bankAccounts,
    bankAccountsLoading,
    bankAccountsError,
    fetchBankAccounts,
    clearBankAccountsError,
    startAddBankFlow,
    notificationsEnabled,
    horseNeighAlertsEnabled,
    toggleNotifications,
    toggleHorseNeighAlerts,
    logout,
  } = useApp();

  // Fetch bank accounts when component mounts
  useEffect(() => {
    if (user) {
      fetchBankAccounts();
    }
  }, [user, fetchBankAccounts]);

  // Parse full name into first and last name
  const fullName = user?.full_name || "";
  const nameParts = fullName.split(" ");
  const firstName = nameParts[0] || "Impulse";
  const lastName = nameParts.slice(1).join(" ") || "Cowboy";

  // Helper function to mask account numbers (show last 4 digits)
  const maskAccountNumber = (accountNumber: string) => {
    if (accountNumber.length <= 4) return accountNumber;
    return "*".repeat(accountNumber.length - 4) + accountNumber.slice(-4);
  };

  // Helper function to format provider names for display
  const formatProviderName = (provider: string) => {
    switch (provider) {
      case "MANE-ZO":
        return "Mane-zo";
      case "REV-O-TROT":
        return "Rev-o-trot";
      case "BUCK-LAYS":
        return "Buck-lays";
      case "HAY-CHSBC":
        return "Hay-ch SBC";
      default:
        return provider;
    }
  };

  return (
    <div className="p-4 space-y-5">
      <div className="flex items-center gap-2">
        <img
          src="/profile.png"
          alt="Profile"
          className="w-10 h-10 object-contain animate-fade-up"
        />
        <h1 className="text-lg font-bold animate-fade-up">Profile</h1>
      </div>

      {/* Profile Info */}
      <div className="card-neigh animate-fade-up" style={{ animationDelay: "100ms" }}>
        <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-3">
          Account
        </p>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">First Name</span>
            <span className="text-sm font-medium">{firstName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Last Name</span>
            <span className="text-sm font-medium">{lastName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Email</span>
            <span className="text-sm font-medium">
              {user?.email || email || "cowboy@ranch.com"}
            </span>
          </div>
        </div>
      </div>

      {/* Connected Banks */}
      <div className="card-neigh animate-fade-up" style={{ animationDelay: "200ms" }}>
        <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-3">
          Connected Banks
        </p>

        {/* Error Display */}
        {bankAccountsError && (
          <Alert variant="destructive" className="mb-3">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>{bankAccountsError}</span>
              <Button
                variant="link"
                size="sm"
                className="h-auto p-0 text-destructive underline"
                onClick={clearBankAccountsError}
              >
                Dismiss
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Loading State */}
        {bankAccountsLoading && (
          <div className="flex items-center gap-2 py-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm text-muted-foreground">Loading bank accounts...</span>
          </div>
        )}

        {/* Bank Accounts Display */}
        {!bankAccountsLoading && bankAccounts.length > 0 && (
          <div className="space-y-3">
            {bankAccounts.map((account) => (
              <div key={account.id} className="border rounded-lg p-3 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {formatProviderName(account.provider)}
                  </span>
                  <div className="flex items-center gap-1 text-xs text-primary font-medium">
                    <span>Connected</span>
                    <Check size={12} />
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  {account.type === "CURRENT" ? "Checking" : "Savings"} •{" "}
                  {maskAccountNumber(account.account_number)}
                </div>
                {account.amount !== undefined && (
                  <div className="text-xs font-medium text-primary">
                    Balance: £{(account.amount / 100).toFixed(2)}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* No Banks Connected */}
        {!bankAccountsLoading && bankAccounts.length === 0 && !bankAccountsError && (
          <p className="text-sm text-muted-foreground">No banks connected</p>
        )}

        {/* Fallback to legacy display for backward compatibility */}
        {!bankAccountsLoading && bankAccounts.length === 0 && connectedBank && (
          <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/50">
            <span className="text-sm font-medium">{connectedBank}</span>
            <span className="text-xs text-muted-foreground">Connected</span>
          </div>
        )}

        <Button
          variant="outline"
          className="w-full mt-3 active:scale-[0.97]"
          size="sm"
          onClick={startAddBankFlow}
        >
          Add Bank
        </Button>
      </div>

      {/* Settings */}
      <div className="card-neigh animate-fade-up" style={{ animationDelay: "300ms" }}>
        <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-3">
          Settings
        </p>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm">Notifications</span>
            <div
              onClick={toggleNotifications}
              className={`w-10 h-6 rounded-full relative cursor-pointer transition-colors ${notificationsEnabled ? "bg-primary" : "bg-muted"}`}
            >
              <div
                className={`absolute top-1 w-4 h-4 bg-primary-foreground rounded-full transition-all ${notificationsEnabled ? "right-1" : "left-1"}`}
              />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <span className="text-sm">Horse Neigh Alerts</span>
              <img src="/horse-head.png" alt="Horse" className="w-4 h-4 object-contain inline" />
            </div>
            <div
              onClick={toggleHorseNeighAlerts}
              className={`w-10 h-6 rounded-full relative cursor-pointer transition-colors ${horseNeighAlertsEnabled ? "bg-primary" : "bg-muted"}`}
            >
              <div
                className={`absolute top-1 w-4 h-4 bg-primary-foreground rounded-full transition-all ${horseNeighAlertsEnabled ? "right-1" : "left-1"}`}
              />
            </div>
          </div>
        </div>
      </div>

      <Button
        onClick={logout}
        className="w-full active:scale-[0.97] flex items-center gap-2 justify-center"
      >
        <span>Log Out</span>
        <img src="/blonde-horse-head.png" alt="Horse" className="w-5 h-5 object-contain" />
      </Button>
    </div>
  );
};

export default ProfileTab;
