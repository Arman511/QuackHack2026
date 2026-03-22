import { useState } from "react";
import { useApp } from "@/hooks/useApp";
import { Button } from "@/components/ui/button";
import DashboardTab from "./tabs/DashboardTab";
import GoalsTab from "./tabs/GoalsTab";
import NotificationsTab from "./tabs/NotificationsTab";
import ProfileTab from "./tabs/ProfileTab";

const tabs = [
  { key: "dashboard", label: "Dashboard", icon: "horse-head" },
  { key: "goals", label: "Goals", icon: "target" },
  { key: "notifications", label: "Alerts", icon: "notification" },
  { key: "profile", label: "Profile", icon: "profile" },
];

const MainApp = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const { notifications, logout } = useApp();
  const unread = notifications.length;

  return (
    <div className="min-h-screen pb-20">
      <div className="max-w-lg mx-auto">
        <div className="p-4 pb-0 flex justify-end">
          <Button variant="outline" size="sm" onClick={logout}>
            Log Out
          </Button>
        </div>
        {activeTab === "dashboard" && <DashboardTab />}
        {activeTab === "goals" && <GoalsTab />}
        {activeTab === "notifications" && <NotificationsTab />}
        {activeTab === "profile" && <ProfileTab />}
      </div>

      <nav className="bottom-nav">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className="bottom-nav-item"
            data-active={activeTab === tab.key}
            onClick={() => setActiveTab(tab.key)}
          >
            <span className="text-lg relative">
              <img
                src={`/${tab.icon}.png`}
                alt={tab.label}
                className="w-10 h-10 object-contain"
              />
              {tab.key === "notifications" && unread > 0 && (
                <span className="absolute -top-1 -right-2 w-4 h-4 bg-impulse text-[10px] font-bold text-primary-foreground rounded-full flex items-center justify-center">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </span>
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
};

export default MainApp;
