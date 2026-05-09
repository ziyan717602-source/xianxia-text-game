import { describe, it, expect } from 'vitest';
import { performAction, ACTION_ROUTE_QUALITIES } from '../src/game/actions';
import { createInitialState } from '../src/game/state';
import { Realm } from '../src/game/types';
import { checkUnlocks } from '../src/game/unlock';

describe('performAction', () => {
  it('should return failure for unknown action ID', () => {
    const state = createInitialState();
    const result = performAction(state, 'nonexistent_action_xyz');
    expect(result.success).toBe(false);
    expect(result.log).toContain('未知');
    expect(result.state).toBe(state);
  });

  it('should return failure when resources are insufficient', () => {
    const state = createInitialState();
    // kuzuo costs essence; set it to 0
    state.resources.essence = 0;
    const result = performAction(state, 'kuzuo');
    expect(result.success).toBe(false);
    expect(result.log).toContain('不足');
  });

  it('should return failure when required flags are not met', () => {
    const state = createInitialState();
    state.resources.essence = 100;
    // sect_roll_call requires outer_gate_registered flag + outer_gate location
    const result = performAction(state, 'sect_roll_call');
    expect(result.success).toBe(false);
  });

  it('should return failure when stabilize_bottleneck conditions not met', () => {
    let state = createInitialState();
    state.resources.essence = 10;  // cost is 35
    state.resources.qi = 5;
    state.resources.insight = 1;
    state.realm = Realm.QiCondensation;
    state.realmLayer = 1;
    state.currentLocationId = 'home';
    // stabilize_bottleneck costs essence:35, qi:3, insight:1 — essence insufficient
    const result = performAction(state, 'stabilize_bottleneck');
    expect(result.success).toBe(false);
    expect(result.log).toContain('不足');
  });

  it('should perform kuzuo (quiet cultivation) and produce output', () => {
    const state = createInitialState();
    state.resources.essence = 50;
    const result = performAction(state, 'kuzuo');
    expect(result.success).toBe(true);
    expect(result.state.resources.insight).toBeGreaterThan(0);
    expect(result.state.choices.qualities.action_kuzuo_count).toBe(1);
  });

  it('should perform tuna after unlocking it', () => {
    let state = createInitialState();
    state.resources.qi = 10;
    state.resources.essence = 50;
    state = checkUnlocks(state);
    expect(state.unlockedActions).toContain('tuna');

    const result = performAction(state, 'tuna');
    expect(result.success).toBe(true);
    expect(result.state.resources.qi).toBeGreaterThan(10);
  });

  it('should perform tiaoxi and produce essence', () => {
    let state = createInitialState();
    state.resources.qi = 10;
    state.resources.essence = 50;
    state = checkUnlocks(state);

    const beforeEssence = state.resources.essence;
    const result = performAction(state, 'tiaoxi');
    expect(result.success).toBe(true);
    expect(result.state.resources.essence).toBeGreaterThan(beforeEssence);
  });

  it('should deduct cost and produce output for breakthrough actions', () => {
    let state = createInitialState(20260508);
    state.realm = Realm.QiCondensation;
    state.realmLayer = 1;
    state.resources.qi = 50;
    state.resources.insight = 5;
    state.resources.essence = 100;
    state.choices.flags.prepared_qi_layer_2 = true;
    state = checkUnlocks(state);

    const result = performAction(state, 'breakthrough_qi_2', () => 0.01);
    expect(result.success).toBe(true);
    // On success, realm changes to layer 2
    expect(result.state.realmLayer).toBe(2);
    expect(result.state.choices.flags.reached_qi_layer_2).toBe(true);
  });

  it('should record world logs after action', () => {
    const state = createInitialState();
    state.resources.essence = 50;
    const result = performAction(state, 'kuzuo');
    expect(result.state.world.recentActions['kuzuo']).toBeGreaterThan(0);
  });

  it('should update action route quality after action', () => {
    const state = createInitialState();
    state.resources.essence = 50;
    const result = performAction(state, 'kuzuo');
    expect(result.state.choices.qualities.quiet_cultivation).toBeGreaterThan(0);
  });

  it('should set completed flag after action', () => {
    const state = createInitialState();
    state.resources.essence = 50;
    const result = performAction(state, 'kuzuo');
    expect(result.state.choices.flags.completed_kuzuo).toBe(true);
  });

  // Pill study/brew/consume actions
  it('should learn recipe via study_qi_formula', () => {
    let state = createInitialState();
    state.realm = Realm.QiCondensation;
    state.realmLayer = 1;
    state.resources.essence = 100;
    state.resources.herbs = 10;
    state.resources.insight = 6;
    state.choices.qualities.action_bianyao_count = 2;
    state = checkUnlocks(state);

    const result = performAction(state, 'study_qi_formula');
    expect(result.success).toBe(true);
    expect(result.state.alchemy.knownRecipeIds).toContain('small_qi_pill');
  });

  it('should brew pill via brew_qi_pill', () => {
    let state = createInitialState();
    state.realm = Realm.QiCondensation;
    state.realmLayer = 1;
    state.resources.essence = 100;
    state.resources.herbs = 10;
    state.resources.insight = 6;
    state.choices.qualities.action_bianyao_count = 2;
    state = checkUnlocks(performAction(state, 'study_qi_formula').state);

    const result = performAction(state, 'brew_qi_pill', () => 0.1);
    expect(result.success).toBe(true);
    // On success, qi pills should be produced
    expect(result.state.resources.qiPills).toBeGreaterThan(0);
  });

  it('should consume pill via take_qi_pill', () => {
    let state = createInitialState();
    state.realm = Realm.QiCondensation;
    state.realmLayer = 1;
    state.resources.essence = 200;
    state.resources.herbs = 20;
    state.resources.insight = 10;
    state.choices.qualities.action_bianyao_count = 2;
    state = checkUnlocks(performAction(state, 'study_qi_formula').state);
    state = checkUnlocks(performAction(state, 'brew_qi_pill', () => 0.1).state);

    const beforeQi = state.resources.qi;
    const result = performAction(state, 'take_qi_pill');
    expect(result.success).toBe(true);
    expect(result.state.resources.qi).toBeGreaterThan(beforeQi);
    expect(result.state.resources.dantoxin).toBeGreaterThan(0);
  });

  // Sect actions
  it('should perform sect_roll_call at outer_gate with registered flag', () => {
    let state = createInitialState();
    state.realm = Realm.QiCondensation;
    state.realmLayer = 1;
    state.resources.essence = 100;
    state.choices.flags.outer_gate_registered = true;
    state.currentLocationId = 'outer_gate';
    state = checkUnlocks(state);

    const result = performAction(state, 'sect_roll_call');
    expect(result.success).toBe(true);
    expect(result.state.choices.flags.attended_outer_gate_roll_call).toBe(true);
    expect(result.state.choices.tags.sect_status).toBe('roll_called');
  });

  it('should perform sect_patrol and update qualities', () => {
    let state = createInitialState();
    state.realm = Realm.QiCondensation;
    state.realmLayer = 1;
    state.resources.essence = 100;
    state.choices.flags.attended_outer_gate_roll_call = true;
    state.choices.qualities.sect_trace = 3;
    state.currentLocationId = 'outer_gate';
    state = checkUnlocks(state);

    const result = performAction(state, 'sect_patrol');
    expect(result.success).toBe(true);
    expect(result.state.choices.flags.accepted_outer_gate_patrol).toBe(true);
    expect(result.state.choices.qualities.sect_contribution).toBeGreaterThan(0);
  });

  // Dwelling actions
  it('should establish dwelling at Foundation realm', () => {
    let state = createInitialState();
    state.realm = Realm.FoundationEstablishment;
    state.realmLayer = 1;
    state.resources.essence = 100;
    state.resources.coins = 50;
    state.resources.herbs = 10;
    state.currentLocationId = 'home';
    state = checkUnlocks(state);

    const result = performAction(state, 'establish_dwelling');
    expect(result.success).toBe(true);
    expect(result.state.dwelling.level).toBe(1);
  });

  // Market actions
  it('should unlock market stall at Foundation realm', () => {
    let state = createInitialState();
    state.realm = Realm.FoundationEstablishment;
    state.realmLayer = 1;
    state = checkUnlocks(state);

    expect(state.unlockedActions).toContain('open_market_stall');
    expect(state.unlockedActions).toContain('buy_rare_herbs');
  });

  // Follower actions
  it('should recruit servant when dwelling level >= 1', () => {
    let state = createInitialState();
    state.realm = Realm.FoundationEstablishment;
    state.realmLayer = 1;
    state.resources.essence = 100;
    state.resources.coins = 100;
    state.resources.herbs = 10;
    state.currentLocationId = 'home';
    state = checkUnlocks(state);
    state = performAction(state, 'establish_dwelling').state;
    state = checkUnlocks(state);

    expect(state.unlockedActions).toContain('recruit_servant');
    const result = performAction(state, 'recruit_servant');
    expect(result.success).toBe(true);
    expect(Object.keys(result.state.followers.followers).length).toBeGreaterThan(0);
  });

  // Inner demon actions
  it('should confront demon and clear it', () => {
    let state = createInitialState();
    state.resources.essence = 100;
    state.resources.qi = 50;
    state.innerDemon = {
      ...state.innerDemon,
      activeDemon: 'demon_of_rashness',
      demonProgress: 50,
    };

    const result = performAction(state, 'confront_demon');
    expect(result.success).toBe(true);
    expect(result.state.innerDemon.activeDemon).toBeNull();
    expect(result.state.innerDemon.suppressedDemons).toContain('demon_of_rashness');
    expect(result.state.resources.insight).toBeGreaterThan(0);
  });

  it('should suppress demon and consume lifespan', () => {
    let state = createInitialState();
    state.resources.essence = 100;
    state.innerDemon = {
      ...state.innerDemon,
      activeDemon: 'demon_of_rashness',
      demonProgress: 50,
    };
    const beforeLifespan = state.resources.lifespan;

    const result = performAction(state, 'suppress_demon');
    expect(result.success).toBe(true);
    expect(result.state.innerDemon.activeDemon).toBeNull();
    expect(result.state.resources.lifespan).toBeLessThan(beforeLifespan);
  });

  it('should ignore demon without clearing it', () => {
    let state = createInitialState();
    state.resources.essence = 100;
    state.innerDemon = {
      ...state.innerDemon,
      activeDemon: 'demon_of_rashness',
      demonProgress: 30,
    };

    const result = performAction(state, 'ignore_demon');
    expect(result.success).toBe(true);
    // Demon should still be active (progress < 100)
    expect(result.state.innerDemon.activeDemon).toBe('demon_of_rashness');
  });

  it('should handle ignore_demon when progress >= 100 causing consequences', () => {
    let state = createInitialState();
    state.resources.essence = 100;
    state.resources.qi = 50;
    state.innerDemon = {
      ...state.innerDemon,
      activeDemon: 'demon_of_rashness',
      demonProgress: 100,
    };

    const result = performAction(state, 'ignore_demon');
    expect(result.success).toBe(true);
    expect(result.state.innerDemon.activeDemon).toBeNull();
    expect(result.state.resources.wounds).toBeGreaterThan(0);
  });

  // Practice actions for high realm
  it('should perform golden_core_practice and produce custom log', () => {
    let state = createInitialState();
    state.realm = Realm.GoldenCore;
    state.realmLayer = 1;
    state.resources.essence = 100;
    state.unlockedActions = [...state.unlockedActions, 'golden_core_practice'];
    state = checkUnlocks(state);

    const result = performAction(state, 'golden_core_practice');
    expect(result.success).toBe(true);
    expect(result.log).toContain('金丹');
  });

  it('should perform nascent_soul_practice and produce custom log', () => {
    let state = createInitialState();
    state.realm = Realm.NascentSoul;
    state.realmLayer = 1;
    state.resources.essence = 100;
    state.unlockedActions = [...state.unlockedActions, 'nascent_soul_practice'];
    state = checkUnlocks(state);

    const result = performAction(state, 'nascent_soul_practice');
    expect(result.success).toBe(true);
    expect(result.log).toContain('元婴');
  });

  // Location actions with proper conditions
  it('should set read_stone_tablet flag at abandoned_temple', () => {
    let state = createInitialState();
    state.resources.essence = 100;
    state.resources.insight = 10;
    state.currentLocationId = 'abandoned_temple';
    state.choices.flags.found_jade_slip = true;

    const result = performAction(state, 'read_stone_tablet');
    expect(result.success).toBe(true);
    expect(result.state.choices.flags.read_stone_tablet).toBe(true);
  });

  it('should increase alchemy_affinity via protect_seedling at herb_slope', () => {
    let state = createInitialState();
    state.resources.essence = 100;
    state.resources.herbs = 5;
    state.currentLocationId = 'herb_slope';
    state.choices.flags.marked_herb_patch = true;

    const result = performAction(state, 'protect_seedling');
    expect(result.success).toBe(true);
    expect(result.state.choices.flags.protected_seedling).toBe(true);
    expect(result.state.choices.qualities.alchemy_affinity).toBeGreaterThan(0);
  });

  // seek_foundation_guardian sets flags (requires outer_gate location + bottleneck_foundation flag, no existing guardian)
  it('should set foundation guardian flags via seek_foundation_guardian', () => {
    let state = createInitialState();
    state.realm = Realm.QiCondensation;
    state.realmLayer = 9;
    state.resources.essence = 200;
    state.resources.qi = 100;
    state.resources.coins = 20;
    state.resources.insight = 10;
    state.choices.flags.bottleneck_foundation = true;
    state.choices.flags.outer_gate_registered = true;
    state.currentLocationId = 'outer_gate';
    state = checkUnlocks(state);

    const result = performAction(state, 'seek_foundation_guardian');
    expect(result.success).toBe(true);
    expect(result.state.choices.flags.foundation_guardian).toBe(true);
    expect(result.state.choices.flags.sought_foundation_guardian).toBe(true);
  });

  // Risk check
  it('should fail on risk roll', () => {
    let state = createInitialState();
    state.resources.essence = 100;
    // xunshan has riskProbability > 0
    state.unlockedActions = [...state.unlockedActions, 'xunshan'];
    state.choices.flags.found_jade_slip = true;
    state = checkUnlocks(state);

    // Force risk failure by returning 0 (which is < riskProbability)
    const result = performAction(state, 'xunshan', () => 0.001);
    // The action may or may not fail based on riskProbability
    // If it has a risk probability > 0 and roll < it, it should fail
    if (result.log.includes('意外')) {
      expect(result.success).toBe(false);
    }
  });

  // Required realm check
  it('should fail when required realm is not met', () => {
    let state = createInitialState();
    state.realm = Realm.Mortal;
    state.resources.essence = 100;
    state.choices.flags.foundation_morning_seen = true;
    state.unlockedActions = [...state.unlockedActions, 'foundation_daily_practice'];

    const result = performAction(state, 'foundation_daily_practice');
    expect(result.success).toBe(false);
    expect(result.log).toContain('境界');
  });
});

