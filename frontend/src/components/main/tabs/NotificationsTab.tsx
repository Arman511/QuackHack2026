import { useApp } from "@/hooks/useApp";
import { Bell, Skull, Vault, Megaphone } from "lucide-react";

const typeColors: Record<string, string> = {
  impulse: "bg-impulse/10 text-impulse",
  punishment: "bg-warning/10 text-warning",
  savings: "bg-savings/10 text-savings",
  info: "bg-secondary text-muted-foreground",
};

const typeIcons: Record<string, React.ComponentType<{ size?: number }>> = {
  impulse: () => <img src="/horse-head.png" alt="Horse" className="w-5 h-5 object-contain" />,
  punishment: Skull,
  savings: Vault,
  info: Megaphone,
};

const NotificationsTab = () => {
  const { notifications } = useApp();

  return (
    <div className="p-4 space-y-5">
      <div className="flex items-center gap-2">
        <h1 className="text-lg font-bold animate-fade-up">Notifications</h1>
        <Bell size={20} className="text-muted-foreground animate-fade-up" />
      </div>

      <div className="space-y-3">
        {notifications.map((n, i) => (
          <div
            key={n.id}
            className="card-neigh animate-fade-up"
            style={{ animationDelay: `${i * 70}ms` }}
          >
            <div className="flex items-start gap-3">
              <span
                className={`w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0 ${typeColors[n.type]}`}
              >
                {(() => {
                  const IconComponent = typeIcons[n.type];
                  if (n.type === "impulse") {
                    return <IconComponent />;
                  }
                  const LucideIcon = IconComponent as React.ComponentType<{ size?: number }>;
                  return <LucideIcon size={16} />;
                })()}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{n.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                <p className="text-xs text-muted-foreground/60 mt-1">{n.date}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default NotificationsTab;
