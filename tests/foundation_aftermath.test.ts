import { describe, it, expect } from 'vitest';
import { rollEvent } from '../src/game/events';
import { createInitialState } from '../src/game/state';
import { EVENTS } from '../src/content/events';
import { ACTIONS } from '../src/content/actions';
import { performAction } from '../src/game/actions';
import { getAvailableActionsAtLocation } from '../src/game/location';
import { getBreakthroughSummary } from '../src/game/breakthrough';
import { checkUnlocks } from '../src/game/unlock';
import { Realm } from '../src/game/types';

function createFoundationMorningState() {
  let state = createInitialState(20260509);
  state.realm = Realm.FoundationEstablishment;
  state.realmLayer = 1;
  state.currentLocationId = 'home';
  state.resources.essence = 100;
  state.resources.qi = 50;
  state.resources.insight = 20;
  state.choices.flags.reached_foundation = true;
  return state;
}

function createQiCondensationWithNursedScar() {
  let state = createInitialState(20260510);
  state.realm = Realm.QiCondensation;
  state.realmLayer = 3;
  state.currentLocationId = 'home';
  state.resources.essence = 80;
  state.resources.wounds = 2;
  state.resources.dantoxin = 10;
  state.resources.lifespan = 1000;
  state.choices.flags.foundation_scar = true;
  state.choices.flags.foundation_scar_aches_seen = true;
  state.choices.flags.nursed_foundation_scar = true;
  return state;
}

function createQiCondensationWithIgnoredScar() {
  let state = createInitialState(20260511);
  state.realm = Realm.QiCondensation;
  state.realmLayer = 3;
  state.currentLocationId = 'home';
  state.resources.essence = 80;
  state.resources.wounds = 2;
  state.resources.lifespan = 1000;
  state.choices.flags.foundation_scar = true;
  state.choices.flags.foundation_scar_aches_seen = true;
  state.choices.flags.ignored_foundation_scar = true;
  return state;
}

