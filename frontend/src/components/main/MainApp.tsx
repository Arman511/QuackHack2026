import { useState } from "react";
import { useApp } from "@/hooks/useApp";
import DashboardTab from "./tabs/DashboardTab";
import GoalsTab from "./tabs/GoalsTab";
import NotificationsTab from "./tabs/NotificationsTab";
import ProfileTab from "./tabs/ProfileTab";

const tabs = [
  { key: "dashboard", label: "Dashboard", icon: "horse-head", isImage: true },
  { key: "goals", label: "Goals", icon: "target", isImage: true },
  { key: "notifications", label: "Alerts", icon: "notification", isImage: true },
  { key: "profile", label: "Profile", icon: "profile", isImage: true },
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
                <img
                  src={`/${tab.icon}.png`}
                  alt={tab.label}
                  className="w-10 h-10 object-contain"
                />
              ) : (
                <tab.icon size={40} />
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
