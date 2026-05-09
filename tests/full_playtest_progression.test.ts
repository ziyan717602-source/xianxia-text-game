/**
 * Full progression playtest — simulates a complete player journey
 * from Mortal through all realm progressions, checking for bugs
 * at every step.
 */
import { describe, it, expect } from 'vitest';
import { createInitialState, getMaxStamina, INITIAL_MAX_STAMINA, REALM_LIFESPAN_YEARS, DAYS_PER_YEAR, TICKS_PER_DAY } from '../src/game/state';
import { performAction, ACTIONS, ACTION_ROUTE_QUALITIES } from '../src/game/actions';
import { checkUnlocks } from '../src/game/unlock';
import { getNextBreakthroughRule, getBreakthroughSuccessChance, resolveBreakthrough, stabilizeBreakthrough, hasPreparedBreakthrough } from '../src/game/breakthrough';
import { moveToLocation, getAvailableActionsAtLocation, getVisibleLocations } from '../src/game/location';
import { processTick, processBatchTicks } from '../src/game/tick';
import { rollEvent } from '../src/game/events';
import { createRng } from '../src/game/state';
import { Realm, SpiritualRoot, Season, Resources, GameState } from '../src/game/types';
import { serializeSave, deserializeSave, createSaveData, migrateSaveData, CURRENT_SAVE_VERSION } from '../src/storage/save';
import { advanceSectRank, canAdvanceSectRank, registerOuterDisciple, completeTask, setCurrentTask, failTask, leaveSect } from '../src/game/sect';
import { recruitFollower, canRecruitFollower, assignFollowerTask, collectFollowerIncome, followerTick, getMaxFollowers } from '../src/game/follower';
import { upgradeDwelling, canUpgradeDwelling, installFormation, canInstallFormation, getDwellingAutoIncome } from '../src/game/dwelling';
import { RESOURCE_KEYS } from '../src/game/resources';
import { EVENTS } from '../src/content/events';
import { BREAKTHROUGH_RULES } from '../src/content/breakthroughs';

// ─── Helpers ────────────────────────────────────────────────────────────────

interface BugReport {
  step: string;
  description: string;
  expected?: any;
  actual?: any;
  severity: 'critical' | 'major' | 'minor';
}

const bugs: BugReport[] = [];

function reportBug(step: string, description: string, severity: BugReport['severity'], expected?: any, actual?: any) {
  bugs.push({ step, description, expected, actual, severity });
  console.error(`🪲 [${severity.toUpperCase()}] ${step}: ${description}`, 
    expected !== undefined ? `\n  Expected: ${JSON.stringify(expected)}` : '',
    actual !== undefined ? `\n  Actual: ${JSON.stringify(actual)}` : '');
}

/** Perform action and apply unlocks in one step */
function doAction(state: GameState, actionId: string, rng?: () => number): GameState {
  const result = performAction(state, actionId, rng);
  return checkUnlocks(result.state);
}

/** Check no resource is negative (except lifespan which can be 0) */
function checkNoNegativeResources(state: GameState, step: string) {
  for (const key of RESOURCE_KEYS) {
    if (key === 'lifespan') continue; // lifespan can be 0
    if ((state.resources[key] as number) < 0) {
      reportBug(step, `Resource ${key} is negative`, 'major', '>= 0', state.resources[key]);
    }
  }
}

/** Check state consistency */
function checkStateConsistency(state: GameState, step: string) {
  // Realm should match realmLayer
  if (state.realm === Realm.Mortal && state.realmLayer !== 0) {
    reportBug(step, 'Mortal realm should have layer 0', 'major', 0, state.realmLayer);
  }
  if (state.realm === Realm.QiCondensation && state.realmLayer < 1) {
    reportBug(step, 'QiCondensation should have layer >= 1', 'major', '>= 1', state.realmLayer);
  }
  
  // Essence should not exceed max
  const maxEssence = getMaxStamina(state.realm);
  if (state.resources.essence > maxEssence) {
    // This can happen with tiaoxi; not necessarily a bug but worth tracking
  }
  
  // Wounds should not be negative
  if (state.resources.wounds < 0) {
    reportBug(step, 'Wounds is negative', 'major', '>= 0', state.resources.wounds);
  }
  
  // Dantoxin should not be negative
  if (state.resources.dantoxin < 0) {
    reportBug(step, 'Dantoxin is negative', 'major', '>= 0', state.resources.dantoxin);
  }

  // Game over checks
  if (state.resources.wounds >= 10 && !state.choices.flags.game_over) {
    reportBug(step, 'Wounds >= 10 but no game_over flag', 'major', true, false);
  }
  if (state.resources.lifespan <= 0 && !state.choices.flags.game_over) {
    reportBug(step, 'Lifespan <= 0 but no game_over flag', 'major', true, false);
  }
  
  // Time should advance forward
  if (state.time.tick < 0) {
    reportBug(step, 'Tick is negative', 'critical', '>= 0', state.time.tick);
  }
  
  // Year should be positive
  if (state.time.year < 1) {
    reportBug(step, 'Year is less than 1', 'critical', '>= 1', state.time.year);
  }
  
  // Unlocked actions should have corresponding action definitions
  for (const actionId of state.unlockedActions) {
    if (!ACTIONS[actionId]) {
      reportBug(step, `Unlocked action "${actionId}" has no definition in ACTIONS`, 'major');
    }
  }
}

/** Force a breakthrough success by using rng=0 */
function forceBreakthroughSuccess(state: GameState, actionId: string): GameState {
  return doAction(state, actionId, () => 0);
}

/** Prepare and break through a qi layer */
function prepareAndBreakthrough(state: GameState, layerActionId: string, step: string): GameState {
  // Stabilize bottleneck
  const beforePrep = state.breakthrough.preparation;
  state = doAction(state, 'stabilize_bottleneck');
  
  const rule = getNextBreakthroughRule(state);
  if (!rule) {
    reportBug(step, 'No breakthrough rule found after stabilize_bottleneck', 'critical');
    return state;
  }
  
  // Check that breakthrough action is unlocked
  if (!state.unlockedActions.includes(layerActionId)) {
    reportBug(step, `Breakthrough action ${layerActionId} not unlocked after preparation`, 'major');
  }
  
  // Attempt breakthrough (force success)
  const beforeRealm = state.realm;
  const beforeLayer = state.realmLayer;
  
  state = forceBreakthroughSuccess(state, layerActionId);
  state = checkUnlocks(state);
  
  // Verify breakthrough happened
  if (state.realm === beforeRealm && state.realmLayer === beforeLayer && layerActionId !== 'breakthrough_foundation') {
    // For qi layers this means something went wrong
    reportBug(step, `Breakthrough ${layerActionId} did not change realm/layer`, 'critical', 
      'realm or layer change', `${state.realm} layer ${state.realmLayer}`);
  }
  
  return state;
}

// ─── Test Suite ──────────────────────────────────────────────────────────────

