import { useApp } from "@/hooks/useApp";
import { Skull, Megaphone } from "lucide-react";
import { Notification } from "@/data/mockData";

const typeColors: Record<string, string> = {
  impulse: "bg-impulse/10 text-impulse",
  punishment: "bg-warning/10 text-warning",
  savings: "bg-savings/10 text-savings",
  info: "bg-secondary text-muted-foreground",
};

// Function to determine the appropriate icon based on notification content
const getNotificationIcon = (
  notification: Notification,
): React.ComponentType<{ size?: number }> => {
  const content = `${notification.title} ${notification.message}`.toLowerCase();

  if (notification.type === "impulse") {
    // Gaming/Steam related
    if (content.includes("steam") || content.includes("video game") || content.includes("gaming")) {
      return () => <img src="/controller.png" alt="Gaming" className="w-14 h-14 object-contain" />;
    }
    // Food related (takeaway, food delivery, coffee)
    if (
      content.includes("takeaway") ||
      content.includes("food") ||
      content.includes("deliveroo") ||
      content.includes("coffee")
    ) {
      return () => <img src="/carrot.png" alt="Food" className="w-14 h-14 object-contain" />;
    }
    // Default impulse icon
    return () => <img src="/horse-head.png" alt="Horse" className="w-14 h-14 object-contain" />;
  }

  if (notification.type === "punishment") {
    // Horse neigh related punishments
    if (content.includes("neigh") || content.includes("nfc tap")) {
      return () => <img src="/neigh.png" alt="Neigh" className="w-14 h-14 object-contain" />;
    }
    // Hobby horsing related punishments
    if (content.includes("hobby horsing")) {
      return () => (
        <img src="/hobby-horse.png" alt="Hobby Horse" className="w-14 h-14 object-contain" />
      );
    }
    // Default punishment icon
    return Skull;
  }

  // Default icons for other types
  const typeIcons: Record<string, React.ComponentType<{ size?: number }>> = {
    savings: () => <img src="/coin.png" alt="Coin" className="w-14 h-14 object-contain" />,
    info: Megaphone,
  };

  return typeIcons[notification.type] || Megaphone;
};

const NotificationsTab = () => {
  const { notifications } = useApp();

  return (
    <div className="p-4 space-y-5">
      <div className="flex items-center gap-2">
        <h1 className="text-lg font-bold animate-fade-up">Notifications</h1>
        <img
          src="/notification.png"
          alt="Notifications"
          className="w-10 h-10 object-contain animate-fade-up"
        />
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
                className={`w-16 h-16 rounded-xl flex items-center justify-center text-base shrink-0 ${typeColors[n.type]}`}
              >
                {(() => {
                  const IconComponent = getNotificationIcon(n);

                  // Check if it's one of our custom image components
                  if (
                    n.type === "impulse" ||
                    n.type === "savings" ||
                    (n.type === "punishment" &&
                      (n.message.toLowerCase().includes("neigh") ||
                        n.message.toLowerCase().includes("nfc tap") ||
                        n.message.toLowerCase().includes("hobby horsing")))
                  ) {
                    return <IconComponent />;
                  } else {
                    // It's a Lucide icon
                    const LucideIcon = IconComponent as React.ComponentType<{ size?: number }>;
                    return <LucideIcon size={28} />;
                  }
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
