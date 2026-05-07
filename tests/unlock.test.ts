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
    expect(nextState.unlockedActions).toContain('tiaoxi');
    expect(nextState.choices.flags['unlocked_tuna']).toBe(true);
  });

  it('should not unlock if conditions are not met', () => {
    const state = createInitialState(123);
    state.resources.qi = 0; // less than 1
    state.resources.herbs = 2; // less than 5

    const nextState = checkUnlocks(state);
    expect(nextState.unlockedActions).not.toContain('tuna');
  });

  it('should unlock rike_tuna after tuna is performed 10 times', () => {
    let state = createInitialState();
    // simulate tuna 10 times
    for (let i = 0; i < 10; i++) {
      // Need enough essence to perform
      state.resources.essence = 100;
      state = performAction(state, 'tuna').state;
    }

    expect(state.choices.qualities['action_tuna_count']).toBe(10);
    
    state = checkUnlocks(state);
    expect(state.choices.flags['unlocked_rike_tuna']).toBe(true);
    expect(state.unlockedActions).toContain('rike_tuna');
  });

  it('should unlock yinqi only after daily practice has been completed', () => {
    let state = createInitialState();
    state.resources.qi = 15;
    state.resources.insight = 3;

    state = checkUnlocks(state);
    expect(state.unlockedActions).not.toContain('yinqi');

    state.choices.flags.completed_rike_tuna = true;
    state = checkUnlocks(state);

    expect(state.unlockedActions).toContain('yinqi');
    expect(state.choices.flags['unlocked_yinqi']).toBe(true);
  });

  it('should unlock mountain actions after the jade slip is found', () => {
    let state = createInitialState();
    state.choices.flags.found_jade_slip = true;

    state = checkUnlocks(state);
    expect(state.unlockedActions).toContain('caiyao');
    expect(state.unlockedActions).toContain('xunshan');
    expect(state.choices.flags.unlocked_mountain_actions).toBe(true);
  });
});
