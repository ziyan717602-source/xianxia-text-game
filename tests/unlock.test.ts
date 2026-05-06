import { describe, it, expect } from 'vitest';
import { createInitialState } from '../src/game/state';
import { checkUnlocks } from '../src/game/unlock';
import { performAction } from '../src/game/actions';

describe('Unlock System', () => {
  it('should unlock tuna when qi >= 10', () => {
    let state = createInitialState();
    state.resources.qi = 10;

    const nextState = checkUnlocks(state);
    expect(nextState.unlockedActions).toContain('tuna');
    expect(nextState.choices.flags['unlocked_tuna']).toBe(true);
  });

  it('should not unlock if conditions are not met', () => {
    let state = createInitialState();
    state.resources.qi = 9;

    const nextState = checkUnlocks(state);
    expect(nextState.unlockedActions).not.toContain('tuna');
  });

  it('should unlock rike_tuna after tuna is performed 10 times', () => {
    let state = createInitialState();
    // simulate tuna 10 times
    for (let i = 0; i < 10; i++) {
      // Need enough stamina to perform
      state.resources.stamina = 100;
      state = performAction(state, 'tuna').state;
    }

    expect(state.choices.qualities['action_tuna_count']).toBe(10);
    
    state = checkUnlocks(state);
    expect(state.choices.flags['unlocked_rike_tuna']).toBe(true);
  });
});