describe('Full Progression Playtest', () => {
  it('should progress from Mortal to Qi Condensation Layer 1', () => {
    let state = createInitialState(42);
    
    expect(state.realm).toBe(Realm.Mortal);
    expect(state.realmLayer).toBe(0);
    expect(state.unlockedActions).toContain('kuzuo');
    expect(state.resources.essence).toBe(INITIAL_MAX_STAMINA);
    
    // Step 1: Do kuzuo several times to get insight
    for (let i = 0; i < 3; i++) {
      state = doAction(state, 'kuzuo');
      checkNoNegativeResources(state, 'kuzuo loop');
    }
    
    // Should have unlocked tuna and tiaoxi by now
    if (!state.unlockedActions.includes('tuna')) {
      reportBug('Mortal→Qi1', 'tuna not unlocked after kuzuo x3 (insight >= 2)', 'major');
    }
    if (!state.unlockedActions.includes('tiaoxi')) {
      reportBug('Mortal→Qi1', 'tiaoxi not unlocked after kuzuo x3', 'major');
    }
    
    // Step 2: Do tuna to get qi
    for (let i = 0; i < 6; i++) {
      const beforeQi = state.resources.qi;
      state = doAction(state, 'tuna');
      checkNoNegativeResources(state, 'tuna loop');
    }
    
    // Need enough tuna to unlock rike_tuna (5 times)
    if (!state.choices.flags['unlocked_rike_tuna']) {
      reportBug('Mortal→Qi1', 'rike_tuna not unlocked after 6 tuna (need action_tuna_count >= 5)', 'major');
    }
    
    // Step 3: Ensure we have qi >= 15 and insight >= 3 for yinqi
    // Do more kuzuo/tuna if needed
    while (state.resources.insight < 3) {
      state = doAction(state, 'kuzuo');
    }
    while (state.resources.qi < 16) {
      state = doAction(state, 'tuna');
    }
    state = checkUnlocks(state);
    
    // yinqi should be unlocked
    if (!state.unlockedActions.includes('yinqi')) {
      reportBug('Mortal→Qi1', 'yinqi not unlocked (qi >= 15, insight >= 3, unlocked_rike_tuna)', 'critical',
        true, state.unlockedActions.includes('yinqi'));
    }
    
    // Step 4: Perform yinqi
    const beforeRealm = state.realm;
    state = doAction(state, 'yinqi');
    state = checkUnlocks(state);
    
    if (state.realm !== Realm.QiCondensation) {
      reportBug('Mortal→Qi1', 'yinqi did not advance to QiCondensation', 'critical',
        Realm.QiCondensation, state.realm);
    }
    if (state.realmLayer !== 1) {
      reportBug('Mortal→Qi1', 'yinqi did not set realmLayer to 1', 'critical', 1, state.realmLayer);
    }
    if (!state.choices.flags.entered_qi_condensation) {
      reportBug('Mortal→Qi1', 'entered_qi_condensation flag not set after yinqi', 'major');
    }
    
    checkNoNegativeResources(state, 'After yinqi');
    checkStateConsistency(state, 'After yinqi');
  });
  
  it('should progress from Qi Layer 1 to Layer 9', () => {
    let state = createInitialState(20260507);
    state.realm = Realm.QiCondensation;
    state.realmLayer = 1;
    state.currentLocationId = 'home';
    state.resources.essence = 200;
    state.resources.qi = 200;
    state.resources.insight = 50;
    state.choices.qualities.quiet_cultivation = 4;
    state = checkUnlocks(state);
    
    // Progress through qi layers 2-9
    const layers = [
      { action: 'breakthrough_qi_2', targetLayer: 2, successFlag: 'reached_qi_layer_2' },
      { action: 'breakthrough_qi_3', targetLayer: 3, successFlag: 'reached_qi_layer_3' },
      { action: 'breakthrough_qi_4', targetLayer: 4, successFlag: 'reached_qi_layer_4' },
      { action: 'breakthrough_qi_5', targetLayer: 5, successFlag: 'reached_qi_layer_5' },
      { action: 'breakthrough_qi_6', targetLayer: 6, successFlag: 'reached_qi_layer_6' },
      { action: 'breakthrough_qi_7', targetLayer: 7, successFlag: 'reached_qi_layer_7' },
      { action: 'breakthrough_qi_8', targetLayer: 8, successFlag: 'reached_qi_layer_8' },
      { action: 'breakthrough_qi_9', targetLayer: 9, successFlag: 'reached_qi_layer_9' },
    ];
    
    for (const layer of layers) {
      // Replenish resources for each layer
      state.resources.essence = 200;
      state.resources.qi = 200;
      state.resources.insight = 50;
      
      state = prepareAndBreakthrough(state, layer.action, `Qi→Layer${layer.targetLayer}`);
      
      if (state.realmLayer !== layer.targetLayer) {
        reportBug(`Qi→Layer${layer.targetLayer}`, `realmLayer is ${state.realmLayer} instead of ${layer.targetLayer}`, 'critical');
      }
      if (!state.choices.flags[layer.successFlag]) {
        reportBug(`Qi→Layer${layer.targetLayer}`, `success flag ${layer.successFlag} not set`, 'major');
      }
      
      checkNoNegativeResources(state, `After qi layer ${layer.targetLayer}`);
      checkStateConsistency(state, `After qi layer ${layer.targetLayer}`);
    }
    
    expect(state.realmLayer).toBe(9);
  });
  
  it('should progress from Qi Layer 9 to Foundation Establishment', () => {
    let state = createInitialState(20260508);
    state.realm = Realm.QiCondensation;
    state.realmLayer = 9;
    state.currentLocationId = 'home';
    state.resources.essence = 300;
    state.resources.qi = 300;
    state.resources.insight = 50;
    state.resources.coins = 50;
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
    
    // Stabilize foundation bottleneck
    state = doAction(state, 'stabilize_bottleneck');
    
    const rule = getNextBreakthroughRule(state);
    if (rule?.id !== 'foundation') {
      reportBug('Qi9→Foundation', `Expected foundation rule, got ${rule?.id}`, 'critical', 'foundation', rule?.id);
    }
    
    // Attempt foundation breakthrough (force success)
    state = forceBreakthroughSuccess(state, 'breakthrough_foundation');
    state = checkUnlocks(state);
    
    if (state.realm !== Realm.FoundationEstablishment) {
      reportBug('Qi9→Foundation', 'Did not advance to FoundationEstablishment', 'critical',
        Realm.FoundationEstablishment, state.realm);
    }
    if (state.realmLayer !== 1) {
      reportBug('Qi9→Foundation', `realmLayer should be 1, got ${state.realmLayer}`, 'major', 1, state.realmLayer);
    }
    if (!state.choices.flags.reached_foundation) {
      reportBug('Qi9→Foundation', 'reached_foundation flag not set', 'major');
    }
    
    checkNoNegativeResources(state, 'After foundation breakthrough');
    checkStateConsistency(state, 'After foundation breakthrough');
  });
  
  it('should progress from Foundation to Golden Core', () => {
    let state = createInitialState(20260509);
    state.realm = Realm.FoundationEstablishment;
    state.realmLayer = 1;
    state.currentLocationId = 'home';
    state.resources.essence = 200;
    state.resources.qi = 200;
    state.resources.insight = 50;
    state.choices.qualities.quiet_cultivation = 10;
    state.choices.flags.foundation_morning_seen = true;
    state = checkUnlocks(state);
    
    // Stabilize golden core bottleneck
    state = doAction(state, 'stabilize_bottleneck');
    
    const rule = getNextBreakthroughRule(state);
    if (rule?.id !== 'golden_core') {
      reportBug('Foundation→GoldenCore', `Expected golden_core rule, got ${rule?.id}`, 'critical');
    }
    
    // Force success
    state = forceBreakthroughSuccess(state, 'breakthrough_golden_core');
    state = checkUnlocks(state);
    
    if (state.realm !== Realm.GoldenCore) {
      reportBug('Foundation→GoldenCore', 'Did not advance to GoldenCore', 'critical',
        Realm.GoldenCore, state.realm);
    }
    if (!state.choices.flags.reached_golden_core) {
      reportBug('Foundation→GoldenCore', 'reached_golden_core flag not set', 'major');
    }
    
    checkNoNegativeResources(state, 'After golden core breakthrough');
    checkStateConsistency(state, 'After golden core breakthrough');
  });
  
  it('should progress from Golden Core to Nascent Soul', () => {
    let state = createInitialState(20260510);
    state.realm = Realm.GoldenCore;
    state.realmLayer = 1;
    state.currentLocationId = 'home';
    state.resources.essence = 300;
    state.resources.qi = 300;
    state.resources.insight = 60;
    state.choices.qualities.quiet_cultivation = 12;
    state = checkUnlocks(state);
    
    // Stabilize nascent soul bottleneck
    state = doAction(state, 'stabilize_bottleneck');
    
    const rule = getNextBreakthroughRule(state);
    if (rule?.id !== 'nascent_soul') {
      reportBug('GoldenCore→NascentSoul', `Expected nascent_soul rule, got ${rule?.id}`, 'critical');
    }
    
    // Force success
    state = forceBreakthroughSuccess(state, 'breakthrough_nascent_soul');
    state = checkUnlocks(state);
    
    if (state.realm !== Realm.NascentSoul) {
      reportBug('GoldenCore→NascentSoul', 'Did not advance to NascentSoul', 'critical',
        Realm.NascentSoul, state.realm);
    }
    if (!state.choices.flags.reached_nascent_soul) {
      reportBug('GoldenCore→NascentSoul', 'reached_nascent_soul flag not set', 'major');
    }
    
    checkNoNegativeResources(state, 'After nascent soul breakthrough');
    checkStateConsistency(state, 'After nascent soul breakthrough');
  });
  
  it('should progress from Nascent Soul to Spirit Transformation', () => {
    let state = createInitialState(20260511);
    state.realm = Realm.NascentSoul;
    state.realmLayer = 1;
    state.currentLocationId = 'home';
    state.resources.essence = 400;
    state.resources.qi = 400;
    state.resources.insight = 100;
    state.choices.qualities.quiet_cultivation = 15;
    state = checkUnlocks(state);
    
    // Stabilize
    state = doAction(state, 'stabilize_bottleneck');
    
    // Force success
    state = forceBreakthroughSuccess(state, 'breakthrough_spirit_transformation');
    state = checkUnlocks(state);
    
    if (state.realm !== Realm.SpiritTransformation) {
      reportBug('NascentSoul→SpiritTransformation', 'Did not advance to SpiritTransformation', 'critical',
        Realm.SpiritTransformation, state.realm);
    }
    
    checkNoNegativeResources(state, 'After spirit transformation breakthrough');
    checkStateConsistency(state, 'After spirit transformation breakthrough');
  });
  
  it('should progress from Spirit Transformation to Integration', () => {
    let state = createInitialState(20260512);
    state.realm = Realm.SpiritTransformation;
    state.realmLayer = 1;
    state.currentLocationId = 'home';
    state.resources.essence = 600;
    state.resources.qi = 600;
    state.resources.insight = 150;
    state.choices.qualities.quiet_cultivation = 18;
    state = checkUnlocks(state);
    
    state = doAction(state, 'stabilize_bottleneck');
    state = forceBreakthroughSuccess(state, 'breakthrough_integration');
    state = checkUnlocks(state);
    
    if (state.realm !== Realm.Integration) {
      reportBug('SpiritTransformation→Integration', 'Did not advance to Integration', 'critical',
        Realm.Integration, state.realm);
    }
    
    checkNoNegativeResources(state, 'After integration breakthrough');
    checkStateConsistency(state, 'After integration breakthrough');
  });
  
  it('should progress from Integration to Mahayana', () => {
    let state = createInitialState(20260513);
    state.realm = Realm.Integration;
    state.realmLayer = 1;
    state.currentLocationId = 'home';
    state.resources.essence = 800;
    state.resources.qi = 800;
    state.resources.insight = 200;
    state.choices.qualities.quiet_cultivation = 20;
    state = checkUnlocks(state);
    
    state = doAction(state, 'stabilize_bottleneck');
    state = forceBreakthroughSuccess(state, 'breakthrough_mahayana');
    state = checkUnlocks(state);
    
    if (state.realm !== Realm.Mahayana) {
      reportBug('Integration→Mahayana', 'Did not advance to Mahayana', 'critical',
        Realm.Mahayana, state.realm);
    }
    
    checkNoNegativeResources(state, 'After mahayana breakthrough');
    checkStateConsistency(state, 'After mahayana breakthrough');
  });
  
  it('should progress from Mahayana to Tribulation', () => {
    let state = createInitialState(20260514);
    state.realm = Realm.Mahayana;
    state.realmLayer = 1;
    state.currentLocationId = 'home';
    state.resources.essence = 1000;
    state.resources.qi = 1000;
    state.resources.insight = 300;
    state.choices.qualities.quiet_cultivation = 25;
    state = checkUnlocks(state);
    
    state = doAction(state, 'stabilize_bottleneck');
    state = forceBreakthroughSuccess(state, 'breakthrough_tribulation');
    state = checkUnlocks(state);
    
    if (state.realm !== Realm.Tribulation) {
      reportBug('Mahayana→Tribulation', 'Did not advance to Tribulation', 'critical',
        Realm.Tribulation, state.realm);
    }
    
    checkNoNegativeResources(state, 'After tribulation breakthrough');
    checkStateConsistency(state, 'After tribulation breakthrough');
  });
});