describe('Foundation Aftermath Events', () => {
  describe('foundation_establishment_morning', () => {
    it('should trigger when at home and realm is FoundationEstablishment', () => {
      const state = createFoundationMorningState();
      const event = EVENTS.find(e => e.id === 'foundation_establishment_morning');
      expect(event?.condition(state)).toBe(true);
    });

    it('should not trigger when foundation_morning_seen flag is set', () => {
      const state = createFoundationMorningState();
      state.choices.flags.foundation_morning_seen = true;
      const event = EVENTS.find(e => e.id === 'foundation_establishment_morning');
      expect(event?.condition(state)).toBe(false);
    });

    it('should not trigger when not at home', () => {
      const state = createFoundationMorningState();
      state.currentLocationId = 'market';
      const event = EVENTS.find(e => e.id === 'foundation_establishment_morning');
      expect(event?.condition(state)).toBe(false);
    });

    it('should not trigger when realm is not FoundationEstablishment', () => {
      const state = createFoundationMorningState();
      state.realm = Realm.QiCondensation;
      const event = EVENTS.find(e => e.id === 'foundation_establishment_morning');
      expect(event?.condition(state)).toBe(false);
    });

    it('should have weight 100 (always triggers first)', () => {
      const state = createFoundationMorningState();
      const event = EVENTS.find(e => e.id === 'foundation_establishment_morning');
      expect(event?.weight(state)).toBe(100);
    });

    it('should grant insight and set flags on "巡视新身" choice', () => {
      const state = createFoundationMorningState();
      const event = EVENTS.find(e => e.id === 'foundation_establishment_morning')!;
      const result = event.choices[0].effect(state);

      expect(result.state.choices.flags.foundation_morning_seen).toBe(true);
      expect(result.state.choices.flags.surveyed_new_body).toBe(true);
      expect(result.state.resources.insight).toBe(state.resources.insight + 3);
    });

    it('should grant qi and quiet_cultivation on "静坐体悟" choice', () => {
      const state = createFoundationMorningState();
      const event = EVENTS.find(e => e.id === 'foundation_establishment_morning')!;
      const result = event.choices[1].effect(state);

      expect(result.state.choices.flags.foundation_morning_seen).toBe(true);
      expect(result.state.resources.qi).toBe(state.resources.qi + 5);
      expect(result.state.resources.essence).toBe(state.resources.essence - 20);
      expect(result.state.choices.qualities.quiet_cultivation).toBe(2);
    });

    it('should roll as the highest weighted event at home', () => {
      const state = createFoundationMorningState();
      state.choices.flags.found_jade_slip = true; // prevent find_jade_slip
      const event = rollEvent(state, () => 0);
      expect(event?.id).toBe('foundation_establishment_morning');
    });
  });

  describe('foundation_scar_lingering', () => {
    it('should trigger when at home with nursed_foundation_scar flag', () => {
      const state = createQiCondensationWithNursedScar();
      const event = EVENTS.find(e => e.id === 'foundation_scar_lingering');
      expect(event?.condition(state)).toBe(true);
    });

    it('should trigger when at home with ignored_foundation_scar flag', () => {
      const state = createQiCondensationWithIgnoredScar();
      const event = EVENTS.find(e => e.id === 'foundation_scar_lingering');
      expect(event?.condition(state)).toBe(true);
    });

    it('should not trigger when foundation_scar_lingering_seen flag is set', () => {
      const state = createQiCondensationWithNursedScar();
      state.choices.flags.foundation_scar_lingering_seen = true;
      const event = EVENTS.find(e => e.id === 'foundation_scar_lingering');
      expect(event?.condition(state)).toBe(false);
    });

    it('should not trigger when not at home', () => {
      const state = createQiCondensationWithNursedScar();
      state.currentLocationId = 'market';
      const event = EVENTS.find(e => e.id === 'foundation_scar_lingering');
      expect(event?.condition(state)).toBe(false);
    });

    it('should not trigger when realm is not QiCondensation', () => {
      const state = createQiCondensationWithNursedScar();
      state.realm = Realm.FoundationEstablishment;
      const event = EVENTS.find(e => e.id === 'foundation_scar_lingering');
      expect(event?.condition(state)).toBe(false);
    });

    it('should calculate weight based on wounds', () => {
      const state = createQiCondensationWithNursedScar();
      state.resources.wounds = 3;
      const event = EVENTS.find(e => e.id === 'foundation_scar_lingering');
      expect(event?.weight(state)).toBe(18 + 3 * 6);
    });

    it('should heal wound and reduce dantoxin on "调养经脉" with enough essence', () => {
      const state = createQiCondensationWithNursedScar();
      state.resources.essence = 60;
      state.resources.dantoxin = 5;
      const event = EVENTS.find(e => e.id === 'foundation_scar_lingering')!;
      const result = event.choices[0].effect(state);

      expect(result.state.choices.flags.foundation_scar_lingering_seen).toBe(true);
      expect(result.state.choices.flags.meridians_nursed).toBe(true);
      expect(result.state.resources.essence).toBe(60 - 50);
      expect(result.state.resources.wounds).toBe(1);
      expect(result.state.resources.dantoxin).toBe(3);
      expect(result.state.resources.lifespan).toBe(state.resources.lifespan - 40);
      expect(result.state.choices.qualities.quiet_cultivation).toBe(1);
    });

    it('should add wound on "调养经脉" without enough essence', () => {
      const state = createQiCondensationWithNursedScar();
      state.resources.essence = 30;
      const event = EVENTS.find(e => e.id === 'foundation_scar_lingering')!;
      const result = event.choices[0].effect(state);

      expect(result.state.choices.flags.foundation_scar_lingering_seen).toBe(true);
      expect(result.state.resources.wounds).toBe(3);
    });

    it('should reduce wounds and add dantoxin on "药浴化瘀" with enough herbs', () => {
      const state = createQiCondensationWithNursedScar();
      state.resources.herbs = 8;
      state.resources.dantoxin = 5;
      const event = EVENTS.find(e => e.id === 'foundation_scar_lingering')!;
      const result = event.choices[1].effect(state);

      expect(result.state.choices.flags.foundation_scar_lingering_seen).toBe(true);
      expect(result.state.choices.flags.used_herb_bath).toBe(true);
      expect(result.state.resources.herbs).toBe(3);
      expect(result.state.resources.dantoxin).toBe(8);
      expect(result.state.resources.wounds).toBe(0);
      expect(result.state.choices.qualities.alchemy_affinity).toBe(1);
    });

    it('should fail gracefully on "药浴化瘀" without enough herbs', () => {
      const state = createQiCondensationWithNursedScar();
      state.resources.herbs = 3;
      const event = EVENTS.find(e => e.id === 'foundation_scar_lingering')!;
      const result = event.choices[1].effect(state);

      expect(result.state.choices.flags.foundation_scar_lingering_seen).toBe(true);
      expect(result.log).toContain('药不够');
    });

    it('should add qi and wounds on "强撑运功"', () => {
      const state = createQiCondensationWithNursedScar();
      const event = EVENTS.find(e => e.id === 'foundation_scar_lingering')!;
      const result = event.choices[2].effect(state);

      expect(result.state.choices.flags.foundation_scar_lingering_seen).toBe(true);
      expect(result.state.choices.flags.pushed_through_scar).toBe(true);
      expect(result.state.resources.qi).toBe(state.resources.qi + 3);
      expect(result.state.resources.wounds).toBe(3);
      expect(result.state.resources.lifespan).toBe(state.resources.lifespan - 40);
      expect(result.state.choices.qualities.reckless_breakthrough).toBe(1);
    });
  });

  describe('guardian_favor_recalled', () => {
    it('should trigger when at outer_gate with thanked_foundation_guardian flag', () => {
      let state = createInitialState();
      state.currentLocationId = 'outer_gate';
      state.choices.flags.thanked_foundation_guardian = true;
      const event = EVENTS.find(e => e.id === 'guardian_favor_recalled');
      expect(event?.condition(state)).toBe(true);
    });

    it('should not trigger when guardian_favor_recalled_seen flag is set', () => {
      let state = createInitialState();
      state.currentLocationId = 'outer_gate';
      state.choices.flags.thanked_foundation_guardian = true;
      state.choices.flags.guardian_favor_recalled_seen = true;
      const event = EVENTS.find(e => e.id === 'guardian_favor_recalled');
      expect(event?.condition(state)).toBe(false);
    });

    it('should not trigger when not at outer_gate', () => {
      let state = createInitialState();
      state.currentLocationId = 'home';
      state.choices.flags.thanked_foundation_guardian = true;
      const event = EVENTS.find(e => e.id === 'guardian_favor_recalled');
      expect(event?.condition(state)).toBe(false);
    });

    it('should calculate weight based on sect_trace', () => {
      let state = createInitialState();
      state.currentLocationId = 'outer_gate';
      state.choices.flags.thanked_foundation_guardian = true;
      state.choices.qualities.sect_trace = 3;
      const event = EVENTS.find(e => e.id === 'guardian_favor_recalled');
      expect(event?.weight(state)).toBe(14 + 3 * 2);
    });

    it('should accept errand on "应下差事"', () => {
      let state = createInitialState();
      state.currentLocationId = 'outer_gate';
      state.choices.flags.thanked_foundation_guardian = true;
      state.resources.essence = 50;
      const event = EVENTS.find(e => e.id === 'guardian_favor_recalled')!;
      const result = event.choices[0].effect(state);

      expect(result.state.choices.flags.guardian_favor_recalled_seen).toBe(true);
      expect(result.state.choices.flags.completed_guardian_favor).toBe(true);
      expect(result.state.resources.essence).toBe(20);
      expect(result.state.resources.coins).toBe(8);
      expect(result.state.choices.qualities.sect_contribution).toBe(2);
      expect(result.state.choices.qualities.sect_trace).toBe(1);
    });

    it('should decline on "婉拒" with quality changes', () => {
      let state = createInitialState();
      state.currentLocationId = 'outer_gate';
      state.choices.flags.thanked_foundation_guardian = true;
      state.choices.qualities.sect_trace = 3;
      const event = EVENTS.find(e => e.id === 'guardian_favor_recalled')!;
      const result = event.choices[1].effect(state);

      expect(result.state.choices.flags.guardian_favor_recalled_seen).toBe(true);
      expect(result.state.choices.flags.declined_guardian_favor).toBe(true);
      expect(result.state.choices.qualities.quiet_cultivation).toBe(1);
      expect(result.state.choices.qualities.sect_trace).toBe(2);
    });
  });

  describe('foundation_debt_collector', () => {
    it('should trigger when at market with foundation_debt_delayed flag', () => {
      let state = createInitialState();
      state.currentLocationId = 'market';
      state.choices.flags.foundation_debt_delayed = true;
      const event = EVENTS.find(e => e.id === 'foundation_debt_collector');
      expect(event?.condition(state)).toBe(true);
    });

    it('should not trigger when foundation_debt_collector_seen flag is set', () => {
      let state = createInitialState();
      state.currentLocationId = 'market';
      state.choices.flags.foundation_debt_delayed = true;
      state.choices.flags.foundation_debt_collector_seen = true;
      const event = EVENTS.find(e => e.id === 'foundation_debt_collector');
      expect(event?.condition(state)).toBe(false);
    });

    it('should not trigger when not at market', () => {
      let state = createInitialState();
      state.currentLocationId = 'home';
      state.choices.flags.foundation_debt_delayed = true;
      const event = EVENTS.find(e => e.id === 'foundation_debt_collector');
      expect(event?.condition(state)).toBe(false);
    });

    it('should calculate weight based on market_ties and karmic_weight', () => {
      let state = createInitialState();
      state.currentLocationId = 'market';
      state.choices.flags.foundation_debt_delayed = true;
      state.choices.qualities.market_ties = 3;
      state.choices.qualities.karmic_weight = 2;
      const event = EVENTS.find(e => e.id === 'foundation_debt_collector');
      expect(event?.weight(state)).toBe(20 + 3 * (-2) + 2 * 4);
    });

    it('should settle debt fully on "付清本息" with enough coins', () => {
      let state = createInitialState();
      state.currentLocationId = 'market';
      state.choices.flags.foundation_debt_delayed = true;
      state.choices.tags.market_debt = 'foundation_pill';
      state.resources.coins = 20;
      const event = EVENTS.find(e => e.id === 'foundation_debt_collector')!;
      const result = event.choices[0].effect(state);

      expect(result.state.choices.flags.foundation_debt_collector_seen).toBe(true);
      expect(result.state.choices.flags.foundation_debt_fully_settled).toBe(true);
      expect(result.state.resources.coins).toBe(4);
      expect(result.state.choices.tags.market_debt).toBeUndefined();
      expect(result.state.choices.qualities.market_ties).toBe(2);
    });

    it('should partially pay on "付清本息" without enough coins', () => {
      let state = createInitialState();
      state.currentLocationId = 'market';
      state.choices.flags.foundation_debt_delayed = true;
      state.resources.coins = 10;
      const event = EVENTS.find(e => e.id === 'foundation_debt_collector')!;
      const result = event.choices[0].effect(state);

      expect(result.state.choices.flags.foundation_debt_collector_seen).toBe(true);
      expect(result.state.resources.coins).toBe(0);
      expect(result.state.choices.qualities.karmic_weight).toBe(1);
    });

    it('should delay again on "再拖一期"', () => {
      let state = createInitialState();
      state.currentLocationId = 'market';
      state.choices.flags.foundation_debt_delayed = true;
      state.choices.qualities.market_ties = 2;
      const event = EVENTS.find(e => e.id === 'foundation_debt_collector')!;
      const result = event.choices[1].effect(state);

      expect(result.state.choices.flags.foundation_debt_collector_seen).toBe(true);
      expect(result.state.choices.flags.foundation_debt_delayed_again).toBe(true);
      expect(result.state.choices.qualities.karmic_weight).toBe(2);
      expect(result.state.choices.qualities.market_ties).toBe(0);
    });

    it('should pay in herbs on "抵药还账" with enough herbs', () => {
      let state = createInitialState();
      state.currentLocationId = 'market';
      state.choices.flags.foundation_debt_delayed = true;
      state.choices.tags.market_debt = 'foundation_pill';
      state.resources.herbs = 10;
      const event = EVENTS.find(e => e.id === 'foundation_debt_collector')!;
      const result = event.choices[2].effect(state);

      expect(result.state.choices.flags.foundation_debt_collector_seen).toBe(true);
      expect(result.state.choices.flags.paid_debt_in_herbs).toBe(true);
      expect(result.state.resources.herbs).toBe(2);
      expect(result.state.choices.tags.market_debt).toBeUndefined();
      expect(result.state.choices.qualities.alchemy_affinity).toBe(1);
    });

    it('should fail gracefully on "抵药还账" without enough herbs', () => {
      let state = createInitialState();
      state.currentLocationId = 'market';
      state.choices.flags.foundation_debt_delayed = true;
      state.resources.herbs = 5;
      const event = EVENTS.find(e => e.id === 'foundation_debt_collector')!;
      const result = event.choices[2].effect(state);

      expect(result.state.choices.flags.foundation_debt_collector_seen).toBe(true);
      expect(result.log).toContain('药不够');
    });
  });
});

