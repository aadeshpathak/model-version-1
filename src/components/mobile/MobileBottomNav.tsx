import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, FileText, CreditCard, Bell, Menu, User, Settings, LogOut } from 'lucide-react';
import { useUser } from '@/context/UserContext';

const MobileBottomNav: React.FC = () => {
  const { currentView, setCurrentView, currentUser, handleLogout } = useUser();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const getNavItems = () => {
    if (currentUser === 'admin') {
      return [
        { id: 'dashboard', label: 'Home', icon: Home },
        { id: 'bills', label: 'Bills', icon: FileText },
        { id: 'expenses', label: 'Expenses', icon: CreditCard },
        { id: 'notices', label: 'Notices', icon: Bell },
      ];
    } else {
      return [
        { id: 'dashboard', label: 'Home', icon: Home },
        { id: 'myBills', label: 'Bills', icon: FileText },
        { id: 'payments', label: 'Payments', icon: CreditCard },
        { id: 'notices', label: 'Notices', icon: Bell },
      ];
    }
  };

  const navItems = getNavItems();

  const menuItems = [
    { icon: User, label: 'Profile', action: () => { setCurrentView('profile'); setIsMenuOpen(false); } },
    { icon: Settings, label: 'Settings', action: () => { setCurrentView('settings'); setIsMenuOpen(false); } },
    { icon: LogOut, label: 'Logout', action: () => { handleLogout(); setIsMenuOpen(false); } },
  ];

  return (
    <>
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-gray-200 rounded-t-3xl shadow-2xl z-50"
        role="tablist"
        aria-label="Main navigation"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex justify-around items-center h-16 px-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <motion.button
                key={item.id}
                onClick={() => setCurrentView(item.id)}
                className={`flex flex-col items-center justify-center p-2 rounded-xl transition-colors min-h-[44px] min-w-[44px] ${
                  isActive ? 'text-blue-600 bg-blue-50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
                whileTap={{ scale: 0.95 }}
                aria-label={item.label}
                role="tab"
                aria-selected={isActive}
              >
                <Icon size={22} className="mb-1" />
                <span className="text-xs font-medium">{item.label}</span>
              </motion.button>
            );
          })}
          <motion.button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className={`flex flex-col items-center justify-center p-2 rounded-xl transition-colors min-h-[44px] min-w-[44px] ${
              isMenuOpen ? 'text-blue-600 bg-blue-50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
            whileTap={{ scale: 0.95 }}
            aria-label="Menu"
          >
            <Menu size={22} className="mb-1" />
            <span className="text-xs font-medium">Menu</span>
          </motion.button>
        </div>
      </nav>

      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/30 z-40"
              onClick={() => setIsMenuOpen(false)}
            />
            <motion.div
              initial={{ y: '-100%' }}
              animate={{ y: 0 }}
              exit={{ y: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed bottom-16 left-4 right-4 bg-white rounded-2xl shadow-2xl z-50 p-4"
            >
              <div className="space-y-2">
                {menuItems.map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <motion.button
                      key={index}
                      onClick={item.action}
                      className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors"
                      whileTap={{ scale: 0.98 }}
                    >
                      <Icon size={20} className="text-gray-600" />
                      <span className="text-gray-900 font-medium">{item.label}</span>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default MobileBottomNav;