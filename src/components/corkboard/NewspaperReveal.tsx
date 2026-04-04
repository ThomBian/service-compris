import React from "react";
import { motion } from "motion/react";
import { useTranslation } from "react-i18next";

interface NewspaperRevealProps {
  headlineDisplayed: string;
  headlineFull: string;
  deck: string;
  bodyLeft: string;
  bodyRight: string;
  isActive: boolean;
  isDismissed: boolean;
  /** When true (carousel `final` step), desk layout at full scale so copy stays readable. */
  isFinalArrangement: boolean;
  canAdvance: boolean;
  containerZIndex: number;
  /** Final desk: sit in a horizontal row with siblings (no corner offsets). */
  layoutFinalRow?: boolean;
}

const VARIANTS = {
  hidden: { opacity: 0, scale: 0.7, y: -60, x: 0 },
  active: { opacity: 1, scale: 1, y: 0, x: 0 },
  dismissedCompact: { opacity: 0.92, scale: 0.56, x: "-30vw", y: "-22vh" },
  dismissedFinal: { opacity: 1, scale: 1, x: "-14vw", y: "-13vh" },
  dismissedFinalRow: { opacity: 1, scale: 1, x: 0, y: 0 },
} as const;

export function NewspaperReveal({
  headlineDisplayed,
  headlineFull,
  deck,
  bodyLeft,
  bodyRight,
  isActive,
  isDismissed,
  isFinalArrangement,
  canAdvance,
  containerZIndex,
  layoutFinalRow = false,
}: NewspaperRevealProps) {
  const { t } = useTranslation("campaign");
  const headlineDone =
    headlineFull.length > 0 && headlineDisplayed === headlineFull;
  const animateKey = isActive
    ? "active"
    : isDismissed
      ? isFinalArrangement
        ? layoutFinalRow
          ? "dismissedFinalRow"
          : "dismissedFinal"
        : "dismissedCompact"
      : "hidden";
  const showFullArticle = isFinalArrangement || headlineDone;
  const headlineToShow = isFinalArrangement ? headlineFull : headlineDisplayed;

  return (
    <div
      className={
        layoutFinalRow
          ? "relative flex h-full min-h-0 w-[min(60vw,50rem)] min-w-[200px] max-w-md shrink-0 flex-col items-center justify-start"
          : undefined
      }
      style={
        layoutFinalRow
          ? {
              pointerEvents: "none",
              zIndex: containerZIndex,
            }
          : {
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              pointerEvents: "none",
              zIndex: containerZIndex,
            }
      }
    >
      <motion.div
        className={
          layoutFinalRow
            ? "min-h-0 w-full max-h-full flex-1 overflow-y-auto overflow-x-hidden"
            : undefined
        }
        variants={VARIANTS}
        animate={animateKey}
        initial="hidden"
        transition={{ type: "spring", stiffness: 200, damping: 22 }}
      >
        <div
          className={`w-full bg-white rounded-xl border-2 border-[#141414] shadow-[6px_6px_0_0_#141414] overflow-hidden ${
            layoutFinalRow ? "max-w-none" : "min-w-[18rem] max-w-2xl"
          }`}
        >
          <div className="border-b-2 border-[#141414] px-5 py-5 text-center">
            <p
              className="text-2xl font-black uppercase tracking-[0.1em] text-[#141414]"
              style={{ fontFamily: "Georgia, serif" }}
            >
              {t("corkboard.newspaper.masthead")}
            </p>
            <div className="flex justify-between mt-2 border-t border-[#141414]/20 pt-2">
              <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#141414]/40">
                {t("corkboard.newspaper.eveningEdition")}
              </span>
              <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#141414]/40">
                {t("corkboard.newspaper.free")}
              </span>
            </div>
          </div>

          <div className="px-5 pt-6 pb-5">
            <p
              className="text-base font-black uppercase leading-tight tracking-[0.02em] text-[#141414]"
              style={{ fontFamily: "Georgia, serif" }}
            >
              {headlineToShow}
              {!headlineDone && !isFinalArrangement && (
                <span className="animate-pulse opacity-60">|</span>
              )}
            </p>
            {showFullArticle && deck && (
              <p className="text-xs text-[#141414]/60 italic mt-4 pt-3 border-t border-[#141414]/15 leading-relaxed">
                {deck}
              </p>
            )}
          </div>

          {showFullArticle && (bodyLeft || bodyRight) && (
            <div className="grid grid-cols-2 px-5 pt-4 pb-5 mt-2 border-t border-[#141414]/15 gap-0">
              <div
                className={`leading-relaxed text-[#141414]/70 pr-3 border-r border-[#141414]/15 ${
                  isFinalArrangement ? "text-[11px]" : "text-[10px]"
                }`}
              >
                {bodyLeft}
              </div>
              <div
                className={`leading-relaxed text-[#141414]/70 pl-3 ${
                  isFinalArrangement ? "text-[11px]" : "text-[10px]"
                }`}
              >
                {bodyRight}
              </div>
            </div>
          )}

          {canAdvance && (
            <div className="px-5 pb-5 text-center">
              <span className="text-[10px] font-bold tracking-[0.3em] text-[#141414]/40 animate-pulse">
                {t("corkboard.carousel.pressEnter")}
              </span>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
