import { describe, expect, it } from 'vitest';
import { ORIGINS, SELECTABLE_ORIGINS } from '../src/content/origins';
import { performAction } from '../src/game/actions';
import { getAvailableActionsAtLocation } from '../src/game/location';
import { applyOrigin, getOriginName, hasSelectedOrigin } from '../src/game/origins';
import { createInitialState } from '../src/game/state';
import { Realm } from '../src/game/types';
import { checkUnlocks } from '../src/game/unlock';

describe('Origin system', () => {
  it('should expose five selectable ordinary origins', () => {
    expect(SELECTABLE_ORIGINS.map((origin) => origin.id)).toEqual([
      'mountain_dweller',
      'village_scholar',
      'market_helper',
      'outer_child',
      'wandering_roots',
    ]);
  });

  it('should leave a new state without a selected origin', () => {
    const state = createInitialState();

    expect(hasSelectedOrigin(state)).toBe(false);
    expect(state.choices.tags.origin).toBeUndefined();
  });

  it('should apply mountain dweller without locking future paths', () => {
    let state = createInitialState();

    state = applyOrigin(state, 'mountain_dweller');

    expect(hasSelectedOrigin(state)).toBe(true);
    expect(getOriginName(state)).toBe(ORIGINS.mountain_dweller.name);
    expect(state.currentLocationId).toBe('mountain_path');
    expect(state.resources.herbs).toBe(2);
    expect(state.choices.qualities.alchemy_affinity).toBe(2);
    expect(getAvailableActionsAtLocation(state)).toContain('caiyao');
  });

  it('should let market helper use market actions immediately', () => {
    let state = createInitialState();

    state = applyOrigin(state, 'market_helper');

    expect(state.currentLocationId).toBe('market');
    expect(getAvailableActionsAtLocation(state)).toEqual(['trade', 'gossip']);

    const result = performAction(state, 'trade');

    expect(result.success).toBe(true);
    expect(result.state.resources.coins).toBe(10);
    expect(result.state.choices.qualities.market_ties).toBe(3);
  });

  it('should let outer child touch sect systems without entering a sect path', () => {
    let state = createInitialState();

    state = applyOrigin(state, 'outer_child');

    expect(state.currentLocationId).toBe('outer_gate');
    expect(state.choices.flags.heard_outer_gate_rules).toBe(true);
    expect(state.choices.flags.outer_gate_registered).toBe(true);
    expect(state.choices.tags.sect_trace).toBe('outer_registered');
    expect(getAvailableActionsAtLocation(state)).toEqual(['sect_chore', 'listen_lesson']);

    const result = performAction(state, 'listen_lesson');

    expect(result.success).toBe(true);
    expect(result.state.resources.insight).toBe(2);
    expect(result.state.choices.qualities.sect_trace).toBe(3);

    state.realm = Realm.QiCondensation;
    state.realmLayer = 1;
    state = checkUnlocks(state);
    expect(state.unlockedActions).toContain('sect_roll_call');
  });

  it('should ignore origin application after one has been selected', () => {
    let state = createInitialState();

    state = applyOrigin(state, 'village_scholar');
    const nextState = applyOrigin(state, 'market_helper');

    expect(nextState).toBe(state);
    expect(nextState.choices.tags.origin).toBe('village_scholar');
  });
});
