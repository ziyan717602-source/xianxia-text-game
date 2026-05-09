import { GameState } from './types';
import { UNLOCKS } from '../content/unlocks';

export function checkUnlocks(state: GameState): GameState {
  let currentState = state;
  const MAX_ITERATIONS = 10;

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    let changed = false;
    for (const rule of UNLOCKS) {
      if (rule.condition(currentState)) {
        const prevActions = currentState.unlockedActions;
        const prevFlags = currentState.choices.flags;
        currentState = rule.effect(currentState);
        if (currentState.unlockedActions !== prevActions || currentState.choices.flags !== prevFlags) {
          changed = true;
        }
      }
    }
    if (!changed) break;
  }

  return currentState;
}
