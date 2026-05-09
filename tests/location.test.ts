import { describe, it, expect } from 'vitest';
import { createInitialState } from '../src/game/state';
import { moveToLocation, getAvailableActionsAtLocation } from '../src/game/location';
import { Realm } from '../src/game/types';

describe('Location System', () => {
  it('should move to a new location if essence is sufficient', () => {
    let state = createInitialState();
    state.resources.essence = 100;
    state.currentLocationId = 'home';

    const result = moveToLocation(state, 'mountain_path');
    expect(result.success).toBe(true);
    expect(result.state.currentLocationId).toBe('mountain_path');
    expect(result.state.resources.essence).toBe(95);
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

  it('should fail to move if essence is too low', () => {
    let state = createInitialState();
    state.resources.essence = 4;

    const result = moveToLocation(state, 'mountain_path');
    expect(result.success).toBe(false);
    expect(result.state.currentLocationId).toBe('home');
  });

  it('should get available actions filtered by unlocks', () => {
    let state = createInitialState();
    state.currentLocationId = 'home';
    state.unlockedActions = ['tuna']; // Only tuna is unlocked

    const actions = getAvailableActionsAtLocation(state);
    expect(actions).toEqual(['tuna']);

    // unlock another
    state.unlockedActions = ['tuna', 'tiaoxi'];
    const actions2 = getAvailableActionsAtLocation(state);
    expect(actions2).toEqual(['tuna', 'tiaoxi']);
  });

  it('should expose the initial action at home', () => {
    const state = createInitialState();

    expect(getAvailableActionsAtLocation(state)).toEqual(['kuzuo']);
  });

  it('should hide actions whose flags or realm conditions are not met', () => {
    let state = createInitialState();
    state.currentLocationId = 'home';
    state.unlockedActions = ['yinqi', 'inspect_root'];

    expect(getAvailableActionsAtLocation(state)).not.toContain('yinqi');

    state.resources.qi = 15;
    state.resources.insight = 3;
    state.choices.flags.unlocked_rike_tuna = true;

    expect(getAvailableActionsAtLocation(state)).toContain('yinqi');

    state.realm = Realm.QiCondensation;
    state.realmLayer = 1;

    // With realmAtLeast check, QiCondensation can still use Mortal-realm actions like yinqi
    expect(getAvailableActionsAtLocation(state)).toContain('yinqi');
    expect(getAvailableActionsAtLocation(state)).toContain('inspect_root');

    state.choices.flags.root_known = true;
    expect(getAvailableActionsAtLocation(state)).not.toContain('inspect_root');
  });

  it('should expose outer gate actions when unlocked at the outer gate', () => {
    const state = createInitialState();
    state.currentLocationId = 'outer_gate';
    state.realm = Realm.QiCondensation;
    state.realmLayer = 1;
    state.choices.flags.heard_outer_gate_rules = true;
    state.choices.flags.completed_sect_errand = true;
    state.unlockedActions = ['sect_chore', 'sect_errand', 'sect_supply', 'listen_lesson'];

    expect(getAvailableActionsAtLocation(state)).toEqual(['sect_chore', 'sect_errand', 'sect_supply', 'listen_lesson']);
  });
});
