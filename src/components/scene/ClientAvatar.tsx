import React from 'react';
import { motion } from 'motion/react';
import { VisualTraits } from '../../types';

interface ClientAvatarProps {
  traits: VisualTraits;
  animState?: 'entrance' | 'accused' | 'refused' | null;
  onAnimationComplete?: () => void;
}

const SKIN_TONES    = ['#fde8d0', '#f5c5a3', '#d4956a', '#a0624a', '#5c3317'] as const;
const HAIR_COLORS   = ['#1a0f0a', '#4a2c17', '#d4a843', '#c0392b', '#888888', '#f0f0f0'] as const;
const CLOTHING_COLORS = ['#141414', '#c0392b', '#2c3e50', '#27ae60', '#8e44ad'] as const;
const SVG_HEIGHTS   = [52, 66, 80] as const;

function Hair({ style, color }: { style: number; color: string }) {
  switch (style) {
    case 0: return ( // short
      <g>
        <ellipse cx="24" cy="10" rx="10" ry="9" fill={color} />
        <rect x="14" y="10" width="20" height="6" fill={color} />
      </g>
    );
    case 1: return ( // long
      <g>
        <ellipse cx="24" cy="10" rx="10" ry="9" fill={color} />
        <rect x="14" y="10" width="4" height="26" rx="2" fill={color} />
        <rect x="30" y="10" width="4" height="26" rx="2" fill={color} />
      </g>
    );
    case 2: return ( // curly
      <g>
        <circle cx="24" cy="9" r="9" fill={color} />
        <circle cx="15" cy="12" r="5" fill={color} />
        <circle cx="33" cy="12" r="5" fill={color} />
        <circle cx="18" cy="7" r="5" fill={color} />
        <circle cx="30" cy="7" r="5" fill={color} />
      </g>
    );
    case 3: return null; // bald
    case 4: return ( // bun
      <g>
        <ellipse cx="24" cy="12" rx="9" ry="8" fill={color} />
        <circle cx="24" cy="4" r="4" fill={color} />
      </g>
    );
    default: return null;
  }
}

function Clothing({ style, color, skin }: { style: number; color: string; skin: string }) {
  switch (style) {
    case 0: return ( // formal jacket
      <g>
        <rect x="13" y="27" width="22" height="24" rx="2" fill="#141414" />
        <polygon points="13,27 21,27 17,43" fill="#1c1c1c" />
        <polygon points="35,27 27,27 31,43" fill="#1c1c1c" />
        <rect x="21" y="29" width="6" height="20" rx="1" fill="white" />
        <circle cx="24" cy="33" r="0.8" fill="#d4af37" />
        <circle cx="24" cy="37" r="0.8" fill="#d4af37" />
        <circle cx="24" cy="41" r="0.8" fill="#d4af37" />
        <rect x="5" y="27" width="9" height="20" rx="4" fill="#141414" />
        <rect x="34" y="27" width="9" height="20" rx="4" fill="#141414" />
        <ellipse cx="9" cy="48" rx="4" ry="3" fill={skin} />
        <ellipse cx="39" cy="48" rx="4" ry="3" fill={skin} />
        <rect x="14" y="50" width="9" height="24" rx="3" fill="#2c3e50" />
        <rect x="25" y="50" width="9" height="24" rx="3" fill="#2c3e50" />
      </g>
    );
    case 1: return ( // casual shirt
      <g>
        <rect x="13" y="27" width="22" height="23" rx="3" fill={color} />
        <rect x="5" y="27" width="9" height="18" rx="4" fill={color} />
        <rect x="34" y="27" width="9" height="18" rx="4" fill={color} />
        <ellipse cx="9" cy="46" rx="4" ry="3" fill={skin} />
        <ellipse cx="39" cy="46" rx="4" ry="3" fill={skin} />
        <rect x="14" y="49" width="9" height="25" rx="3" fill="#2c3e50" />
        <rect x="25" y="49" width="9" height="25" rx="3" fill="#2c3e50" />
      </g>
    );
    case 2: return ( // dress
      <g>
        <rect x="14" y="27" width="20" height="14" rx="2" fill={color} />
        <polygon points="9,41 39,41 43,76 5,76" fill={color} />
        <rect x="5" y="27" width="10" height="14" rx="4" fill={color} />
        <rect x="33" y="27" width="10" height="14" rx="4" fill={color} />
        <ellipse cx="10" cy="42" rx="4" ry="3" fill={skin} />
        <ellipse cx="38" cy="42" rx="4" ry="3" fill={skin} />
      </g>
    );
    case 3: return ( // smart-casual blazer
      <g>
        <rect x="13" y="27" width="22" height="23" rx="2" fill={color} />
        <polygon points="13,27 20,27 16,41" fill={color} />
        <polygon points="35,27 28,27 32,41" fill={color} />
        <rect x="21" y="29" width="6" height="19" rx="1" fill="white" />
        <rect x="5" y="27" width="9" height="19" rx="4" fill={color} />
        <rect x="34" y="27" width="9" height="19" rx="4" fill={color} />
        <ellipse cx="9" cy="47" rx="4" ry="3" fill={skin} />
        <ellipse cx="39" cy="47" rx="4" ry="3" fill={skin} />
        <rect x="14" y="49" width="9" height="25" rx="3" fill="#141414" />
        <rect x="25" y="49" width="9" height="25" rx="3" fill="#141414" />
      </g>
    );
    default: return null;
  }
}