describe('Edge Cases', () => {
  it('should reject actions with insufficient essence', () => {
    let state = createInitialState(42);
    state.resources.essence = 0;
    
    const result = performAction(state, 'kuzuo');
    expect(result.success).toBe(false);
    // State should not change on failed action
    expect(result.state.resources.essence).toBe(0);
  });
  
  it('should handle breakthrough failure correctly', () => {
    let state = createInitialState(20260507);
    state.realm = Realm.QiCondensation;
    state.realmLayer = 1;
    state.currentLocationId = 'home';
    state.resources.essence = 200;
    state.resources.qi = 200;
    state.resources.insight = 50;
    state.choices.qualities.quiet_cultivation = 4;
    state = checkUnlocks(state);
    state = doAction(state, 'stabilize_bottleneck');
    
    const beforeWounds = state.resources.wounds;
    const beforeLifespan = state.resources.lifespan;
    
    // Force failure with rng=1
    const result = performAction(state, 'breakthrough_qi_2', () => 1);
    expect(result.success).toBe(true); // action succeeds even if breakthrough fails
    expect(result.state.realmLayer).toBe(1); // layer should not change
    expect(result.state.resources.wounds).toBeGreaterThan(beforeWounds);
    expect(result.state.resources.lifespan).toBeLessThan(beforeLifespan);
    expect(result.state.breakthrough.failures.qi_layer_2).toBe(1);
    
    checkNoNegativeResources(result.state, 'After breakthrough failure');
  });
  
  it('should handle dantoxin overflow correctly', () => {
    let state = createInitialState(42);
    state.realm = Realm.QiCondensation;
    state.realmLayer = 1;
    state.resources.dantoxin = 100; // Maximum toxicity
    
    // Dantoxin consequences should apply
    const tickedState = processBatchTicks(state, 10);
    
    // At dantoxin >= 100, wounds should accumulate per day
    if (tickedState.resources.wounds <= state.resources.wounds) {
      reportBug('Dantoxin overflow', 'Dantoxin >= 100 did not cause wound accumulation', 'major');
    }
    
    // Dantoxin should reduce essence recovery
    // At >= 100, -1 essence per tick
    if (tickedState.resources.essence > state.resources.essence) {
      // Essence should not have recovered (or recovered less)
      reportBug('Dantoxin overflow', 'Essence recovered despite dantoxin >= 100 (-1/tick penalty)', 'major');
    }
    
    checkNoNegativeResources(tickedState, 'After dantoxin overflow tick');
  });
  
  it('should handle wound accumulation leading to game over', () => {
    let state = createInitialState(42);
    state.resources.wounds = 9;
    
    const tickedState = processBatchTicks(state, 10);
    
    // 9 wounds should not be game over yet
    if (state.resources.wounds < 10 && state.choices.flags.game_over) {
      reportBug('Wound game over', 'Game over triggered with wounds < 10', 'major');
    }
    
    // Set wounds to 10
    state.resources.wounds = 10;
    const deadState = processBatchTicks(state, 10);
    
    if (!deadState.choices.flags.game_over) {
      reportBug('Wound game over', 'Game over not triggered with wounds >= 10', 'critical');
    }
    if (deadState.choices.tags.game_over_reason !== 'wounds') {
      reportBug('Wound game over', 'Game over reason not "wounds"', 'major', 'wounds', deadState.choices.tags.game_over_reason);
    }
  });
  
  it('should handle follower management', () => {
    let state = createInitialState(42);
    state.realm = Realm.FoundationEstablishment;
    state.realmLayer = 1;
    state.currentLocationId = 'home';
    state.resources.essence = 200;
    state.resources.qi = 200;
    state.resources.insight = 50;
    state.resources.coins = 100;
    state.resources.herbs = 50;
    state.choices.flags.foundation_morning_seen = true;
    state.choices.flags.dwelling_level_1 = true;
    state.dwelling.level = 1;
    state = checkUnlocks(state);
    
    // Can recruit servant with dwelling level 1
    if (!canRecruitFollower(state, 'servant')) {
      reportBug('Follower', 'Cannot recruit servant with dwelling level 1', 'major');
    }
    
    // Cannot recruit disciple without Golden Core
    if (canRecruitFollower(state, 'disciple')) {
      reportBug('Follower', 'Can recruit disciple without Golden Core', 'major');
    }
    
    // Cannot recruit guard without dwelling level 2
    if (canRecruitFollower(state, 'guard')) {
      reportBug('Follower', 'Can recruit guard without dwelling level 2', 'major');
    }
    
    // Recruit a servant
    const beforeFollowerCount = Object.keys(state.followers.followers).length;
    state = recruitFollower(state, 'servant');
    const afterFollowerCount = Object.keys(state.followers.followers).length;
    
    if (afterFollowerCount !== beforeFollowerCount + 1) {
      reportBug('Follower', 'Servant not added after recruitment', 'major',
        beforeFollowerCount + 1, afterFollowerCount);
    }
    
    // Assign a task
    const followerId = Object.keys(state.followers.followers)[0];
    state = assignFollowerTask(state, followerId, 'herb_gathering');
    
    if (state.followers.followers[followerId].taskAssignment !== 'herb_gathering') {
      reportBug('Follower', 'Task not assigned to follower', 'major');
    }
    
    // Collect income
    state = collectFollowerIncome(state);
    // Should have gained some herbs
    checkNoNegativeResources(state, 'After follower income collection');
    
    // Test follower with 0 loyalty leaves
    state.followers.followers[followerId].loyalty = 0;
    state = followerTick(state);
    
    if (state.followers.followers[followerId]) {
      reportBug('Follower', 'Follower with 0 loyalty did not leave', 'major');
    }
  });
  
  it('should handle sect rank advancement', () => {
    let state = createInitialState(42);
    
    // Cannot advance from 'none' rank
    if (canAdvanceSectRank(state)) {
      reportBug('Sect rank', 'Can advance from none rank', 'major');
    }
    
    // Register as outer disciple
    state = registerOuterDisciple(state);
    if (state.sect.rank !== 'outer') {
      reportBug('Sect rank', 'registerOuterDisciple did not set rank to outer', 'major');
    }
    
    // Cannot advance to inner without Foundation + contribution
    if (canAdvanceSectRank(state)) {
      reportBug('Sect rank', 'Can advance to inner without sufficient conditions', 'major');
    }
    
    // Set conditions for inner: Foundation + contribution >= 20 + discipline >= 5
    state.realm = Realm.FoundationEstablishment;
    state.realmLayer = 1;
    state.sect.contribution = 20;
    state.sect.discipline = 5;
    
    if (!canAdvanceSectRank(state)) {
      reportBug('Sect rank', 'Cannot advance to inner despite meeting conditions', 'major');
    }
    
    state = advanceSectRank(state);
    if (state.sect.rank !== 'inner') {
      reportBug('Sect rank', 'advanceSectRank did not set rank to inner', 'major');
    }
    
    // Cannot advance to core without Golden Core
    state.sect.contribution = 50;
    if (canAdvanceSectRank(state)) {
      reportBug('Sect rank', 'Can advance to core without Golden Core', 'major');
    }
    
    state.realm = Realm.GoldenCore;
    state.realmLayer = 1;
    if (!canAdvanceSectRank(state)) {
      reportBug('Sect rank', 'Cannot advance to core despite meeting conditions', 'major');
    }
    
    state = advanceSectRank(state);
    if (state.sect.rank !== 'core') {
      reportBug('Sect rank', 'advanceSectRank did not set rank to core', 'major');
    }
    
    // Test leave sect
    state = leaveSect(state);
    if (state.sect.rank !== 'none') {
      reportBug('Sect rank', 'leaveSect did not reset rank to none', 'major');
    }
    if (!state.choices.flags.left_sect) {
      reportBug('Sect rank', 'left_sect flag not set after leaving sect', 'major');
    }
  });
  
  it('should handle location switching', () => {
    let state = createInitialState(42);
    state.realm = Realm.QiCondensation;
    state.realmLayer = 1;
    state.resources.essence = 100;
    state.choices.flags.entered_qi_condensation = true;
    state = checkUnlocks(state);
    
    // Move to mountain_path
    const moveResult = moveToLocation(state, 'mountain_path');
    if (!moveResult.success) {
      reportBug('Location', 'Failed to move to mountain_path', 'major');
    }
    expect(moveResult.state.currentLocationId).toBe('mountain_path');
    
    // Moving should cost essence
    if (moveResult.state.resources.essence >= state.resources.essence) {
      reportBug('Location', 'Moving did not cost essence', 'minor');
    }
    
    // Cannot move to same location
    const sameResult = moveToLocation(moveResult.state, 'mountain_path');
    expect(sameResult.success).toBe(false);
    
    // Cannot move to non-existent location
    const badResult = moveToLocation(state, 'nonexistent_location');
    expect(badResult.success).toBe(false);
    
    // Cannot move with insufficient essence
    state.resources.essence = 2;
    const poorResult = moveToLocation(state, 'mountain_path');
    expect(poorResult.success).toBe(false);
    
    // Check visible locations include new ones after entering Qi Condensation
    const visibleLocations = getVisibleLocations(moveResult.state);
    const locationIds = visibleLocations.map(l => l.id);
    if (!locationIds.includes('stream_valley')) {
      reportBug('Location', 'stream_valley not visible after entering Qi Condensation', 'minor');
    }
    if (!locationIds.includes('abandoned_temple')) {
      reportBug('Location', 'abandoned_temple not visible after entering Qi Condensation', 'minor');
    }
  });
  
  it('should handle save/load roundtrip', () => {
    let state = createInitialState(42);
    state.realm = Realm.QiCondensation;
    state.realmLayer = 3;
    state.resources.qi = 50;
    state.resources.essence = 80;
    state.resources.insight = 10;
    state.resources.herbs = 5;
    state.choices.flags['test_custom_flag'] = true;
    state.choices.qualities.quiet_cultivation = 7;
    state.breakthrough.preparation['qi_layer_2'] = 2;
    state.breakthrough.failures['qi_layer_2'] = 1;
    
    // Save
    const json = serializeSave(state);
    
    // Load
    const loadedState = deserializeSave(json);
    
    // Verify
    if (loadedState.seed !== state.seed) {
      reportBug('Save/Load', 'Seed mismatch after roundtrip', 'critical', state.seed, loadedState.seed);
    }
    if (loadedState.realm !== state.realm) {
      reportBug('Save/Load', 'Realm mismatch after roundtrip', 'critical', state.realm, loadedState.realm);
    }
    if (loadedState.realmLayer !== state.realmLayer) {
      reportBug('Save/Load', 'realmLayer mismatch after roundtrip', 'critical', state.realmLayer, loadedState.realmLayer);
    }
    if (loadedState.resources.qi !== state.resources.qi) {
      reportBug('Save/Load', 'qi mismatch after roundtrip', 'critical', state.resources.qi, loadedState.resources.qi);
    }
    if (loadedState.resources.essence !== state.resources.essence) {
      reportBug('Save/Load', 'essence mismatch after roundtrip', 'critical', state.resources.essence, loadedState.resources.essence);
    }
    if (loadedState.choices.flags['test_custom_flag'] !== true) {
      reportBug('Save/Load', 'Custom flag lost after roundtrip', 'major');
    }
    if (loadedState.breakthrough.preparation['qi_layer_2'] !== 2) {
      reportBug('Save/Load', 'Breakthrough preparation lost after roundtrip', 'major');
    }
    if (loadedState.breakthrough.failures['qi_layer_2'] !== 1) {
      reportBug('Save/Load', 'Breakthrough failures lost after roundtrip', 'major');
    }
    
    // Test invalid JSON fallback
    const fallbackState = deserializeSave('not valid json');
    if (fallbackState.realm !== Realm.Mortal) {
      reportBug('Save/Load', 'Invalid JSON did not fallback to initial state', 'major');
    }
    
    // Test migration
    const migrated = migrateSaveData({
      version: 1,
      state: { ...state, realm: Realm.QiCondensation },
      createdAt: 1,
      updatedAt: 1,
      seed: 42,
    });
    if (migrated.version !== CURRENT_SAVE_VERSION) {
      reportBug('Save/Load', `Migration did not reach current version (${CURRENT_SAVE_VERSION})`, 'major',
        CURRENT_SAVE_VERSION, migrated.version);
    }
    if (migrated.state.realmLayer === undefined) {
      reportBug('Save/Load', 'Migration V1→current did not add realmLayer', 'major');
    }
  });
  
  it('should handle dwelling and formation upgrades', () => {
    let state = createInitialState(42);
    state.realm = Realm.FoundationEstablishment;
    state.realmLayer = 1;
    state.resources.essence = 200;
    state.resources.qi = 200;
    state.resources.insight = 50;
    state.resources.coins = 200;
    state.resources.herbs = 50;
    state.choices.flags.foundation_morning_seen = true;
    
    // Cannot upgrade dwelling at level 0 without Foundation realm
    state.realm = Realm.QiCondensation;
    if (canUpgradeDwelling(state)) {
      reportBug('Dwelling', 'Can upgrade dwelling without Foundation realm', 'major');
    }
    
    // Now with Foundation
    state.realm = Realm.FoundationEstablishment;
    if (!canUpgradeDwelling(state)) {
      reportBug('Dwelling', 'Cannot upgrade dwelling with Foundation and sufficient resources', 'major');
    }
    
    // Upgrade to level 1
    state = upgradeDwelling(state);
    if (state.dwelling.level !== 1) {
      reportBug('Dwelling', 'Dwelling not upgraded to level 1', 'major');
    }
    if (!state.choices.flags.dwelling_level_1) {
      reportBug('Dwelling', 'dwelling_level_1 flag not set', 'major');
    }
    
    // Check auto income
    const income = getDwellingAutoIncome(state);
    if (income.qi <= 0) {
      reportBug('Dwelling', 'No auto qi income from dwelling level 1', 'minor');
    }
    
    // Cannot install formation at level 1
    if (canInstallFormation(state)) {
      reportBug('Dwelling', 'Can install formation at dwelling level 1 (need level 2)', 'major');
    }
    
    // Upgrade to level 2
    state.resources.coins = 300;
    state.resources.herbs = 100;
    state.resources.insight = 100;
    state = upgradeDwelling(state);
    if (state.dwelling.level !== 2) {
      reportBug('Dwelling', 'Dwelling not upgraded to level 2', 'major');
    }
    
    // Now can install formation
    if (!canInstallFormation(state)) {
      reportBug('Dwelling', 'Cannot install formation at dwelling level 2 with resources', 'major');
    }
    
    state = installFormation(state);
    if (state.dwelling.formationLevel !== 1) {
      reportBug('Dwelling', 'Formation not installed to level 1', 'major');
    }
    // Formation level 1 = 聚灵阵, which gives auto qi bonus but NOT breakthrough bonus
    // Breakthrough bonus starts at formation level 2 (护法阵)
    // So formationBonus at level 1 should be 0
    if (state.dwelling.formationBonus !== 0) {
      reportBug('Dwelling', 'Formation level 1 should have 0 breakthrough bonus (only auto qi)', 'minor', 0, state.dwelling.formationBonus);
    }
    // Auto qi should increase with formation level 1
    if (state.dwelling.autoQiPerDay <= 0) {
      reportBug('Dwelling', 'Auto qi per day should be positive with dwelling level 2 + formation level 1', 'minor');
    }
    
    checkNoNegativeResources(state, 'After dwelling upgrades');
  });
  
  it('should handle dantoxin penalty on breakthrough chance', () => {
    const cleanState = createInitialState(42);
    cleanState.realm = Realm.QiCondensation;
    cleanState.realmLayer = 1;
    cleanState.resources.essence = 200;
    cleanState.resources.qi = 200;
    cleanState.resources.insight = 50;
    cleanState.choices.qualities.quiet_cultivation = 4;
    
    const toxicState = { ...cleanState, resources: { ...cleanState.resources, dantoxin: 60 } };
    
    const cleanChance = getBreakthroughSuccessChance(cleanState, BREAKTHROUGH_RULES.qi_layer_2);
    const toxicChance = getBreakthroughSuccessChance(toxicState, BREAKTHROUGH_RULES.qi_layer_2);
    
    if (toxicChance >= cleanChance) {
      reportBug('Dantoxin penalty', 'High dantoxin does not reduce breakthrough chance', 'major',
        '< clean', toxicChance);
    }
    
    // Chance should be clamped between 0.2 and 0.92
    if (cleanChance < 0.2 || cleanChance > 0.92) {
      reportBug('Breakthrough chance', `Breakthrough chance ${cleanChance} out of bounds [0.2, 0.92]`, 'major');
    }
  });
  
  it('should handle complete cultivation flow (root reveal + attune)', () => {
    let state = createInitialState(42);
    state.realm = Realm.QiCondensation;
    state.realmLayer = 1;
    state.currentLocationId = 'home';
    state.resources.essence = 200;
    state.resources.qi = 200;
    state.resources.insight = 50;
    state = checkUnlocks(state);
    
    // Inspect root should be available
    if (!state.unlockedActions.includes('inspect_root')) {
      reportBug('Cultivation flow', 'inspect_root not unlocked at QiCondensation', 'major');
    }
    
    // Perform inspect_root
    const result = performAction(state, 'inspect_root');
    if (!result.state.cultivation.rootKnown) {
      reportBug('Cultivation flow', 'rootKnown not set after inspect_root', 'major');
    }
    if (result.state.spiritualRoot === SpiritualRoot.Mortal) {
      reportBug('Cultivation flow', 'spiritualRoot still Mortal after inspect_root', 'major');
    }
    
    // Attune technique should now be available
    state = checkUnlocks(result.state);
    if (!state.unlockedActions.includes('attune_technique')) {
      reportBug('Cultivation flow', 'attune_technique not unlocked after root reveal', 'major');
    }
    
    // Attune technique
    const attuneResult = performAction(state, 'attune_technique');
    if (attuneResult.state.cultivation.activeTechniqueId === 'small_breathing') {
      reportBug('Cultivation flow', 'Technique not changed after attunement', 'minor');
    }
    
    checkNoNegativeResources(attuneResult.state, 'After cultivation flow');
  });
});

