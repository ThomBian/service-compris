import React, { useCallback, Dispatch, SetStateAction } from 'react';
import { flushSync } from 'react-dom';
import { GameState } from '../types';
import { AccusationField, checkAccusation } from '../logic/gameLogic';
import { type Toast } from '../context/ToastContext';
import type { SpecialCharacter } from '../logic/characters/SpecialCharacter';

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
          toastArgs = ['Client stormed out!', '★ −0.5', 'error'];
          return {
            ...prev,
            ...characterOutcome,
            currentClient: null,
            rating: Math.max(0, prev.rating - 0.5),
            logs: [`Client stormed out after false accusation!`, ...nextLogs].slice(0, 50)
          };
        }

        if (caught) {
          toastArgs = ['Caught in a lie!', `Patience −${patiencePenalty}`, 'success'];
        } else {
          toastArgs = ['False accusation!', `Patience −${patiencePenalty}`, 'warning'];
        }

        return {
          ...prev,
          ...characterOutcome,
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
