import { useApp } from '@/context/AppContext';
import { Button } from '@/components/ui/button';

const ProfileTab = () => {
  const { email, connectedBank, logout } = useApp();

  return (
    <div className="p-4 space-y-5">
      <h1 className="text-lg font-bold font-display animate-fade-up">Profile 👤</h1>

      {/* Profile Info */}
      <div className="card-neigh animate-fade-up" style={{ animationDelay: '100ms' }}>
        <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-3">Account</p>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Email</span>
            <span className="text-sm font-medium">{email || 'cowboy@ranch.com'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Username</span>
            <span className="text-sm font-medium">ImpulseCowboy</span>
          </div>
        </div>
      </div>

      {/* Connected Banks */}
      <div className="card-neigh animate-fade-up" style={{ animationDelay: '200ms' }}>
        <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-3">Connected Banks</p>
        {connectedBank ? (
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{connectedBank}</span>
            <span className="text-xs text-primary font-medium">Connected ✓</span>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No banks connected</p>
        )}
        <Button variant="outline" className="w-full mt-3 active:scale-[0.97]" size="sm">
          Add Bank
        </Button>
      </div>

      {/* Settings */}
      <div className="card-neigh animate-fade-up" style={{ animationDelay: '300ms' }}>
        <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-3">Settings</p>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm">Notifications</span>
            <div className="w-10 h-6 bg-primary rounded-full relative cursor-pointer">
              <div className="absolute top-1 right-1 w-4 h-4 bg-primary-foreground rounded-full" />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Horse Neigh Alerts 🐴</span>
            <div className="w-10 h-6 bg-primary rounded-full relative cursor-pointer">
              <div className="absolute top-1 right-1 w-4 h-4 bg-primary-foreground rounded-full" />
            </div>
          </div>
        </div>
      </div>

      <Button variant="outline" onClick={logout} className="w-full active:scale-[0.97]">
        Log Out 🐴
      </Button>
    </div>
  );
};

export default ProfileTab;
