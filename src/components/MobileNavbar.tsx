import { useUser } from '@/context/UserContext';
import { Button } from '@/components/ui/button';
import { Home, DollarSign, Bell, Settings, Users, TrendingUp, FileText } from 'lucide-react';

export const MobileNavbar = () => {
  const { currentView, setCurrentView, role } = useUser();

  const memberMenu = [
    { icon: Home, label: 'Dashboard', key: 'dashboard' },
    { icon: DollarSign, label: 'My Bills', key: 'myBills' },
    { icon: Bell, label: 'Notices', key: 'notices' },
    { icon: Settings, label: 'Profile', key: 'profile' },
  ];

  const adminMenu = [
    { icon: Home, label: 'Dashboard', key: 'dashboard' },
    { icon: Users, label: 'Members', key: 'members' },
    { icon: DollarSign, label: 'Bills', key: 'bills' },
    { icon: TrendingUp, label: 'Expenses', key: 'expenses' },
    { icon: Bell, label: 'Notices', key: 'notices' },
    { icon: FileText, label: 'Reports', key: 'reports' },
    { icon: Settings, label: 'Settings', key: 'settings' },
  ];

  const menu = role === 'admin' ? adminMenu : memberMenu;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-border shadow-lg z-50 lg:hidden">
      <div className="flex items-center justify-around py-2 px-4">
        {menu.slice(0, 4).map((item) => (
          <Button
            key={item.key}
            variant={currentView === item.key ? "default" : "ghost"}
            size="sm"
            className={`flex flex-col items-center gap-1 h-auto py-2 px-3 ${
              currentView === item.key
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setCurrentView(item.key)}
          >
            <item.icon className="w-5 h-5" />
            <span className="text-xs font-medium">{item.label}</span>
          </Button>
        ))}
      </div>
    </div>
  );
};