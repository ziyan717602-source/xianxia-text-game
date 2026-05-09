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
    expect(state.choices.qualities.quiet_cultivation).toBeCloseTo(0.2);
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
    expect(errand.log).toContain('差事');
    expect(state.resources.coins).toBe(4);
    expect(state.resources.herbs).toBe(1);
    expect(state.resources.insight).toBe(1);
    expect(state.choices.flags.completed_sect_errand).toBe(true);
    expect(state.choices.qualities.sect_trace).toBeCloseTo(0.2);

    state.resources.essence = 100;
    const supply = performAction(state, 'sect_supply');
    state = supply.state;

    expect(supply.success).toBe(true);
    expect(supply.log).toContain('供给');
    expect(state.resources.coins).toBe(6);
    expect(state.resources.herbs).toBe(4);
    expect(state.choices.flags.completed_sect_supply).toBe(true);
    expect(state.choices.qualities.sect_trace).toBeCloseTo(0.4);
  });

  it('should perform outer gate roll call and patrol as a rule-bound task chain', () => {
    let state = createInitialState();
    state.realm = Realm.QiCondensation;
    state.realmLayer = 1;
    state.currentLocationId = 'outer_gate';
    state.resources.essence = 100;
    state.choices.flags.outer_gate_registered = true;
    state.unlockedActions.push('sect_roll_call', 'sect_patrol');

    const rollCall = performAction(state, 'sect_roll_call');
    state = rollCall.state;

    expect(rollCall.success).toBe(true);
    expect(rollCall.log).toContain('点名应到');
    expect(state.resources.essence).toBe(90);
    expect(state.resources.insight).toBe(1);
    expect(state.choices.flags.attended_outer_gate_roll_call).toBe(true);
    expect(state.choices.tags.sect_status).toBe('roll_called');
    expect(state.choices.qualities.sect_discipline).toBe(1);
    expect(state.choices.qualities.sect_trace).toBeCloseTo(0.2);

    const patrol = performAction(state, 'sect_patrol');
    state = patrol.state;

    expect(patrol.success).toBe(true);
    expect(patrol.log).toContain('巡值一圈');
    expect(state.resources.essence).toBe(55);
    expect(state.resources.coins).toBe(3);
    expect(state.resources.herbs).toBe(1);
    expect(state.resources.insight).toBe(2);
    expect(state.choices.flags.completed_sect_patrol).toBe(true);
    expect(state.choices.tags.sect_status).toBe('patrol');
    expect(state.choices.qualities.sect_contribution).toBe(1);
    expect(state.choices.qualities.sect_discipline).toBe(2);
    expect(state.choices.qualities.sect_trace).toBeCloseTo(0.4);
  });
});
