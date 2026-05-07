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
});
