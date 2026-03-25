import React from 'react';
import { motion } from 'motion/react';

interface MaitreDAvatarProps {
  animState?: 'bow' | 'stop' | 'shrug' | null;
  onAnimationComplete?: () => void;
}

export const MaitreDAvatar: React.FC<MaitreDAvatarProps> = ({ animState, onAnimationComplete }) => {
  const motionProps =
    animState === 'bow' ? {
      animate: { rotate: [0, 8, 0] },
      transition: { duration: 0.5, ease: 'easeInOut' as const },
    } : animState === 'stop' ? {
      animate: { scale: [1, 1.05, 1] },
      transition: { duration: 0.3 },
    } : animState === 'shrug' ? {
      animate: { y: [0, -4, 0] },
      transition: { duration: 0.4, ease: 'easeInOut' as const },
    } : {};

  return (
    <motion.div
      {...motionProps}
      style={{ originX: '50%', originY: '100%' }}
      onAnimationComplete={animState ? onAnimationComplete : undefined}
    >
      <svg width="54" height="88" viewBox="0 0 54 88" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Hair — modern undercut, dark brown */}
        <ellipse cx="27" cy="10" rx="11" ry="10" fill="#2d1b00" />
        <rect x="16" y="10" width="22" height="6" fill="#2d1b00" />
        <path d="M16,12 Q18,8 22,9 Q26,10 27,8 Q32,6 36,10 L38,14 L16,14 Z" fill="#2d1b00" />
        {/* Face — warm medium skin */}
        <ellipse cx="27" cy="17" rx="10" ry="11" fill="#d4956a" />
        {/* Eyebrows */}
        <path d="M19 12 Q22 10.5 25 12" stroke="#2d1b00" strokeWidth="1.2" fill="none" strokeLinecap="round" />
        <path d="M29 12 Q32 10.5 35 12" stroke="#2d1b00" strokeWidth="1.2" fill="none" strokeLinecap="round" />
        {/* Eyes */}
        <ellipse cx="22" cy="15" rx="2" ry="2.2" fill="#2d1b00" />
        <ellipse cx="32" cy="15" rx="2" ry="2.2" fill="#2d1b00" />
        <circle cx="22.8" cy="14.2" r="0.6" fill="white" />
        <circle cx="32.8" cy="14.2" r="0.6" fill="white" />
        {/* Mouth — composed smile */}
        <path d="M22 24 Q27 27 32 24" stroke="#a0623a" strokeWidth="0.9" fill="none" />
        {/* Neck */}
        <rect x="24" y="28" width="6" height="5" fill="#d4956a" />
        {/* Shirt collar */}
        <polygon points="22,30 27,35 22,38" fill="white" />
        <polygon points="32,30 27,35 32,38" fill="white" />
        {/* Bow tie — burgundy */}
        <polygon points="20,31.5 27,35 20,38.5" fill="#7b1c2e" />
        <polygon points="34,31.5 27,35 34,38.5" fill="#7b1c2e" />
        <circle cx="27" cy="35" r="1.8" fill="#5a1420" />
        {/* Jacket — slim navy */}
        <rect x="14" y="32" width="26" height="30" rx="3" fill="#0f1923" />
        {/* Lapels */}
        <polygon points="14,32 22,32 18,48" fill="#141d2b" />
        <polygon points="40,32 32,32 36,48" fill="#141d2b" />
        {/* Shirt front */}
        <rect x="24" y="35" width="6" height="24" rx="1" fill="white" />
        {/* Pocket square — burgundy */}
        <polygon points="17,36 22,36 20,33 17,34" fill="#7b1c2e" />
        {/* Arms */}
        <rect x="4" y="33" width="11" height="24" rx="5" fill="#0f1923" />
        <rect x="39" y="33" width="11" height="24" rx="5" fill="#0f1923" />
        {/* Hands */}
        <ellipse cx="9" cy="58" rx="5" ry="4" fill="#d4956a" />
        <ellipse cx="45" cy="58" rx="5" ry="4" fill="#d4956a" />
        {/* Trousers */}
        <rect x="15" y="61" width="10" height="26" rx="3" fill="#0f1923" />
        <rect x="29" y="61" width="10" height="26" rx="3" fill="#0f1923" />
        {/* Shoes — dark brown oxfords */}
        <ellipse cx="20" cy="87" rx="7" ry="3" fill="#2d1b00" />
        <ellipse cx="34" cy="87" rx="7" ry="3" fill="#2d1b00" />
      </svg>
    </motion.div>
  );
};
