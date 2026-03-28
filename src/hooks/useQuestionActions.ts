import { useCallback, Dispatch, SetStateAction } from 'react';
import { flushSync } from 'react-dom';
import { 
  GameState,
  ChatMessage
} from '../types';
import { QuestionField, generateQuestionResponse, clearFloorplanSelection } from '../logic/gameLogic';
import { type Toast } from '../context/ToastContext';
import { tGame } from '../i18n/tGame';

type ShowToast = (
  title: string,
  detail?: string,
  variant?: Toast['variant'],
  duration?: number,
) => void;

export function useQuestionActions(
  setGameState: Dispatch<SetStateAction<GameState>>,
  showToast: ShowToast,
) {
  const askQuestion = useCallback((field: QuestionField) => {
    let toastArgs: [string, string | undefined, Toast['variant']] | null = null;

    flushSync(() => {
      setGameState(prev => {
        if (!prev.currentClient) return prev;

        const { 
          playerQuestion, 
          guestResponse, 
          patiencePenalty, 
          revealedInfo, 
          caught, 
          logMsg 
        } = generateQuestionResponse({
          field, 
          client: prev.currentClient, 
          reservations: prev.reservations, 
          inGameMinutes: prev.inGameMinutes
        });

        const nextPatience = Math.max(0, prev.currentClient.patience - patiencePenalty);
        const nextLogs = logMsg ? [logMsg, ...prev.logs].slice(0, 50) : prev.logs;

        if (nextPatience <= 0) {
          toastArgs = [tGame('toast.stormOutTitle'), tGame('toast.stormPatienceDetail'), 'error'];
          return {
            ...prev,
            grid: clearFloorplanSelection(prev.grid),
            currentClient: null,
            rating: Math.max(0, prev.rating - 0.5),
            logs: [tGame('logStormDesk'), ...nextLogs].slice(0, 50)
          };
        }

        const newHistory: ChatMessage[] = [
          ...prev.currentClient.chatHistory,
          { sender: 'maitre-d', text: playerQuestion },
          { sender: 'guest', text: guestResponse }
        ];

        return {
          ...prev,
          currentClient: {
            ...prev.currentClient,
            ...revealedInfo,
            patience: nextPatience,
            isCaught: caught || prev.currentClient.isCaught,
            lastMessage: guestResponse,
            chatHistory: newHistory
          },
          logs: nextLogs
        };
      });
    });

    if (toastArgs) showToast(...toastArgs);
  }, [setGameState, showToast]);

  return { askQuestion };
}
