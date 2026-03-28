import React, { useEffect, useRef, useState } from 'react';
import { SALARY_COST, ELECTRICITY_COST, FOOD_COST_PER_COVER } from '../constants';
import type { VisualTraits } from '../types';
import { ClientAvatar } from './scene/ClientAvatar';

export interface SummaryData {
  nightNumber: number;
  shiftRevenue: number;
  /** Actual net for the night: (cash_end − bill) − cash_start. Accounts for in-shift penalties. */
  shiftNet: number;
  coversSeated: number;
  overtimeMinutes: number;
  cashBefore: number;
  ratingBefore: number;
  moraleBefore: number;
  cashAfter: number;
  ratingAfter: number;
  moraleAfter: number;
  loseReason: 'none' | 'bankruptcy' | 'morale' | 'vip' | 'banned';
  /** Present when loseReason is vip or banned — who ended the run. */
  loseCharacterName?: string;
  loseCharacterTraits?: VisualTraits;
}

interface Props {
  data: SummaryData;
  onNextShift: () => void;
  onTryAgain: () => void;
}

/** Body copy under the stats when the night ends in a loss (null = no loss banner). */
function loseMessage(
  reason: SummaryData['loseReason'],
  showPortrait: boolean,
  characterName: string | undefined,
): string | null {
  switch (reason) {
    case 'bankruptcy':
      return "You can't cover tonight's costs. The restaurant closes its doors.";
    case 'morale':
      return "Your staff has had enough. The doors close.";
    case 'vip':
      if (showPortrait) return 'A VIP incident forced the house to close tonight.';
      if (characterName) {
        return `${characterName} — a VIP incident forced the house to close tonight.`;
      }
      return 'A VIP incident forced the house to close tonight.';
    case 'banned':
      if (showPortrait) {
        return 'Seating this guest had consequences the restaurant could not survive.';
      }
      if (characterName) {
        return `${characterName} — seating them had consequences the restaurant could not survive.`;
      }
      return 'Seating the wrong guest had consequences the restaurant could not survive.';
    default:
      return null;
  }
}

function useCountUp(target: number, duration: number, active: boolean): number {
  const [value, setValue] = useState(0);
  const raf = useRef<number | null>(null);
  useEffect(() => {
    if (!active) { setValue(0); return; }
    const start = performance.now();
    const abs = Math.abs(target);
    function step(now: number) {
      const t = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(ease * abs));
      if (t < 1) raf.current = requestAnimationFrame(step);
      else setValue(abs);
    }
    raf.current = requestAnimationFrame(step);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [target, duration, active]);
  return value;
}

