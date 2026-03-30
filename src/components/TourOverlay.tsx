// src/components/TourOverlay.tsx
import React, { useEffect, useState, useId } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { TOUR_STEPS } from '@/src/tour/tourSteps';
import { Z_INDEX } from '@/src/zIndex';

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
const TOOLTIP_WIDTH = 420;
const TOOLTIP_MARGIN = 12;
const EDGE_GUARD = 12;

const COUNTDOWN_START = 3;

export const TourOverlay: React.FC<TourOverlayProps> = ({ step, onNext, onSkip }) => {
  const { t } = useTranslation('tour');
  const [rect, setRect] = useState<TargetRect | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const tourStep = TOUR_STEPS[step];
  const isLastStep = step === TOUR_STEPS.length - 1;
  const maskId = useId().replace(/:/g, '_');
  const ck = tourStep.copyKey;
  const title = t(`${ck}.title`);
  const tooltip = t(`${ck}.tooltip`);

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
    let cancelled = false;

    const measure = () => {
      const el = document.querySelector(`[data-tour="${tourStep.target}"]`);
      if (!el || cancelled) return;
      const r = el.getBoundingClientRect();
      setRect({
        x: r.left - PAD,
        y: r.top - PAD,
        width: r.width + PAD * 2,
        height: r.height + PAD * 2,
      });
    };

    const update = () => requestAnimationFrame(measure);

    update();

    const resizeObserver = new ResizeObserver(update);
    resizeObserver.observe(document.documentElement);

    const mutationObserver = new MutationObserver(() => {
      if (document.querySelector(`[data-tour="${tourStep.target}"]`)) {
        update();
      }
    });
    mutationObserver.observe(document.body, { childList: true, subtree: true });

    return () => {
      cancelled = true;
      resizeObserver.disconnect();
      mutationObserver.disconnect();
    };
  }, [step, tourStep.target]);

  const vw = window.innerWidth;
  const vh = window.innerHeight;

  const tooltipBelow = rect ? rect.y + rect.height < vh * 0.6 : true;
  const tooltipTop = rect
    ? tooltipBelow
      ? rect.y + rect.height + TOOLTIP_MARGIN
      : EDGE_GUARD
    : vh / 2;
  const tooltipMaxHeight = rect
    ? tooltipBelow
      ? vh - tooltipTop - EDGE_GUARD
      : rect.y - EDGE_GUARD - TOOLTIP_MARGIN
    : undefined;
  const tooltipCenterX = rect ? rect.x + rect.width / 2 : vw / 2;
  const tooltipLeft = Math.min(
    Math.max(tooltipCenterX - TOOLTIP_WIDTH / 2, EDGE_GUARD),
    vw - TOOLTIP_WIDTH - EDGE_GUARD,
  );

  return createPortal(
    <div className="fixed inset-0" style={{ zIndex: Z_INDEX.tour }}>
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

      {countdown !== null && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
          <p className="text-2xl font-black uppercase tracking-[0.2em] text-white">
            {t('countdown.ready')}
          </p>
          <span className="text-8xl font-black text-white tabular-nums">
            {countdown === 0 ? t('countdown.go') : countdown}
          </span>
        </div>
      )}

      {rect && countdown === null && (
        <div
          role="dialog"
          aria-label={`${t('aria.stepOf', { n: step + 1, total: TOUR_STEPS.length })}: ${title}`}
          className="absolute w-[420px] rounded-xl border-2 border-[#141414] bg-[#E4E3E0] px-5 py-4 shadow-[4px_4px_0_0_#141414]"
          style={{
            top: tooltipTop,
            left: tooltipLeft,
          }}
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#141414]/50">
            {t('aria.stepProgress', { n: step + 1, total: TOUR_STEPS.length })}
          </p>
          <h3 className="mt-1 text-base font-black uppercase tracking-[0.12em] text-[#141414]">
            {title}
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-[#141414]/80">
            {tooltip}
          </p>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={isLastStep ? handleDone : onNext}
              className="flex-1 rounded-xl bg-[#141414] px-4 py-2 text-sm font-bold uppercase tracking-wide text-[#E4E3E0] shadow-[4px_4px_0_0_#141414] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_#141414] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none"
            >
              {isLastStep ? t('buttons.letsGo') : t('buttons.next')}
            </button>
            {!isLastStep && (
              <button
                type="button"
                onClick={onSkip}
                className="rounded-xl border-2 border-[#141414]/20 px-4 py-2 text-sm font-bold uppercase tracking-wide text-[#141414]/40 transition-colors hover:border-[#141414]/40 hover:text-[#141414]/60"
              >
                {t('buttons.skip')}
              </button>
            )}
          </div>
        </div>
      )}
    </div>,
    document.body,
  );
};
