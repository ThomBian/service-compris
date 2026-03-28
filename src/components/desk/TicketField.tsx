import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface TicketFieldProps {
  label: string;
  value: string | undefined; // undefined = not yet asked (empty state)
  onAsk: () => void; // called when empty field is clicked
  onAccuse: () => void; // called when filled field is clicked
  /** Shown in hover badge when value is known (e.g. "No Reservation", "Too Late"). */
  accuseLabel: string;
}

/** Shared pill: same size/weight for Ask and Accuse; only hue changes. */
const actionBadgeBase =
  'inline-flex items-center justify-center max-w-full text-xs font-bold uppercase tracking-wide rounded-full px-2.5 py-1.5 border leading-none whitespace-nowrap';

export const TicketField: React.FC<TicketFieldProps> = ({
  label,
  value,
  onAsk,
  onAccuse,
  accuseLabel,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const isEmpty = value === undefined;

  const badgeVariant = isEmpty
    ? 'text-blue-700 bg-blue-100 border-blue-400'
    : 'text-orange-700 bg-orange-100 border-orange-400';

  return (
    <motion.div
      className={`cursor-pointer rounded-xl px-2 py-1.5 border-2 transition-colors hover:shadow-[2px_2px_0_0_rgba(20,20,20,0.12)] ${
        isEmpty
          ? isHovered
            ? 'border-dashed border-blue-400 bg-blue-50'
            : 'border-dashed border-gray-300'
          : isHovered
            ? 'border-orange-400 bg-orange-50'
            : 'border-[#141414]'
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={isEmpty ? onAsk : onAccuse}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (isEmpty) onAsk();
          else onAccuse();
        }
      }}
    >
      {/* Fixed-height header row + reserved right gutter so label/value never reflow on hover */}
      <div className="relative mb-0.5 min-h-8 flex items-center">
        <span
          className={`min-w-0 flex-1 truncate pr-44 text-xs font-bold uppercase tracking-widest transition-colors ${
            isHovered ? (isEmpty ? 'text-blue-500' : 'text-orange-500') : 'opacity-40'
          }`}
        >
          {label}
        </span>
        <div className="pointer-events-none absolute right-0 top-1/2 z-10 flex max-w-44 -translate-y-1/2 justify-end">
          <AnimatePresence mode="wait">
            {isHovered && (
              <motion.span
                key={isEmpty ? 'ask' : 'accuse'}
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.12, ease: 'easeOut' }}
                className={`pointer-events-auto ${actionBadgeBase} ${badgeVariant}`}
              >
                {isEmpty ? '🔍 Ask' : `👆 ${accuseLabel}`}
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="min-h-5.5 flex items-center">
        {isEmpty ? (
          <span className="text-[13px] font-bold tracking-[3px] text-gray-300 font-mono select-none leading-none">
            _ _ _ _ _ _
          </span>
        ) : (
          <span
            className={`text-[14px] font-bold font-mono leading-none transition-colors ${
              isHovered ? 'text-orange-600' : ''
            }`}
          >
            {value}
          </span>
        )}
      </div>
    </motion.div>
  );
};