describe('Event System', () => {
  it('should have events that can fire for various game states', () => {
    // Check events exist
    if (EVENTS.length === 0) {
      reportBug('Events', 'No events defined in the system', 'critical');
      return;
    }
    
    // Test event rolling with initial state
    const state = createInitialState(42);
    state.realm = Realm.QiCondensation;
    state.realmLayer = 1;
    state.resources.essence = 100;
    state.resources.qi = 50;
    state.resources.insight = 10;
    state.currentLocationId = 'home';
    
    // Check which events have their conditions met
    const possibleEvents = EVENTS.filter(e => e.condition(state));
    // There should be at least some events possible
    // (Even if none, this isn't necessarily a bug for initial state)
    
    // Roll events with seeded rng — should not crash
    const rng = createRng(42, 0);
    let event = null;
    try {
      event = rollEvent(state, rng);
    } catch (e) {
      reportBug('Events', `rollEvent crashed: ${(e as Error).message}`, 'critical');
    }
    
    // Test with high-resource state
    const richState = { ...state, resources: { ...state.resources, qi: 500, insight: 100, coins: 100, herbs: 50 } };
    try {
      rollEvent(richState, rng);
    } catch (e) {
      reportBug('Events', `rollEvent crashed with rich state: ${(e as Error).message}`, 'critical');
    }
    
    // Test with Foundation state
    const foundationState = { ...state, realm: Realm.FoundationEstablishment, realmLayer: 1 };
    try {
      rollEvent(foundationState, rng);
    } catch (e) {
      reportBug('Events', `rollEvent crashed with foundation state: ${(e as Error).message}`, 'critical');
    }
    
    // Test with Golden Core state
    const gcState = { ...state, realm: Realm.GoldenCore, realmLayer: 1 };
    try {
      rollEvent(gcState, rng);
    } catch (e) {
      reportBug('Events', `rollEvent crashed with golden core state: ${(e as Error).message}`, 'critical');
    }
  });
  
  it('should check event conditions against various states without crashing', () => {
    const states = [
      { name: 'Mortal', realm: Realm.Mortal, layer: 0 },
      { name: 'Qi L1', realm: Realm.QiCondensation, layer: 1 },
      { name: 'Qi L5', realm: Realm.QiCondensation, layer: 5 },
      { name: 'Qi L9', realm: Realm.QiCondensation, layer: 9 },
      { name: 'Foundation', realm: Realm.FoundationEstablishment, layer: 1 },
      { name: 'Golden Core', realm: Realm.GoldenCore, layer: 1 },
      { name: 'Nascent Soul', realm: Realm.NascentSoul, layer: 1 },
      { name: 'Spirit Transformation', realm: Realm.SpiritTransformation, layer: 1 },
      { name: 'Integration', realm: Realm.Integration, layer: 1 },
      { name: 'Mahayana', realm: Realm.Mahayana, layer: 1 },
      { name: 'Tribulation', realm: Realm.Tribulation, layer: 1 },
    ];
    
    for (const s of states) {
      const state = createInitialState(42);
      state.realm = s.realm;
      state.realmLayer = s.layer;
      state.resources.qi = 100;
      state.resources.insight = 20;
      state.resources.essence = 100;
      
      // Check every event's condition doesn't crash
      for (const event of EVENTS) {
        try {
          event.condition(state);
        } catch (e) {
          reportBug('Event conditions', `Event "${event.id}" condition crashed for state ${s.name}: ${(e as Error).message}`, 'critical');
        }
      }
      
      // Check weight function doesn't crash
      for (const event of EVENTS) {
        if (event.condition(state)) {
          try {
            event.weight(state);
          } catch (e) {
            reportBug('Event weights', `Event "${event.id}" weight() crashed for state ${s.name}: ${(e as Error).message}`, 'critical');
          }
        }
      }
    }
  });
});

