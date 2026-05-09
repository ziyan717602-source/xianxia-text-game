import { describe, it, expect } from 'vitest';
import {
  createInitialState,
  INITIAL_MAX_STAMINA,
  TICKS_PER_DAY,
  DAYS_PER_YEAR,
  getMaxStamina,
} from '../src/game/state';
import { processBatchTicks, STAMINA_RECOVERY_PER_TICK } from '../src/game/tick';
import { Realm } from '../src/game/types';

describe('processBatchTicks — batch offline settlement', () => {
  it('should return unchanged state for 0 elapsed ticks', () => {
    const state = createInitialState(42);
    const result = processBatchTicks(state, 0);
    expect(result.time.tick).toBe(state.time.tick);
    expect(result.resources.lifespan).toBe(state.resources.lifespan);
    expect(result.resources.essence).toBe(state.resources.essence);
  });

  it('should return unchanged state for negative elapsed ticks', () => {
    const state = createInitialState(42);
    const result = processBatchTicks(state, -100);
    expect(result.time.tick).toBe(state.time.tick);
  });

  it('should process 100 ticks correctly', () => {
    const state = createInitialState(42);
    const initialLifespan = state.resources.lifespan;
    const initialEssence = state.resources.essence;

    const result = processBatchTicks(state, 100);

    // Tick should advance by 100
    expect(result.time.tick).toBe(100);

    // Lifespan should decay by 100 * 1.0 (Mortal rate)
    expect(result.resources.lifespan).toBe(initialLifespan - 100);

    // Essence should recover by 100, capped at max
    const expectedEssence = Math.min(INITIAL_MAX_STAMINA, initialEssence + 100);
    expect(result.resources.essence).toBe(expectedEssence);
  });

  it('should process 1000 ticks correctly', () => {
    const state = createInitialState(42);
    const initialLifespan = state.resources.lifespan;

    const result = processBatchTicks(state, 1000);

    // Tick should advance by 1000
    expect(result.time.tick).toBe(1000);

    // Lifespan should decay by 1000 * 1.0 (Mortal rate)
    expect(result.resources.lifespan).toBe(initialLifespan - 1000);

    // Essence should be capped at max (100 for Mortal)
    expect(result.resources.essence).toBe(INITIAL_MAX_STAMINA);
  });

  it('should clamp essence to max and not exceed it', () => {
    const state = createInitialState(42);
    // Essence starts at 100 (max for Mortal)
    expect(state.resources.essence).toBe(INITIAL_MAX_STAMINA);

    const result = processBatchTicks(state, 10000);
    // Should not exceed max even with massive tick count
    expect(result.resources.essence).toBe(INITIAL_MAX_STAMINA);
  });

  it('should clamp essence to 0 minimum', () => {
    const state = createInitialState(42);
    state.resources.essence = 0;
    // With high dantoxin, essence can go negative, but should be clamped to 0
    state.resources.dantoxin = 100;
    const result = processBatchTicks(state, 100);
    expect(result.resources.essence).toBeGreaterThanOrEqual(0);
  });

  it('should clamp lifespan to 0 minimum', () => {
    const state = createInitialState(42);
    state.resources.lifespan = 5;

    const result = processBatchTicks(state, 100);

    expect(result.resources.lifespan).toBe(0);
    expect(result.choices.flags.game_over).toBe(true);
    expect(result.choices.tags.game_over_reason).toBe('lifespan');
  });

  it('should apply realm-based lifespan decay rate', () => {
    const mortalState = createInitialState(42);
    mortalState.resources.essence = 200; // ensure enough essence
    const gcState = createInitialState(42);
    gcState.realm = Realm.GoldenCore;
    gcState.resources.essence = 200;

    const mortalResult = processBatchTicks(mortalState, 1000);
    const gcResult = processBatchTicks(gcState, 1000);

    // GoldenCore has 0.5 decay rate vs Mortal's 1.0
    const mortalDecay = mortalState.resources.lifespan - mortalResult.resources.lifespan;
    const gcDecay = gcState.resources.lifespan - gcResult.resources.lifespan;

    expect(mortalDecay).toBe(1000);
    expect(gcDecay).toBe(500); // 0.5 rate
  });

  it('should process dwelling auto-income correctly for multiple days', () => {
    let state = createInitialState(42);
    state.realm = Realm.FoundationEstablishment;
    state.realmLayer = 1;
    state.dwelling = {
      level: 1,
      formationLevel: 0,
      autoQiPerDay: 2,
      formationBonus: 0,
      upgradeCost: {},
    };

    const initialQi = state.resources.qi;
    // 100 ticks = 10 days
    const result = processBatchTicks(state, 100);

    // Dwelling level 1 gives 2 qi per day
    // 10 days passed → 20 qi
    expect(result.resources.qi).toBe(initialQi + 20);
  });

  it('should process dwelling auto-income for large tick counts', () => {
    let state = createInitialState(42);
    state.realm = Realm.FoundationEstablishment;
    state.realmLayer = 1;
    state.dwelling = {
      level: 2,
      formationLevel: 0,
      autoQiPerDay: 5,
      formationBonus: 0,
      upgradeCost: {},
    };

    const initialQi = state.resources.qi;
    // 1000 ticks = 100 days
    const result = processBatchTicks(state, 1000);

    // 100 days * 5 qi/day = 500 qi
    // Dwelling level 2 also gives insight: floor(2/2) = 1 per day → 100 insight
    expect(result.resources.qi).toBe(initialQi + 500);
    expect(result.resources.insight).toBeGreaterThanOrEqual(100);
  });

  it('should remove followers with 0 loyalty in a single pass', () => {
    const state = createInitialState(42);
    state.realm = Realm.FoundationEstablishment;
    state.realmLayer = 1;
    state.dwelling = {
      level: 1,
      formationLevel: 0,
      autoQiPerDay: 2,
      formationBonus: 0,
      upgradeCost: {},
    };
    state.followers = {
      followers: {
        f1: { id: 'f1', name: '阿福', role: 'servant', loyalty: 0, skill: 3, taskAssignment: null, accumulatedIncome: { herbs: 0, coins: 0, qi: 0 } },
        f2: { id: 'f2', name: '小石', role: 'servant', loyalty: 50, skill: 2, taskAssignment: null, accumulatedIncome: { herbs: 0, coins: 0, qi: 0 } },
      },
      maxFollowers: 1,
    };

    // Process enough ticks to span many days (100 ticks = 10 days)
    const result = processBatchTicks(state, 100);

    // f1 should be removed (loyalty 0), f2 should remain
    expect(result.followers.followers['f1']).toBeUndefined();
    expect(result.followers.followers['f2']).toBeDefined();
    expect(result.followers.followers['f2'].loyalty).toBe(50);
  });

  it('should not infinite loop — 1000 ticks completes quickly', () => {
    const state = createInitialState(42);
    const start = performance.now();
    const result = processBatchTicks(state, 1000);
    const elapsed = performance.now() - start;

    // Should complete in well under 100ms (no per-tick loop)
    expect(elapsed).toBeLessThan(100);
    expect(result.time.tick).toBe(1000);
  });

  it('should not infinite loop — 10000 ticks completes quickly', () => {
    const state = createInitialState(42);
    const start = performance.now();
    const result = processBatchTicks(state, 10000);
    const elapsed = performance.now() - start;

    // Should still complete quickly (no per-tick or per-day loop)
    expect(elapsed).toBeLessThan(100);
    expect(result.time.tick).toBe(10000);
  });

  it('should handle inner demon trigger in batch mode', () => {
    let state = createInitialState(42);
    // Set up conditions for demon of rashness
    state.realm = Realm.QiCondensation;
    state.choices.qualities.reckless_breakthrough = 5;
    state.resources.dantoxin = 30;
    state.resources.qi = 100;
    state.resources.lifespan = 50000;

    // Process 100 ticks (10 days)
    const result = processBatchTicks(state, 100);

    // The demon should have been triggered (conditions are met)
    // Demon of rashness has progressIncrement = 15
    // With 10 days: first check gives 15, remaining 9 days add 15*9 = 135
    // Total = 15 + 135 = 150, capped at 100 → consequences applied
    // After consequences, demon clears but re-triggers (not in suppressedDemons)
    // due to conditions still being met. After cascade: demon may be re-triggered
    // with lower progress.
    // The key check is that consequences were applied (wounds increased)
    expect(result.resources.wounds).toBeGreaterThan(0);
  });

  it('should scale inner demon progress with elapsed days', () => {
    let state = createInitialState(42);
    // Set up conditions for demon of rashness
    state.realm = Realm.QiCondensation;
    state.choices.qualities.reckless_breakthrough = 5;
    state.resources.dantoxin = 30;
    state.resources.qi = 100; // enough qi to survive demon consequence

    // Process only 10 ticks (1 day) — demon should trigger but not reach 100
    const result1Day = processBatchTicks(state, 10);
    // 1 day: trigger gives 15 progress, no remaining days → progress = 15
    // But wait, with only 1 day, remainingChecks = 0, so progress = 15
    expect(result1Day.innerDemon.activeDemon).toBe('demon_of_rashness');
    expect(result1Day.innerDemon.demonProgress).toBe(15);

    // Process 20 ticks (2 days) — progress should be higher
    const result2Days = processBatchTicks(state, 20);
    // 2 days: trigger gives 15, remaining 1 day adds 15 → 30
    expect(result2Days.innerDemon.activeDemon).toBe('demon_of_rashness');
    expect(result2Days.innerDemon.demonProgress).toBe(30);
  });

  it('should handle existing active demon in batch mode', () => {
    let state = createInitialState(42);
    state.realm = Realm.QiCondensation;
    state.choices.qualities.reckless_breakthrough = 5;
    state.resources.dantoxin = 30;
    // Pre-activate a demon
    state.innerDemon = {
      activeDemon: 'demon_of_rashness',
      demonProgress: 30,
      suppressedDemons: [],
    };

    // Process 30 ticks (3 days)
    const result = processBatchTicks(state, 30);

    // checkDemonTrigger increments by 15 (first day) + 15*2 (remaining 2 days) = 45
    // Total: 30 + 45 = 75 (but checkDemonTrigger adds 15 to existing 30 = 45,
    // then batch adds 15*2 = 30 more → 75)
    expect(result.innerDemon.activeDemon).toBe('demon_of_rashness');
    expect(result.innerDemon.demonProgress).toBe(75);
  });

  it('should apply demon consequences when progress reaches 100 in batch', () => {
    let state = createInitialState(42);
    state.realm = Realm.QiCondensation;
    state.choices.qualities.reckless_breakthrough = 5;
    state.resources.dantoxin = 30;
    state.resources.qi = 50;
    state.resources.lifespan = 50000;
    // Pre-activate a demon at high progress
    state.innerDemon = {
      activeDemon: 'demon_of_rashness',
      demonProgress: 80,
      suppressedDemons: [],
    };

    // Process 10 ticks (1 day) — 80 + 15 = 95, not enough
    const result1 = processBatchTicks(state, 10);
    expect(result1.innerDemon.demonProgress).toBe(95);
    expect(result1.innerDemon.activeDemon).toBe('demon_of_rashness');

    // Process 20 ticks (2 days) — progress will exceed 100 → consequences applied
    // After consequences, demon clears but may re-trigger since conditions persist
    // and demon_of_rashness is NOT added to suppressedDemons by applyDemonConsequence
    const result2 = processBatchTicks(state, 20);
    // The important thing is that consequences were applied (wounds increased)
    expect(result2.resources.wounds).toBeGreaterThan(0);
    // Demon progress should be lower than 100 after cascade resolution
    expect(result2.innerDemon.demonProgress).toBeLessThan(100);
  });

  it('should correctly compute day boundaries for tick offsets', () => {
    const state = createInitialState(42);
    // Starting at tick 0, 10 ticks = 1 day boundary
    const result = processBatchTicks(state, TICKS_PER_DAY);
    expect(result.time.tick).toBe(TICKS_PER_DAY);
  });

  it('should handle mid-day starting points', () => {
    let state = createInitialState(42);
    state = { ...state, time: { ...state.time, tick: 5 } }; // mid-day

    // 5 more ticks to reach day boundary (tick 10)
    const result = processBatchTicks(state, 5);
    expect(result.time.tick).toBe(10);
  });

  it('should set game_over for wounds >= 10', () => {
    let state = createInitialState(42);
    state.resources.wounds = 9;
    state.resources.dantoxin = 100; // dantoxin >= 100 adds wounds per day

    // 10 days of dantoxin >= 100 → 10 wounds added
    const result = processBatchTicks(state, 100);
    // 9 initial + 10 from dantoxin = 19 wounds, but capped check at >= 10
    expect(result.resources.wounds).toBeGreaterThanOrEqual(10);
    expect(result.choices.flags.game_over).toBe(true);
    expect(result.choices.tags.game_over_reason).toBe('wounds');
  });

  it('should produce consistent results — batch matches iterative for simple cases', async () => {
    const { processTick: processTickIter } = await import('../src/game/tick');
    const state1 = createInitialState(42);
    const state2 = createInitialState(42);

    // Process 10 ticks via batch
    const batchResult = processBatchTicks(state1, 10);

    // Process 10 ticks via iterative processTick calls (1 tick each)
    let iterResult = state2;
    for (let i = 0; i < 10; i++) {
      iterResult = processTickIter(iterResult, 1000);
    }

    // Key resources should match
    expect(batchResult.resources.lifespan).toBe(iterResult.resources.lifespan);
    expect(batchResult.resources.essence).toBe(iterResult.resources.essence);
    expect(batchResult.time.tick).toBe(iterResult.time.tick);
  });
});
