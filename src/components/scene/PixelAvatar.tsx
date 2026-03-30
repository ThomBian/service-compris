import React, { useRef, useEffect } from "react";
import type { VisualTraits } from "../../types";
import { buildCustomerLayers, renderSprite } from "./pixelRenderer";

const SPRITE_W = 24;
const SPRITE_H = 48;

/** Guest desk reactions + Maître d' podium reactions (bow / stop / shrug). */
export type PixelAvatarAnimState =
  | "entrance"
  | "accused"
  | "refused"
  | "bow"
  | "stop"
  | "shrug"
  | null;

interface PixelAvatarProps {
  traits: VisualTraits;
  animState?: PixelAvatarAnimState;
  onAnimationComplete?: () => void;
  scale?: number;
}

const KEYFRAMES = `
@keyframes pa-entrance {
  from { transform: translateY(8px); opacity: 0; }
  to   { transform: translateY(0);   opacity: 1; }
}
@keyframes pa-accused {
  0%   { transform: translateX(0); }
  15%  { transform: translateX(-4px); }
  30%  { transform: translateX(4px); }
  45%  { transform: translateX(-3px); }
  60%  { transform: translateX(3px); }
  75%  { transform: translateX(-2px); }
  100% { transform: translateX(0); }
}
@keyframes pa-refused {
  from { transform: translateY(0);    opacity: 1;   }
  to   { transform: translateY(10px); opacity: 0.4; }
}
@keyframes pa-bow {
  0% { transform: translateY(0) scale(1); }
  45% { transform: translateY(10px) scale(0.92, 0.96); }
  100% { transform: translateY(0) scale(1); }
}
@keyframes pa-stop {
  0% { transform: translateX(0) scaleX(1); }
  35% { transform: translateX(0) scaleX(1.14); }
  100% { transform: translateX(0) scaleX(1); }
}
@keyframes pa-shrug {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  25% { transform: translateY(-3px) rotate(-4deg); }
  50% { transform: translateY(-4px) rotate(4deg); }
  75% { transform: translateY(-3px) rotate(-2deg); }
}
`;

let styleInjected = false;
function injectKeyframes() {
  if (styleInjected || typeof document === "undefined") return;
  const el = document.createElement("style");
  el.textContent = KEYFRAMES;
  document.head.appendChild(el);
  styleInjected = true;
}

export const PixelAvatar: React.FC<PixelAvatarProps> = ({
  traits,
  animState,
  onAnimationComplete,
  scale = 2,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    injectKeyframes();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, SPRITE_W, SPRITE_H);
    renderSprite(buildCustomerLayers(traits), ctx);
  }, [traits]);

  const animStyle: React.CSSProperties = (() => {
    switch (animState) {
      case "entrance":
        return { animation: "pa-entrance 0.3s ease-out forwards" };
      case "accused":
        return { animation: "pa-accused 0.4s ease-in-out forwards" };
      case "refused":
        return { animation: "pa-refused 0.3s ease-in forwards" };
      case "bow":
        return { animation: "pa-bow 0.5s ease-in-out forwards" };
      case "stop":
        return { animation: "pa-stop 0.3s ease-out forwards" };
      case "shrug":
        return { animation: "pa-shrug 0.4s ease-in-out forwards" };
      default:
        return {};
    }
  })();

  return (
    <canvas
      ref={canvasRef}
      width={SPRITE_W}
      height={SPRITE_H}
      aria-hidden
      style={{
        width: SPRITE_W * scale,
        height: SPRITE_H * scale,
        imageRendering: "pixelated",
        ...animStyle,
      }}
      onAnimationEnd={animState ? onAnimationComplete : undefined}
    />
  );
};
