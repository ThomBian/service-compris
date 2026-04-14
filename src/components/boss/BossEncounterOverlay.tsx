import React, { useRef } from 'react';
import { useGame } from '../../context/GameContext';
import { useCountdown } from '../../hooks/useCountdown';
import type { MiniGameId } from '../../types';
import { useTranslation } from 'react-i18next';
import { BOSS_ROSTER } from '../../data/bossRoster';
import { Z_INDEX } from '../../zIndex';
import { CoatCheckGame } from './CoatCheckGame';
import type { MiniGameProps } from './miniGameTypes';

export type { MiniGameProps } from './miniGameTypes';

// Populated by each mini-game plan. Placeholder stubs for now.
const MINI_GAMES: Record<MiniGameId, React.FC<MiniGameProps>> = {
  HANDSHAKE: ({ onWin, onLose }) => (
    <div className="flex flex-col items-center gap-4 p-8">
      <p className="text-white/60 text-sm tracking-widest uppercase">Handshake — coming soon</p>
      <div className="flex gap-4">
        <button type="button" onClick={onWin} className="px-4 py-2 bg-green-700 text-white rounded">
          Win
        </button>
        <button type="button" onClick={onLose} className="px-4 py-2 bg-red-700 text-white rounded">
          Lose
        </button>
      </div>
    </div>
  ),
  WHITE_GLOVE: ({ onWin, onLose }) => (
    <div className="flex flex-col items-center gap-4 p-8">
      <p className="text-white/60 text-sm tracking-widest uppercase">White Glove — coming soon</p>
      <div className="flex gap-4">
        <button type="button" onClick={onWin} className="px-4 py-2 bg-green-700 text-white rounded">
          Win
        </button>
        <button type="button" onClick={onLose} className="px-4 py-2 bg-red-700 text-white rounded">
          Lose
        </button>
      </div>
    </div>
  ),
  PAPARAZZI: ({ onWin, onLose }) => (
    <div className="flex flex-col items-center gap-4 p-8">
      <p className="text-white/60 text-sm tracking-widest uppercase">Paparazzi — coming soon</p>
      <div className="flex gap-4">
        <button type="button" onClick={onWin} className="px-4 py-2 bg-green-700 text-white rounded">
          Win
        </button>
        <button type="button" onClick={onLose} className="px-4 py-2 bg-red-700 text-white rounded">
          Lose
        </button>
      </div>
    </div>
  ),
  COAT_CHECK: CoatCheckGame,
};

// Duration (ms) per mini-game
const DURATIONS: Record<MiniGameId, number> = {
  HANDSHAKE: 10000,
  WHITE_GLOVE: 4000,
  PAPARAZZI: 4000,
  COAT_CHECK: 12000,
};

export function BossEncounterOverlay() {
  const { gameState, clearBossEncounter } = useGame();
  const { t } = useTranslation('game');
  const encounter = gameState.activeBossEncounter;
  const resolvedRef = useRef(false);

  React.useEffect(() => {
    if (encounter) resolvedRef.current = false;
  }, [encounter]);

  const resolve = (outcome: 'WIN' | 'LOSE') => {
    if (resolvedRef.current) return;
    resolvedRef.current = true;
    clearBossEncounter(outcome);
  };

  const durationMs = encounter ? DURATIONS[encounter.miniGame] : 0;
  useCountdown(
    durationMs,
    durationMs > 0 ? () => resolve('LOSE') : undefined,
  );

  if (!encounter) return null;

  const boss = BOSS_ROSTER.find(b => b.id === encounter.bossId);
  const Game = MINI_GAMES[encounter.miniGame];
  const commandWord = encounter.interceptedAction === 'SEAT' ? 'SEAT.' : 'REFUSE.';
  const quote = boss ? t(boss.quoteKey) : '';

  return (
    <div
      className="fixed inset-0 bg-black flex flex-col items-center justify-center"
      style={{ animation: 'fadeIn 0.2s ease', zIndex: Z_INDEX.introBackdrop }}
    >
      <div
        className="flex flex-col items-center gap-2 mb-8"
        style={{ animation: 'slamIn 0.6s cubic-bezier(0.22, 1, 0.36, 1)' }}
      >
        <p className="text-white/40 text-xs tracking-[4px] uppercase">⚡ Boss Encounter</p>
        <h1 className="text-[#e8c97a] text-2xl font-black tracking-[3px] uppercase">
          {boss?.name ?? encounter.bossId}
        </h1>
        <div className="w-10 h-px bg-white/20 my-1" />
        <p className="text-white text-4xl font-black tracking-[6px] uppercase">{commandWord}</p>
        {quote ? (
          <p className="text-white/50 text-sm italic mt-1 max-w-xs text-center">{quote}</p>
        ) : null}
      </div>

      <div className="w-full max-w-lg">
        <Game onWin={() => resolve('WIN')} onLose={() => resolve('LOSE')} durationMs={durationMs} />
      </div>

      <TimerBar durationMs={durationMs} onExpire={() => resolve('LOSE')} />

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slamIn { from { transform: scale(1.15); opacity: 0; } to { transform: scale(1); opacity: 1; } }
      `}</style>
    </div>
  );
}

function TimerBar({ durationMs, onExpire }: { durationMs: number; onExpire: () => void }) {
  const { progress } = useCountdown(durationMs, onExpire);
  const color = progress > 0.5 ? '#e8c97a' : progress > 0.25 ? '#f59e0b' : '#ef4444';
  return (
    <div className="fixed bottom-0 left-0 right-0 h-1 bg-white/10">
      <div className="h-full transition-none" style={{ width: `${progress * 100}%`, background: color }} />
    </div>
  );
}
