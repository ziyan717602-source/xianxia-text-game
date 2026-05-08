import { describe, it, expect } from 'vitest';
import { rollEvent } from '../src/game/events';
import { createInitialState } from '../src/game/state';
import { EVENTS } from '../src/content/events';
import { Realm } from '../src/game/types';

describe('Event System', () => {
  it('should not roll event if conditions are not met', () => {
    const state = createInitialState();
    state.resources.insight = 0; // Less than 2, won't trigger find_jade_slip
    const event = rollEvent(state);
    expect(event).toBeNull();
  });

  it('should roll find_jade_slip when insight >= 2', () => {
    const state = createInitialState();
    state.resources.insight = 2; // Condition met
    
    // Use a fixed random function that always returns 0.5
    const event = rollEvent(state, () => 0.5);
    expect(event).not.toBeNull();
    expect(event?.id).toBe('find_jade_slip');
  });

  it('should handle choice effect correctly', () => {
    const state = createInitialState();
    state.resources.qi = 0;
    
    const event = EVENTS.find(e => e.id === 'find_jade_slip');
    expect(event).toBeDefined();

    if (event) {
      const choice = event.choices[0]; // 探查玉简
      const result = choice.effect(state);
      expect(result.state.resources.qi).toBe(1);
      expect(result.log).toContain('玉简中记录的吐纳之法');
    }
  });

  it('should roll location specific events', () => {
    const state = createInitialState();
    state.currentLocationId = 'mountain_path';
    state.choices.flags['found_jade_slip'] = true; // prevent find_jade_slip
    
    // We expect wounded_cultivator
    const event = rollEvent(state, () => 0.5);
    expect(event?.id).toBe('wounded_cultivator');
  });

  it('should apply location event weight modifiers', () => {
    const state = createInitialState();
    state.currentLocationId = 'mountain_path';
    state.choices.flags['found_jade_slip'] = true;

    const event = rollEvent(state, () => 0.99);
    expect(event?.id).toBe('wounded_cultivator');
  });

  it('should record a relationship when helping the wounded cultivator', () => {
    const state = createInitialState();
    state.resources.herbs = 5;

    const event = EVENTS.find(e => e.id === 'wounded_cultivator');
    const result = event!.choices[0].effect(state);
    const relationship = result.state.relationships['wounded_cultivator'];

    expect(relationship).toBeDefined();
    expect(relationship.favors).toBe(1);
    expect(relationship.grudges).toBe(0);
    expect(relationship.tags).toContain('欠人情');
    expect(relationship.state).toBe('Departed');
  });

  it('should record a grudge when robbing the wounded cultivator', () => {
    const state = createInitialState();

    const event = EVENTS.find(e => e.id === 'wounded_cultivator');
    const result = event!.choices[2].effect(state);
    const relationship = result.state.relationships['wounded_cultivator'];

    expect(result.state.resources.coins).toBe(20);
    expect(relationship.grudges).toBe(2);
    expect(relationship.tags).toContain('被你搜掠');
  });

  it('should roll the spring herb event when mountain state and season match', () => {
    const state = createInitialState();
    state.currentLocationId = 'mountain_path';
    state.resources.herbs = 1;
    state.choices.flags['met_wounded_cultivator'] = true;

    const event = rollEvent(state, () => 0);

    expect(event?.id).toBe('rain_after_sprouts');
  });

  it('should mark an herb patch and strengthen alchemy affinity', () => {
    const state = createInitialState();
    state.resources.herbs = 1;

    const event = EVENTS.find(e => e.id === 'rain_after_sprouts');
    const result = event!.choices[1].effect(state);

    expect(result.state.choices.flags.found_rain_after_sprouts).toBe(true);
    expect(result.state.choices.flags.marked_herb_patch).toBe(true);
    expect(result.state.choices.qualities.alchemy_affinity).toBe(2);
    expect(result.state.resources.herbs).toBe(2);
  });

  it('should let the wounded cultivator repay a favor with a route hint', () => {
    let state = createInitialState();
    state.resources.herbs = 5;

    const woundedEvent = EVENTS.find(e => e.id === 'wounded_cultivator')!;
    state = woundedEvent.choices[0].effect(state).state;

    const returnEvent = EVENTS.find(e => e.id === 'wounded_cultivator_return')!;
    const result = returnEvent.choices[1].effect(state);

    expect(result.state.choices.flags.wounded_cultivator_returned).toBe(true);
    expect(result.state.choices.flags.heard_herb_slope_hint).toBe(true);
    expect(result.state.resources.insight).toBe(2);
    expect(result.state.relationships.wounded_cultivator.favors).toBe(0);
  });

  it('should record market debt when buying herbs on credit', () => {
    const state = createInitialState();

    const event = EVENTS.find(e => e.id === 'market_price_rise');
    const result = event!.choices[2].effect(state);
    const relationship = result.state.relationships.market_keeper;

    expect(result.state.resources.herbs).toBe(2);
    expect(result.state.choices.qualities.market_ties).toBe(2);
    expect(relationship.debts).toBe(1);
    expect(relationship.tags).toContain('赊账');
  });

  it('should record outer gate rules as a sect trace', () => {
    const state = createInitialState();

    const event = EVENTS.find(e => e.id === 'outer_gate_rules');
    const result = event!.choices[0].effect(state);

    expect(result.state.choices.flags.heard_outer_gate_rules).toBe(true);
    expect(result.state.choices.tags.sect_trace).toBe('heard_rules');
    expect(result.state.choices.qualities.sect_trace).toBe(1);
  });

  it('should let the outer gate clerk register a sect trace relationship', () => {
    let state = createInitialState();
    state.realm = Realm.QiCondensation;
    state.realmLayer = 1;
    state.currentLocationId = 'outer_gate';
    state.resources.coins = 3;
    state.choices.flags.heard_outer_gate_rules = true;

    const event = EVENTS.find(e => e.id === 'outer_gate_register');
    expect(event?.condition(state)).toBe(true);

    const result = event!.choices[0].effect(state);

    expect(result.state.resources.coins).toBe(0);
    expect(result.state.choices.flags.outer_gate_registered).toBe(true);
    expect(result.state.choices.tags.sect_trace).toBe('registered');
    expect(result.state.choices.qualities.sect_trace).toBe(2);
    expect(result.state.relationships.outer_gate_clerk.tags).toContain('记名');
  });

  it('should let the outer gate clerk point to errand work', () => {
    let state = createInitialState();
    state.realm = Realm.QiCondensation;
    state.realmLayer = 1;
    state.currentLocationId = 'outer_gate';
    state.choices.flags.heard_outer_gate_rules = true;

    const event = EVENTS.find(e => e.id === 'outer_gate_register')!;
    const result = event.choices[1].effect(state);

    expect(result.state.choices.flags.accepted_outer_gate_errand).toBe(true);
    expect(result.state.choices.tags.sect_trace).toBe('errand');
    expect(result.state.resources.insight).toBe(1);
    expect(result.state.relationships.outer_gate_clerk.tags).toContain('给过短差');
  });

  it('should help a failed same-gate peer with stabilizing powder', () => {
    let state = createInitialState();
    state.realm = Realm.QiCondensation;
    state.realmLayer = 1;
    state.currentLocationId = 'outer_gate';
    state.resources.stabilizingPowders = 1;
    state.choices.flags.outer_gate_registered = true;

    const event = EVENTS.find(e => e.id === 'outer_gate_peer_failure');
    expect(event?.condition(state)).toBe(true);

    const result = event!.choices[0].effect(state);

    expect(result.state.resources.stabilizingPowders).toBe(0);
    expect(result.state.choices.flags.outer_gate_peer_failure_seen).toBe(true);
    expect(result.state.choices.flags.helped_same_gate_with_powder).toBe(true);
    expect(result.state.choices.qualities.alchemy_affinity).toBe(1);
    expect(result.state.choices.qualities.sect_contribution).toBe(1);
    expect(result.state.relationships.same_gate_peer.favors).toBe(1);
    expect(result.state.relationships.same_gate_peer.tags).toContain('欠你药情');
  });

  it('should create a same-gate pill debt when lending a qi pill', () => {
    let state = createInitialState();
    state.realm = Realm.QiCondensation;
    state.realmLayer = 1;
    state.currentLocationId = 'outer_gate';
    state.resources.qiPills = 1;
    state.choices.qualities.sect_trace = 2;

    const event = EVENTS.find(e => e.id === 'outer_gate_peer_failure')!;
    const result = event.choices[1].effect(state);

    expect(result.state.resources.qiPills).toBe(0);
    expect(result.state.choices.flags.same_gate_peer_qi_pill_debt_open).toBe(true);
    expect(result.state.choices.qualities.sect_trace).toBe(3);
    expect(result.state.choices.qualities.karmic_weight).toBe(1);
    expect(result.state.relationships.same_gate_peer.debts).toBe(1);
    expect(result.state.relationships.same_gate_peer.tags).toContain('借过小聚气丸');
  });

  it('should let a same-gate peer repay a pill debt', () => {
    let state = createInitialState();
    state.currentLocationId = 'outer_gate';
    state.resources.qiPills = 1;
    state.choices.qualities.sect_trace = 2;

    const failureEvent = EVENTS.find(e => e.id === 'outer_gate_peer_failure')!;
    state = failureEvent.choices[1].effect(state).state;

    const returnEvent = EVENTS.find(e => e.id === 'same_gate_peer_return');
    expect(returnEvent?.condition(state)).toBe(true);

    const result = returnEvent!.choices[0].effect(state);

    expect(result.state.resources.coins).toBe(6);
    expect(result.state.choices.flags.same_gate_peer_return_seen).toBe(true);
    expect(result.state.choices.flags.same_gate_peer_debt_settled).toBe(true);
    expect(result.state.choices.flags.same_gate_peer_qi_pill_debt_open).toBe(false);
    expect(result.state.relationships.same_gate_peer.debts).toBe(0);
    expect(result.state.relationships.same_gate_peer.tags).toContain('还过药账');
  });

  it('should record a same-gate grudge when the failed peer is ignored', () => {
    let state = createInitialState();
    state.realm = Realm.QiCondensation;
    state.realmLayer = 1;
    state.currentLocationId = 'outer_gate';
    state.choices.flags.completed_sect_errand = true;

    const event = EVENTS.find(e => e.id === 'outer_gate_peer_failure')!;
    const result = event.choices[2].effect(state);

    expect(result.state.resources.insight).toBe(1);
    expect(result.state.choices.flags.left_same_gate_peer_failed).toBe(true);
    expect(result.state.choices.qualities.quiet_cultivation).toBe(1);
    expect(result.state.relationships.same_gate_peer.grudges).toBe(1);
    expect(result.state.relationships.same_gate_peer.tags).toContain('被你旁观');
  });

  it('should expose and resolve the meridian dantoxin event', () => {
    let state = createInitialState();
    state.realm = Realm.QiCondensation;
    state.realmLayer = 1;
    state.currentLocationId = 'home';
    state.resources.dantoxin = 60;
    state.resources.essence = 80;
    state.resources.qi = 10;

    const event = EVENTS.find(e => e.id === 'dantoxin_in_meridians');
    expect(event?.condition(state)).toBe(true);

    const result = event!.choices[0].effect(state);

    expect(result.state.choices.flags.dantoxin_in_meridians_seen).toBe(true);
    expect(result.state.choices.flags.forced_out_dantoxin).toBe(true);
    expect(result.state.resources.dantoxin).toBe(50);
    expect(result.state.resources.qi).toBe(6);
    expect(result.state.choices.qualities.quiet_cultivation).toBe(1);
  });

  it('should let the meridian dantoxin event point to a cleansing formula', () => {
    let state = createInitialState();
    state.realm = Realm.QiCondensation;
    state.realmLayer = 1;
    state.currentLocationId = 'home';
    state.resources.dantoxin = 60;
    state.resources.herbs = 2;

    const event = EVENTS.find(e => e.id === 'dantoxin_in_meridians')!;
    const result = event.choices[1].effect(state);

    expect(result.state.choices.flags.sought_cleansing_formula).toBe(true);
    expect(result.state.resources.herbs).toBe(1);
    expect(result.state.resources.insight).toBe(2);
    expect(result.state.choices.qualities.alchemy_affinity).toBe(1);
  });

  it('should expose foundation scar care after a failed foundation breakthrough', () => {
    let state = createInitialState();
    state.realm = Realm.QiCondensation;
    state.realmLayer = 3;
    state.currentLocationId = 'home';
    state.resources.essence = 80;
    state.resources.wounds = 2;
    state.resources.lifespan = 1000;
    state.choices.flags.foundation_scar = true;

    const event = EVENTS.find(e => e.id === 'foundation_scar_aches');
    expect(event?.condition(state)).toBe(true);

    const result = event!.choices[0].effect(state);

    expect(result.state.choices.flags.foundation_scar_aches_seen).toBe(true);
    expect(result.state.choices.flags.nursed_foundation_scar).toBe(true);
    expect(result.state.resources.essence).toBe(40);
    expect(result.state.resources.wounds).toBe(1);
    expect(result.state.resources.lifespan).toBe(940);
    expect(result.state.choices.qualities.quiet_cultivation).toBe(1);
  });

  it('should maintain a qi array after array retreat', () => {
    let state = createInitialState();
    state.currentLocationId = 'home';
    state.resources.coins = 5;
    state.resources.herbs = 2;
    state.choices.flags.home_qi_array = true;
    state.choices.flags.qi_array_maintenance_pending = true;

    const event = EVENTS.find(e => e.id === 'qi_array_maintenance');
    expect(event?.condition(state)).toBe(true);

    const result = event!.choices[0].effect(state);

    expect(result.state.resources.coins).toBe(1);
    expect(result.state.resources.herbs).toBe(0);
    expect(result.state.choices.flags.qi_array_maintenance_pending).toBe(false);
    expect(result.state.choices.flags.maintained_qi_array).toBe(true);
    expect(result.state.choices.tags.dwelling).toBe('qi_array_stable');
    expect(result.state.choices.qualities.formation_craft).toBe(1);
  });

  it('should let a qi array be overdrawn at a cost', () => {
    let state = createInitialState();
    state.currentLocationId = 'home';
    state.resources.qi = 10;
    state.choices.flags.home_qi_array = true;
    state.choices.flags.qi_array_maintenance_pending = true;

    const event = EVENTS.find(e => e.id === 'qi_array_maintenance')!;
    const result = event.choices[2].effect(state);

    expect(result.state.resources.qi).toBe(14);
    expect(result.state.resources.dantoxin).toBe(3);
    expect(result.state.resources.wounds).toBe(1);
    expect(result.state.choices.flags.strained_qi_array).toBe(true);
    expect(result.state.choices.flags.qi_array_maintenance_pending).toBe(false);
    expect(result.state.choices.tags.dwelling).toBe('qi_array_strained');
    expect(result.state.choices.qualities.reckless_breakthrough).toBe(1);
  });

  it('should settle foundation practice by checking old burdens', () => {
    let state = createInitialState();
    state.realm = Realm.FoundationEstablishment;
    state.realmLayer = 1;
    state.currentLocationId = 'home';
    state.resources.dantoxin = 12;
    state.resources.wounds = 1;
    state.choices.flags.foundation_practice_settling_pending = true;

    const event = EVENTS.find(e => e.id === 'foundation_practice_settling');
    expect(event?.condition(state)).toBe(true);

    const result = event!.choices[1].effect(state);

    expect(result.state.choices.flags.foundation_practice_settling_seen).toBe(true);
    expect(result.state.choices.flags.foundation_practice_settling_pending).toBe(false);
    expect(result.state.choices.flags.foundation_checked_old_burdens).toBe(true);
    expect(result.state.resources.dantoxin).toBe(6);
    expect(result.state.resources.wounds).toBe(0);
    expect(result.state.resources.insight).toBe(1);
    expect(result.state.choices.tags.foundation_state).toBe('checked_burdens');
    expect(result.state.choices.qualities.alchemy_affinity).toBe(1);
    expect(result.state.choices.qualities.quiet_cultivation).toBe(1);
  });

  it('should let foundation practice rework a qi array', () => {
    let state = createInitialState();
    state.realm = Realm.FoundationEstablishment;
    state.realmLayer = 1;
    state.currentLocationId = 'home';
    state.resources.qi = 20;
    state.resources.coins = 4;
    state.resources.herbs = 2;
    state.choices.flags.home_qi_array = true;
    state.choices.flags.qi_array_maintenance_pending = true;
    state.choices.flags.qi_array_unstable = true;
    state.choices.flags.strained_qi_array = true;
    state.choices.flags.foundation_practice_settling_pending = true;

    const event = EVENTS.find(e => e.id === 'foundation_practice_settling')!;
    const result = event.choices[2].effect(state);

    expect(result.state.resources.coins).toBe(0);
    expect(result.state.resources.herbs).toBe(0);
    expect(result.state.resources.qi).toBe(22);
    expect(result.state.choices.flags.foundation_reworked_qi_array).toBe(true);
    expect(result.state.choices.flags.qi_array_maintenance_pending).toBe(false);
    expect(result.state.choices.flags.qi_array_unstable).toBe(false);
    expect(result.state.choices.flags.strained_qi_array).toBe(false);
    expect(result.state.choices.tags.dwelling).toBe('foundation_array');
    expect(result.state.choices.tags.foundation_state).toBe('array_reworked');
    expect(result.state.choices.qualities.formation_craft).toBe(2);
  });

  it('should maintain a cave dwelling after cave seclusion', () => {
    let state = createInitialState();
    state.realm = Realm.FoundationEstablishment;
    state.realmLayer = 1;
    state.currentLocationId = 'home';
    state.resources.coins = 6;
    state.resources.herbs = 3;
    state.choices.flags.cave_dwelling = true;
    state.choices.flags.cave_dwelling_upkeep_pending = true;

    const event = EVENTS.find(e => e.id === 'cave_dwelling_upkeep');
    expect(event?.condition(state)).toBe(true);

    const result = event!.choices[0].effect(state);

    expect(result.state.resources.coins).toBe(0);
    expect(result.state.resources.herbs).toBe(0);
    expect(result.state.choices.flags.cave_dwelling_upkeep_pending).toBe(false);
    expect(result.state.choices.flags.maintained_cave_dwelling).toBe(true);
    expect(result.state.choices.flags.cave_dwelling_neglected).toBe(false);
    expect(result.state.choices.tags.dwelling).toBe('cave_dwelling_stable');
    expect(result.state.choices.qualities.formation_craft).toBe(2);
  });

  it('should let cave dwelling upkeep draw on sect supply records', () => {
    let state = createInitialState();
    state.realm = Realm.FoundationEstablishment;
    state.realmLayer = 1;
    state.currentLocationId = 'home';
    state.choices.flags.cave_dwelling = true;
    state.choices.flags.cave_dwelling_upkeep_pending = true;
    state.choices.flags.completed_sect_supply = true;
    state.choices.qualities.sect_contribution = 2;

    const event = EVENTS.find(e => e.id === 'cave_dwelling_upkeep')!;
    const result = event.choices[1].effect(state);

    expect(result.state.choices.flags.cave_dwelling_upkeep_pending).toBe(false);
    expect(result.state.choices.flags.cave_dwelling_supported_by_sect).toBe(true);
    expect(result.state.choices.tags.dwelling).toBe('cave_dwelling_supplied');
    expect(result.state.choices.tags.sect_status).toBe('cave_supply');
    expect(result.state.choices.qualities.formation_craft).toBe(1);
    expect(result.state.choices.qualities.sect_trace).toBe(1);
    expect(result.state.choices.qualities.sect_discipline).toBe(1);
    expect(result.state.choices.qualities.sect_contribution).toBe(1);
  });

  it('should allow neglecting cave dwelling upkeep for immediate qi at a cost', () => {
    let state = createInitialState();
    state.realm = Realm.FoundationEstablishment;
    state.realmLayer = 1;
    state.currentLocationId = 'home';
    state.resources.qi = 10;
    state.resources.lifespan = 1000;
    state.choices.flags.cave_dwelling = true;
    state.choices.flags.cave_dwelling_upkeep_pending = true;

    const event = EVENTS.find(e => e.id === 'cave_dwelling_upkeep')!;
    const result = event.choices[2].effect(state);

    expect(result.state.resources.qi).toBe(16);
    expect(result.state.resources.dantoxin).toBe(2);
    expect(result.state.resources.wounds).toBe(1);
    expect(result.state.resources.lifespan).toBe(940);
    expect(result.state.choices.flags.cave_dwelling_upkeep_pending).toBe(false);
    expect(result.state.choices.flags.cave_dwelling_neglected).toBe(true);
    expect(result.state.choices.tags.dwelling).toBe('cave_dwelling_strained');
    expect(result.state.choices.qualities.reckless_breakthrough).toBe(1);
  });

  it('should harvest a ripened cave herb plot without damaging it', () => {
    let state = createInitialState();
    state.realm = Realm.FoundationEstablishment;
    state.realmLayer = 1;
    state.currentLocationId = 'home';
    state.choices.flags.cave_herb_plot = true;
    state.choices.flags.cave_herb_plot_ripening_pending = true;

    const event = EVENTS.find(e => e.id === 'cave_herb_plot_ripens');
    expect(event?.condition(state)).toBe(true);

    const result = event!.choices[0].effect(state);

    expect(result.state.resources.herbs).toBe(4);
    expect(result.state.choices.flags.cave_herb_plot_ripening_pending).toBe(false);
    expect(result.state.choices.flags.harvested_cave_herb_plot).toBe(true);
    expect(result.state.choices.tags.cave_support).toBe('herb_plot_stable');
    expect(result.state.choices.qualities.alchemy_affinity).toBe(2);
  });

  it('should allow forcing cave herb growth for more herbs at a toxin and lifespan cost', () => {
    let state = createInitialState();
    state.realm = Realm.FoundationEstablishment;
    state.realmLayer = 1;
    state.currentLocationId = 'home';
    state.resources.lifespan = 1000;
    state.choices.flags.cave_herb_plot = true;
    state.choices.flags.cave_herb_plot_ripening_pending = true;

    const event = EVENTS.find(e => e.id === 'cave_herb_plot_ripens')!;
    const result = event.choices[2].effect(state);

    expect(result.state.resources.herbs).toBe(6);
    expect(result.state.resources.dantoxin).toBe(2);
    expect(result.state.resources.lifespan).toBe(960);
    expect(result.state.choices.flags.cave_herb_plot_ripening_pending).toBe(false);
    expect(result.state.choices.flags.forced_cave_herb_plot).toBe(true);
    expect(result.state.choices.tags.cave_support).toBe('forced_growth');
    expect(result.state.choices.qualities.alchemy_affinity).toBe(1);
    expect(result.state.choices.qualities.reckless_breakthrough).toBe(1);
  });

  it('should settle a borrowed foundation pill debt at the market', () => {
    let state = createInitialState();
    state.currentLocationId = 'market';
    state.resources.coins = 12;
    state.choices.tags.market_debt = 'foundation_pill';
    state.choices.flags.foundation_pill_debt_open = true;

    const event = EVENTS.find(e => e.id === 'market_foundation_debt');
    expect(event?.condition(state)).toBe(true);

    const result = event!.choices[0].effect(state);

    expect(result.state.resources.coins).toBe(0);
    expect(result.state.choices.flags.market_foundation_debt_seen).toBe(true);
    expect(result.state.choices.flags.foundation_debt_settled).toBe(true);
    expect(result.state.choices.flags.foundation_pill_debt_open).toBe(false);
    expect(result.state.choices.tags.market_debt).toBeUndefined();
    expect(result.state.relationships.market_keeper.tags).toContain('筑基丹账清');
  });

  it('should record delayed foundation pill debt as a market relationship', () => {
    let state = createInitialState();
    state.currentLocationId = 'market';
    state.choices.tags.market_debt = 'foundation_pill';

    const event = EVENTS.find(e => e.id === 'market_foundation_debt')!;
    const result = event.choices[1].effect(state);

    expect(result.state.choices.flags.foundation_debt_delayed).toBe(true);
    expect(result.state.choices.qualities.market_ties).toBe(-1);
    expect(result.state.choices.qualities.karmic_weight).toBe(1);
    expect(result.state.relationships.market_keeper.debts).toBe(2);
    expect(result.state.relationships.market_keeper.tags).toContain('筑基丹账拖延');
  });

  it('should reckon a foundation market account after foundation establishment', () => {
    let state = createInitialState();
    state.realm = Realm.FoundationEstablishment;
    state.realmLayer = 1;
    state.currentLocationId = 'market';
    state.resources.coins = 16;
    state.choices.flags.reached_foundation = true;
    state.choices.flags.foundation_pill_debt_open = true;
    state.choices.tags.market_debt = 'foundation_pill';

    const event = EVENTS.find(e => e.id === 'foundation_market_reckoning');
    expect(event?.condition(state)).toBe(true);

    const result = event!.choices[0].effect(state);

    expect(result.state.resources.coins).toBe(0);
    expect(result.state.choices.flags.foundation_market_reckoning_seen).toBe(true);
    expect(result.state.choices.flags.foundation_market_reckoned).toBe(true);
    expect(result.state.choices.flags.foundation_pill_debt_open).toBe(false);
    expect(result.state.choices.tags.market_debt).toBeUndefined();
    expect(result.state.choices.tags.market_status).toBe('foundation_account_clear');
    expect(result.state.choices.qualities.market_ties).toBe(2);
    expect(result.state.relationships.market_keeper.tags).toContain('筑基后清账');
  });

  it('should let a foundation market account be pressed into a grudge', () => {
    let state = createInitialState();
    state.realm = Realm.FoundationEstablishment;
    state.realmLayer = 1;
    state.currentLocationId = 'market';
    state.choices.flags.reached_foundation = true;
    state.choices.flags.foundation_debt_delayed = true;

    const event = EVENTS.find(e => e.id === 'foundation_market_reckoning')!;
    const result = event.choices[2].effect(state);

    expect(result.state.choices.flags.foundation_market_pressed_account).toBe(true);
    expect(result.state.choices.flags.foundation_pill_debt_open).toBe(false);
    expect(result.state.choices.tags.market_status).toBe('pressed_account');
    expect(result.state.choices.qualities.market_ties).toBe(-2);
    expect(result.state.choices.qualities.karmic_weight).toBe(2);
    expect(result.state.relationships.market_keeper.grudges).toBe(1);
    expect(result.state.relationships.market_keeper.tags).toContain('筑基后压账');
  });

  it('should resolve the outer gate guardian account after seeking foundation support', () => {
    let state = createInitialState();
    state.currentLocationId = 'outer_gate';
    state.resources.coins = 4;
    state.choices.flags.sought_foundation_guardian = true;
    state.choices.flags.foundation_guardian_account_open = true;

    const event = EVENTS.find(e => e.id === 'outer_gate_guardian_account');
    expect(event?.condition(state)).toBe(true);

    const result = event!.choices[0].effect(state);

    expect(result.state.resources.coins).toBe(0);
    expect(result.state.choices.flags.outer_gate_guardian_account_seen).toBe(true);
    expect(result.state.choices.flags.thanked_foundation_guardian).toBe(true);
    expect(result.state.choices.flags.foundation_guardian_account_open).toBe(false);
    expect(result.state.choices.qualities.sect_trace).toBe(1);
    expect(result.state.relationships.foundation_guardian.tags).toContain('收过谢礼');
  });

  it('should move a foundation cultivator into the outer gate foundation registry', () => {
    let state = createInitialState();
    state.realm = Realm.FoundationEstablishment;
    state.realmLayer = 1;
    state.currentLocationId = 'outer_gate';
    state.resources.coins = 6;
    state.choices.flags.reached_foundation = true;
    state.choices.flags.outer_gate_registered = true;
    state.choices.flags.sought_foundation_guardian = true;
    state.choices.flags.foundation_guardian_account_open = true;

    const event = EVENTS.find(e => e.id === 'outer_gate_foundation_registry');
    expect(event?.condition(state)).toBe(true);

    const result = event!.choices[0].effect(state);

    expect(result.state.resources.coins).toBe(0);
    expect(result.state.choices.flags.outer_gate_foundation_registry_seen).toBe(true);
    expect(result.state.choices.flags.outer_gate_guardian_account_seen).toBe(true);
    expect(result.state.choices.flags.foundation_registered_outer_gate).toBe(true);
    expect(result.state.choices.flags.foundation_guardian_account_open).toBe(false);
    expect(result.state.choices.tags.sect_status).toBe('foundation_registered');
    expect(result.state.choices.qualities.sect_trace).toBe(2);
    expect(result.state.choices.qualities.sect_discipline).toBe(1);
    expect(result.state.relationships.outer_gate_clerk.tags).toContain('记筑基名册');
    expect(result.state.relationships.foundation_guardian.tags).toContain('筑基后销账');
  });

  it('should let a foundation cultivator avoid the outer gate registry', () => {
    let state = createInitialState();
    state.realm = Realm.FoundationEstablishment;
    state.realmLayer = 1;
    state.currentLocationId = 'outer_gate';
    state.choices.flags.reached_foundation = true;
    state.choices.flags.outer_gate_registered = true;
    state.choices.flags.sought_foundation_guardian = true;

    const event = EVENTS.find(e => e.id === 'outer_gate_foundation_registry')!;
    const result = event.choices[2].effect(state);

    expect(result.state.choices.flags.foundation_avoided_registry).toBe(true);
    expect(result.state.choices.flags.foundation_guardian_account_open).toBe(false);
    expect(result.state.choices.tags.sect_status).toBe('unregistered_foundation');
    expect(result.state.choices.qualities.sect_trace).toBe(-2);
    expect(result.state.choices.qualities.sect_discipline).toBe(-2);
    expect(result.state.choices.qualities.karmic_weight).toBe(1);
    expect(result.state.relationships.outer_gate_clerk.grudges).toBe(1);
    expect(result.state.relationships.foundation_guardian.grudges).toBe(1);
  });

  it('should punish missing outer gate roll call after registered retreat', () => {
    let state = createInitialState();
    state.realm = Realm.QiCondensation;
    state.realmLayer = 1;
    state.currentLocationId = 'outer_gate';
    state.resources.coins = 3;
    state.choices.flags.outer_gate_registered = true;
    state.choices.qualities.action_short_retreat_count = 1;
    state.choices.qualities.sect_trace = 2;

    const event = EVENTS.find(e => e.id === 'outer_gate_missed_roll_call');
    expect(event?.condition(state)).toBe(true);

    const result = event!.choices[0].effect(state);

    expect(result.state.resources.coins).toBe(0);
    expect(result.state.choices.flags.outer_gate_missed_roll_call_seen).toBe(true);
    expect(result.state.choices.flags.outer_gate_fine_paid).toBe(true);
    expect(result.state.choices.tags.sect_status).toBe('fined');
    expect(result.state.choices.qualities.sect_discipline).toBe(-1);
    expect(result.state.relationships.outer_gate_clerk.tags).toContain('收过点卯罚钱');
  });

  it('should let a missed roll call be worked off with outer gate labor', () => {
    let state = createInitialState();
    state.realm = Realm.QiCondensation;
    state.realmLayer = 1;
    state.currentLocationId = 'outer_gate';
    state.resources.essence = 40;
    state.choices.flags.outer_gate_registered = true;
    state.choices.qualities.action_short_retreat_count = 1;

    const event = EVENTS.find(e => e.id === 'outer_gate_missed_roll_call')!;
    const result = event.choices[1].effect(state);

    expect(result.state.resources.essence).toBe(15);
    expect(result.state.resources.insight).toBe(1);
    expect(result.state.choices.flags.worked_off_missed_roll_call).toBe(true);
    expect(result.state.choices.qualities.sect_discipline).toBe(1);
    expect(result.state.choices.qualities.sect_trace).toBe(1);
    expect(result.state.relationships.outer_gate_clerk.tags).toContain('补过点卯杂务');
  });

  it('should resolve an outer gate patrol report into contribution', () => {
    let state = createInitialState();
    state.realm = Realm.QiCondensation;
    state.realmLayer = 1;
    state.currentLocationId = 'outer_gate';
    state.choices.flags.completed_sect_patrol = true;
    state.choices.qualities.sect_contribution = 1;

    const event = EVENTS.find(e => e.id === 'outer_gate_patrol_report');
    expect(event?.condition(state)).toBe(true);

    const result = event!.choices[0].effect(state);

    expect(result.state.resources.coins).toBe(2);
    expect(result.state.choices.flags.outer_gate_patrol_report_seen).toBe(true);
    expect(result.state.choices.flags.reported_outer_gate_patrol).toBe(true);
    expect(result.state.choices.qualities.sect_contribution).toBe(2);
    expect(result.state.choices.qualities.sect_discipline).toBe(1);
    expect(result.state.relationships.outer_gate_clerk.favors).toBe(1);
    expect(result.state.relationships.outer_gate_clerk.tags).toContain('收过巡值回报');
  });
});
