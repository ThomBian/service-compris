import { type GameState } from '../../types';
import { VipCharacter } from './VipCharacter';

export class StandardVip extends VipCharacter {
  onSeated(_state: GameState): Partial<GameState> {
    return {};
  }

  onRefused(state: GameState): Partial<GameState> {
    if (this.def.gameOver) {
      return {
        gameOver: true,
        gameOverReason: 'VIP',
        gameOverCharacterId: this.def.id,
        timeMultiplier: 0,
      };
    }
    return {
      rating: Math.max(0, state.rating - (this.def.ratingPenalty ?? 0)),
      cash: Math.max(0, state.cash - (this.def.cashPenalty ?? 0)),
    };
  }
}
