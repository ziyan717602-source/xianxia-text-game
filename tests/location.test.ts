import { describe, it, expect } from 'vitest';
import { createInitialState } from '../src/game/state';
import { moveToLocation, getAvailableActionsAtLocation } from '../src/game/location';

describe('Location System', () => {
  it('should move to a new location if stamina is sufficient', () => {
    let state = createInitialState();
    state.resources.stamina = 100;
    state.currentLocationId = 'home';

    const result = moveToLocation(state, 'mountain_path');
    expect(result.success).toBe(true);
    expect(result.state.currentLocationId).toBe('mountain_path');
    expect(result.state.resources.stamina).toBe(95);
  });

  it('should fail to move if location does not exist', () => {
    const state = createInitialState();
    const result = moveToLocation(state, 'invalid_location');
    expect(result.success).toBe(false);
    expect(result.state.currentLocationId).toBe(state.currentLocationId);
  });

  it('should fail to move if already there', () => {
    const state = createInitialState();
    const result = moveToLocation(state, 'home');
    expect(result.success).toBe(false);
  });

  it('should fail to move if stamina is too low', () => {
    let state = createInitialState();
    state.resources.stamina = 4;

    const result = moveToLocation(state, 'mountain_path');
    expect(result.success).toBe(false);
    expect(result.state.currentLocationId).toBe('home');
  });

  it('should get available actions filtered by unlocks', () => {
    let state = createInitialState();
    state.currentLocationId = 'home';
    state.unlockedActions = ['tuna']; // Only tuna is unlocked

    // home has ['tuna', 'dushu', 'xiuxi']
    const actions = getAvailableActionsAtLocation(state);
    expect(actions).toEqual(['tuna']);

    // unlock another
    state.unlockedActions = ['tuna', 'xiuxi'];
    const actions2 = getAvailableActionsAtLocation(state);
    expect(actions2).toEqual(['tuna', 'xiuxi']);
  });
});
