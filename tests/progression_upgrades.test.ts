import { describe, expect, it } from 'vitest';
import { performAction } from '../src/game/actions';
import { createInitialState } from '../src/game/state';
import { Realm } from '../src/game/types';

describe('Progression upgrades', () => {
  it('should perform short retreat as a batch upgrade after daily practice', () => {
    let state = createInitialState();
    state.realm = Realm.QiCondensation;
    state.realmLayer = 1;
    state.resources.essence = 100;
    state.resources.qi = 30;
    state.unlockedActions.push('short_retreat');

    const result = performAction(state, 'short_retreat');
    state = result.state;

    expect(result.success).toBe(true);
    expect(result.log).toContain('闭门三日');
    expect(state.resources.qi).toBe(54);
    expect(state.resources.essence).toBe(10);
    expect(state.time.tick).toBe(150);
    expect(state.choices.flags.completed_short_retreat).toBe(true);
    expect(state.choices.qualities.quiet_cultivation).toBe(1);
  });

  it('should perform outer gate errands and unlock supply-like support', () => {
    let state = createInitialState();
    state.realm = Realm.QiCondensation;
    state.realmLayer = 1;
    state.currentLocationId = 'outer_gate';
    state.resources.essence = 100;
    state.choices.flags.heard_outer_gate_rules = true;
    state.unlockedActions.push('sect_errand', 'sect_supply');

    const errand = performAction(state, 'sect_errand');
    state = errand.state;

    expect(errand.success).toBe(true);
    expect(errand.log).toContain('外门短差');
    expect(state.resources.coins).toBe(4);
    expect(state.resources.herbs).toBe(1);
    expect(state.resources.insight).toBe(1);
    expect(state.choices.flags.completed_sect_errand).toBe(true);
    expect(state.choices.qualities.sect_trace).toBe(1);

    state.resources.essence = 100;
    const supply = performAction(state, 'sect_supply');
    state = supply.state;

    expect(supply.success).toBe(true);
    expect(supply.log).toContain('供给');
    expect(state.resources.coins).toBe(6);
    expect(state.resources.herbs).toBe(4);
    expect(state.choices.flags.completed_sect_supply).toBe(true);
    expect(state.choices.qualities.sect_trace).toBe(2);
  });
});
