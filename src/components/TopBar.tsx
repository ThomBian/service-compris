import React from "react";
import { useTranslation } from "react-i18next";
import {
  Clock,
  Star,
  DollarSign,
  Play,
  Pause,
  FastForward,
  Heart,
  HelpCircle,
} from "lucide-react";
import type { ActiveRule } from "../types/campaign";
import { getRule } from "../logic/nightRules";

interface TopBarProps {
  inGameMinutes: number;
  rating: number;
  cash: number;
  morale: number;
  timeMultiplier: number;
  setTimeMultiplier: (m: number) => void;
  formatTime: (minutes: number) => string;
  difficulty: number;
  onTourClick: () => void;
  nightNumber: number;
  isOvertime: boolean;
  activeRules?: ActiveRule[];
}

export const TopBar: React.FC<TopBarProps> = ({
  inGameMinutes,
  rating,
  cash,
  morale,
  timeMultiplier,
  setTimeMultiplier,
  formatTime,
  difficulty,
  onTourClick,
  nightNumber,
  isOvertime,
  activeRules = [],
}) => {
  const { t } = useTranslation('ui');
  const pauseDisabled = getRule<boolean>(activeRules, 'PAUSE_DISABLED', false);
  return (
    <header className="border-b border-[#141414]/20 p-4 flex items-center justify-between bg-[#E4E3E0]/60 backdrop-blur-sm z-20 shrink-0">
      <div className="flex items-center gap-8" data-tour="topbar">
        <div className="flex items-center gap-1">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-40">{t('topbar.night')}</span>
          <span className="font-mono text-xl font-bold">{nightNumber}</span>
        </div>
        <div className={`flex items-center gap-2 ${isOvertime ? 'text-amber-600' : ''}`}>
          <Clock size={20} />
          <span className="font-mono text-xl font-bold">
            {formatTime(inGameMinutes)}
          </span>
          {isOvertime && (
            <span className="text-[10px] font-black uppercase tracking-[0.15em] bg-amber-500 text-white rounded px-1.5 py-0.5 animate-pulse">
              {t('topbar.overtime')}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Star size={20} className="text-yellow-600 fill-yellow-600" />
          <span className="font-mono text-xl font-bold">
            {rating.toFixed(1)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Heart size={20} className="text-red-500 fill-red-500" />
          <span className="font-mono text-xl font-bold">{morale}%</span>
        </div>
        <div className="flex items-center gap-2">
          <DollarSign size={20} className="text-emerald-700" />
          <span className="font-mono text-xl font-bold">
            {Math.round(cash)}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
      <div className="flex items-center gap-2 bg-white/50 p-1 rounded-xl border border-[#141414]/10">
        {difficulty === 3 ? (
          <div
            className="flex items-center gap-2 px-2 py-1"
            title={t('topbar.hellLockedTitle')}
          >
            <span className="px-3 py-1 rounded-xl text-xs font-bold bg-[#141414] text-[#E4E3E0]">
              3×
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider opacity-40">
              {t('topbar.locked')}
            </span>
          </div>
        ) : (
          [0, 1, 2, 3].filter(m => !(m === 0 && pauseDisabled)).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setTimeMultiplier(m)}
              title={
                m === 0
                  ? t('topbar.speedPause')
                  : m === 1
                    ? t('topbar.speed1')
                    : m === 2
                      ? t('topbar.speed2')
                      : t('topbar.speed3')
              }
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-colors ${
                timeMultiplier === m
                  ? m === 0
                    ? "bg-amber-500 text-[#141414] ring-2 ring-[#141414] ring-offset-2 ring-offset-[#E4E3E0]"
                    : "bg-[#141414] text-[#E4E3E0]"
                  : "hover:bg-[#141414]/10"
              }`}
            >
              {m === 0 ? (
                <Pause size={14} />
              ) : m === 1 ? (
                <Play size={14} />
              ) : m === 2 ? (
                <FastForward size={14} />
              ) : (
                "3x"
              )}
            </button>
          ))
        )}
      </div>
      <button
        type="button"
        onClick={onTourClick}
        title={t('topbar.tourTitle')}
        className="rounded-xl p-1.5 transition-colors hover:bg-[#141414]/10"
      >
        <HelpCircle size={20} />
      </button>
      </div>
    </header>
  );
};
