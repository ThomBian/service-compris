import type { VisualTraits } from '../../types';

/** Props passed from `BossEncounterOverlay` into every boss mini-game component. */
export interface MiniGameProps {
  onWin: () => void;
  onLose: () => void;
  /** Total encounter time from roster overlay; timer UI is owned by the overlay except where a game tracks its own elapsed time. */
  durationMs: number;
  /** Boss avatar in mini-games that show the encounter character (e.g. Coat Check). */
  bossVisualTraits?: VisualTraits;
}
