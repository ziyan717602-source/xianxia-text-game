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

  it('should arrange a qi array and use it as the next retreat upgrade', () => {
    let state = createInitialState();
    state.realm = Realm.QiCondensation;
    state.realmLayer = 1;
    state.resources.essence = 100;
    state.resources.qi = 40;
    state.resources.herbs = 6;
    state.resources.coins = 10;
    state.resources.insight = 6;
    state.unlockedActions.push('arrange_qi_array', 'array_retreat');

    const arrange = performAction(state, 'arrange_qi_array');
    state = arrange.state;

    expect(arrange.success).toBe(true);
    expect(arrange.log).toContain('聚气阵');
    expect(state.resources.essence).toBe(60);
    expect(state.resources.herbs).toBe(2);
    expect(state.resources.coins).toBe(2);
    expect(state.resources.insight).toBe(2);
    expect(state.choices.flags.home_qi_array).toBe(true);
    expect(state.choices.tags.dwelling).toBe('qi_array');
    expect(state.choices.qualities.formation_craft).toBe(1);

    state.resources.essence = 100;
    const retreat = performAction(state, 'array_retreat');
    state = retreat.state;

    expect(retreat.success).toBe(true);
    expect(retreat.log).toContain('阵中');
    expect(state.resources.qi).toBe(74);
    expect(state.resources.insight).toBe(3);
    expect(state.time.tick).toBe(320);
    expect(state.choices.flags.qi_array_maintenance_pending).toBe(true);
    expect(state.choices.flags.completed_array_retreat).toBe(true);
    expect(state.choices.qualities.quiet_cultivation).toBe(1);
  });

  it('should continue routine cultivation after foundation establishment', () => {
    let state = createInitialState();
    state.realm = Realm.FoundationEstablishment;
    state.realmLayer = 1;
    state.resources.essence = 100;
    state.resources.qi = 60;
    state.resources.insight = 5;
    state.choices.flags.reached_foundation = true;
    state.unlockedActions.push('foundation_daily_practice');

    const result = performAction(state, 'foundation_daily_practice');
    state = result.state;

    expect(result.success).toBe(true);
    expect(result.log).toContain('筑基后的日课');
    expect(state.resources.essence).toBe(20);
    expect(state.resources.qi).toBe(98);
    expect(state.resources.insight).toBe(5);
    expect(state.time.tick).toBe(220);
    expect(state.choices.flags.foundation_practice_started).toBe(true);
    expect(state.choices.flags.foundation_practice_settling_pending).toBe(true);
    expect(state.choices.flags.completed_foundation_daily_practice).toBe(true);
    expect(state.choices.tags.foundation_state).toBe('daily_practice');
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
    expect(rollCall.log).toContain('外门点过名');
    expect(state.resources.essence).toBe(90);
    expect(state.resources.insight).toBe(1);
    expect(state.choices.flags.attended_outer_gate_roll_call).toBe(true);
    expect(state.choices.tags.sect_status).toBe('roll_called');
    expect(state.choices.qualities.sect_discipline).toBe(1);
    expect(state.choices.qualities.sect_trace).toBe(1);

    const patrol = performAction(state, 'sect_patrol');
    state = patrol.state;

    expect(patrol.success).toBe(true);
    expect(patrol.log).toContain('外门巡值');
    expect(state.resources.essence).toBe(55);
    expect(state.resources.coins).toBe(3);
    expect(state.resources.herbs).toBe(1);
    expect(state.resources.insight).toBe(2);
    expect(state.choices.flags.completed_sect_patrol).toBe(true);
    expect(state.choices.tags.sect_status).toBe('patrol');
    expect(state.choices.qualities.sect_contribution).toBe(1);
    expect(state.choices.qualities.sect_discipline).toBe(2);
    expect(state.choices.qualities.sect_trace).toBe(2);
  });
});