describe('Action System Validation', () => {
  it('should have all action IDs referenced in unlocks be valid', () => {
    // Collect all action IDs referenced in ACTION_ROUTE_QUALITIES
    for (const actionId of Object.keys(ACTION_ROUTE_QUALITIES)) {
      if (!ACTIONS[actionId]) {
        reportBug('Action validation', `Action "${actionId}" in ACTION_ROUTE_QUALITIES has no definition`, 'major');
      }
    }
  });
  
  it('should have all breakthrough actions have matching rules', () => {
    for (const [actionId, rule] of Object.entries(BREAKTHROUGH_RULES)) {
      if (rule.actionId !== actionId && !ACTIONS[rule.actionId]) {
        reportBug('Breakthrough validation', `Breakthrough rule "${rule.id}" references missing action "${rule.actionId}"`, 'major');
      }
    }
  });
  
  it('should have consistent cost definitions between action and breakthrough rule', () => {
    for (const rule of Object.values(BREAKTHROUGH_RULES)) {
      const action = ACTIONS[rule.actionId];
      if (!action) continue;
      
      // Action cost should be at least as much as breakthrough required resources
      // (They may differ — action cost is what's spent, requiredResources is the gate)
      // But we verify the action exists and has a cost
      if (Object.keys(action.cost).length === 0) {
        reportBug('Breakthrough cost', `Breakthrough action "${rule.actionId}" has no cost`, 'minor');
      }
    }
  });
});

