import { useApp } from "@/context/AppContext";
import { Button } from "@/components/ui/button";
import { User, Check } from "lucide-react";

const ProfileTab = () => {
  const {
    email,
    connectedBank,
    notificationsEnabled,
    horseNeighAlertsEnabled,
    toggleNotifications,
    toggleHorseNeighAlerts,
    logout,
  } = useApp();

  return (
    <div className="p-4 space-y-5">
      <div className="flex items-center gap-2">
        <h1 className="text-lg font-bold animate-fade-up">Profile</h1>
        <User size={20} className="text-muted-foreground animate-fade-up" />
      </div>

      {/* Profile Info */}
      <div className="card-neigh animate-fade-up" style={{ animationDelay: "100ms" }}>
        <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-3">
          Account
        </p>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">First Name</span>
            <span className="text-sm font-medium">Impulse</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Last Name</span>
            <span className="text-sm font-medium">Cowboy</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Email</span>
            <span className="text-sm font-medium">{email || "cowboy@ranch.com"}</span>
          </div>
        </div>
      </div>

      {/* Connected Banks */}
      <div className="card-neigh animate-fade-up" style={{ animationDelay: "200ms" }}>
        <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-3">
          Connected Banks
        </p>
        {connectedBank ? (
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{connectedBank}</span>
            <div className="flex items-center gap-1 text-xs text-primary font-medium">
              <span>Connected</span>
              <Check size={12} />
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No banks connected</p>
        )}
        <Button variant="outline" className="w-full mt-3 active:scale-[0.97]" size="sm">
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
        <img src="/horse-head.png" alt="Horse" className="w-5 h-5 object-contain" />
      </Button>
    </div>
  );
};

export default ProfileTab;
