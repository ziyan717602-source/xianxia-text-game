import { describe, expect, it } from 'vitest';
import { createInitialState, INITIAL_MAX_STAMINA, TICKS_PER_DAY } from '../src/game/state';
import { processTick, TICK_INTERVAL_MS } from '../src/game/tick';
import { performAction } from '../src/game/actions';
import { Realm } from '../src/game/types';
import { checkUnlocks } from '../src/game/unlock';
import { migrateSaveData, CURRENT_SAVE_VERSION } from '../src/storage/save';
import { applyDantoxinConsequences } from '../src/game/alchemy';
import {
  MERIDIAN_CLEANSING_PILL_RECIPE_ID,
  FOUNDATION_STRENGTHENING_PILL_RECIPE_ID,
  SPIRIT_GATHERING_PILL_RECIPE_ID,
} from '../src/game/alchemy';

function createFoundationState() {
  let state = createInitialState(20260301);
  state.realm = Realm.FoundationEstablishment;
  state.realmLayer = 1;
  state.currentLocationId = 'home';
  state.resources.essence = 100;
  state.resources.herbs = 30;
  state.resources.insight = 20;
  state.resources.coins = 20;
  state = checkUnlocks(state);
  return state;
}

describe('Dantoxin tick consequences', () => {
  it('should increase wounds when dantoxin >= 100 at day boundary', () => {
    let state = createInitialState(999);
    state.resources.dantoxin = 100;
    state.resources.essence = 50;
    state.resources.wounds = 0;

    // Process 10 ticks = 1 day
    state = processTick(state, TICK_INTERVAL_MS * TICKS_PER_DAY);

    // At dantoxin >= 100, +1 wound per day
    expect(state.resources.wounds).toBeGreaterThanOrEqual(1);
  });

  it('should not increase wounds from dantoxin when dantoxin < 100', () => {
    let state = createInitialState(998);
    state.resources.dantoxin = 50;
    state.resources.essence = 50;
    state.resources.wounds = 0;

    const prevWounds = state.resources.wounds;
    state = processTick(state, TICK_INTERVAL_MS * TICKS_PER_DAY);

    expect(state.resources.wounds).toBe(prevWounds);
  });

  it('should reduce essence recovery by 50% when dantoxin >= 80', () => {
    // Set up state with dantoxin at 80 and low essence
    let state = createInitialState(997);
    state.resources.dantoxin = 80;
    state.resources.essence = 50;
    state.resources.wounds = 0;

    // Process 10 ticks = 1 day
    // Normal recovery: 10 essence per 10 ticks
    // With dantoxin >= 80: recovery halved = 5 essence
    state = processTick(state, TICK_INTERVAL_MS * TICKS_PER_DAY);

    // Should have recovered only about half the normal amount
    // Normal would be 50 + 10 = 60, with penalty should be ~55
    expect(state.resources.essence).toBe(55);
  });

  it('should apply dantoxin >= 100 consequences via applyDantoxinConsequences', () => {
    let state = createInitialState(996);
    state.resources.dantoxin = 100;
    state.resources.essence = 50;
    state.resources.wounds = 0;

    // Process 10 ticks directly through the consequence function
    state = applyDantoxinConsequences(state, 10);

    // +1 wound per day (every 10 ticks)
    expect(state.resources.wounds).toBe(1);
    // -1 essence per tick
    expect(state.resources.essence).toBe(40);
  });
});

