import { useState } from "react";
import { useApp } from "@/context/AppContext";
import DashboardTab from "./tabs/DashboardTab";
import GoalsTab from "./tabs/GoalsTab";
import NotificationsTab from "./tabs/NotificationsTab";
import ProfileTab from "./tabs/ProfileTab";

const tabs = [
  { key: "dashboard", label: "Dashboard", icon: "horse", isImage: true },
  { key: "goals", label: "Goals", icon: "💰", isImage: false },
  { key: "notifications", label: "Alerts", icon: "🔔", isImage: false },
  { key: "profile", label: "Profile", icon: "👤", isImage: false },
];

const MainApp = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const { notifications } = useApp();
  const unread = notifications.length;

  return (
    <div className="min-h-screen pb-20">
      <div className="max-w-lg mx-auto">
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
              {tab.isImage ? (
                <img src="/horse-head.png" alt="Horse" className="w-6 h-6 object-contain" />
              ) : (
                tab.icon
              )}
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
