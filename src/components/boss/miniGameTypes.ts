import type { VisualTraits } from '../../types';

export interface MiniGameProps {
  onWin: () => void;
  onLose: () => void;
  durationMs: number;
  /** Boss avatar in mini-games that show the encounter character (e.g. Coat Check). */
  bossVisualTraits?: VisualTraits;
}
