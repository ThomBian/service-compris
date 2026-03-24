import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface TicketFieldProps {
  label: string;
  value: string | undefined; // undefined = not yet asked (empty state)
  onAsk: () => void;         // called when empty field is clicked
  onAccuse: () => void;      // called when filled field is clicked
}

export const TicketField: React.FC<TicketFieldProps> = ({ label, value, onAsk, onAccuse }) => {
  const [isHovered, setIsHovered] = useState(false);
  const isEmpty = value === undefined;

  return (
    <motion.div
      className={`cursor-pointer rounded-lg px-2 py-1.5 border-2 transition-colors ${
        isEmpty
          ? isHovered
            ? 'border-dashed border-blue-400 bg-blue-50'
            : 'border-dashed border-gray-300'
          : isHovered
            ? 'border-orange-400 bg-orange-50'
            : 'border-[#141414]'
      }`}
      whileHover={{ y: -1 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={isEmpty ? onAsk : onAccuse}
      style={isHovered ? { boxShadow: '2px 2px 0px 0px rgba(20,20,20,0.12)' } : undefined}
    >
      {/* Label row with badge flush right */}
      <div className="flex items-center justify-between mb-0.5">
        <span
          className={`text-[8px] font-bold uppercase tracking-widest transition-colors ${
            isHovered ? (isEmpty ? 'text-blue-500' : 'text-orange-500') : 'opacity-40'
          }`}
        >
          {label}
        </span>
        <AnimatePresence>
          {isHovered && (
            <motion.span
              key="badge"
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.7, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              className={`text-[8px] font-bold rounded-full px-1.5 py-0.5 ${
                isEmpty
                  ? 'text-blue-500 bg-blue-100 border border-blue-300'
                  : 'text-orange-500 bg-orange-100 border border-orange-300'
              }`}
            >
              {isEmpty ? '🔍 Ask' : '👆 Accuse'}
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Value or placeholder */}
      {isEmpty ? (
        <span className="text-[13px] font-bold tracking-[3px] text-gray-300 font-mono select-none">
          _ _ _ _ _ _
        </span>
      ) : (
        <span className={`text-[14px] font-bold font-mono transition-colors ${isHovered ? 'text-orange-600' : ''}`}>
          {value}
        </span>
      )}
    </motion.div>
  );
};
