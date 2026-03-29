// src/components/scene/StreetSceneBackground.tsx
import React from 'react';

interface StreetSceneBackgroundProps {
  children: React.ReactNode;
}

// Neon glow overlays tuned to sign positions in public/street-background.png.
// Each sign has a primary glow and a pavement reflection below it.
// Positions are % of the container — adjust if the image crops differently.
const NEONS = [
  // LE SOLSTICE — gold, far left
  { key: 'solstice',  left: '4%',  top: '10%', w: '14%', h: '50%', color: 'rgba(240,192,64,0.65)',  dur: '3.2s', delay: '0s',    reflectH: '18%' },
  // ART DECO — gold vertical, left-center
  { key: 'artdeco',   left: '22%', top: '5%',  w: '6%',  h: '65%', color: 'rgba(240,200,80,0.5)',   dur: '4.1s', delay: '0.8s',  reflectH: '15%' },
  // JAZZ CAFE — purple
  { key: 'jazz',      left: '47%', top: '8%',  w: '9%',  h: '55%', color: 'rgba(160,80,220,0.6)',   dur: '2.8s', delay: '1.4s',  reflectH: '16%' },
  // JAZZ CLUB — purple lower
  { key: 'jazzclub',  left: '54%', top: '45%', w: '10%', h: '25%', color: 'rgba(180,60,240,0.45)',  dur: '3.5s', delay: '0.3s',  reflectH: '10%' },
  // DRUGS — cyan, far right
  { key: 'drugs',     left: '91%', top: '10%', w: '7%',  h: '55%', color: 'rgba(0,200,255,0.6)',    dur: '2.5s', delay: '2.1s',  reflectH: '17%' },
] as const;

export const StreetSceneBackground: React.FC<StreetSceneBackgroundProps> = ({ children }) => {
  return (
    <div className="relative h-full w-full overflow-visible">
      {/* Layer 1 — background image */}
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: "url('/street-background.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'bottom center',
          imageRendering: 'pixelated',
        }}
      />

      {/* Layer 2 — neon glow overlays + pavement reflections */}
      <div className="absolute inset-0 z-[1] pointer-events-none">
        <style>{`
          @keyframes neonPulse {
            0%, 100% { opacity: 0.5; filter: blur(8px); }
            50%       { opacity: 1;   filter: blur(13px); }
          }
        `}</style>
        {NEONS.map((n) => (
          <React.Fragment key={n.key}>
            {/* Sign glow */}
            <div
              style={{
                position: 'absolute',
                left: n.left,
                top: n.top,
                width: n.w,
                height: n.h,
                background: `radial-gradient(ellipse, ${n.color} 0%, transparent 70%)`,
                animation: `neonPulse ${n.dur} ease-in-out infinite`,
                animationDelay: n.delay,
              }}
            />
            {/* Pavement reflection */}
            <div
              style={{
                position: 'absolute',
                left: n.left,
                bottom: 0,
                width: n.w,
                height: n.reflectH,
                background: `linear-gradient(180deg, ${n.color.replace(/[\d.]+\)$/, '0.25)')} 0%, transparent 100%)`,
                filter: 'blur(4px)',
                animation: `neonPulse ${n.dur} ease-in-out infinite`,
                animationDelay: n.delay,
              }}
            />
          </React.Fragment>
        ))}
      </div>

      {/* Layer 3 — children (DeskScene content) */}
      <div className="relative z-10 h-full overflow-visible">
        {children}
      </div>
    </div>
  );
};
