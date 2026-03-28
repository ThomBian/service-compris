// src/components/TourOverlay.tsx
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { TOUR_STEPS } from '@/src/tour/tourSteps';

interface TargetRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface TourOverlayProps {
  step: number;
  onNext: () => void;
  onSkip: () => void;
}

const PAD = 10;
const TOOLTIP_WIDTH = 256;
const TOOLTIP_MARGIN = 12;
const EDGE_GUARD = 12;

export const TourOverlay: React.FC<TourOverlayProps> = ({ step, onNext, onSkip }) => {
  const [rect, setRect] = useState<TargetRect | null>(null);
  const tourStep = TOUR_STEPS[step];
  const isLastStep = step === TOUR_STEPS.length - 1;

  useEffect(() => {
    const update = () => {
      requestAnimationFrame(() => {
        const el = document.querySelector(`[data-tour="${tourStep.target}"]`);
        if (!el) return;
        const r = el.getBoundingClientRect();
        setRect({
          x: r.left - PAD,
          y: r.top - PAD,
          width: r.width + PAD * 2,
          height: r.height + PAD * 2,
        });
      });
    };

    update();

    const observer = new ResizeObserver(update);
    observer.observe(document.documentElement);
    return () => observer.disconnect();
  }, [step, tourStep.target]);

  const vw = window.innerWidth;
  const vh = window.innerHeight;

  const tooltipBelow = rect ? rect.y + rect.height < vh * 0.6 : true;
  const tooltipTop = rect
    ? tooltipBelow
      ? rect.y + rect.height + TOOLTIP_MARGIN
      : rect.y - TOOLTIP_MARGIN
    : vh / 2;
  const tooltipCenterX = rect ? rect.x + rect.width / 2 : vw / 2;
  const tooltipLeft = Math.min(
    Math.max(tooltipCenterX - TOOLTIP_WIDTH / 2, EDGE_GUARD),
    vw - TOOLTIP_WIDTH - EDGE_GUARD,
  );

  return createPortal(
    <div className="fixed inset-0 z-50">
      {/* SVG spotlight overlay */}
      {rect && (
        <svg
          className="absolute inset-0 w-full h-full"
          style={{ pointerEvents: 'none' }}
          aria-hidden
        >
          <defs>
            <mask id="tour-hole">
              <rect width="100%" height="100%" fill="white" />
              <rect
                x={rect.x}
                y={rect.y}
                width={rect.width}
                height={rect.height}
                rx={8}
                fill="black"
              />
            </mask>
          </defs>
          <rect
            width="100%"
            height="100%"
            fill="rgba(0,0,0,0.72)"
            mask="url(#tour-hole)"
          />
        </svg>
      )}

      {/* Tooltip */}
      {rect && (
        <div
          role="dialog"
          aria-label={`Tour step ${step + 1} of ${TOUR_STEPS.length}: ${tourStep.title}`}
          className="absolute w-64 rounded-xl border-2 border-[#141414] bg-[#E4E3E0] px-5 py-4 shadow-[4px_4px_0_0_rgba(20,20,20,1)]"
          style={{
            top: tooltipBelow ? tooltipTop : undefined,
            bottom: tooltipBelow ? undefined : vh - tooltipTop,
            left: tooltipLeft,
          }}
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#141414]/50">
            {step + 1} of {TOUR_STEPS.length}
          </p>
          <h3 className="mt-1 text-base font-black uppercase tracking-[0.12em] text-[#141414]">
            {tourStep.title}
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-[#141414]/80">
            {tourStep.tooltip}
          </p>
          <button
            type="button"
            onClick={isLastStep ? onSkip : onNext}
            className="mt-4 w-full rounded-lg bg-[#141414] px-4 py-2 text-sm font-bold uppercase tracking-wide text-[#E4E3E0] transition-opacity hover:opacity-80"
          >
            {isLastStep ? 'Done' : 'Next →'}
          </button>
        </div>
      )}

      {/* Skip */}
      <button
        type="button"
        onClick={onSkip}
        className="absolute top-4 right-4 text-xs font-bold uppercase tracking-wide text-white/60 transition-colors hover:text-white/90"
      >
        Skip tour
      </button>
    </div>,
    document.body,
  );
};
