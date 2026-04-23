import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { playHandshakeItemSfx, playToastSound } from '../../audio/gameSfx';
import type { MiniGameProps } from './miniGameTypes';
import {
  bossEmeraldReveal,
  bossGoldAttention,
  bossGridTileBase,
  bossGridTileIdle,
  bossHudEyebrow,
  bossInteractiveFocus,
  bossRoseReveal,
} from './bossMiniGameChrome';

const ITEMS = [
  { id: 'LEDGER', icon: '📖' },
  { id: 'BELL', icon: '🔔' },
  { id: 'COIN', icon: '🪙' },
  { id: 'WHISKEY', icon: '🥃' },
] as const;

type ItemId = (typeof ITEMS)[number]['id'];
type Phase = 'SHOWING' | 'WAITING';
type InputFeedback = { id: ItemId; status: 'good' | 'bad' } | null;
type FailReveal = { expected: ItemId; wrong: ItemId } | null;

const INITIAL_SEQUENCE_LENGTH = 4;
const INITIAL_DELAY_MS = 400;
const HIGHLIGHT_MS = 400;
const GAP_MS = 200;
const INPUT_FEEDBACK_MS = 180;
const FAIL_REVEAL_MS = 2000;
const TARGET_SEQUENCE_LENGTH = 8;

function nextRandomItem(): ItemId {
  const idx = Math.floor(Math.random() * ITEMS.length);
  return ITEMS[idx].id;
}

function generateSequence(length: number): ItemId[] {
  return Array.from({ length }, () => nextRandomItem());
}

/** No countdown bar in overlay (`DURATIONS.HANDSHAKE === 0`); win/lose come only from sequence play. */
export function HandshakeGame({ onWin, onLose, durationMs: _durationMs }: MiniGameProps) {
  const { t } = useTranslation('game');
  const [sequence, setSequence] = useState<ItemId[]>(() =>
    generateSequence(INITIAL_SEQUENCE_LENGTH),
  );
  const [playerInput, setPlayerInput] = useState<ItemId[]>([]);
  const [phase, setPhase] = useState<Phase>('SHOWING');
  const [showIndex, setShowIndex] = useState<number>(-1);
  const [feedback, setFeedback] = useState<InputFeedback>(null);
  const [failReveal, setFailReveal] = useState<FailReveal>(null);
  const [inputLocked, setInputLocked] = useState(false);
  const resolvedRef = useRef(false);
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearFeedbackTimer = () => {
    if (feedbackTimerRef.current) {
      clearTimeout(feedbackTimerRef.current);
      feedbackTimerRef.current = null;
    }
  };

  const activeItemId = useMemo(
    () => (showIndex >= 0 ? sequence[showIndex] : null),
    [sequence, showIndex],
  );

  const resolve = (outcome: 'WIN' | 'LOSE') => {
    if (resolvedRef.current) return;
    resolvedRef.current = true;
    if (outcome === 'WIN') onWin();
    else onLose();
  };

  useEffect(() => {
    if (phase !== 'SHOWING') return;
    const timers: Array<ReturnType<typeof setTimeout>> = [];

    sequence.forEach((_, index) => {
      const startAt = INITIAL_DELAY_MS + index * (HIGHLIGHT_MS + GAP_MS);
      timers.push(
        setTimeout(() => {
          if (resolvedRef.current) return;
          playHandshakeItemSfx(sequence[index]!);
          setShowIndex(index);
        }, startAt),
      );
      timers.push(
        setTimeout(() => {
          if (resolvedRef.current) return;
          setShowIndex(-1);
        }, startAt + HIGHLIGHT_MS),
      );
    });

    const finishAt = INITIAL_DELAY_MS + sequence.length * (HIGHLIGHT_MS + GAP_MS);
    timers.push(
      setTimeout(() => {
        if (resolvedRef.current) return;
        setPhase('WAITING');
      }, finishAt),
    );

    return () => {
      timers.forEach(clearTimeout);
    };
  }, [phase, sequence]);

  useEffect(() => {
    return () => clearFeedbackTimer();
  }, []);

  const handleClick = (id: ItemId) => {
    if (resolvedRef.current || inputLocked) return;
    playHandshakeItemSfx(id);

    const nextInput = [...playerInput, id];
    const nextPos = nextInput.length - 1;
    clearFeedbackTimer();
    if (id !== sequence[nextPos]) {
      setInputLocked(true);
      setFailReveal({ expected: sequence[nextPos], wrong: id });
      playToastSound('error');
      feedbackTimerRef.current = setTimeout(() => {
        setFailReveal(null);
        resolve('LOSE');
      }, FAIL_REVEAL_MS);
      return;
    }

    setInputLocked(true);
    setFeedback({ id, status: 'good' });
    if (nextInput.length === sequence.length) {
      feedbackTimerRef.current = setTimeout(() => {
        setFeedback(null);
        if (sequence.length >= TARGET_SEQUENCE_LENGTH) {
          resolve('WIN');
          return;
        }
        setPlayerInput([]);
        setSequence(prev => [...prev, nextRandomItem()]);
        setPhase('SHOWING');
        setInputLocked(false);
      }, INPUT_FEEDBACK_MS);
      return;
    }

    feedbackTimerRef.current = setTimeout(() => {
      setFeedback(null);
      setPlayerInput(nextInput);
      setInputLocked(false);
    }, INPUT_FEEDBACK_MS);
  };

  return (
    <div
      role="region"
      aria-label={t('boss.handshake.ariaRegion')}
      className="flex h-full min-h-0 flex-col items-center justify-center gap-6"
    >
      <p className={`text-center ${bossHudEyebrow}`}>
        {phase === 'SHOWING'
          ? t('boss.handshake.watchSequence')
          : t('boss.handshake.repeatSteps', { count: sequence.length })}
      </p>

      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {ITEMS.map(item => {
          const isActive = activeItemId === item.id;
          const isGoodPick = feedback?.id === item.id && feedback.status === 'good';
          const isBadPick = feedback?.id === item.id && feedback.status === 'bad';
          const isFailExpected = failReveal?.expected === item.id;
          const isFailWrong = failReveal?.wrong === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleClick(item.id)}
              className={[
                bossGridTileBase,
                bossInteractiveFocus,
                isActive
                  ? bossGoldAttention
                  : isFailExpected
                    ? bossEmeraldReveal
                    : isFailWrong
                      ? bossRoseReveal
                      : isGoodPick
                        ? bossEmeraldReveal
                        : isBadPick
                          ? bossRoseReveal
                          : bossGridTileIdle,
                phase === 'SHOWING' ? 'cursor-default' : 'cursor-pointer',
              ].join(' ')}
            >
              {item.icon}
              <span className="sr-only">
                {t(`boss.handshake.items.${item.id.toLowerCase()}`)}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex gap-1.5 sm:gap-2" aria-hidden>
        {sequence.map((_, i) => (
          <span
            key={`progress-${i}`}
            className={[
              'h-2 w-2 rounded-full transition-colors',
              i < playerInput.length ? 'bg-[#e8c97a] shadow-[0_0_8px_rgba(232,201,122,0.45)]' : 'bg-white/15',
            ].join(' ')}
          />
        ))}
      </div>
    </div>
  );
}
