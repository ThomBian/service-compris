import React, { useRef, useEffect } from "react";
import { renderSprite } from "./pixelRenderer";
import type { PixelLayer } from "./pixelSprites";

const SPRITE_W = 24;
const SPRITE_H = 48;

const SKIN = "#d4956a";
const HAIR = "#2d1b00";
const JACKET = "#0f1923";
const BOWTIE = "#7b1c2e";
const SHIRT = "#f0f0f0";
const GOLD = "#d4af37";
const SHOES = "#2d1b00";

function buildIdleLayers(): PixelLayer[] {
  return [
    [{ x: 4, y: 46, w: 16, h: 2, color: "rgba(0,0,0,0.3)" }],
    [
      { x: 4, y: 43, w: 6, h: 3, color: SHOES },
      { x: 14, y: 43, w: 6, h: 3, color: SHOES },
    ],
    [
      { x: 6, y: 35, w: 4, h: 8, color: JACKET },
      { x: 14, y: 35, w: 4, h: 8, color: JACKET },
    ],
    [
      { x: 2, y: 22, w: 3, h: 18, color: JACKET },
      { x: 19, y: 22, w: 3, h: 18, color: JACKET },
    ],
    [
      { x: 2, y: 38, w: 3, h: 3, color: SKIN },
      { x: 19, y: 38, w: 3, h: 3, color: SKIN },
    ],
    [{ x: 5, y: 22, w: 14, h: 14, color: JACKET }],
    [{ x: 10, y: 22, w: 4, h: 14, color: SHIRT }],
    [
      { x: 8, y: 22, w: 3, h: 4, color: BOWTIE },
      { x: 13, y: 22, w: 3, h: 4, color: BOWTIE },
      { x: 11, y: 23, w: 2, h: 3, color: "#5a1420" },
    ],
    [
      { x: 11, y: 27, w: 2, h: 2, color: GOLD },
      { x: 11, y: 31, w: 2, h: 2, color: GOLD },
    ],
    [{ x: 6, y: 23, w: 3, h: 3, color: BOWTIE }],
    [{ x: 10, y: 19, w: 4, h: 4, color: SKIN }],
    [
      { x: 7, y: 9, w: 10, h: 11, color: SKIN },
      { x: 9, y: 13, w: 2, h: 2, color: "#1a0f0a" },
      { x: 13, y: 13, w: 2, h: 2, color: "#1a0f0a" },
      { x: 10, y: 13, w: 1, h: 1, color: "white" },
      { x: 14, y: 13, w: 1, h: 1, color: "white" },
      { x: 9, y: 18, w: 6, h: 1, color: "#6b3020" },
      { x: 10, y: 17, w: 4, h: 1, color: HAIR },
    ],
    [
      { x: 6, y: 5, w: 12, h: 5, color: HAIR },
      { x: 5, y: 8, w: 2, h: 3, color: HAIR },
      { x: 17, y: 8, w: 2, h: 3, color: HAIR },
    ],
    [
      { x: 8, y: 11, w: 4, h: 1, color: HAIR },
      { x: 12, y: 11, w: 4, h: 1, color: HAIR },
    ],
  ];
}

function buildBowLayers(): PixelLayer[] {
  return [
    [{ x: 4, y: 46, w: 16, h: 2, color: "rgba(0,0,0,0.3)" }],
    [
      { x: 4, y: 43, w: 6, h: 3, color: SHOES },
      { x: 14, y: 43, w: 6, h: 3, color: SHOES },
    ],
    [
      { x: 6, y: 35, w: 4, h: 8, color: JACKET },
      { x: 14, y: 35, w: 4, h: 8, color: JACKET },
    ],
    [
      { x: 1, y: 24, w: 4, h: 14, color: JACKET },
      { x: 19, y: 24, w: 4, h: 14, color: JACKET },
    ],
    [
      { x: 1, y: 36, w: 4, h: 3, color: SKIN },
      { x: 19, y: 36, w: 4, h: 3, color: SKIN },
    ],
    [{ x: 4, y: 24, w: 16, h: 14, color: JACKET }],
    [{ x: 10, y: 24, w: 4, h: 14, color: SHIRT }],
    [
      { x: 8, y: 24, w: 3, h: 4, color: BOWTIE },
      { x: 13, y: 24, w: 3, h: 4, color: BOWTIE },
      { x: 11, y: 25, w: 2, h: 3, color: "#5a1420" },
    ],
    [{ x: 10, y: 23, w: 4, h: 4, color: SKIN }],
    [
      { x: 6, y: 13, w: 10, h: 11, color: SKIN },
      { x: 8, y: 17, w: 4, h: 1, color: "#1a0f0a" },
      { x: 14, y: 17, w: 4, h: 1, color: "#1a0f0a" },
      { x: 9, y: 21, w: 6, h: 1, color: "#8b4513" },
    ],
    [
      { x: 5, y: 9, w: 12, h: 5, color: HAIR },
      { x: 4, y: 12, w: 2, h: 3, color: HAIR },
      { x: 16, y: 12, w: 2, h: 3, color: HAIR },
    ],
  ];
}

