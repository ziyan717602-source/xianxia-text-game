import { describe, expect, it } from 'vitest';
import { EVENTS } from '../src/content/events';
import { performAction } from '../src/game/actions';
import { rollEvent } from '../src/game/events';
import { getAvailableActionsAtLocation } from '../src/game/location';
import { getVisibleResourceIds } from '../src/game/resources';
import { createInitialState } from '../src/game/state';
import { checkUnlocks } from '../src/game/unlock';
import { Realm } from '../src/game/types';
import { ACTIONS } from '../src/content/actions';

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

    state.resources.qi = 15;
    state.resources.insight = 3;
    state.choices.flags.completed_rike_tuna = true;
    state = checkUnlocks(state);

    const availableActions = getAvailableActionsAtLocation(state);
    expect(availableActions).toContain('yinqi');
    expect(availableActions).toContain('rike_tuna');

    state.resources.essence = 100;
    state = performAction(state, 'yinqi').state;

    expect(state.realm).toBe(Realm.QiCondensation);
    expect(state.realmLayer).toBe(1);
    expect(getAvailableActionsAtLocation(state)).not.toContain('yinqi');
  });

  it('should reach qi condensation through daily practice without manual resource injection', () => {
    let state = createInitialState();
    let actionCount = 0;

    const doAction = (actionId: string) => {
      const result = performAction(state, actionId, () => 0.9);
      expect(result.success).toBe(true);
      state = checkUnlocks(result.state);
      actionCount += 1;
    };

    const ensureEssence = (actionId: string) => {
      const neededEssence = ACTIONS[actionId].cost.essence ?? 0;
      while (state.resources.essence < neededEssence) {
        doAction('tiaoxi');
      }
    };

    doAction('kuzuo');
    doAction('kuzuo');

    const jadeSlip = EVENTS.find((item) => item.id === 'find_jade_slip')!;
    state = checkUnlocks(jadeSlip.choices[0].effect(state).state);

    doAction('kuzuo');

    expect(getAvailableActionsAtLocation(state)).toContain('tuna');

    for (let index = 0; index < 10; index += 1) {
      ensureEssence('tuna');
      doAction('tuna');
    }

    expect(getAvailableActionsAtLocation(state)).toContain('rike_tuna');
    expect(getAvailableActionsAtLocation(state)).not.toContain('yinqi');

    ensureEssence('rike_tuna');
    doAction('rike_tuna');

    expect(getAvailableActionsAtLocation(state)).toContain('yinqi');

    ensureEssence('yinqi');
    doAction('yinqi');

    expect(state.realm).toBe(Realm.QiCondensation);
    expect(state.realmLayer).toBe(1);
    expect(getAvailableActionsAtLocation(state)).not.toContain('yinqi');
    expect(getAvailableActionsAtLocation(state)).toContain('inspect_root');
    expect(state.choices.qualities.action_tuna_count).toBe(10);
    expect(state.choices.qualities.action_rike_tuna_count).toBe(1);
    expect(actionCount).toBeLessThanOrEqual(20);
    expect(state.time.tick).toBeGreaterThanOrEqual(180);
    expect(state.time.tick).toBeLessThanOrEqual(220);
  });
});
