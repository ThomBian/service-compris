import { useEffect, useCallback, Dispatch, SetStateAction } from 'react';
import type { GameState, ScriptedEvent } from '../types';
import { PhysicalState as PS } from '../types';
import type { NightConfig } from '../types/campaign';
import { TICK_RATE } from '../constants';
import i18n from '../i18n';

// --- Pure helpers (exported for testing) ---

export function evaluateTimeTrigger(currentMinute: number, targetMinute: number): boolean {
  return currentMinute >= targetMinute;
}

/**
 * Returns true if this event should fire right now.
 * `currentCharacterId` is the characterId of the client currently AT_DESK (or null).
 */
export function shouldFireEvent(
  event: ScriptedEvent,
  firedEventIds: string[],
  currentMinute: number,
  currentCharacterId: string | null,
): boolean {
  const alreadyFired = firedEventIds.includes(event.id);
  if (alreadyFired && event.once !== false) return false;

  const { trigger } = event;

  if (trigger.kind === 'TIME') {
    return evaluateTimeTrigger(currentMinute, trigger.minute);
  }

  if (trigger.kind === 'CHARACTER_AT_DESK') {
    return currentCharacterId === trigger.characterId;
  }

  return false;
}

// --- Hook ---

export function useScriptedEvents(
  gameState: GameState,
  setGameState: Dispatch<SetStateAction<GameState>>,
  nightConfig: NightConfig | undefined,
  onShowDialogue: (lines: string[]) => void,
  spawnScriptedCharacter: (characterId: string) => void,
): void {
  const events = nightConfig?.scriptedEvents ?? [];

  const atDeskCharacterId =
    gameState.currentClient?.physicalState === PS.AT_DESK
      ? (gameState.currentClient.characterId ?? null)
      : null;

  const dispatchActions = useCallback(
    (event: ScriptedEvent) => {
      const mult = gameState.timeMultiplier;
      for (const action of event.actions) {
        if (action.kind === 'SHOW_DIALOGUE') {
          onShowDialogue(action.lines.map(key => i18n.t(key, { ns: 'campaign' })));
        } else if (action.kind === 'REVEAL_TOOL') {
          setGameState(prev => {
            if (prev.revealedTools.includes(action.tool)) return prev;
            return { ...prev, revealedTools: [...prev.revealedTools, action.tool] };
          });
        } else if (action.kind === 'SET_SHIFT_END_PENDING') {
          setGameState(prev => ({ ...prev, nightEndPending: true }));
        } else if (action.kind === 'SPAWN_CHARACTER') {
          const delay = action.delayMinutes ?? 0;
          if (delay === 0) {
            spawnScriptedCharacter(action.characterId);
          } else {
            const msPerGameMinute = mult > 0 ? TICK_RATE / mult : TICK_RATE;
            window.setTimeout(() => spawnScriptedCharacter(action.characterId), delay * msPerGameMinute);
          }
        }
      }
    },
    [onShowDialogue, setGameState, spawnScriptedCharacter, gameState.timeMultiplier],
  );

  useEffect(() => {
    if (events.length === 0) return;

    for (const event of events) {
      if (event.trigger.kind !== 'TIME') continue;
      if (!shouldFireEvent(event, gameState.firedEventIds, gameState.inGameMinutes, null)) continue;

      if (event.once !== false) {
        setGameState(prev => ({
          ...prev,
          firedEventIds: prev.firedEventIds.includes(event.id)
            ? prev.firedEventIds
            : [...prev.firedEventIds, event.id],
        }));
      }
      dispatchActions(event);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState.inGameMinutes]);

  useEffect(() => {
    if (events.length === 0 || atDeskCharacterId === null) return;

    for (const event of events) {
      if (event.trigger.kind !== 'CHARACTER_AT_DESK') continue;
      if (!shouldFireEvent(event, gameState.firedEventIds, gameState.inGameMinutes, atDeskCharacterId)) continue;

      if (event.once !== false) {
        setGameState(prev => ({
          ...prev,
          firedEventIds: prev.firedEventIds.includes(event.id)
            ? prev.firedEventIds
            : [...prev.firedEventIds, event.id],
        }));
      }
      dispatchActions(event);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState.currentClient?.id, atDeskCharacterId]);
}