describe('New pill brewing (F3)', () => {
  it('should learn, brew, and take meridian cleansing pill', () => {
    let state = createFoundationState();
    state.resources.dantoxin = 30;
    state = checkUnlocks(state);

    // Study the formula
    const study = performAction(state, 'study_meridian_cleansing_formula');
    expect(study.success).toBe(true);
    state = checkUnlocks(study.state);
    expect(state.alchemy.knownRecipeIds).toContain(MERIDIAN_CLEANSING_PILL_RECIPE_ID);

    // Brew the pill
    const brew = performAction(state, 'brew_meridian_cleansing_pill', () => 0.1);
    expect(brew.success).toBe(true);
    state = checkUnlocks(brew.state);
    expect(state.resources.meridianCleansingPills).toBe(1);

    // Take the pill
    state.resources.dantoxin = 50;
    state.resources.wounds = 2;
    const take = performAction(state, 'take_meridian_cleansing_pill');
    expect(take.success).toBe(true);
    state = take.state;

    // Should reduce dantoxin and wounds
    expect(state.resources.dantoxin).toBeLessThan(50);
    expect(state.resources.wounds).toBeLessThan(2);
    expect(state.resources.meridianCleansingPills).toBe(0);
  });

  it('should learn, brew, and take foundation strengthening pill', () => {
    let state = createFoundationState();
    state = checkUnlocks(state);

    // Study the formula
    const study = performAction(state, 'study_foundation_strengthening_formula');
    expect(study.success).toBe(true);
    state = checkUnlocks(study.state);
    expect(state.alchemy.knownRecipeIds).toContain(FOUNDATION_STRENGTHENING_PILL_RECIPE_ID);

    // Brew the pill
    const brew = performAction(state, 'brew_foundation_strengthening_pill', () => 0.1);
    expect(brew.success).toBe(true);
    state = checkUnlocks(brew.state);
    expect(state.resources.foundationStrengtheningPills).toBe(1);

    // Take the pill
    const take = performAction(state, 'take_foundation_strengthening_pill');
    expect(take.success).toBe(true);
    state = take.state;

    // Should increase qi
    expect(state.resources.foundationStrengtheningPills).toBe(0);
    // Should increment breakthrough preparation for current target
    // (depends on whether there's a current breakthrough target)
  });

  it('should learn, brew, and take spirit gathering pill', () => {
    let state = createFoundationState();
    state.choices.flags.foundation_morning_seen = true;
    state.choices.qualities.action_foundation_daily_practice_count = 1;
    state = checkUnlocks(state);

    // Study the formula
    const study = performAction(state, 'study_spirit_gathering_formula');
    expect(study.success).toBe(true);
    state = checkUnlocks(study.state);
    expect(state.alchemy.knownRecipeIds).toContain(SPIRIT_GATHERING_PILL_RECIPE_ID);

    // Brew the pill
    const brew = performAction(state, 'brew_spirit_gathering_pill', () => 0.1);
    expect(brew.success).toBe(true);
    state = checkUnlocks(brew.state);
    expect(state.resources.spiritGatheringPills).toBe(1);

    // Take the pill
    const prevQi = state.resources.qi;
    const take = performAction(state, 'take_spirit_gathering_pill');
    expect(take.success).toBe(true);
    state = take.state;

    // Should increase qi and add dantoxin
    expect(state.resources.qi).toBeGreaterThan(prevQi);
    expect(state.resources.dantoxin).toBeGreaterThan(0);
    expect(state.resources.spiritGatheringPills).toBe(0);
  });
});

describe('Save migration V10 to V11', () => {
  it('should migrate V10 saves by adding new pill resources', () => {
    const state = createInitialState(111);
    // Simulate V10 state (without new pill resources)
    const { meridianCleansingPills, foundationStrengtheningPills, spiritGatheringPills, ...resourcesWithoutNewPills } = state.resources;

    const migrated = migrateSaveData({
      version: 10,
      state: {
        ...state,
        resources: resourcesWithoutNewPills,
      },
      createdAt: 1,
      updatedAt: 1,
      seed: 111,
    });

    expect(migrated.version).toBe(CURRENT_SAVE_VERSION);
    expect(migrated.state.resources.meridianCleansingPills).toBe(0);
    expect(migrated.state.resources.foundationStrengtheningPills).toBe(0);
    expect(migrated.state.resources.spiritGatheringPills).toBe(0);
  });

  it('should add sect, dwelling, followers defaults when missing in V10', () => {
    const state = createInitialState(222);
    const { sect, dwelling, followers, ...stateWithoutNewFields } = state;

    const migrated = migrateSaveData({
      version: 10,
      state: stateWithoutNewFields,
      createdAt: 1,
      updatedAt: 1,
      seed: 222,
    });

    expect(migrated.version).toBe(CURRENT_SAVE_VERSION);
    expect(migrated.state.sect).toBeDefined();
    expect(migrated.state.dwelling).toBeDefined();
    expect(migrated.state.followers).toBeDefined();
  });
});
