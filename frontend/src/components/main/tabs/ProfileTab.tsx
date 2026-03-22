import { useApp } from "@/hooks/useApp";
import { Button } from "@/components/ui/button";
import { Check, AlertCircle, Loader2, Plus, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { impulseCategories } from "@/data/mockData";

interface ProfileTabProps {
  logout: () => void;
}

const ProfileTab = ({ logout }: ProfileTabProps) => {
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
    // Impulse category management
    impulseCategories: selectedImpulses,
    toggleImpulseCategory,
    addCustomCategory,
  } = useApp();

  const [customImpulseInput, setCustomImpulseInput] = useState("");
  const [isUpdatingImpulses, setIsUpdatingImpulses] = useState(false);

  // Function to get category-specific icons (same as in ImpulseZonesPage)
  const getCategoryIcon = (category: string): string | null => {
    const lowerCategory = category.toLowerCase();

    if (
      lowerCategory.includes("steam") ||
      lowerCategory.includes("video game") ||
      lowerCategory.includes("gaming")
    ) {
      return "/controller.png";
    }
    // Coffee gets its own icon
    if (lowerCategory.includes("coffee")) {
      return "/coffee.png";
    }
    // Food/takeaway/delivery use carrot icon
    if (
      lowerCategory.includes("food") ||
      lowerCategory.includes("takeaway") ||
      lowerCategory.includes("delivery")
    ) {
      return "/carrot.png";
    }
    if (lowerCategory.includes("hobby horsing") || lowerCategory.includes("hobby horse")) {
      return "/hobby-horse.png";
    }
    // Add clothes icon
    if (
      lowerCategory.includes("clothes") ||
      lowerCategory.includes("clothing") ||
      lowerCategory.includes("fashion") ||
      lowerCategory.includes("apparel")
    ) {
      return "/clothes.png";
    }
    // Add books icon
    if (
      lowerCategory.includes("book") ||
      lowerCategory.includes("reading") ||
      lowerCategory.includes("kindle") ||
      lowerCategory.includes("audible")
    ) {
      return "/books.png";
    }
    // Add makeup/beauty icon
    if (
      lowerCategory.includes("makeup") ||
      lowerCategory.includes("beauty") ||
      lowerCategory.includes("cosmetic") ||
      lowerCategory.includes("skincare") ||
      lowerCategory.includes("sephora")
    ) {
      return "/makeup.png";
    }
    // Add shopping icon (keep existing shopping logic but use new icon)
    if (
      lowerCategory.includes("amazon") ||
      lowerCategory.includes("shopping") ||
      lowerCategory.includes("gadgets") ||
      lowerCategory.includes("online shopping") ||
      lowerCategory.includes("retail")
    ) {
      return "/shopping.png";
    }

    return null; // No specific icon, will use default horse
  };

  const handleToggleImpulse = async (category: string) => {
    try {
      setIsUpdatingImpulses(true);
      await toggleImpulseCategory(category);
    } catch (error) {
      console.error("Failed to update impulse category:", error);
    } finally {
      setIsUpdatingImpulses(false);
    }
  };

  const handleAddCustomImpulse = async () => {
    if (customImpulseInput.trim() && !selectedImpulses.includes(customImpulseInput.trim())) {
      try {
        setIsUpdatingImpulses(true);
        await addCustomCategory(customImpulseInput.trim());
        setCustomImpulseInput("");
      } catch (error) {
        console.error("Failed to add custom impulse category:", error);
      } finally {
        setIsUpdatingImpulses(false);
      }
    }
  };

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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img
            src="/profile.png"
            alt="Profile"
            className="w-10 h-10 object-contain animate-fade-up"
          />
          <h1 className="text-lg font-bold animate-fade-up">Profile</h1>
        </div>
        <Button variant="outline" size="sm" onClick={logout}>
          Log Out
        </Button>
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

      {/* Impulse Categories */}
      <div className="card-neigh animate-fade-up" style={{ animationDelay: "350ms" }}>
        <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-3">
          Impulse Categories
        </p>

        {/* Selected impulse categories */}
        <div className="flex flex-wrap gap-2 mb-4">
          {impulseCategories.map((cat) => (
            <button
              key={cat}
              className="bubble-tag animate-fade-up flex items-center gap-1.5"
              data-selected={selectedImpulses.includes(cat)}
              onClick={() => handleToggleImpulse(cat)}
              disabled={isUpdatingImpulses}
            >
              {(() => {
                const icon = getCategoryIcon(cat);
                return icon ? (
                  <img src={icon} alt={`${cat} icon`} className="w-6 h-6 object-contain" />
                ) : (
                  <img src="/horse-head.png" alt="Horse" className="w-6 h-6 object-contain" />
                );
              })()}
              {cat}
            </button>
          ))}

          {/* Custom categories not in the default list */}
          {selectedImpulses
            .filter((c) => !impulseCategories.includes(c))
            .map((cat) => (
              <button
                key={cat}
                className="bubble-tag flex items-center gap-1.5"
                data-selected="true"
                onClick={() => handleToggleImpulse(cat)}
                disabled={isUpdatingImpulses}
              >
                {(() => {
                  const icon = getCategoryIcon(cat);
                  return icon ? (
                    <img src={icon} alt={`${cat} icon`} className="w-6 h-6 object-contain" />
                  ) : (
                    <img src="/horse-head.png" alt="Horse" className="w-6 h-6 object-contain" />
                  );
                })()}
                {cat}
              </button>
            ))}
        </div>

        {/* Add custom impulse category */}
        <div className="flex gap-2">
          <input
            type="text"
            value={customImpulseInput}
            onChange={(e) => setCustomImpulseInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddCustomImpulse()}
            placeholder="Add custom impulse category..."
            disabled={isUpdatingImpulses}
            className="flex-1 h-10 px-4 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
          />
          <Button
            size="icon"
            variant="outline"
            onClick={handleAddCustomImpulse}
            disabled={isUpdatingImpulses || !customImpulseInput.trim()}
            className="active:scale-[0.95]"
          >
            {isUpdatingImpulses ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus size={16} />}
          </Button>
        </div>

        {isUpdatingImpulses && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>Updating impulse categories...</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileTab;
