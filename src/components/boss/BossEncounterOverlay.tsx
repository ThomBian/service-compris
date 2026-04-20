import React, { useRef, useState } from 'react';
import { useGame } from '../../context/GameContext';
import { useCountdown } from '../../hooks/useCountdown';
import type { MiniGameId } from '../../types';
import { useTranslation } from 'react-i18next';
import { BOSS_ROSTER } from '../../data/bossRoster';
import { Z_INDEX } from '../../zIndex';
import { CoatCheckGame } from './CoatCheckGame';
import { BossEncounterIntro } from './BossEncounterIntro';
import { PixelAvatar } from '../scene/PixelAvatar';
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
  const { t } = useTranslation('game');
  const { gameState, clearBossEncounter } = useGame();
  const encounter = gameState.activeBossEncounter;
  const resolvedRef = useRef(false);
  const [phase, setPhase] = useState<'intro' | 'game'>('intro');

  React.useEffect(() => {
    if (encounter) {
      resolvedRef.current = false;
      setPhase('intro');
    }
  }, [encounter]);

  const resolve = (outcome: 'WIN' | 'LOSE') => {
    if (resolvedRef.current) return;
    resolvedRef.current = true;
    clearBossEncounter(outcome);
  };

  const durationMs = encounter ? DURATIONS[encounter.miniGame] : 0;
  const gameDurationMs = phase === 'game' ? durationMs : 0;
  useCountdown(
    gameDurationMs,
    gameDurationMs > 0 ? () => resolve('LOSE') : undefined,
  );

  if (!encounter) return null;

  const boss = BOSS_ROSTER.find(b => b.id === encounter.bossId);
  const Game = MINI_GAMES[encounter.miniGame];

  return (
    <div
      className="fixed inset-0 flex flex-col bg-black"
      style={{ animation: 'fadeIn 0.25s ease', zIndex: Z_INDEX.introBackdrop }}
    >
      {phase === 'intro' && boss ? (
        <BossEncounterIntro
          boss={boss}
          interceptedAction={encounter.interceptedAction}
          onBegin={() => setPhase('game')}
        />
      ) : null}

      {phase === 'intro' && !boss ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
          <p className="text-sm uppercase tracking-widest text-white/50">{encounter.bossId}</p>
          <button
            type="button"
            onClick={() => setPhase('game')}
            className="rounded-lg border-2 border-white/30 px-6 py-3 text-xs font-bold uppercase tracking-widest text-white/80"
          >
            {t('boss.fallbackContinue')}
          </button>
        </div>
      ) : null}

      {phase === 'game' ? (
        <>
          {boss ? (
            <div
              className="pointer-events-none absolute left-3 top-3 z-1 flex items-center gap-2 rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 sm:left-4 sm:top-4"
              aria-hidden
            >
              <PixelAvatar traits={boss.visualTraits} scale={2} />
              <span className="max-w-40 truncate text-[10px] font-bold uppercase tracking-wide text-white/55 sm:max-w-56 sm:text-xs">
                {boss.name}
              </span>
            </div>
          ) : null}
          <div className="flex flex-1 flex-col items-center justify-center px-3 pb-8 pt-14 sm:px-4 sm:pb-10 sm:pt-16">
            <div className="w-full max-w-lg">
              <Game onWin={() => resolve('WIN')} onLose={() => resolve('LOSE')} durationMs={durationMs} />
            </div>
          </div>
          <TimerBar durationMs={durationMs} onExpire={() => resolve('LOSE')} />
        </>
      ) : null}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
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
