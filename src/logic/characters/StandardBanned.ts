import { type GameState } from '../../types';
import { BannedCharacter } from './BannedCharacter';

export class StandardBanned extends BannedCharacter {
  onRefused(_state: GameState): Partial<GameState> {
    // Justified refusal — no consequence from the character; caller handles reward
    return {};
  }

  onSeated(state: GameState): Partial<GameState> {
    if (this.def.gameOver) {
      return {
        gameOver: true,
        gameOverReason: 'BANNED',
        gameOverCharacterId: this.def.id,
        timeMultiplier: 0,
      };
    }
    return {
      cash:   Math.max(0, state.cash   - (this.def.cashPenalty   ?? 0)),
      morale: Math.max(0, state.morale - (this.def.moralePenalty ?? 0)),
      rating: Math.max(0, state.rating - (this.def.ratingPenalty ?? 0)),
    };
  }
}
