import type { CharacterDefinition, GameState } from '../../types';

export abstract class SpecialCharacter {
  constructor(readonly def: CharacterDefinition) {}
  onDesk?(state: GameState): Partial<GameState>;
  onAuraTick?(state: GameState): Partial<GameState>;
  onStormOut?(state: GameState): Partial<GameState>;
  abstract onSeated(state: GameState): Partial<GameState>;
  abstract onRefused(state: GameState): Partial<GameState>;
}
