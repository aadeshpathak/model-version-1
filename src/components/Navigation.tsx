import { useState } from 'react';
import { useUser } from '@/context/UserContext';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Home, Users, TrendingUp, Bell, Settings, LogOut, Mail, DollarSign, FileText, Menu, Brain } from 'lucide-react';

export const Navigation = () => {
  const { currentView, setCurrentView, handleLogout, role } = useUser();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const adminMenu = [
    { icon: Home, label: 'Dashboard', key: 'dashboard' },
    { icon: Users, label: 'Members', key: 'members' },
    { icon: DollarSign, label: 'Bills', key: 'bills' },
    { icon: TrendingUp, label: 'Expenses', key: 'expenses' },
    { icon: Bell, label: 'Notices', key: 'notices' },
    { icon: FileText, label: 'Reports', key: 'reports' },
    { icon: Settings, label: 'Settings', key: 'settings' },
  ];

  const memberMenu = [
    { icon: Home, label: 'Dashboard', key: 'dashboard' },
    { icon: DollarSign, label: 'My Bills', key: 'myBills' },
    { icon: Bell, label: 'Notices', key: 'notices' },
    { icon: Settings, label: 'Profile', key: 'profile' },
  ];

  const menu = role === 'admin' ? adminMenu : memberMenu;

  const handleMenuClick = (key: string) => {
    setCurrentView(key);
    setIsMobileMenuOpen(false);
  };

  // Desktop Sidebar
  const DesktopSidebar = () => (
    <div className="hidden lg:flex flex-col h-full bg-gradient-to-b from-white via-gray-50 to-white border-r border-gray-200 shadow-xl">
      {/* Header */}
      <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-purple-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center shadow-lg">
            <Home className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              Society Manager
            </h1>
            <p className="text-xs text-gray-500 capitalize">{role} Panel</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {menu.map((item) => (
          <Button
            key={item.key}
            variant={currentView === item.key ? "default" : "ghost"}
            className={`w-full justify-start h-12 rounded-xl transition-all duration-300 group ${
              currentView === item.key
                ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg hover:shadow-xl transform hover:scale-105'
                : 'hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 hover:text-blue-600 hover:shadow-md transform hover:scale-102'
            }`}
            onClick={() => setCurrentView(item.key)}
          >
            <item.icon className={`w-5 h-5 mr-3 transition-transform duration-300 ${
              currentView === item.key ? 'text-white' : 'text-gray-500 group-hover:text-blue-500'
            }`} />
            <span className="font-medium">{item.label}</span>
            {currentView === item.key && (
              <div className="ml-auto w-2 h-2 bg-white rounded-full animate-pulse"></div>
            )}
          </Button>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-100 bg-gradient-to-r from-gray-50 to-gray-100">
        <Button
          variant="ghost"
          onClick={handleLogout}
          className="w-full justify-start h-12 rounded-xl text-red-600 hover:bg-red-50 hover:text-red-700 transition-all duration-300 hover:shadow-md"
        >
          <LogOut className="w-5 h-5 mr-3" />
          <span className="font-medium">Logout</span>
        </Button>
      </div>
    </div>
  );

  // Mobile Bottom Navbar - App Style
  const MobileNavbar = () => (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/98 backdrop-blur-xl border-t border-gray-200 shadow-2xl z-50 safe-area-bottom">
      {/* Main navbar with 5 primary items */}
      <div className="flex items-center justify-around py-2 px-2 overflow-x-auto">
        {menu.slice(0, 5).map((item) => (
          <Button
            key={item.key}
            variant="ghost"
            size="sm"
            className={`flex flex-col items-center space-y-1 p-2 rounded-xl transition-all duration-300 min-w-0 flex-1 ${
              currentView === item.key
                ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg transform scale-105'
                : 'hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 hover:text-blue-600 active:scale-95'
            }`}
            onClick={() => setCurrentView(item.key)}
          >
            <item.icon className={`w-5 h-5 transition-transform duration-300 ${
              currentView === item.key ? 'scale-110' : ''
            }`} />
            <span className="text-xs font-medium truncate">{item.label.split(' ')[0]}</span>
          </Button>
        ))}

        {/* Hamburger Menu for additional items */}
        {menu.length > 5 && (
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="flex flex-col items-center space-y-1 p-2 rounded-xl hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 transition-all duration-300 min-w-0 flex-1 active:scale-95"
              >
                <Menu className="w-5 h-5" />
                <span className="text-xs font-medium">More</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[75vh] rounded-t-3xl bg-gradient-to-b from-white via-gray-50 to-white border-t-4 border-blue-500">
              <div className="flex flex-col h-full">
                {/* Header */}
                <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50 rounded-t-3xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center shadow-lg">
                        <Home className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                          Menu
                        </h2>
                        <p className="text-sm text-gray-500 capitalize">{role} Panel</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="rounded-full w-10 h-10 p-0 hover:bg-gray-100"
                    >
                      ✕
                    </Button>
                  </div>
                </div>

                {/* Menu Items - Grid Layout */}
                <div className="flex-1 p-4">
                  <div className="grid grid-cols-2 gap-3 mb-6">
                    {menu.slice(5).map((item) => (
                      <Button
                        key={item.key}
                        variant={currentView === item.key ? "default" : "ghost"}
                        className={`h-16 rounded-2xl transition-all duration-300 flex flex-col items-center justify-center space-y-2 ${
                          currentView === item.key
                            ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg transform scale-105'
                            : 'hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 hover:text-blue-600 active:scale-95'
                        }`}
                        onClick={() => handleMenuClick(item.key)}
                      >
                        <item.icon className="w-6 h-6" />
                        <span className="text-sm font-medium text-center leading-tight">{item.label}</span>
                      </Button>
                    ))}
                  </div>

                  {/* Logout Button */}
                  <div className="border-t border-gray-200 pt-4">
                    <Button
                      variant="ghost"
                      onClick={() => {
                        handleLogout();
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-full h-14 rounded-2xl text-red-600 hover:bg-red-50 hover:text-red-700 transition-all duration-300 active:scale-95"
                    >
                      <LogOut className="w-5 h-5 mr-3" />
                      <span className="font-medium">Logout</span>
                    </Button>
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        )}
      </div>

      {/* Safe area padding for devices with home indicator */}
      <div className="h-safe-area-bottom bg-white"></div>
    </div>
  );

  return (
    <>
      <DesktopSidebar />
      <MobileNavbar />
    </>
  );
};
