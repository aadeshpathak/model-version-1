import React from 'react';
import { motion } from 'framer-motion';
import MobileHeader from './MobileHeader';
import MobileBottomNav from './MobileBottomNav';

interface MobileLayoutProps {
  children: React.ReactNode;
  title?: string;
}

const MobileLayout: React.FC<MobileLayoutProps> = ({ children, title }) => {
  return (
    <div className="md:hidden min-h-screen bg-gray-50">
      <MobileHeader title={title} />
      <motion.main
        className="pt-16 pb-24 px-4 max-w-screen-sm mx-auto"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        style={{ paddingBottom: 'calc(6rem + env(safe-area-inset-bottom))' }}
      >
        {children}
      </motion.main>
      <MobileBottomNav />
    </div>
  );
};

export default MobileLayout;