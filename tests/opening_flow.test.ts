import { describe, expect, it } from 'vitest';
import { EVENTS } from '../src/content/events';
import { performAction } from '../src/game/actions';
import { rollEvent } from '../src/game/events';
import { getAvailableActionsAtLocation } from '../src/game/location';
import { getVisibleResourceIds } from '../src/game/resources';
import { createInitialState } from '../src/game/state';
import { checkUnlocks } from '../src/game/unlock';
import { Realm } from '../src/game/types';

describe('Opening flow', () => {
  it('should progress from sitting to jade slip to breath work without exposing the whole system', () => {
    let state = createInitialState();

    expect(getVisibleResourceIds(state)).toEqual(['essence']);
    expect(getAvailableActionsAtLocation(state)).toEqual(['kuzuo']);

    state = performAction(state, 'kuzuo').state;
    state = performAction(state, 'kuzuo').state;

    expect(state.resources.insight).toBe(2);
    expect(getVisibleResourceIds(state)).toEqual(['essence', 'insight']);

    const event = rollEvent(state, () => 0);
    expect(event?.id).toBe('find_jade_slip');

    const jadeSlip = EVENTS.find((item) => item.id === 'find_jade_slip')!;
    state = jadeSlip.choices[0].effect(state).state;
    state = checkUnlocks(state);

    expect(state.choices.flags.found_jade_slip).toBe(true);
    expect(state.unlockedActions).toEqual(['kuzuo', 'tuna', 'tiaoxi', 'caiyao', 'xunshan']);
    expect(getAvailableActionsAtLocation(state)).toEqual(['kuzuo', 'tuna', 'tiaoxi']);
    state.currentLocationId = 'mountain_path';
    expect(getAvailableActionsAtLocation(state)).toEqual(['caiyao', 'xunshan']);
    state.currentLocationId = 'home';
    expect(getVisibleResourceIds(state)).toEqual(['essence', 'insight', 'qi']);

    for (let index = 0; index < 10; index += 1) {
      state.resources.essence = 100;
      state = performAction(state, 'tuna').state;
    }
    state = checkUnlocks(state);
    expect(getAvailableActionsAtLocation(state)).toContain('rike_tuna');

    state.resources.qi = 10;
    state.resources.insight = 3;
    state = checkUnlocks(state);

    const availableActions = getAvailableActionsAtLocation(state);
    expect(availableActions).toContain('yinqi');
    expect(availableActions).toContain('rike_tuna');

    state.resources.essence = 100;
    state = performAction(state, 'yinqi').state;

    expect(state.realm).toBe(Realm.QiCondensation);
    expect(state.realmLayer).toBe(1);
  });
});
