import { type GameState } from '../../types';
import { VipCharacter } from './VipCharacter';

export class AuraDrainVip extends VipCharacter {
  onRefused(_state: GameState): Partial<GameState> {
    return { strikeActive: true };
  }

  onSeated(_state: GameState): Partial<GameState> {
    if (this.def.auraRecovery !== 'ON_SEATING') return {};
    return { strikeActive: false };
  }

  onStormOut(_state: GameState): Partial<GameState> {
    return { strikeActive: false };
  }
}