function buildStopLayers(): PixelLayer[] {
  return [
    [{ x: 4, y: 46, w: 16, h: 2, color: "rgba(0,0,0,0.3)" }],
    [
      { x: 4, y: 43, w: 6, h: 3, color: SHOES },
      { x: 14, y: 43, w: 6, h: 3, color: SHOES },
    ],
    [
      { x: 6, y: 35, w: 4, h: 8, color: JACKET },
      { x: 14, y: 35, w: 4, h: 8, color: JACKET },
    ],
    [
      { x: 0, y: 14, w: 4, h: 14, color: JACKET },
      { x: 20, y: 14, w: 4, h: 14, color: JACKET },
    ],
    [
      { x: 0, y: 12, w: 4, h: 4, color: SKIN },
      { x: 20, y: 12, w: 4, h: 4, color: SKIN },
    ],
    [{ x: 5, y: 22, w: 14, h: 14, color: JACKET }],
    [{ x: 10, y: 22, w: 4, h: 14, color: SHIRT }],
    [
      { x: 8, y: 22, w: 3, h: 4, color: BOWTIE },
      { x: 13, y: 22, w: 3, h: 4, color: BOWTIE },
      { x: 11, y: 23, w: 2, h: 3, color: "#5a1420" },
    ],
    [{ x: 10, y: 19, w: 4, h: 4, color: SKIN }],
    [
      { x: 7, y: 9, w: 10, h: 11, color: SKIN },
      { x: 8, y: 13, w: 3, h: 2, color: "#1a0f0a" },
      { x: 13, y: 13, w: 3, h: 2, color: "#1a0f0a" },
      { x: 8, y: 10, w: 4, h: 1, color: HAIR },
      { x: 12, y: 10, w: 4, h: 1, color: HAIR },
      { x: 9, y: 18, w: 6, h: 1, color: "#6b3020" },
    ],
    [
      { x: 6, y: 5, w: 12, h: 5, color: HAIR },
      { x: 5, y: 8, w: 2, h: 3, color: HAIR },
      { x: 17, y: 8, w: 2, h: 3, color: HAIR },
    ],
  ];
}

function buildShrugLayers(): PixelLayer[] {
  return [
    ...buildStopLayers().slice(0, -1),
    [
      { x: 7, y: 9, w: 10, h: 11, color: SKIN },
      { x: 9, y: 13, w: 2, h: 2, color: "#1a0f0a" },
      { x: 13, y: 13, w: 2, h: 2, color: "#1a0f0a" },
      { x: 9, y: 11, w: 3, h: 1, color: HAIR },
      { x: 12, y: 11, w: 3, h: 1, color: HAIR },
      { x: 9, y: 18, w: 2, h: 1, color: "#8b4513" },
      { x: 11, y: 19, w: 2, h: 1, color: "#8b4513" },
      { x: 13, y: 18, w: 2, h: 1, color: "#8b4513" },
    ],
  ];
}

/** Matches former `MaitreDAvatar` motion durations before `onAnimationComplete`. */
const MAITRE_D_ANIM_MS = { bow: 500, stop: 300, shrug: 400 } as const;

interface PixelMaitreDProps {
  animState?: "bow" | "stop" | "shrug" | null;
  onAnimationComplete?: () => void;
  scale?: number;
}

export const PixelMaitreD: React.FC<PixelMaitreDProps> = ({
  animState,
  onAnimationComplete,
  scale = 2,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onCompleteRef = useRef(onAnimationComplete);
  onCompleteRef.current = onAnimationComplete;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, SPRITE_W, SPRITE_H);

    let layers: PixelLayer[];
    if (animState === "bow") layers = buildBowLayers();
    else if (animState === "stop") layers = buildStopLayers();
    else if (animState === "shrug") layers = buildShrugLayers();
    else layers = buildIdleLayers();

    renderSprite(layers, ctx);

    if (animState === "bow" || animState === "stop" || animState === "shrug") {
      const ms = MAITRE_D_ANIM_MS[animState];
      const id = window.setTimeout(() => {
        onCompleteRef.current?.();
      }, ms);
      return () => window.clearTimeout(id);
    }
    return undefined;
  }, [animState]);

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
      }}
    />
  );
};
