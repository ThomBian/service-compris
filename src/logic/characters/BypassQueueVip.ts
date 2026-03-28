import { PhysicalState, type GameState } from '../../types';
import { VipCharacter } from './VipCharacter';

export class BypassQueueVip extends VipCharacter {
  onDesk(state: GameState): Partial<GameState> {
    if (!state.currentClient) return { queue: state.queue };
    const displaced = { ...state.currentClient, physicalState: PhysicalState.IN_QUEUE };
    return { queue: [displaced, ...state.queue] };
  }

  onSeated(state: GameState): Partial<GameState> {
    return { cash: state.cash + (this.def.cashBonus ?? 0) };
  }

  onRefused(state: GameState): Partial<GameState> {
    return {
      rating: Math.max(0, state.rating - (this.def.ratingPenalty ?? 0)),
      morale: Math.max(0, state.morale - (this.def.moralePenalty ?? 0)),
    };
  }
}
