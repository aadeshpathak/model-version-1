import React from 'react';
import { useUser } from '@/context/UserContext';

interface MobileHeaderProps {
  title?: string;
}

const MobileHeader: React.FC<MobileHeaderProps> = ({ title }) => {
  const { currentView } = useUser();

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

  return (
    <header className="md:hidden fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-md border-b border-gray-200 z-40 h-16 flex items-center px-4">
      <div className="flex items-center gap-3">
        <img src="/society-icon.svg" alt="PayMySociety" className="w-8 h-8" />
        <h1 className="text-lg font-semibold text-gray-900">{getTitle()}</h1>
      </div>
    </header>
  );
};

export default MobileHeader;