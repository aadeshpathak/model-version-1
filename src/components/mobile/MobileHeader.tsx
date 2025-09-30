import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, User, Settings, LogOut } from 'lucide-react';
import { useUser } from '@/context/UserContext';

interface MobileHeaderProps {
  title?: string;
}

const MobileHeader: React.FC<MobileHeaderProps> = ({ title }) => {
  const { currentView, handleLogout, currentUser } = useUser();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const getTitle = () => {
    if (title) return title;
    switch (currentView) {
      case 'dashboard': return 'Dashboard';
      case 'myBills': return 'My Bills';
      case 'payments': return 'Payments';
      case 'notices': return 'Notices';
      case 'profile': return 'Profile';
      case 'members': return 'Members';
      case 'bills': return 'Bill Management';
      case 'expenses': return 'Expenses';
      case 'reports': return 'Reports';
      case 'settings': return 'Settings';
      default: return 'PayMySociety';
    }
  };

  const drawerItems = [
    { icon: User, label: 'Profile', action: () => { /* navigate to profile */ } },
    { icon: Settings, label: 'Settings', action: () => { /* navigate to settings */ } },
    { icon: LogOut, label: 'Logout', action: handleLogout },
  ];

  return (
    <>
      <header className="md:hidden fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-md border-b border-gray-200 z-40 h-16 flex items-center justify-between px-4">
        <div className="flex items-center">
          <img src="/society-icon.svg" alt="PayMySociety" className="w-8 h-8" />
        </div>
        <h1 className="text-lg font-semibold text-gray-900">{getTitle()}</h1>
        <button
          onClick={() => setIsDrawerOpen(true)}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          aria-label="Open menu"
        >
          <Menu size={24} />
        </button>
      </header>

      <AnimatePresence>
        {isDrawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50"
              onClick={() => setIsDrawerOpen(false)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.3 }}
              className="fixed top-0 right-0 h-full w-80 bg-white shadow-xl z-50"
            >
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-lg font-semibold">Menu</h2>
                <button
                  onClick={() => setIsDrawerOpen(false)}
                  className="p-2 rounded-lg hover:bg-gray-100"
                  aria-label="Close menu"
                >
                  <X size={24} />
                </button>
              </div>
              <div className="p-4 space-y-4">
                {drawerItems.map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={index}
                      onClick={() => {
                        item.action();
                        setIsDrawerOpen(false);
                      }}
                      className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 transition-colors text-left"
                    >
                      <Icon size={20} />
                      <span>{item.label}</span>
                    </button>
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

export default MobileHeader;