import { describe, expect, it } from 'vitest';
import { BREAKTHROUGH_RULES } from '../src/content/breakthroughs';
import { performAction } from '../src/game/actions';
import { getBreakthroughSuccessChance, getBreakthroughSummary } from '../src/game/breakthrough';
import { getAvailableActionsAtLocation } from '../src/game/location';
import { createInitialState } from '../src/game/state';
import { Realm } from '../src/game/types';
import { checkUnlocks } from '../src/game/unlock';

function createReadyQiState() {
  let state = createInitialState(20260507);
  state.realm = Realm.QiCondensation;
  state.realmLayer = 1;
  state.currentLocationId = 'home';
  state.resources.essence = 100;
  state.resources.qi = 80;
  state.resources.insight = 10;
  state.choices.qualities.quiet_cultivation = 4;
  state = checkUnlocks(state);
  return state;
}

function createReadyFoundationState() {
  let state = createInitialState(20260508);
  state.realm = Realm.QiCondensation;
  state.realmLayer = 9;
  state.currentLocationId = 'home';
  state.resources.essence = 250;
  state.resources.qi = 200;
  state.resources.insight = 30;
  state.resources.coins = 30;
  state.choices.flags.reached_qi_layer_2 = true;
  state.choices.flags.reached_qi_layer_3 = true;
  state.choices.flags.reached_qi_layer_4 = true;
  state.choices.flags.reached_qi_layer_5 = true;
  state.choices.flags.reached_qi_layer_6 = true;
  state.choices.flags.reached_qi_layer_7 = true;
  state.choices.flags.reached_qi_layer_8 = true;
  state.choices.flags.reached_qi_layer_9 = true;
  state.choices.qualities.quiet_cultivation = 8;
  state.choices.qualities.sect_trace = 4;
  state = checkUnlocks(state);
  return state;
}