describe('Resource Integrity', () => {
  it('should not allow negative resources after any standard action', () => {
    let state = createInitialState(42);
    state.realm = Realm.QiCondensation;
    state.realmLayer = 1;
    state.currentLocationId = 'home';
    state.resources.essence = 100;
    state.resources.qi = 50;
    state.resources.insight = 10;
    state.choices.qualities.quiet_cultivation = 4;
    state = checkUnlocks(state);
    
    // Try every unlocked action
    const availableActions = getAvailableActionsAtLocation(state);
    for (const actionId of availableActions) {
      const result = performAction(state, actionId, () => 0.5); // moderate rng
      for (const key of RESOURCE_KEYS) {
        if (key === 'lifespan') continue;
        if ((result.state.resources[key] as number) < 0) {
          reportBug('Resource integrity', `Action "${actionId}" caused negative ${key}`, 'major');
        }
      }
    }
  });
});

describe('High-Realm Alchemy Integration', () => {
  it('should handle brewing and consuming golden core pills', () => {
    let state = createInitialState(42);
    state.realm = Realm.GoldenCore;
    state.realmLayer = 1;
    state.currentLocationId = 'home';
    state.resources.essence = 500;
    state.resources.qi = 500;
    state.resources.insight = 100;
    state.resources.herbs = 100;
    state.resources.coins = 200;
    state.choices.qualities.quiet_cultivation = 10;
    state.choices.qualities.alchemy_affinity = 5;
    state = checkUnlocks(state);
    
    // Study golden core formation formula
    if (!state.unlockedActions.includes('study_golden_core_formation_formula')) {
      reportBug('GC Alchemy', 'study_golden_core_formation_formula not unlocked at GoldenCore', 'major');
    }
    
    const studyResult = performAction(state, 'study_golden_core_formation_formula');
    if (!studyResult.state.alchemy.knownRecipeIds.includes('golden_core_formation_pill')) {
      reportBug('GC Alchemy', 'golden_core_formation_pill recipe not learned after study', 'major');
    }
    state = checkUnlocks(studyResult.state);
    
    // Brew golden core formation pill
    if (!state.unlockedActions.includes('brew_golden_core_formation_pill')) {
      reportBug('GC Alchemy', 'brew_golden_core_formation_pill not unlocked after learning recipe', 'major');
    }
    
    const brewResult = performAction(state, 'brew_golden_core_formation_pill', () => 0); // force success
    // Check if goldenCorePills resource was added
    if (brewResult.state.resources.goldenCorePills <= 0) {
      reportBug('GC Alchemy', 'goldenCorePills not added after successful brew', 'major', '> 0', brewResult.state.resources.goldenCorePills);
    }
    
    // BUG CHECK: brewRecipe does not set has_golden_core_formation_pill flag
    // The unlock rule should handle this instead
    state = checkUnlocks(brewResult.state);
    
    // The unlock rule should set the flag when goldenCorePills > 0
    if (!state.choices.flags.has_golden_core_formation_pill) {
      reportBug('GC Alchemy', 'has_golden_core_formation_pill flag not set after brewing (brewRecipe missing flag for high-realm pills)', 'major');
    }
    
    // Take golden core formation pill
    if (!state.unlockedActions.includes('take_golden_core_formation_pill')) {
      reportBug('GC Alchemy', 'take_golden_core_formation_pill not unlocked after brewing', 'major');
    }
    
    if (state.resources.goldenCorePills > 0) {
      const beforeQi = state.resources.qi;
      const takeResult = performAction(state, 'take_golden_core_formation_pill');
      // Golden core formation pill should increase qi
      // Recipe effect: { qi: 35 }, dantoxin: 8
      // BUG CHECK: consumePill doesn't apply qiDelta (affinity/toxicity modifiers) for golden core+ pills
      // because it lacks isGoldenCoreFormationPill etc. flags
      // This means qi gain is always the raw recipe amount regardless of affinity
      if (takeResult.state.resources.qi <= beforeQi) {
        reportBug('GC Alchemy', 'Qi did not increase after taking golden core formation pill', 'major');
      }
      // Dantoxin should increase (recipe.dantoxin = 8)
      if (takeResult.state.resources.dantoxin <= state.resources.dantoxin) {
        reportBug('GC Alchemy', 'Dantoxin did not increase after taking golden core formation pill', 'minor');
      }
      checkNoNegativeResources(takeResult.state, 'After taking golden core formation pill');
    }
  });
  
  it('should handle brewing and consuming nascent soul pills', () => {
    let state = createInitialState(42);
    state.realm = Realm.NascentSoul;
    state.realmLayer = 1;
    state.currentLocationId = 'home';
    state.resources.essence = 500;
    state.resources.qi = 500;
    state.resources.insight = 100;
    state.resources.herbs = 100;
    state.resources.coins = 200;
    state.choices.qualities.alchemy_affinity = 8;
    state = checkUnlocks(state);
    
    // Study and brew nascent soul nurturing pill
    let result = performAction(state, 'study_nascent_soul_nurturing_formula');
    state = checkUnlocks(result.state);
    
    result = performAction(state, 'brew_nascent_soul_nurturing_pill', () => 0);
    state = checkUnlocks(result.state);
    
    if (state.resources.nascentSoulPills <= 0) {
      reportBug('NS Alchemy', 'nascentSoulPills not added after successful brew', 'major');
    }
    
    // Check that has_nascent_soul_nurturing_pill flag is set
    if (!state.choices.flags.has_nascent_soul_nurturing_pill) {
      reportBug('NS Alchemy', 'has_nascent_soul_nurturing_pill flag not set after brewing nascent soul pill (brewRecipe missing flag for high-realm pills)', 'major');
    }
    
    checkNoNegativeResources(state, 'After nascent soul alchemy');
  });
  
  it('should detect brewRecipe inconsistency for high-realm pill has_* flags', () => {
    // brewRecipe sets has_qi_pill, has_stabilizing_powder, etc. for low-tier pills
    // but does NOT set has_golden_core_formation_pill, has_nascent_soul_nurturing_pill, etc.
    // for high-tier pills. The unlock system compensates, but this is an inconsistency
    // that could cause bugs if the unlock system doesn't fire correctly.
    
    const lowTierPillFlags = [
      'has_qi_pill', 'has_stabilizing_powder', 'has_cleansing_pill',
      'has_meridian_cleansing_pill', 'has_foundation_strengthening_pill',
      'has_spirit_gathering_pill', 'has_warm_furnace_pill', 'has_night_sitting_pill',
      'has_cloud_gathering_pill', 'has_iron_body_pill', 'has_demon_bane_pill',
      'has_foundation_explosion_pill', 'has_spirit_vein_pill', 'has_shadow_escape_pill',
      'has_longevity_pill', 'has_fire_furnace_pill', 'has_nine_turn_foundation_pill',
      'has_buddha_heart_pill',
    ];
    
    const highTierPillFlags = [
      'has_golden_core_formation_pill', 'has_golden_core_strengthening_pill', 'has_golden_core_fire_pill',
      'has_nascent_soul_nurturing_pill', 'has_nascent_soul_separation_pill', 'has_nascent_soul_protection_pill',
      'has_spirit_transform_pill', 'has_spirit_transform_fire_pill',
      'has_integration_pill', 'has_integration_body_pill',
      'has_mahayana_pill', 'has_mahayana_enlightenment_pill',
      'has_tribulation_protection_pill', 'has_heavenly_tribulation_pill', 'has_tribulation_soul_pill',
    ];
    
    // The consumePill function has special is*Pill flags for low-tier pills
    // but NOT for high-tier pills. This means high-tier pills miss out on:
    // - qiDelta calculation (affinity bonus, toxicity penalty)
    // - Special flag settings (tasted_*, guarded_breakthrough, etc.)
    // This is a design inconsistency that could affect gameplay balance
    
    // Test: consume golden core formation pill with high dantoxin
    // For low-tier qi pills, toxicityPenalty reduces qi gain
    // For golden core+ pills, consumePill applies raw recipe.effect.qi
    let state = createInitialState(42);
    state.realm = Realm.GoldenCore;
    state.realmLayer = 1;
    state.currentLocationId = 'home';
    state.resources.goldenCorePills = 1;
    state.resources.dantoxin = 50; // High dantoxin
    state.resources.qi = 100;
    state.choices.flags.has_golden_core_formation_pill = true;
    state.cultivation.rootKnown = true;
    state.cultivation.phaseAffinities = { ...state.cultivation.phaseAffinities, [state.cultivation.dominantElement]: 5 };
    
    const takeResult = performAction(state, 'take_golden_core_formation_pill');
    
    // With low-tier pills at dantoxin >= 30, toxicityPenalty = 2, so qi is reduced
    // With golden core+ pills, consumePill doesn't apply toxicityPenalty to qi
    // This means golden core+ pills are MORE effective at high dantoxin than they should be
    // (Inconsistency: not necessarily a bug if intentional, but worth reporting)
    const qiGained = takeResult.state.resources.qi - state.resources.qi;
    // Recipe effect: { qi: 35 }. With low-tier handling: qiDelta = max(1, 35 + affinity - toxicity)
    // Without: qi = 35 (raw). For low-tier, toxicityPenalty at dantoxin=50 would be 2
    // So high-tier pills bypass toxicity penalty on qi gain
    
    // This is a known design inconsistency
    if (qiGained === 35) {
      reportBug('GC Alchemy', 'Golden core+ pills bypass toxicity/affinity qi modifiers (consumePill missing isGoldenCore* flags)', 'minor',
        'qi modified by affinity/toxicity', `raw qi=${qiGained}`);
    }
  });
});

