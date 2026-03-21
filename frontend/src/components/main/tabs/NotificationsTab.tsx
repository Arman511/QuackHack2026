import { useApp } from '@/context/AppContext';

const typeColors: Record<string, string> = {
  impulse: 'bg-impulse/10 text-impulse',
  punishment: 'bg-warning/10 text-warning',
  savings: 'bg-savings/10 text-savings',
  info: 'bg-secondary text-muted-foreground',
};

const typeIcons: Record<string, string> = {
  impulse: '🐴',
  punishment: '💀',
  savings: '🌾',
  info: '📢',
};

const NotificationsTab = () => {
  const { notifications } = useApp();

  return (
    <div className="p-4 space-y-5">
      <h1 className="text-lg font-bold font-display animate-fade-up">Notifications 🔔</h1>

      <div className="space-y-3">
        {notifications.map((n, i) => (
          <div key={n.id} className="card-neigh animate-fade-up" style={{ animationDelay: `${i * 70}ms` }}>
            <div className="flex items-start gap-3">
              <span className={`w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0 ${typeColors[n.type]}`}>
                {typeIcons[n.type]}
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