function Accessories({ hat, facialHair, neckwear, hairColor, glasses, eyebrows, skin }: {
  hat?: 0 | 1 | 2;
  facialHair?: 0 | 1;
  neckwear?: 0 | 1 | 2 | 3;
  hairColor: string;
  glasses?: 0 | 1;
  eyebrows?: 0 | 1;
  skin: string;
}) {
  return (
    <>
      {facialHair === 0 && (
        <g>
          <path d="M19 20.5 Q21 18.5 24 19.5 Q27 18.5 29 20.5" stroke={hairColor} strokeWidth="1.8" fill="none" strokeLinecap="round" />
          <path d="M19 20.5 Q17.5 22.5 19.5 22" stroke={hairColor} strokeWidth="1.4" fill="none" strokeLinecap="round" />
          <path d="M29 20.5 Q30.5 22.5 28.5 22" stroke={hairColor} strokeWidth="1.4" fill="none" strokeLinecap="round" />
        </g>
      )}
      {facialHair === 1 && (
        <path d="M15 20 Q15 28 24 30 Q33 28 33 20 Q29 23 24 23.5 Q19 23 15 20Z" fill={hairColor} />
      )}
      {neckwear === 0 && (
        <g>
          <polygon points="22,27 26,27 25,44 24,46 23,44" fill="#c0392b" />
          <polygon points="22,27 26,27 24.5,31 23.5,31" fill="#e74c3c" />
        </g>
      )}
      {neckwear === 1 && (
        <g>
          <path d="M20,27 Q24,33 28,27" fill="#d4af37" stroke="#b8960c" strokeWidth="0.5" />
          <circle cx="24" cy="28.5" r="2" fill="#b8960c" />
        </g>
      )}
      {neckwear === 2 && (
        <path d="M16,27 Q18,30 24,29 Q30,30 32,27 Q30,32 26,33 L24,38 L22,33 Q18,32 16,27Z" fill="#c0392b" />
      )}
      {neckwear === 3 && (
        // Long red tie — same shape as neckwear:0 but extended further down
        <g>
          <polygon points="22,27 26,27 25,50 24,53 23,50" fill="#c0392b" />
          <polygon points="22,27 26,27 24.5,31 23.5,31" fill="#e74c3c" />
        </g>
      )}
      {hat === 0 && (
        <g>
          <rect x="17" y="1" width="14" height="12" rx="1" fill="#1a1a1a" />
          <rect x="12" y="12" width="24" height="3" rx="1" fill="#141414" />
        </g>
      )}
      {hat === 1 && (
        <g>
          <ellipse cx="24" cy="9" rx="13" ry="7" fill="#8B0000" />
          <circle cx="30" cy="7" r="2" fill="#6b0000" />
        </g>
      )}
      {hat === 2 && (
        <g>
          <rect x="18" y="1" width="12" height="12" rx="2" fill="white" stroke="#ddd" strokeWidth="0.5" />
          <rect x="15" y="12" width="18" height="2.5" rx="1" fill="#ddd" />
        </g>
      )}
      {eyebrows === 0 && (
        <g>
          <path d="M16 11 Q19 10 21 11.5" stroke="#141414" strokeWidth="2.2" fill="none" strokeLinecap="round" />
          <path d="M32 11 Q29 10 27 11.5" stroke="#141414" strokeWidth="2.2" fill="none" strokeLinecap="round" />
        </g>
      )}
      {eyebrows === 1 && (
        <g>
          <ellipse cx="20.5" cy="12.8" rx="2.8" ry="2.2" fill={skin} />
          <ellipse cx="27.5" cy="12.8" rx="2.8" ry="2.2" fill={skin} />
        </g>
      )}
      {glasses === 0 && (
        <g>
          <circle cx="20.5" cy="14" r="3.2" stroke="#2a2a2a" strokeWidth="0.8" fill="none" />
          <circle cx="27.5" cy="14" r="3.2" stroke="#2a2a2a" strokeWidth="0.8" fill="none" />
          <line x1="23.7" y1="14" x2="24.3" y2="14" stroke="#2a2a2a" strokeWidth="0.8" />
          <line x1="17.3" y1="14" x2="14" y2="13" stroke="#2a2a2a" strokeWidth="0.8" />
          <line x1="30.7" y1="14" x2="34" y2="13" stroke="#2a2a2a" strokeWidth="0.8" />
        </g>
      )}
      {glasses === 1 && (
        <g>
          <rect x="16" y="11.5" width="16" height="5.5" rx="2" fill="#141414" opacity="0.85" />
          <line x1="16" y1="14" x2="13" y2="13" stroke="#141414" strokeWidth="0.8" opacity="0.85" />
          <line x1="32" y1="14" x2="35" y2="13" stroke="#141414" strokeWidth="0.8" opacity="0.85" />
        </g>
      )}
    </>
  );
}

