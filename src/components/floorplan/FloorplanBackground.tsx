// src/components/floorplan/FloorplanBackground.tsx
import React from 'react';

interface FloorplanBackgroundProps {
  children: React.ReactNode;
}

export const FloorplanBackground: React.FC<FloorplanBackgroundProps> = ({ children }) => {
  return (
    <div className="relative h-full w-full overflow-hidden">
      {/* Layer 1 — restaurant interior image */}
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: "url('/restaurant-inside.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          imageRendering: 'pixelated',
        }}
      />
      {/* Layer 2 — radial vignette for grid readability */}
      <div
        className="absolute inset-0 z-[1] pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 40% 60%, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.45) 100%)',
        }}
      />
      {/* Layer 3 — UI content */}
      <div className="relative z-10 h-full flex flex-col">
        {children}
      </div>
    </div>
  );
};
