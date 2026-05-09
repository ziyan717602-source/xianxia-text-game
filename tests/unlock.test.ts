import { describe, it, expect } from 'vitest';
import { createInitialState } from '../src/game/state';
import { checkUnlocks } from '../src/game/unlock';
import { performAction } from '../src/game/actions';
import { Realm } from '../src/game/types';

describe('Unlock System', () => {
  it('should unlock tuna when qi >= 10', () => {
    let state = createInitialState();
    state.resources.qi = 10;

    const nextState = checkUnlocks(state);
    expect(nextState.unlockedActions).toContain('tuna');
    expect(nextState.unlockedActions).toContain('tiaoxi');
    expect(nextState.choices.flags['unlocked_tuna']).toBe(true);
  });

  it('should not unlock if conditions are not met', () => {
    const state = createInitialState(123);
    state.resources.qi = 0; // less than 1
    state.resources.herbs = 2; // less than 5

    const nextState = checkUnlocks(state);
    expect(nextState.unlockedActions).not.toContain('tuna');
  });

  it('should unlock rike_tuna after tuna is performed 10 times', () => {
    let state = createInitialState();
    // simulate tuna 10 times
    for (let i = 0; i < 10; i++) {
      // Need enough essence to perform
      state.resources.essence = 100;
      state = performAction(state, 'tuna').state;
    }

    expect(state.choices.qualities['action_tuna_count']).toBe(10);
    
    state = checkUnlocks(state);
    expect(state.choices.flags['unlocked_rike_tuna']).toBe(true);
    expect(state.unlockedActions).toContain('rike_tuna');
  });

  it('should unlock yinqi only after rike_tuna has been unlocked', () => {
    let state = createInitialState();
    state.resources.qi = 15;
    state.resources.insight = 3;

    state = checkUnlocks(state);
    expect(state.unlockedActions).not.toContain('yinqi');

    state.choices.flags.unlocked_rike_tuna = true;
    state = checkUnlocks(state);

    expect(state.unlockedActions).toContain('yinqi');
    expect(state.choices.flags['unlocked_yinqi']).toBe(true);
  });

  it('should unlock short retreat after repeated daily practice', () => {
    let state = createInitialState();
    state.realm = Realm.QiCondensation;
    state.realmLayer = 1;
    state.resources.qi = 22;
    state.choices.qualities.action_rike_tuna_count = 3;

    state = checkUnlocks(state);

    expect(state.unlockedActions).toContain('short_retreat');
    expect(state.choices.flags.unlocked_short_retreat).toBe(true);
  });

  it('should unlock mountain actions after the jade slip is found', () => {
    let state = createInitialState();
    state.choices.flags.found_jade_slip = true;

    state = checkUnlocks(state);
    expect(state.unlockedActions).toContain('caiyao');
    expect(state.unlockedActions).toContain('xunshan');
    expect(state.choices.flags.unlocked_mountain_actions).toBe(true);
  });

  it('should unlock root inspection after entering qi condensation', () => {
    let state = createInitialState();
    state.realm = Realm.QiCondensation;
    state.realmLayer = 1;

    state = checkUnlocks(state);

    expect(state.unlockedActions).toContain('inspect_root');
    expect(state.choices.flags.unlocked_inspect_root).toBe(true);
  });

  it('should unlock technique attunement after root is known', () => {
    let state = createInitialState();
    state.realm = Realm.QiCondensation;
    state.realmLayer = 1;
    state.choices.flags.root_known = true;

    state = checkUnlocks(state);

    expect(state.unlockedActions).toContain('attune_technique');
    expect(state.choices.flags.unlocked_attune_technique).toBe(true);
  });

  it('should unlock formula study, brewing, and pill taking in sequence', () => {
    let state = createInitialState();
    state.realm = Realm.QiCondensation;
    state.realmLayer = 1;
    state.choices.qualities.action_bianyao_count = 2;

    state = checkUnlocks(state);
    expect(state.unlockedActions).toContain('study_qi_formula');

    state.choices.flags.known_recipe_small_qi_pill = true;
    state = checkUnlocks(state);
    expect(state.unlockedActions).toContain('brew_qi_pill');

    state.resources.qiPills = 1;
    state = checkUnlocks(state);
    expect(state.unlockedActions).toContain('take_qi_pill');
    expect(state.choices.flags.has_qi_pill).toBe(true);
  });

  it('should unlock steady formula after a bottleneck and then powder use', () => {
    let state = createInitialState();
    state.realm = Realm.QiCondensation;
    state.realmLayer = 1;
    state.choices.flags.known_recipe_small_qi_pill = true;
    state.choices.flags.bottleneck_qi_layer_2 = true;

    state = checkUnlocks(state);
    expect(state.unlockedActions).toContain('study_steady_formula');

    state.choices.flags.known_recipe_stabilizing_powder = true;
    state = checkUnlocks(state);
    expect(state.unlockedActions).toContain('brew_stabilizing_powder');

    state.resources.stabilizingPowders = 1;
    state = checkUnlocks(state);
    expect(state.unlockedActions).toContain('take_stabilizing_powder');
    expect(state.choices.flags.has_stabilizing_powder).toBe(true);
  });

  it('should unlock cleansing formula after dantoxin becomes heavy', () => {
    let state = createInitialState();
    state.realm = Realm.QiCondensation;
    state.realmLayer = 1;
    state.choices.flags.known_recipe_small_qi_pill = true;
    state.resources.dantoxin = 30;

    state = checkUnlocks(state);
    expect(state.unlockedActions).toContain('study_cleansing_formula');

    state.choices.flags.known_recipe_cleansing_pill = true;
    state = checkUnlocks(state);
    expect(state.unlockedActions).toContain('brew_cleansing_pill');

    state.resources.cleansingPills = 1;
    state = checkUnlocks(state);
    expect(state.unlockedActions).toContain('take_cleansing_pill');
    expect(state.choices.flags.has_cleansing_pill).toBe(true);
  });

  it('should unlock sect errands and later outer gate supply', () => {
    let state = createInitialState();
    state.realm = Realm.QiCondensation;
    state.realmLayer = 1;
    state.choices.flags.heard_outer_gate_rules = true;
    state.choices.flags.accepted_outer_gate_errand = true;
    state.choices.qualities.sect_trace = 2;

    state = checkUnlocks(state);
    expect(state.unlockedActions).toContain('sect_errand');

    state.choices.flags.completed_sect_errand = true;
    state.choices.qualities.sect_trace = 4;
    state = checkUnlocks(state);

    expect(state.unlockedActions).toContain('sect_supply');
    expect(state.choices.flags.unlocked_sect_supply).toBe(true);
  });

  it('should unlock outer gate roll call and patrol from the registry', () => {
    let state = createInitialState();
    state.realm = Realm.QiCondensation;
    state.realmLayer = 1;
    state.choices.flags.outer_gate_registered = true;

    state = checkUnlocks(state);
    expect(state.unlockedActions).toContain('sect_roll_call');
    expect(state.choices.flags.unlocked_sect_roll_call).toBe(true);

    state.choices.flags.attended_outer_gate_roll_call = true;
    state.choices.qualities.sect_trace = 3;
    state = checkUnlocks(state);

    expect(state.unlockedActions).toContain('sect_patrol');
    expect(state.choices.flags.unlocked_sect_patrol).toBe(true);
  });

  it('should unlock bottleneck preparation and qi breakthrough actions in sequence', () => {
    let state = createInitialState();
    state.realm = Realm.QiCondensation;
    state.realmLayer = 1;
    state.resources.qi = 30;
    state.resources.insight = 4;

    state = checkUnlocks(state);
    expect(state.unlockedActions).toContain('stabilize_bottleneck');

    state.choices.flags.prepared_qi_layer_2 = true;
    state = checkUnlocks(state);
    expect(state.unlockedActions).toContain('breakthrough_qi_2');

    state.realmLayer = 2;
    state.choices.flags.prepared_qi_layer_3 = true;
    state = checkUnlocks(state);
    expect(state.unlockedActions).toContain('breakthrough_qi_3');
  });

  it('should unlock foundation support and foundation breakthrough at qi layer nine', () => {
    let state = createInitialState(20260508);
    state.realm = Realm.QiCondensation;
    state.realmLayer = 9;
    state.resources.qi = 80;
    state.resources.insight = 10;
    state.choices.flags.bottleneck_foundation = true;
    state.choices.flags.completed_sect_errand = true;
    state.choices.qualities.market_ties = 2;

    state = checkUnlocks(state);
    expect(state.unlockedActions).toContain('stabilize_bottleneck');
    expect(state.unlockedActions).toContain('seek_foundation_guardian');
    expect(state.unlockedActions).toContain('borrow_foundation_pill');

    state.choices.flags.prepared_foundation = true;
    state = checkUnlocks(state);
    expect(state.unlockedActions).toContain('breakthrough_foundation');
    expect(state.unlockedActions).toContain('withdraw_foundation');
    expect(state.choices.flags.unlocked_breakthrough_foundation).toBe(true);
    expect(state.choices.flags.unlocked_withdraw_foundation).toBe(true);
  });

  // --- New unlock tests ---

  it('should unlock bianyao when herbs >= 5', () => {
    let state = createInitialState();
    state.resources.herbs = 5;

    state = checkUnlocks(state);
    expect(state.unlockedActions).toContain('bianyao');
    expect(state.choices.flags.unlocked_bianyao).toBe(true);
  });

  it('should not unlock bianyao when herbs < 5', () => {
    const state = createInitialState();
    state.resources.herbs = 4;
    const nextState = checkUnlocks(state);
    expect(nextState.unlockedActions).not.toContain('bianyao');
  });

  it('should unlock canjuan when insight >= 3', () => {
    let state = createInitialState();
    state.resources.insight = 3;

    state = checkUnlocks(state);
    expect(state.choices.flags.unlocked_canjuan).toBe(true);
  });

  it('should not unlock canjuan when insight < 3', () => {
    const state = createInitialState();
    state.resources.insight = 2;
    const nextState = checkUnlocks(state);
    expect(nextState.choices.flags.unlocked_canjuan).toBeFalsy();
  });

  it('should unlock study_warm_furnace_formula in QiCondensation with known small qi pill', () => {
    let state = createInitialState();
    state.realm = Realm.QiCondensation;
    state.realmLayer = 1;
    state.choices.flags.known_recipe_small_qi_pill = true;

    state = checkUnlocks(state);
    expect(state.unlockedActions).toContain('study_warm_furnace_formula');
  });

  it('should unlock study_night_sitting_formula after foundation daily practice', () => {
    let state = createInitialState();
    state.realm = Realm.FoundationEstablishment;
    state.realmLayer = 1;
    state.choices.flags.completed_foundation_daily_practice = true;

    state = checkUnlocks(state);
    expect(state.unlockedActions).toContain('study_night_sitting_formula');
  });

  it('should unlock establish_dwelling at Foundation realm', () => {
    let state = createInitialState();
    state.realm = Realm.FoundationEstablishment;
    state.realmLayer = 1;

    state = checkUnlocks(state);
    expect(state.unlockedActions).toContain('establish_dwelling');
    expect(state.choices.flags.unlocked_establish_dwelling).toBe(true);
  });

  it('should unlock cave_dwelling_location when dwelling.level >= 1', () => {
    let state = createInitialState();
    state.dwelling.level = 1;

    state = checkUnlocks(state);
    expect(state.choices.flags.unlocked_cave_dwelling).toBe(true);
  });

  it('should unlock market_stall at Foundation realm', () => {
    let state = createInitialState();
    state.realm = Realm.FoundationEstablishment;
    state.realmLayer = 1;

    state = checkUnlocks(state);
    expect(state.unlockedActions).toContain('open_market_stall');
    expect(state.unlockedActions).toContain('buy_rare_herbs');
    expect(state.choices.flags.unlocked_market_stall).toBe(true);
  });

  it('should unlock recruit_servant when dwelling.level >= 1', () => {
    let state = createInitialState();
    state.dwelling.level = 1;

    state = checkUnlocks(state);
    expect(state.unlockedActions).toContain('recruit_servant');
    expect(state.choices.flags.unlocked_recruit_servant).toBe(true);
  });

  it('should unlock explore_secret_realm when discoveredRealms is non-empty and at home', () => {
    let state = createInitialState();
    state.secretRealm.discoveredRealms = ['misty_cave'];
    state.currentLocationId = 'home';

    state = checkUnlocks(state);
    expect(state.unlockedActions).toContain('explore_secret_realm');
    expect(state.choices.flags.unlocked_explore_secret_realm).toBe(true);
  });

  it('should not unlock explore_secret_realm when not at home', () => {
    let state = createInitialState();
    state.secretRealm.discoveredRealms = ['misty_cave'];
    state.currentLocationId = 'market';

    state = checkUnlocks(state);
    expect(state.unlockedActions).not.toContain('explore_secret_realm');
  });

  it('should unlock golden_core_practice at GoldenCore realm', () => {
    let state = createInitialState();
    state.realm = Realm.GoldenCore;
    state.realmLayer = 1;

    state = checkUnlocks(state);
    expect(state.unlockedActions).toContain('golden_core_practice');
    expect(state.choices.flags.unlocked_golden_core_practice).toBe(true);
  });

  it('should unlock nascent_soul_practice at NascentSoul realm', () => {
    let state = createInitialState();
    state.realm = Realm.NascentSoul;
    state.realmLayer = 1;

    state = checkUnlocks(state);
    expect(state.unlockedActions).toContain('nascent_soul_practice');
    expect(state.choices.flags.unlocked_nascent_soul_practice).toBe(true);
  });

  it('should unlock breakthrough_golden_core at Foundation layer 3 with prepared flag', () => {
    let state = createInitialState();
    state.realm = Realm.FoundationEstablishment;
    state.realmLayer = 3;
    state.choices.flags.prepared_golden_core = true;

    state = checkUnlocks(state);
    expect(state.unlockedActions).toContain('breakthrough_golden_core');
    expect(state.choices.flags.unlocked_breakthrough_golden_core).toBe(true);
  });

  it('should not unlock breakthrough_golden_core without prepared flag', () => {
    let state = createInitialState();
    state.realm = Realm.FoundationEstablishment;
    state.realmLayer = 3;

    state = checkUnlocks(state);
    expect(state.unlockedActions).not.toContain('breakthrough_golden_core');
  });

  it('should unlock inner_gate_location at inner sect rank', () => {
    let state = createInitialState();
    state.sect.rank = 'inner';

    state = checkUnlocks(state);
    expect(state.choices.flags.unlocked_inner_gate).toBe(true);
  });

  it('should unlock inner_gate_location at core sect rank', () => {
    let state = createInitialState();
    state.sect.rank = 'core';

    state = checkUnlocks(state);
    expect(state.choices.flags.unlocked_inner_gate).toBe(true);
  });

  it('should unlock sect_actions at inner rank', () => {
    let state = createInitialState();
    state.sect.rank = 'inner';

    state = checkUnlocks(state);
    expect(state.unlockedActions).toContain('inner_gate_task');
    expect(state.unlockedActions).toContain('attend_sect_ceremony');
    expect(state.choices.flags.unlocked_sect_actions).toBe(true);
  });

  it('should unlock upgrade_dwelling when dwelling_level_1 flag is set', () => {
    let state = createInitialState();
    state.choices.flags.dwelling_level_1 = true;

    state = checkUnlocks(state);
    expect(state.unlockedActions).toContain('upgrade_dwelling');
    expect(state.choices.flags.unlocked_upgrade_dwelling).toBe(true);
  });

  it('should unlock install_formation when dwelling_level_2 flag is set', () => {
    let state = createInitialState();
    state.choices.flags.dwelling_level_2 = true;

    state = checkUnlocks(state);
    expect(state.unlockedActions).toContain('install_formation');
    expect(state.choices.flags.unlocked_install_formation).toBe(true);
  });

  it('should unlock foundation_meditation at Foundation realm', () => {
    let state = createInitialState();
    state.realm = Realm.FoundationEstablishment;
    state.realmLayer = 1;

    state = checkUnlocks(state);
    expect(state.unlockedActions).toContain('foundation_meditation');
    expect(state.choices.flags.unlocked_foundation_meditation).toBe(true);
  });

  it('should unlock inner_gate_rumor at Foundation realm', () => {
    let state = createInitialState();
    state.realm = Realm.FoundationEstablishment;
    state.realmLayer = 1;

    state = checkUnlocks(state);
    expect(state.unlockedActions).toContain('inner_gate_rumor');
    expect(state.choices.flags.unlocked_inner_gate_rumor).toBe(true);
  });

  it('should unlock study_meridian_cleansing_formula at Foundation with high dantoxin', () => {
    let state = createInitialState();
    state.realm = Realm.FoundationEstablishment;
    state.realmLayer = 1;
    state.resources.dantoxin = 30;

    state = checkUnlocks(state);
    expect(state.unlockedActions).toContain('study_meridian_cleansing_formula');
  });

  it('should unlock study_foundation_strengthening_formula at Foundation realm', () => {
    let state = createInitialState();
    state.realm = Realm.FoundationEstablishment;
    state.realmLayer = 1;

    state = checkUnlocks(state);
    expect(state.unlockedActions).toContain('study_foundation_strengthening_formula');
  });
});