describe('Tick Processing', () => {
  it('should handle batch tick processing without crashing at all realms', () => {
    const realms = [
      Realm.Mortal, Realm.QiCondensation, Realm.FoundationEstablishment,
      Realm.GoldenCore, Realm.NascentSoul, Realm.SpiritTransformation,
      Realm.Integration, Realm.Mahayana, Realm.Tribulation,
    ];
    
    for (const realm of realms) {
      const state = createInitialState(42);
      state.realm = realm;
      state.realmLayer = realm === Realm.Mortal ? 0 : 1;
      state.resources.essence = 100;
      state.resources.qi = 50;
      state.resources.insight = 10;
      
      try {
        const result = processBatchTicks(state, 100);
        checkNoNegativeResources(result, `Batch tick at ${realm}`);
        checkStateConsistency(result, `Batch tick at ${realm}`);
      } catch (e) {
        reportBug('Tick processing', `processBatchTicks crashed at ${realm}: ${(e as Error).message}`, 'critical');
      }
    }
  });
  
  it('should advance time correctly', () => {
    let state = createInitialState(42);
    const initialTick = state.time.tick;
    
    // Perform an action that costs ticks
    state = doAction(state, 'kuzuo');
    
    // Time should have advanced
    if (state.time.tick <= initialTick) {
      reportBug('Tick processing', 'Time did not advance after performing action', 'major');
    }
  });
  
  it('should recover essence over time', () => {
    let state = createInitialState(42);
    state.resources.essence = 10; // Low essence
    
    const result = processBatchTicks(state, 50); // 5 days
    
    // Essence should have recovered
    if (result.resources.essence <= 10) {
      reportBug('Tick processing', 'Essence did not recover over time', 'major');
    }
  });
});

describe('Breakthrough Partial and Failure Path', () => {
  it('should handle partial breakthrough correctly', () => {
    let state = createInitialState(20260507);
    state.realm = Realm.QiCondensation;
    state.realmLayer = 1;
    state.currentLocationId = 'home';
    state.resources.essence = 200;
    state.resources.qi = 200;
    state.resources.insight = 50;
    state.choices.qualities.quiet_cultivation = 4;
    state = checkUnlocks(state);
    state = doAction(state, 'stabilize_bottleneck');
    
    const chance = getBreakthroughSuccessChance(state, BREAKTHROUGH_RULES.qi_layer_2);
    // Force partial by rolling just above success chance but within partial window
    const partialRoll = chance + 0.03;
    
    const result = performAction(state, 'breakthrough_qi_2', () => partialRoll);
    
    // Should be partial - no wounds, no realm change
    if (result.state.realmLayer !== 1) {
      reportBug('Partial breakthrough', 'Partial breakthrough changed realm layer', 'major');
    }
    if (result.state.resources.wounds > 0) {
      reportBug('Partial breakthrough', 'Partial breakthrough caused wounds', 'major');
    }
    if (!result.state.choices.flags.half_broke_qi_layer_2) {
      reportBug('Partial breakthrough', 'half_broke_qi_layer_2 flag not set', 'major');
    }
    // Preparation should increase
    if ((result.state.breakthrough.preparation.qi_layer_2 ?? 0) <= (state.breakthrough.preparation.qi_layer_2 ?? 0)) {
      reportBug('Partial breakthrough', 'Preparation did not increase on partial breakthrough', 'minor');
    }
    
    checkNoNegativeResources(result.state, 'After partial breakthrough');
  });
  
  it('should not allow breakthrough without preparation', () => {
    let state = createInitialState(42);
    state.realm = Realm.QiCondensation;
    state.realmLayer = 1;
    state.currentLocationId = 'home';
    state.resources.essence = 200;
    state.resources.qi = 200;
    state.resources.insight = 50;
    
    // Without stabilizing bottleneck, breakthrough action should not be available
    if (state.unlockedActions.includes('breakthrough_qi_2')) {
      reportBug('Breakthrough gate', 'breakthrough_qi_2 is unlocked without preparation', 'major');
    }
    
    // Attempting breakthrough without required flags should fail
    const result = performAction(state, 'breakthrough_qi_2');
    if (result.success) {
      reportBug('Breakthrough gate', 'breakthrough_qi_2 succeeded without required flags', 'critical');
    }
  });
});

