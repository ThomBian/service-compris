import React, { useCallback, Dispatch, SetStateAction } from 'react';
import { flushSync } from 'react-dom';
import { GameState } from '../types';
import { AccusationField, checkAccusation, clearFloorplanSelection } from '../logic/gameLogic';
import { type Toast } from '../context/ToastContext';
import type { SpecialCharacter } from '../logic/characters/SpecialCharacter';
import { getRule } from '../logic/nightRules';
import { tGame } from '../i18n/tGame';

type ShowToast = (
  title: string,
  detail?: string,
  variant?: Toast['variant'],
  duration?: number,
) => void;

export function useAccusationActions(
  setGameState: Dispatch<SetStateAction<GameState>>,
  showToast: ShowToast,
  characters: React.RefObject<Map<string, SpecialCharacter>>,
) {
  const callOutLie = useCallback((field: AccusationField) => {
    let toastArgs: [string, string | undefined, Toast['variant']] | null = null;

    flushSync(() => {
      setGameState(prev => {
        if (!prev.currentClient) return prev;

        let characterOutcome: Partial<GameState> = {};
        if (prev.currentClient.characterId) {
          const ch = characters.current.get(prev.currentClient.characterId);
          if (ch) {
            characterOutcome = ch.onRefused(prev);
          }
        }

        const {
          caught,
          accusationText,
          guestResponse,
          logMsg,
          patiencePenalty
        } = checkAccusation({
          field,
          client: prev.currentClient,
          reservations: prev.reservations
        });

        const nextPatience = Math.max(0, prev.currentClient.patience - patiencePenalty);
        const nextLogs = [logMsg, ...prev.logs].slice(0, 50);

        if (nextPatience <= 0) {
          toastArgs = [tGame('toast.stormOutTitle'), tGame('toast.stormPatienceDetail'), 'error'];
          return {
            ...prev,
            ...characterOutcome,
            grid: clearFloorplanSelection(prev.grid),
            currentClient: null,
            rating: Math.max(0, prev.rating - 0.5),
            logs: [tGame('logStormFalseAccusation'), ...nextLogs].slice(0, 50)
          };
        }

        if (caught) {
          toastArgs = [tGame('toast.caughtLie'), patiencePenalty > 0 ? tGame('toast.patiencePenalty', { n: patiencePenalty }) : undefined, 'success'];
        } else {
          toastArgs = [tGame('toast.falseAccusation'), patiencePenalty > 0 ? tGame('toast.patiencePenalty', { n: patiencePenalty }) : undefined, 'warning'];
        }

        const strict = getRule<boolean>(prev.activeRules, 'STRICT_FALSE_ACCUSATION', false);
        const strictPenaltyRating = strict && !caught ? 1.0 : prev.rating;

        return {
          ...prev,
          ...characterOutcome,
          rating: strictPenaltyRating,
          currentClient: {
            ...prev.currentClient,
            patience: nextPatience,
            isCaught: caught || prev.currentClient.isCaught,
            lastMessage: guestResponse,
            chatHistory: [
              ...prev.currentClient.chatHistory,
              { sender: 'maitre-d', text: accusationText },
              { sender: 'guest', text: guestResponse }
            ]
          },
          logs: nextLogs
        };
      });
    });

    if (toastArgs) showToast(...toastArgs);
  }, [setGameState, showToast, characters]);

  return { callOutLie };
}
