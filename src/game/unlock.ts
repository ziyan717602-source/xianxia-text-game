import { GameState } from './types';
import { UNLOCKS } from '../content/unlocks';

export function checkUnlocks(state: GameState): GameState {
  let newState = state;
  let changed = false;

  for (const rule of UNLOCKS) {
    // Avoid running effect if flag is already set (optimization)
    // We can assume if the rule id is in flags as unlocked_${id}, it's done. 
    // But since the rules check state, let's just run the condition if not already applied.
    // Let's standardize that rule.effect will check if it's already applied to avoid deep cloning if nothing changes.
    
    if (rule.condition(newState)) {
      const nextState = rule.effect(newState);
      if (nextState !== newState) {
        newState = nextState;
        changed = true;
      }
    }
  }

  // If one unlock causes another, we might need multiple passes, but let's stick to one pass for simplicity 
  // since most unlocks are resource-based or action-based.

  return newState;
}