describe('Post-Foundation Actions', () => {
  function createFoundationStateWithMorning() {
    let state = createFoundationMorningState();
    state.choices.flags.foundation_morning_seen = true;
    state = checkUnlocks(state);
    return state;
  }

  describe('foundation_daily_practice', () => {
    it('should be available when realm is FoundationEstablishment and morning seen', () => {
      const state = createFoundationStateWithMorning();
      expect(state.unlockedActions).toContain('foundation_daily_practice');
      expect(getAvailableActionsAtLocation(state)).toContain('foundation_daily_practice');
    });

    it('should not be available before foundation_morning_seen', () => {
      const state = createFoundationMorningState();
      const unlockedState = checkUnlocks(state);
      expect(unlockedState.unlockedActions).not.toContain('foundation_daily_practice');
    });

    it('should grant qi and insight on perform', () => {
      const state = createFoundationStateWithMorning();
      state.resources.essence = 50;

      const result = performAction(state, 'foundation_daily_practice');

      expect(result.success).toBe(true);
      expect(result.state.resources.qi).toBe(state.resources.qi + 6);
      expect(result.state.resources.insight).toBe(state.resources.insight + 1);
      expect(result.log).toContain('筑基日课毕');
    });

    it('should fail when essence is insufficient', () => {
      const state = createFoundationStateWithMorning();
      state.resources.essence = 10;

      const result = performAction(state, 'foundation_daily_practice');

      expect(result.success).toBe(false);
    });

    it('should increase quiet_cultivation quality', () => {
      const state = createFoundationStateWithMorning();
      state.resources.essence = 50;

      const result = performAction(state, 'foundation_daily_practice');

      expect(result.success).toBe(true);
      expect(result.state.choices.qualities.quiet_cultivation).toBeGreaterThanOrEqual(0.2);
    });
  });

  describe('inner_gate_rumor', () => {
    it('should be available at outer_gate when realm is FoundationEstablishment', () => {
      let state = createFoundationStateWithMorning();
      state.currentLocationId = 'outer_gate';

      expect(state.unlockedActions).toContain('inner_gate_rumor');
      expect(getAvailableActionsAtLocation(state)).toContain('inner_gate_rumor');
    });

    it('should not be available when not at outer_gate', () => {
      let state = createFoundationStateWithMorning();
      state.currentLocationId = 'home';

      expect(getAvailableActionsAtLocation(state)).not.toContain('inner_gate_rumor');
    });

    it('should grant insight on perform', () => {
      let state = createFoundationStateWithMorning();
      state.currentLocationId = 'outer_gate';
      state.resources.essence = 20;

      const result = performAction(state, 'inner_gate_rumor');

      expect(result.success).toBe(true);
      expect(result.state.resources.insight).toBe(state.resources.insight + 3);
      expect(result.log).toContain('内门');
    });

    it('should increase sect_trace quality', () => {
      let state = createFoundationStateWithMorning();
      state.currentLocationId = 'outer_gate';
      state.resources.essence = 20;

      const result = performAction(state, 'inner_gate_rumor');

      expect(result.success).toBe(true);
      expect(result.state.choices.qualities.sect_trace).toBeGreaterThanOrEqual(0.2);
    });
  });

  describe('foundation_meditation', () => {
    it('should be available at home when realm is FoundationEstablishment', () => {
      const state = createFoundationStateWithMorning();

      expect(state.unlockedActions).toContain('foundation_meditation');
      expect(getAvailableActionsAtLocation(state)).toContain('foundation_meditation');
    });

    it('should not be available when not at home', () => {
      let state = createFoundationStateWithMorning();
      state.currentLocationId = 'outer_gate';

      expect(getAvailableActionsAtLocation(state)).not.toContain('foundation_meditation');
    });

    it('should grant qi and insight on perform', () => {
      const state = createFoundationStateWithMorning();
      state.resources.essence = 60;
      state.resources.herbs = 5;

      const result = performAction(state, 'foundation_meditation', () => 0.99);

      expect(result.success).toBe(true);
      expect(result.state.resources.qi).toBe(state.resources.qi + 12);
      expect(result.state.resources.insight).toBe(state.resources.insight + 2);
      expect(result.log).toContain('静修');
    });

    it('should have risk probability of 0.05', () => {
      expect(ACTIONS.foundation_meditation.riskProbability).toBe(0.05);
    });

    it('should fail when essence is insufficient', () => {
      const state = createFoundationStateWithMorning();
      state.resources.essence = 30;
      state.resources.herbs = 5;

      const result = performAction(state, 'foundation_meditation');

      expect(result.success).toBe(false);
    });

    it('should fail when herbs are insufficient', () => {
      const state = createFoundationStateWithMorning();
      state.resources.essence = 60;
      state.resources.herbs = 1;

      const result = performAction(state, 'foundation_meditation');

      expect(result.success).toBe(false);
    });

    it('should increase quiet_cultivation quality', () => {
      const state = createFoundationStateWithMorning();
      state.resources.essence = 60;
      state.resources.herbs = 5;

      const result = performAction(state, 'foundation_meditation', () => 0.99);

      expect(result.success).toBe(true);
      expect(result.state.choices.qualities.quiet_cultivation).toBeGreaterThanOrEqual(0.2);
    });
  });

  describe('FoundationEstablishment realm actions', () => {
    it('should not have QiCondensation-only actions available at FoundationEstablishment', () => {
      const state = createFoundationStateWithMorning();

      expect(getAvailableActionsAtLocation(state)).not.toContain('short_retreat');
    });

    it('should still have basic actions available', () => {
      const state = createFoundationStateWithMorning();

      expect(getAvailableActionsAtLocation(state)).toContain('kuzuo');
      expect(getAvailableActionsAtLocation(state)).toContain('tuna');
      expect(getAvailableActionsAtLocation(state)).toContain('tiaoxi');
    });
  });
});

describe('Breakthrough Summary for FoundationEstablishment', () => {
  it('should return summary when realm is FoundationEstablishment', () => {
    let state = createInitialState(20260512);
    state.realm = Realm.FoundationEstablishment;
    state.realmLayer = 1;
    state.currentLocationId = 'home';
    state.resources.essence = 100;
    state.choices.flags.reached_foundation = true;
    state.breakthrough.lastTargetId = 'foundation';
    state.breakthrough.successes.foundation = 1;
    state.breakthrough.preparation.foundation = 3;
    state.breakthrough.attempts.foundation = 2;

    const summary = getBreakthroughSummary(state);
    // Should not return empty - FoundationEstablishment should show the foundation breakthrough info
    expect(summary.length).toBeGreaterThan(0);
  });

  it('should return empty for non-QiCondensation and non-FoundationEstablishment realms', () => {
    let state = createInitialState();
    state.realm = Realm.Mortal;
    const summary = getBreakthroughSummary(state);
    expect(summary).toEqual([]);
  });
});
