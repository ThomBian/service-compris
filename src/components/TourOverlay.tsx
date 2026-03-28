// src/components/TourOverlay.tsx
import React, { useEffect, useState, useId } from 'react';
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
const TOOLTIP_WIDTH = 300;
const TOOLTIP_MARGIN = 12;
const EDGE_GUARD = 12;

const COUNTDOWN_START = 3;

export const TourOverlay: React.FC<TourOverlayProps> = ({ step, onNext, onSkip }) => {
  const [rect, setRect] = useState<TargetRect | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const tourStep = TOUR_STEPS[step];
  const isLastStep = step === TOUR_STEPS.length - 1;
  const maskId = useId().replace(/:/g, '_');

  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) {
      onSkip();
      return;
    }
    const timer = setTimeout(() => setCountdown((c) => (c ?? 1) - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown, onSkip]);

  const handleDone = () => setCountdown(COUNTDOWN_START);

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
      {/* SVG spotlight overlay — full black during countdown, masked spotlight otherwise */}
      <svg
        className="absolute inset-0 w-full h-full"
        style={{ pointerEvents: 'none' }}
        aria-hidden
      >
        {rect && countdown === null && (
          <defs>
            <mask id={maskId}>
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
        )}
        <rect
          width="100%"
          height="100%"
          fill="rgba(0,0,0,0.88)"
          mask={rect && countdown === null ? `url(#${maskId})` : undefined}
        />
      </svg>

      {/* Countdown screen */}
      {countdown !== null && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
          <p className="text-2xl font-black uppercase tracking-[0.2em] text-white">
            Ready to Play!
          </p>
          <span className="text-8xl font-black text-white tabular-nums">
            {countdown === 0 ? 'Go!' : countdown}
          </span>
        </div>
      )}

      {/* Tooltip */}
      {rect && countdown === null && (
        <div
          role="dialog"
          aria-label={`Tour step ${step + 1} of ${TOUR_STEPS.length}: ${tourStep.title}`}
          className="absolute w-[300px] rounded-xl border-2 border-[#141414] bg-[#E4E3E0] px-5 py-4 shadow-[4px_4px_0_0_rgba(20,20,20,1)]"
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
            onClick={isLastStep ? handleDone : onNext}
            className="mt-4 w-full rounded-lg bg-[#141414] px-4 py-2 text-sm font-bold uppercase tracking-wide text-[#E4E3E0] transition-opacity hover:opacity-80"
          >
            {isLastStep ? "Let's go!" : 'Next →'}
          </button>
        </div>
      )}

      {/* Skip */}
      {countdown === null && (
        <button
          type="button"
          onClick={onSkip}
          className="absolute top-4 right-4 text-xs font-bold uppercase tracking-wide text-white/60 transition-colors hover:text-white/90"
        >
          Skip tour
        </button>
      )}
    </div>,
    document.body,
  );
};