export const ClientAvatar: React.FC<ClientAvatarProps> = ({ traits, animState, onAnimationComplete }) => {
  const skin          = SKIN_TONES[traits.skinTone];
  const hairColor     = HAIR_COLORS[traits.hairColor];
  const clothingColor = CLOTHING_COLORS[traits.clothingColor];
  const svgHeight     = SVG_HEIGHTS[traits.height];
  const svgWidth      = Math.round(svgHeight * 48 / 80);

  const motionProps =
    animState === 'entrance' ? {
      initial: { y: 16, opacity: 0 },
      animate: { y: 0, opacity: 1 },
      transition: { type: 'spring' as const, stiffness: 200, damping: 20 },
    } : animState === 'accused' ? {
      animate: { x: [0, -6, 6, -4, 4, 0] },
      transition: { duration: 0.4 },
    } : animState === 'refused' ? {
      animate: { y: 6, opacity: 0.4 },
      transition: { duration: 0.3 },
    } : {};

  return (
    <motion.div
      {...motionProps}
      onAnimationComplete={animState ? onAnimationComplete : undefined}
    >
      <svg
        width={svgWidth}
        height={svgHeight}
        viewBox="0 0 48 80"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <Hair style={traits.hairStyle} color={hairColor} />
        <ellipse cx="24" cy="16" rx="9" ry="10" fill={skin} />
        <ellipse cx="20.5" cy="14" rx="1.5" ry="1.8" fill="#141414" />
        <ellipse cx="27.5" cy="14" rx="1.5" ry="1.8" fill="#141414" />
        <circle cx="21.1" cy="13.2" r="0.5" fill="white" />
        <circle cx="28.1" cy="13.2" r="0.5" fill="white" />
        <path d="M23 18.5 Q24 20.5 25 18.5" stroke="#00000030" strokeWidth="0.8" fill="none" />
        <path d="M21 22 Q24 24 27 22" stroke="#141414" strokeWidth="0.8" fill="none" />
        <rect x="21" y="26" width="6" height="4" fill={skin} />
        <Clothing style={traits.clothingStyle} color={clothingColor} skin={skin} />
        <Accessories
          hat={traits.hat}
          facialHair={traits.facialHair}
          neckwear={traits.neckwear}
          hairColor={hairColor}
          glasses={traits.glasses}
          eyebrows={traits.eyebrows}
          skin={skin}
        />
        {traits.clothingStyle !== 2 && (
          <>
            <ellipse cx="18" cy="76" rx="6" ry="2.5" fill="#141414" />
            <ellipse cx="30" cy="76" rx="6" ry="2.5" fill="#141414" />
          </>
        )}
      </svg>
    </motion.div>
  );
};
