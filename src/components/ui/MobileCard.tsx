import React from 'react';
import { motion } from 'framer-motion';

interface MobileCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

const MobileCard: React.FC<MobileCardProps> = ({ children, className = '', onClick }) => {
  return (
    <motion.div
      className={`p-4 rounded-2xl shadow-md bg-white/60 backdrop-blur-sm border border-gray-200/50 ${className}`}
      whileTap={onClick ? { scale: 0.98 } : {}}
      onClick={onClick}
    >
      {children}
    </motion.div>
  );
};

export default MobileCard;