describe('Additional Edge Cases', () => {
  it('should handle sect_trace going negative from leaveSect', () => {
    let state = createInitialState(42);
    state.sect.rank = 'outer';
    state.choices.qualities.sect_trace = 2; // Low sect_trace
    
    state = leaveSect(state);
    
    // sect_trace should not go below 0 (or is negative allowed?)
    if ((state.choices.qualities.sect_trace ?? 0) < 0) {
      reportBug('Sect edge', 'sect_trace went negative after leaveSect (-5 penalty)', 'minor',
        '>= 0', state.choices.qualities.sect_trace);
    }
  });
  
  it('should handle double dantoxin from golden core fire pill', () => {
    // take_golden_core_fire_pill handler adds dantoxin +3 AFTER consumePill
    // consumePill already adds recipe.dantoxin (from the recipe effect)
    // So there's potential double-dantoxin if consumePill adds recipe.dantoxin AND the handler adds more
    let state = createInitialState(42);
    state.realm = Realm.GoldenCore;
    state.realmLayer = 1;
    state.currentLocationId = 'home';
    state.resources.goldenCorePills = 1;
    state.resources.dantoxin = 0;
    state.resources.qi = 100;
    state.resources.essence = 100;
    state.choices.flags.has_golden_core_fire_pill = true;
    state = checkUnlocks(state);
    
    const beforeDantoxin = state.resources.dantoxin;
    const result = performAction(state, 'take_golden_core_fire_pill');
    
    // Golden core fire pill: recipe.dantoxin = ?, handler adds +3
    // Check if dantoxin increase is reasonable
    const dantoxinGain = result.state.resources.dantoxin - beforeDantoxin;
    // If the recipe also has dantoxin in its effect field AND recipe.dantoxin is set,
    // consumePill could add dantoxin twice
    if (dantoxinGain > 15) {
      reportBug('GC Fire Pill', `Unusually high dantoxin gain (${dantoxinGain}) from golden core fire pill - possible double application`, 'minor',
        'reasonable amount', dantoxinGain);
    }
    
    checkNoNegativeResources(result.state, 'After golden core fire pill');
  });
  
  it('should handle lifespan reaching zero correctly', () => {
    let state = createInitialState(42);
    state.resources.lifespan = 5; // Very low
    
    const result = processBatchTicks(state, 10);
    
    if (!result.choices.flags.game_over) {
      reportBug('Lifespan edge', 'Game over not triggered when lifespan reaches zero', 'critical');
    }
    if (result.choices.tags.game_over_reason !== 'lifespan') {
      reportBug('Lifespan edge', 'Game over reason not "lifespan"', 'major');
    }
    // Lifespan should be clamped at 0, not negative
    if (result.resources.lifespan < 0) {
      reportBug('Lifespan edge', 'Lifespan went below 0', 'major', 0, result.resources.lifespan);
    }
  });
  
  it('should handle simultaneous wound and lifespan game over', () => {
    let state = createInitialState(42);
    state.resources.lifespan = 1;
    state.resources.wounds = 10;
    
    const result = processBatchTicks(state, 10);
    
    // Should have game_over flag, regardless of which condition triggered first
    if (!result.choices.flags.game_over) {
      reportBug('Dual game over', 'Game over not triggered with both wounds >= 10 and lifespan <= 0', 'critical');
    }
  });
  
  it('should handle failTask discipline going negative', () => {
    let state = createInitialState(42);
    state.sect.rank = 'outer';
    state.sect.discipline = 0;
    
    state = failTask(state);
    
    if (state.sect.discipline < 0) {
      reportBug('Sect discipline', 'Discipline went negative after failTask', 'minor',
        '>= 0', state.sect.discipline);
    }
  });
  
  it('should handle all actions with ACTION_ROUTE_QUALITIES having valid quality strings', () => {
    const validQualities = new Set([
      'quiet_cultivation', 'alchemy_affinity', 'combat_edge', 'market_ties', 'sect_trace',
      'reckless_breakthrough',
    ]);
    
    for (const [actionId, quality] of Object.entries(ACTION_ROUTE_QUALITIES)) {
      if (!validQualities.has(quality)) {
        reportBug('Action quality', `Action "${actionId}" has unrecognized route quality "${quality}"`, 'major');
      }
    }
  });
  
  it('should not crash when performing actions at wrong realm', () => {
    let state = createInitialState(42);
    state.realm = Realm.Mortal;
    state.realmLayer = 0;
    state.resources.essence = 500;
    state.resources.qi = 500;
    state.resources.insight = 100;
    
    // Try high-realm actions while at Mortal
    const highRealmActions = [
      'foundation_daily_practice', 'golden_core_practice', 'nascent_soul_practice',
      'spirit_transformation_practice', 'integration_practice', 'mahayana_practice',
      'tribulation_practice',
    ];
    
    for (const actionId of highRealmActions) {
      try {
        const result = performAction(state, actionId);
        if (result.success) {
          reportBug('Realm gate', `Action "${actionId}" succeeded at Mortal realm (should require higher realm)`, 'critical');
        }
      } catch (e) {
        reportBug('Realm gate', `Action "${actionId}" crashed at Mortal realm: ${(e as Error).message}`, 'critical');
      }
    }
  });
});

describe('Bug Report Summary', () => {
  it('should print all discovered bugs', () => {
    // This test always passes; it just prints the bug summary
    if (bugs.length > 0) {
      console.log('\n' + '='.repeat(80));
      console.log(`BUG REPORT: ${bugs.length} bug(s) found during playtest`);
      console.log('='.repeat(80));
      
      const critical = bugs.filter(b => b.severity === 'critical');
      const major = bugs.filter(b => b.severity === 'major');
      const minor = bugs.filter(b => b.severity === 'minor');
      
      if (critical.length > 0) {
        console.log(`\n🔴 CRITICAL (${critical.length}):`);
        for (const bug of critical) {
          console.log(`  [${bug.step}] ${bug.description}`);
          if (bug.expected !== undefined) console.log(`    Expected: ${JSON.stringify(bug.expected)}`);
          if (bug.actual !== undefined) console.log(`    Actual: ${JSON.stringify(bug.actual)}`);
        }
      }
      
      if (major.length > 0) {
        console.log(`\n🟠 MAJOR (${major.length}):`);
        for (const bug of major) {
          console.log(`  [${bug.step}] ${bug.description}`);
          if (bug.expected !== undefined) console.log(`    Expected: ${JSON.stringify(bug.expected)}`);
          if (bug.actual !== undefined) console.log(`    Actual: ${JSON.stringify(bug.actual)}`);
        }
      }
      
      if (minor.length > 0) {
        console.log(`\n🟡 MINOR (${minor.length}):`);
        for (const bug of minor) {
          console.log(`  [${bug.step}] ${bug.description}`);
          if (bug.expected !== undefined) console.log(`    Expected: ${JSON.stringify(bug.expected)}`);
          if (bug.actual !== undefined) console.log(`    Actual: ${JSON.stringify(bug.actual)}`);
        }
      }
      
      console.log('='.repeat(80) + '\n');
    } else {
      console.log('\n✅ No bugs found during playtest!\n');
    }
    
    expect(true).toBe(true);
  });
});
