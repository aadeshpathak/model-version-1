import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, FileText, CreditCard, Bell, Menu, User, Settings, Users, BarChart3, Building2, X, LogOut, Brain } from 'lucide-react';
import { useUser } from '@/context/UserContext';

const MobileBottomNav: React.FC = () => {
  const { currentView, setCurrentView, currentUser, handleLogout, unreadNoticesCount } = useUser();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const getNavItems = () => {
    if (currentUser === 'admin') {
      return [
        { id: 'dashboard', label: 'Home', icon: Home },
        { id: 'members', label: 'Members', icon: Users },
        { id: 'bills', label: 'Bills', icon: FileText },
        { id: 'expenses', label: 'Expenses', icon: CreditCard },
        { id: 'reports', label: 'Reports', icon: BarChart3 },
        { id: 'aiInsights', label: 'AI Insights', icon: Brain },
        { id: 'settings', label: 'Settings', icon: Settings },
      ];
    } else {
      return [
        { id: 'dashboard', label: 'Home', icon: Home },
        { id: 'myBills', label: 'Bills', icon: FileText },
        { id: 'payments', label: 'Payments', icon: CreditCard },
        { id: 'notices', label: 'Notices', icon: Bell },
        { id: 'profile', label: 'Profile', icon: User },
      ];
    }
  };

  const navItems = getNavItems();
  const mainNavItems = navItems.slice(0, 4); // First 4 items in bottom nav
  const drawerItems = navItems.slice(4); // Remaining items in drawer

  const handleNavClick = (itemId: string) => {
    setCurrentView(itemId);
    setIsDrawerOpen(false); // Close drawer when navigating
  };

  return (
    <>
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-gray-200/50 shadow-2xl z-50"
        role="tablist"
        aria-label="Main navigation"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex justify-around items-center h-16 px-2 relative">
          {mainNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <motion.button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all duration-200 min-h-[44px] min-w-[44px] relative ${
                  isActive
                    ? 'text-blue-600 bg-blue-50'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
                whileTap={{ scale: 0.95 }}
                aria-label={item.label}
                role="tab"
                aria-selected={isActive}
              >
                <div className="relative">
                  <Icon size={22} className="mb-1" />
                  {item.id === 'notices' && unreadNoticesCount > 0 && (
                    <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full min-w-[18px] h-[18px] flex items-center justify-center font-bold">
                      {unreadNoticesCount > 9 ? '9+' : unreadNoticesCount}
                    </div>
                  )}
                </div>
                <span className="text-xs font-medium">{item.label}</span>
                {isActive && (
                  <motion.div
                    className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-6 h-1 bg-blue-600 rounded-full"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
              </motion.button>
            );
          })}

          {/* Hamburger Menu Button */}
          <motion.button
            onClick={() => setIsDrawerOpen(true)}
            className="flex flex-col items-center justify-center p-2 rounded-xl transition-all duration-200 min-h-[44px] min-w-[44px] text-gray-600 hover:text-gray-900 hover:bg-gray-50"
            whileTap={{ scale: 0.95 }}
            aria-label="More options"
          >
            <Menu size={22} className="mb-1" />
            <span className="text-xs font-medium">More</span>
          </motion.button>
        </div>
      </nav>

      {/* Animated Drawer */}
      <AnimatePresence>
        {isDrawerOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-[60] backdrop-blur-sm"
              onClick={() => setIsDrawerOpen(false)}
            />

            {/* Drawer */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{
                type: 'spring',
                stiffness: 300,
                damping: 30,
                mass: 0.8
              }}
              className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl z-[70] max-h-[70vh] overflow-hidden"
              style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
            >
              {/* Drawer Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Menu</h3>
                    <p className="text-sm text-gray-500">More options</p>
                  </div>
                </div>
                <motion.button
                  onClick={() => setIsDrawerOpen(false)}
                  className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
                  whileTap={{ scale: 0.95 }}
                  aria-label="Close menu"
                >
                  <X size={20} className="text-gray-500" />
                </motion.button>
              </div>

              {/* Drawer Content */}
              <div className="p-4">
                <div className="space-y-2">
                  {drawerItems.map((item, index) => {
                    const Icon = item.icon;
                    const isActive = currentView === item.id;
                    return (
                      <motion.button
                        key={item.id}
                        onClick={() => handleNavClick(item.id)}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all duration-200 ${
                          isActive
                            ? 'bg-blue-50 border border-blue-200'
                            : 'hover:bg-gray-50'
                        }`}
                        whileTap={{ scale: 0.98 }}
                      >
                        <div className={`p-2 rounded-xl ${
                          isActive ? 'bg-blue-100' : 'bg-gray-100'
                        }`}>
                          <Icon size={20} className={isActive ? 'text-blue-600' : 'text-gray-600'} />
                        </div>
                        <div className="flex-1 text-left">
                          <span className={`font-medium ${isActive ? 'text-blue-900' : 'text-gray-900'}`}>
                            {item.label}
                          </span>
                        </div>
                        {isActive && (
                          <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                        )}
                      </motion.button>
                    );
                  })}
                </div>

                {/* Quick Actions */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="mt-6 pt-4 border-t border-gray-100"
                >
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Quick Actions</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <motion.button
                      className="flex flex-col items-center gap-2 p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border border-green-200 hover:shadow-md transition-all"
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        setCurrentView('dashboard');
                        setIsDrawerOpen(false);
                      }}
                    >
                      <Home size={20} className="text-green-600" />
                      <span className="text-xs font-medium text-green-900">Dashboard</span>
                    </motion.button>
                    <motion.button
                      className="flex flex-col items-center gap-2 p-4 bg-gradient-to-br from-red-50 to-pink-50 rounded-2xl border border-red-200 hover:shadow-md transition-all"
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        handleLogout();
                        setIsDrawerOpen(false);
                      }}
                    >
                      <LogOut size={20} className="text-red-600" />
                      <span className="text-xs font-medium text-red-900">Logout</span>
                    </motion.button>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default MobileBottomNav;