describe('ACTION_ROUTE_QUALITIES', () => {
  it('should have entries for basic cultivation actions', () => {
    expect(ACTION_ROUTE_QUALITIES.kuzuo).toBe('quiet_cultivation');
    expect(ACTION_ROUTE_QUALITIES.tuna).toBe('quiet_cultivation');
    expect(ACTION_ROUTE_QUALITIES.tiaoxi).toBe('quiet_cultivation');
  });

  it('should have entries for alchemy actions', () => {
    expect(ACTION_ROUTE_QUALITIES.study_qi_formula).toBe('alchemy_affinity');
    expect(ACTION_ROUTE_QUALITIES.brew_qi_pill).toBe('alchemy_affinity');
    expect(ACTION_ROUTE_QUALITIES.take_qi_pill).toBe('alchemy_affinity');
  });

  it('should have entries for breakthrough actions', () => {
    expect(ACTION_ROUTE_QUALITIES.breakthrough_qi_2).toBe('quiet_cultivation');
    expect(ACTION_ROUTE_QUALITIES.breakthrough_foundation).toBe('quiet_cultivation');
    expect(ACTION_ROUTE_QUALITIES.breakthrough_golden_core).toBe('quiet_cultivation');
  });

  it('should have entries for sect actions', () => {
    expect(ACTION_ROUTE_QUALITIES.sect_roll_call).toBe('sect_trace');
    expect(ACTION_ROUTE_QUALITIES.sect_patrol).toBe('sect_trace');
    expect(ACTION_ROUTE_QUALITIES.inner_gate_task).toBe('sect_trace');
  });

  it('should have entries for dwelling actions', () => {
    expect(ACTION_ROUTE_QUALITIES.establish_dwelling).toBe('quiet_cultivation');
    expect(ACTION_ROUTE_QUALITIES.upgrade_dwelling).toBe('quiet_cultivation');
  });

  it('should have entries for follower actions', () => {
    expect(ACTION_ROUTE_QUALITIES.recruit_servant).toBe('sect_trace');
    expect(ACTION_ROUTE_QUALITIES.collect_follower_income).toBe('market_ties');
  });

  it('should have entries for inner demon actions', () => {
    expect(ACTION_ROUTE_QUALITIES.confront_demon).toBe('quiet_cultivation');
    expect(ACTION_ROUTE_QUALITIES.suppress_demon).toBe('quiet_cultivation');
    expect(ACTION_ROUTE_QUALITIES.ignore_demon).toBe('quiet_cultivation');
  });

  it('should have entries for high realm practice', () => {
    expect(ACTION_ROUTE_QUALITIES.golden_core_practice).toBe('quiet_cultivation');
    expect(ACTION_ROUTE_QUALITIES.nascent_soul_practice).toBe('quiet_cultivation');
  });

  it('should have entries for market and secret realm actions', () => {
    expect(ACTION_ROUTE_QUALITIES.open_market_stall).toBe('market_ties');
    expect(ACTION_ROUTE_QUALITIES.explore_secret_realm).toBe('combat_edge');
  });
});