export const EndOfNightSummary: React.FC<Props> = ({ data, onNextShift, onTryAgain }) => {
  const {
    nightNumber, shiftRevenue, shiftNet, coversSeated, overtimeMinutes,
    cashBefore, ratingBefore, moraleBefore,
    cashAfter, ratingAfter, moraleAfter,
    loseReason,
    loseCharacterName,
    loseCharacterTraits,
  } = data;

  const foodCost = coversSeated * FOOD_COST_PER_COVER;
  const bill = SALARY_COST + ELECTRICITY_COST + foodCost;
  const net = shiftNet;
  const isLoss = loseReason !== 'none';

  const [step, setStep] = useState(0);
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let i = 1; i <= 12; i++) {
      timers.push(setTimeout(() => setStep(i), i * 240));
    }
    return () => timers.forEach(clearTimeout);
  }, []);

  const revCount = useCountUp(shiftRevenue, 400, step >= 3);
  const salCount = useCountUp(SALARY_COST, 400, step >= 5);
  const elecCount = useCountUp(ELECTRICITY_COST, 400, step >= 6);
  const foodCount = useCountUp(foodCost, 400, step >= 8);
  const netCount = useCountUp(Math.abs(net), 600, step >= 9);

  const headline =
    loseReason === 'none' || loseReason === 'bankruptcy' ? 'Service Complete' : 'Shift Cut Short';
  const losePortrait =
    (loseReason === 'vip' || loseReason === 'banned') &&
    loseCharacterName &&
    loseCharacterTraits
      ? { name: loseCharacterName, traits: loseCharacterTraits }
      : null;

  const loseMsg = loseMessage(loseReason, losePortrait !== null, loseCharacterName);

  const s = (n: number) => `opacity-0 translate-y-1 transition-all duration-300 ${n <= step ? 'opacity-100 translate-y-0' : ''}`;

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#141414]/80 p-4">
      <div className="flex flex-col gap-3 w-full max-w-sm rounded-2xl border-2 border-[#141414] bg-[#E4E3E0] px-7 py-6 shadow-[6px_6px_0_0_rgba(20,20,20,1)]">

        <div className={s(1)}>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-40">Night {nightNumber}</p>
          <h2 className={`text-2xl font-black uppercase tracking-[0.15em] ${isLoss ? 'text-red-700' : ''}`}>
            {headline}
          </h2>
          {overtimeMinutes > 0 && (
            <span className="inline-block mt-1 text-[10px] font-bold uppercase tracking-wide bg-[#141414] text-[#E4E3E0] rounded px-2 py-0.5">
              +{overtimeMinutes} min overtime
            </span>
          )}
        </div>

        <hr className="border-[#141414]/15" />

        <p className={`text-[9px] font-bold uppercase tracking-[0.2em] opacity-35 -mb-1 ${s(2)}`}>Revenue</p>
        <div className={`flex justify-between text-sm ${s(3)}`}>
          <span className="uppercase tracking-wide opacity-60 text-xs font-semibold">Tonight's takings</span>
          <span className="font-bold text-emerald-700">+&euro;{revCount}</span>
        </div>

        <p className={`text-[9px] font-bold uppercase tracking-[0.2em] opacity-35 -mb-1 ${s(4)}`}>Fixed costs</p>
        <div className={`flex justify-between text-sm ${s(5)}`}>
          <span className="uppercase tracking-wide opacity-60 text-xs font-semibold">Salaries</span>
          <span className="font-bold text-red-700">&minus;&euro;{salCount}</span>
        </div>
        <div className={`flex justify-between text-sm ${s(6)}`}>
          <span className="uppercase tracking-wide opacity-60 text-xs font-semibold">Electricity</span>
          <span className="font-bold text-red-700">&minus;&euro;{elecCount}</span>
        </div>

        <p className={`text-[9px] font-bold uppercase tracking-[0.2em] opacity-35 -mb-1 ${s(7)}`}>Variable costs</p>
        <div className={`flex justify-between text-sm ${s(8)}`}>
          <span className="uppercase tracking-wide opacity-60 text-xs font-semibold">Food & supplies ({coversSeated} covers)</span>
          <span className="font-bold text-red-700">&minus;&euro;{foodCount}</span>
        </div>

        <div className={`flex justify-between items-baseline border-t-2 border-[#141414] pt-2 ${s(9)}`}>
          <span className="text-xs font-black uppercase tracking-[0.15em]">Tonight</span>
          <span className={`text-xl font-black ${net >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
            {net >= 0 ? '+' : '\u2212'}&euro;{netCount}
          </span>
        </div>

        <hr className="border-[#141414]/15" />

        <div className={`flex gap-2 ${s(10)}`}>
          {[
            { label: 'Cash', val: `\u20AC${Math.round(cashAfter)}`, delta: cashAfter - cashBefore },
            { label: 'Rating', val: `${ratingAfter.toFixed(1)}\u2605`, delta: ratingAfter - ratingBefore },
            { label: 'Morale', val: `${moraleAfter}`, delta: moraleAfter - moraleBefore },
          ].map(({ label, val, delta }) => (
            <div key={label} className="flex-1 flex flex-col items-center gap-0.5 border-[1.5px] border-[#141414] rounded-xl py-2 bg-white">
              <span className="text-[9px] font-bold uppercase tracking-wide opacity-50">{label}</span>
              <span className="text-sm font-black">{val}</span>
              <span className={`text-[10px] font-bold ${delta >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                {delta >= 0 ? '+' : ''}{label === 'Rating' ? delta.toFixed(1) : Math.round(delta)}
              </span>
            </div>
          ))}
        </div>

        {loseMsg && (
          <div
            className={`flex flex-col gap-2 text-red-700 border border-red-300 rounded-lg px-3 py-2 bg-red-50 ${s(11)}`}
          >
            {losePortrait && (
              <div className="flex items-center gap-3">
                <div className="shrink-0 w-12 flex items-end justify-center [&_svg]:w-full [&_svg]:h-auto">
                  <ClientAvatar traits={losePortrait.traits} />
                </div>
                <p className="text-[10px] font-black uppercase tracking-wide text-[#141414] leading-tight">
                  {losePortrait.name}
                </p>
              </div>
            )}
            <p className="text-xs font-bold text-center">{loseMsg}</p>
          </div>
        )}

        <div className={s(12)}>
          {isLoss ? (
            <button
              onClick={onTryAgain}
              className="w-full py-3 rounded-xl border-2 border-red-700 bg-red-700 text-white text-sm font-black uppercase tracking-[0.2em] shadow-[3px_3px_0_0_rgba(185,28,28,1)] hover:translate-x-px hover:translate-y-px hover:shadow-[2px_2px_0_0_rgba(185,28,28,1)] transition-all"
            >
              Try Again
            </button>
          ) : (
            <button
              onClick={onNextShift}
              className="w-full py-3 rounded-xl border-2 border-[#141414] bg-[#141414] text-[#E4E3E0] text-sm font-black uppercase tracking-[0.2em] shadow-[3px_3px_0_0_rgba(20,20,20,1)] hover:translate-x-px hover:translate-y-px hover:shadow-[2px_2px_0_0_rgba(20,20,20,1)] transition-all"
            >
              Night {nightNumber + 1} &rarr;
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