describe('Breakthrough system', () => {
  it('should prepare the next qi bottleneck before breakthrough', () => {
    let state = createReadyQiState();

    expect(getAvailableActionsAtLocation(state)).toContain('stabilize_bottleneck');

    const result = performAction(state, 'stabilize_bottleneck');
    expect(result.success).toBe(true);
    state = checkUnlocks(result.state);

    expect(state.breakthrough.preparation.qi_layer_2).toBe(1);
    expect(state.choices.flags.prepared_qi_layer_2).toBe(true);
    expect(state.unlockedActions).toContain('breakthrough_qi_2');
    expect(getBreakthroughSummary(state).join(' / ')).toContain('炼气二层');
  });

  it('should advance to qi layer two on success', () => {
    let state = createReadyQiState();
    state = checkUnlocks(performAction(state, 'stabilize_bottleneck').state);
    state.resources.essence = 100;

    const result = performAction(state, 'breakthrough_qi_2', () => 0);

    expect(result.success).toBe(true);
    expect(result.state.realm).toBe(Realm.QiCondensation);
    expect(result.state.realmLayer).toBe(2);
    expect(result.state.choices.flags.reached_qi_layer_2).toBe(true);
    expect(result.state.breakthrough.successes.qi_layer_2).toBe(1);
  });

  it('should record partial breakthrough without adding wounds', () => {
    let state = createReadyQiState();
    state = checkUnlocks(performAction(state, 'stabilize_bottleneck').state);
    state.resources.essence = 100;
    const chance = getBreakthroughSuccessChance(state, BREAKTHROUGH_RULES.qi_layer_2);

    const result = performAction(state, 'breakthrough_qi_2', () => chance + 0.03);

    expect(result.state.realmLayer).toBe(1);
    expect(result.state.choices.flags.half_broke_qi_layer_2).toBe(true);
    expect(result.state.breakthrough.preparation.qi_layer_2).toBe(2);
    expect(result.state.resources.wounds).toBe(0);
  });

  it('should leave wounds and lifespan loss on failed breakthrough', () => {
    let state = createReadyQiState();
    state = checkUnlocks(performAction(state, 'stabilize_bottleneck').state);
    state.resources.essence = 100;
    const beforeLifespan = state.resources.lifespan;

    const result = performAction(state, 'breakthrough_qi_2', () => 1);

    expect(result.state.realmLayer).toBe(1);
    expect(result.state.choices.flags.failed_qi_layer_2).toBe(true);
    expect(result.state.breakthrough.failures.qi_layer_2).toBe(1);
    expect(result.state.resources.wounds).toBe(1);
    expect(result.state.resources.lifespan).toBe(beforeLifespan - 20 - 60);
  });

  it('should make dantoxin and wounds reduce breakthrough chance', () => {
    const cleanState = createReadyQiState();
    const toxicState = createReadyQiState();
    toxicState.resources.dantoxin = 30;
    toxicState.resources.wounds = 2;

    const cleanChance = getBreakthroughSuccessChance(cleanState, BREAKTHROUGH_RULES.qi_layer_2);
    const toxicChance = getBreakthroughSuccessChance(toxicState, BREAKTHROUGH_RULES.qi_layer_2);

    expect(toxicChance).toBeLessThan(cleanChance);
  });

  it('should let stabilizing powder raise breakthrough chance', () => {
    const cleanState = createReadyQiState();
    const guardedState = createReadyQiState();
    guardedState.choices.flags.guarded_breakthrough = true;

    const cleanChance = getBreakthroughSuccessChance(cleanState, BREAKTHROUGH_RULES.qi_layer_2);
    const guardedChance = getBreakthroughSuccessChance(guardedState, BREAKTHROUGH_RULES.qi_layer_2);

    expect(guardedChance).toBeGreaterThan(cleanChance);
  });

  it('should consume stabilizing powder guard and reduce failed breakthrough wounds', () => {
    let state = createReadyQiState();
    state = checkUnlocks(performAction(state, 'stabilize_bottleneck').state);
    state.resources.essence = 100;
    state.resources.dantoxin = 30;
    state.choices.flags.guarded_breakthrough = true;

    const result = performAction(state, 'breakthrough_qi_2', () => 0.99);

    expect(result.state.resources.wounds).toBe(1);
    expect(result.state.choices.flags.guarded_breakthrough).toBe(false);
    expect(result.state.breakthrough.failures.qi_layer_2).toBe(1);
  });

  it('should prepare layer three after reaching qi layer two', () => {
    let state = createReadyQiState();
    state = checkUnlocks(performAction(state, 'stabilize_bottleneck').state);
    state.resources.essence = 100;
    state = checkUnlocks(performAction(state, 'breakthrough_qi_2', () => 0).state);
    state.resources.essence = 100;
    state.resources.qi = 80;
    state.resources.insight = 10;

    state = checkUnlocks(performAction(state, 'stabilize_bottleneck').state);

    expect(state.breakthrough.preparation.qi_layer_3).toBe(1);
    expect(state.choices.flags.prepared_qi_layer_3).toBe(true);
    expect(state.unlockedActions).toContain('breakthrough_qi_3');
  });

  it('should expose the qi layer 4 bottleneck after reaching qi layer three', () => {
    let state = createReadyQiState();
    state = checkUnlocks(performAction(state, 'stabilize_bottleneck').state);
    state.resources.essence = 100;
    state = checkUnlocks(performAction(state, 'breakthrough_qi_2', () => 0).state);
    state.resources.essence = 100;
    state.resources.qi = 100;
    state.resources.insight = 10;
    state = checkUnlocks(performAction(state, 'stabilize_bottleneck').state);
    state.resources.essence = 100;
    state = checkUnlocks(performAction(state, 'breakthrough_qi_3', () => 0).state);

    expect(state.realmLayer).toBe(3);
    expect(getAvailableActionsAtLocation(state)).toContain('stabilize_bottleneck');
    expect(getBreakthroughSummary(state).join(' / ')).toContain('炼气四层');
  });

  it('should prepare and unlock foundation breakthrough', () => {
    let state = createReadyFoundationState();

    expect(getAvailableActionsAtLocation(state)).toContain('stabilize_bottleneck');

    const result = performAction(state, 'stabilize_bottleneck');
    expect(result.success).toBe(true);
    state = checkUnlocks(result.state);

    expect(state.breakthrough.preparation.foundation).toBe(1);
    expect(state.choices.flags.bottleneck_foundation).toBe(true);
    expect(state.choices.flags.prepared_foundation).toBe(true);
    expect(state.unlockedActions).toContain('breakthrough_foundation');
    expect(state.unlockedActions).toContain('withdraw_foundation');
    expect(getAvailableActionsAtLocation(state)).toContain('breakthrough_foundation');
    expect(getAvailableActionsAtLocation(state)).toContain('withdraw_foundation');
  });

  it('should withdraw from foundation and keep a reduced prepared bottleneck', () => {
    let state = createReadyFoundationState();
    state = checkUnlocks(performAction(state, 'stabilize_bottleneck').state);
    state.resources.essence = 250;
    state.resources.qi = 200;
    state.resources.dantoxin = 8;
    state.resources.wounds = 1;
    state.choices.flags.foundation_guardian = true;
    state.choices.flags.borrowed_foundation_aid = true;
    state.choices.qualities.reckless_breakthrough = 2;

    const result = performAction(state, 'withdraw_foundation');

    expect(result.success).toBe(true);
    expect(result.log).toContain('筑基关口');
    expect(result.state.breakthrough.preparation.foundation).toBe(1);
    expect(result.state.choices.flags.withdrew_foundation).toBe(true);
    expect(result.state.choices.tags.foundation_pause).toBe('withdrew');
    expect(result.state.choices.flags.foundation_guardian).toBe(false);
    expect(result.state.choices.flags.borrowed_foundation_aid).toBe(false);
    expect(result.state.resources.dantoxin).toBe(5);
    expect(result.state.resources.wounds).toBe(0);
    expect(result.state.choices.qualities.reckless_breakthrough).toBe(1);
  });

  it('should make guardian and borrowed aid improve foundation odds', () => {
    const plainState = createReadyFoundationState();
    const supportedState = createReadyFoundationState();
    supportedState.choices.flags.foundation_guardian = true;
    supportedState.choices.flags.borrowed_foundation_aid = true;

    const plainChance = getBreakthroughSuccessChance(plainState, BREAKTHROUGH_RULES.foundation);
    const supportedChance = getBreakthroughSuccessChance(supportedState, BREAKTHROUGH_RULES.foundation);

    expect(supportedChance).toBeGreaterThan(plainChance);
  });

  it('should record guardian support as a sect ledger choice', () => {
    let state = createReadyFoundationState();
    state.choices.flags.bottleneck_foundation = true;
    state.choices.flags.completed_sect_errand = true;
    state.currentLocationId = 'outer_gate';
    state = checkUnlocks(state);

    expect(getAvailableActionsAtLocation(state)).toContain('seek_foundation_guardian');

    const result = performAction(state, 'seek_foundation_guardian');

    expect(result.success).toBe(true);
    expect(result.log).toContain('护法');
    expect(result.state.choices.flags.foundation_guardian).toBe(true);
    expect(result.state.choices.flags.foundation_guardian_account_open).toBe(true);
    expect(result.state.choices.tags.sect_trace).toBe('guardian');
    expect(result.state.choices.qualities.sect_trace).toBeGreaterThan(state.choices.qualities.sect_trace);
    expect(getAvailableActionsAtLocation(result.state)).not.toContain('seek_foundation_guardian');
  });

  it('should record borrowed foundation aid with dantoxin and market debt', () => {
    let state = createReadyFoundationState();
    state.choices.flags.bottleneck_foundation = true;
    state.choices.flags.known_recipe_small_qi_pill = true;
    state.currentLocationId = 'market';
    state = checkUnlocks(state);

    expect(getAvailableActionsAtLocation(state)).toContain('borrow_foundation_pill');

    const result = performAction(state, 'borrow_foundation_pill');

    expect(result.success).toBe(true);
    expect(result.log).toContain('借你一枚筑基用丹');
    expect(result.state.choices.flags.borrowed_foundation_aid).toBe(true);
    expect(result.state.choices.flags.foundation_pill_debt_open).toBe(true);
    expect(result.state.choices.tags.market_debt).toBe('foundation_pill');
    expect(result.state.resources.dantoxin).toBe(state.resources.dantoxin + 12);
    expect(getAvailableActionsAtLocation(result.state)).not.toContain('borrow_foundation_pill');
  });

  it('should enter foundation establishment on a successful foundation breakthrough', () => {
    let state = createReadyFoundationState();
    state = checkUnlocks(performAction(state, 'stabilize_bottleneck').state);
    state.resources.essence = 250;
    state.resources.qi = 200;
    state.resources.insight = 30;
    state.choices.flags.foundation_guardian = true;
    state.choices.flags.borrowed_foundation_aid = true;

    const result = performAction(state, 'breakthrough_foundation', () => 0);

    expect(result.success).toBe(true);
    expect(result.state.realm).toBe(Realm.FoundationEstablishment);
    expect(result.state.realmLayer).toBe(1);
    expect(result.state.choices.flags.reached_foundation).toBe(true);
    expect(result.state.breakthrough.successes.foundation).toBe(1);
    expect(result.state.choices.flags.foundation_guardian).toBe(false);
    expect(result.state.choices.flags.borrowed_foundation_aid).toBe(false);
  });

  it('should leave a foundation scar and larger lifespan loss on failed foundation breakthrough', () => {
    let state = createReadyFoundationState();
    state = checkUnlocks(performAction(state, 'stabilize_bottleneck').state);
    state.resources.essence = 250;
    state.resources.qi = 200;
    state.resources.insight = 30;
    state.choices.flags.foundation_guardian = true;
    state.choices.flags.borrowed_foundation_aid = true;
    const beforeLifespan = state.resources.lifespan;

    const result = performAction(state, 'breakthrough_foundation', () => 1);

    expect(result.success).toBe(true);
    expect(result.state.realm).toBe(Realm.QiCondensation);
    expect(result.state.realmLayer).toBe(9);
    expect(result.state.choices.flags.failed_foundation).toBe(true);
    expect(result.state.choices.flags.foundation_scar).toBe(true);
    expect(result.state.breakthrough.failures.foundation).toBe(1);
    expect(result.state.resources.wounds).toBe(2);
    expect(result.state.resources.lifespan).toBe(beforeLifespan - 180 - 120);
    expect(result.state.choices.flags.foundation_guardian).toBe(false);
    expect(result.state.choices.flags.borrowed_foundation_aid).toBe(false);
  });
});
