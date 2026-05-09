import { GameState, Realm } from '../../game/types';
import { getNextBreakthroughRule } from '../../game/breakthrough';

export interface UnlockRule {
  id: string;
  condition: (state: GameState) => boolean;
  effect: (state: GameState) => GameState;
}

export { getNextBreakthroughRule, Realm };
