import { useCallback, Dispatch, SetStateAction } from 'react';
import { GameState } from '../types';
import { AccusationField, checkAccusation } from '../logic/gameLogic';

export function useAccusationActions(
  setGameState: Dispatch<SetStateAction<GameState>>
) {
  const callOutLie = useCallback((field: AccusationField) => {
    setGameState(prev => {
      if (!prev.currentClient) return prev;
      
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
        return { 
          ...prev, 
          currentClient: null, 
          rating: Math.max(0, prev.rating - 0.5),
          logs: [`Client stormed out after false accusation!`, ...nextLogs].slice(0, 50)
        };
      }

      return {
        ...prev,
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
  }, [setGameState]);

  return { callOutLie };
}
