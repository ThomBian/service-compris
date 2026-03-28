import { type GameState } from '../../types';
import { VipCharacter } from './VipCharacter';

export class AuraDrainVip extends VipCharacter {
  onRefused(_state: GameState): Partial<GameState> {
    return { strikeActive: true };
  }

  onSeated(_state: GameState): Partial<GameState> {
    return {
      strikeActive: this.def.auraRecovery === 'ON_SEATING' ? false : undefined,
    };
  }

  onStormOut(_state: GameState): Partial<GameState> {
    return { strikeActive: false };
  }
}
