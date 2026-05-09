import { describe, it, expect } from 'vitest';
import { performAction } from '../src/game/actions';
import { createInitialState, createRng, TICKS_PER_DAY, DAYS_PER_YEAR, REALM_LIFESPAN_YEARS } from '../src/game/state';
import { processTick, processBatchTicks } from '../src/game/tick';
import { checkUnlocks } from '../src/game/unlock';
import { getAvailableActionsAtLocation } from '../src/game/location';
import { stabilizeBreakthrough, resolveBreakthrough } from '../src/game/breakthrough';
import { EVENTS } from '../src/content/events';
import { ACTIONS } from '../src/content/actions';
import { Realm, Resources } from '../src/game/types';
import { RESOURCE_KEYS } from '../src/game/resources';

// Fixed seed for deterministic test results
const TEST_SEED = 42;

/**
 * Helper: simulate performing an action N times with ticks between each.
 * Uses a fixed RNG to avoid random risk failures.
 */
function simulateActions(
  state: ReturnType<typeof createInitialState>,
  actionId: string,
  count: number,
): { state: ReturnType<typeof createInitialState>; successCount: number; failCount: number } {
  let current = state;
  let successCount = 0;
  let failCount = 0;
  const rng = createRng(TEST_SEED, current.time.tick);

  for (let i = 0; i < count; i++) {
    const result = performAction(current, actionId, () => rng());
    if (result.success) {
      successCount++;
      current = checkUnlocks(result.state);
    } else {
      failCount++;
      // Even on failure the state may have changed (e.g. cooldown ticks)
      current = checkUnlocks(result.state);
    }
  }

  return { state: current, successCount, failCount };
}

/**
 * Helper: perform a single action with deterministic RNG and unlock check.
 * Uses () => 0.9 by default to avoid risk failures (any action with
 * riskProbability < 0.9 will succeed).
 */
function doAction(
  state: ReturnType<typeof createInitialState>,
  actionId: string,
  rngOverride?: () => number,
): ReturnType<typeof createInitialState> {
  const rng = rngOverride ?? (() => 0.9);
  const result = performAction(state, actionId, rng);
  return checkUnlocks(result.state);
}

/**
 * Helper: advance N ticks, processing them in batches.
 */
function advanceTicks(
  state: ReturnType<typeof createInitialState>,
  count: number,
): ReturnType<typeof createInitialState> {
  return processBatchTicks(state, count);
}

/**
 * Helper: ensure enough essence for an action by using tiaoxi (调息).
 */
function ensureEssence(
  state: ReturnType<typeof createInitialState>,
  needed: number,
): ReturnType<typeof createInitialState> {
  let current = state;
  while (current.resources.essence < needed) {
    current = doAction(current, 'tiaoxi');
  }
  return current;
}

/**
 * Helper: verify no resource is negative (except lifespan which can be 0).
 */
function assertNoNegativeResources(state: ReturnType<typeof createInitialState>, context: string) {
  for (const key of RESOURCE_KEYS) {
    if (key === 'lifespan') continue; // lifespan handled separately
    expect(state.resources[key], `${context}: ${key} should not be negative`).toBeGreaterThanOrEqual(0);
  }
}

/**
 * Helper: trigger the find_jade_slip event to unlock tuna/tiaoxi/caiyao/xunshan.
 */
function triggerJadeSlip(state: ReturnType<typeof createInitialState>): ReturnType<typeof createInitialState> {
  const jadeSlip = EVENTS.find((e) => e.id === 'find_jade_slip')!;
  state = jadeSlip.choices[0].effect(state).state;
  return checkUnlocks(state);
}

/**
 * Helper: calculate remaining lifespan in years.
 */
function lifespanYears(state: ReturnType<typeof createInitialState>): number {
  return state.resources.lifespan / (TICKS_PER_DAY * DAYS_PER_YEAR);
}

// ============================================================================
// Route 1: Mortal → Qi Condensation (引气)
// ============================================================================
describe('Route 1: Mortal → Qi Condensation (引气)', () => {
  it('should progress from mortal to QiCondensation through actual gameplay', () => {
    let state = createInitialState(TEST_SEED);

    // Verify starting state
    expect(state.realm).toBe(Realm.Mortal);
    expect(state.resources.qi).toBe(0);
    expect(state.resources.insight).toBe(0);
    expect(state.unlockedActions).toEqual(['kuzuo']);

    // Step 1: Build initial insight through kuzuo (枯坐)
    // kuzuo costs 5 essence, gives 1 insight
    // Need at least 2 insight for jade slip, but we'll build 3+ for yinqi later
    for (let i = 0; i < 4; i++) {
      state = ensureEssence(state, 5);
      state = doAction(state, 'kuzuo');
    }
    expect(state.resources.insight).toBeGreaterThanOrEqual(4);

    // Step 2: Trigger jade slip event to unlock tuna/tiaoxi
    state = triggerJadeSlip(state);
    expect(state.choices.flags.found_jade_slip).toBe(true);
    expect(state.unlockedActions).toContain('tuna');
    expect(state.unlockedActions).toContain('tiaoxi');

    // Step 3: Build qi through tuna (吐纳) — need 10 tuna for rike_tuna unlock
    // Use () => 0.9 RNG to avoid risk failures on any risky actions
    for (let i = 0; i < 10; i++) {
      state = ensureEssence(state, 10);
      state = doAction(state, 'tuna', () => 0.9);
    }
    state = checkUnlocks(state);

    // Verify rike_tuna unlocked after 10 tuna
    expect(getAvailableActionsAtLocation(state)).toContain('rike_tuna');

    // Step 4: Complete at least one rike_tuna to get the completed_rike_tuna flag
    state = ensureEssence(state, 60);
    state = doAction(state, 'rike_tuna', () => 0.9);
    expect(state.choices.flags.completed_rike_tuna).toBe(true);
    state = checkUnlocks(state);

    // Step 5: Verify yinqi action is available
    // Requires: qi >= 15, insight >= 3, completed_rike_tuna flag
    // We should have enough qi from tuna/rike_tuna
    expect(state.resources.qi).toBeGreaterThanOrEqual(15);
    expect(state.resources.insight).toBeGreaterThanOrEqual(3);
    expect(getAvailableActionsAtLocation(state)).toContain('yinqi');

    // Step 6: Perform the breakthrough to Qi Condensation
    state = ensureEssence(state, 30);
    state = doAction(state, 'yinqi', () => 0.9);

    // Verify breakthrough succeeded
    expect(state.realm).toBe(Realm.QiCondensation);
    expect(state.realmLayer).toBe(1);
    expect(state.choices.flags.entered_qi_condensation).toBe(true);

    // Verify new actions unlock naturally
    state = checkUnlocks(state);
    expect(state.unlockedActions).toContain('inspect_root');
    expect(state.unlockedActions).toContain('tuna');

    // Verify lifespan is reasonable — QiCondensation gets 100 years
    const yearsLeft = lifespanYears(state);
    expect(yearsLeft).toBeGreaterThan(50);
  });

  it('should have caiyao available after reaching QiCondensation with proper unlocks', () => {
    let state = createInitialState(TEST_SEED);

    // Quick path to QiCondensation
    state = doAction(state, 'kuzuo');
    state = doAction(state, 'kuzuo');
    state = triggerJadeSlip(state);
    for (let i = 0; i < 10; i++) {
      state = ensureEssence(state, 10);
      state = doAction(state, 'tuna');
    }
    state = checkUnlocks(state);
    state = ensureEssence(state, 60);
    state = doAction(state, 'rike_tuna');
    state = checkUnlocks(state);
    state = ensureEssence(state, 30);
    state = doAction(state, 'yinqi');
    state = checkUnlocks(state);

    // caiyao should be available (unlocked via mountain_actions + jade_slip)
    expect(state.unlockedActions).toContain('caiyao');
  });
});

// ============================================================================
// Route 2: Qi Condensation → Foundation (筑基)
// ============================================================================
describe('Route 2: Qi Condensation → Foundation (筑基)', () => {
  /**
   * Create a state at QiCondensation layer 1 by playing through from mortal.
   */
  function playToQiCondensation(): ReturnType<typeof createInitialState> {
    let state = createInitialState(TEST_SEED);
    // Build insight (need 3+ for yinqi)
    for (let i = 0; i < 4; i++) {
      state = ensureEssence(state, 5);
      state = doAction(state, 'kuzuo', () => 0.9);
    }
    state = triggerJadeSlip(state);
    for (let i = 0; i < 10; i++) {
      state = ensureEssence(state, 10);
      state = doAction(state, 'tuna', () => 0.9);
    }
    state = checkUnlocks(state);
    state = ensureEssence(state, 60);
    state = doAction(state, 'rike_tuna', () => 0.9);
    state = checkUnlocks(state);
    state = ensureEssence(state, 30);
    state = doAction(state, 'yinqi', () => 0.9);
    state = checkUnlocks(state);
    return state;
  }

  it('should progress through Qi layers 2-9 and reach Foundation', () => {
    let state = playToQiCondensation();
    expect(state.realm).toBe(Realm.QiCondensation);
    expect(state.realmLayer).toBe(1);

    // Play through layers 2-3 with actual actions to verify resource flow
    for (let layer = 2; layer <= 3; layer++) {
      const actionId = `breakthrough_qi_${layer}`;
      const btRule = getBreakthroughRuleForLayer(layer);

      // Build resources via gameplay
      while (state.resources.qi < (btRule.qi ?? 0) + 10) {
        state = ensureEssence(state, 60);
        state = doAction(state, 'rike_tuna');
      }
      while (state.resources.insight < (btRule.insight ?? 0) + 2) {
        state = ensureEssence(state, 5);
        state = doAction(state, 'kuzuo');
      }
      state = ensureEssence(state, btRule.essence ?? 0);

      // Stabilize bottleneck to get the prepared flag
      state = checkUnlocks(state);
      const stabResult = stabilizeBreakthrough(state);
      state = checkUnlocks(stabResult.state);
      expect(state.choices.flags[`prepared_qi_layer_${layer}`]).toBe(true);

      // Verify breakthrough action is unlocked
      expect(state.unlockedActions).toContain(actionId);

      // Perform the breakthrough — guaranteed success
      state = ensureEssence(state, btRule.essence ?? 0);
      const btResult = resolveBreakthrough(state, actionId, () => 0.01);
      state = checkUnlocks(btResult.state);

      expect(state.realmLayer).toBe(layer);
      expect(state.choices.flags[`reached_qi_layer_${layer}`]).toBe(true);
    }

    // Fast-forward layers 4-9 using resolveBreakthrough (resource injection)
    // This avoids the very long loop while still testing the breakthrough chain
    for (let layer = 4; layer <= 9; layer++) {
      const actionId = `breakthrough_qi_${layer}`;
      const btRule = getBreakthroughRuleForLayer(layer);

      // Inject required resources for this layer
      state.resources.essence = btRule.essence ?? 0;
      state.resources.qi = (btRule.qi ?? 0) + 20;
      state.resources.insight = (btRule.insight ?? 0) + 5;
      state = checkUnlocks(state);

      // Stabilize bottleneck
      const stabResult = stabilizeBreakthrough(state);
      state = checkUnlocks(stabResult.state);
      expect(state.choices.flags[`prepared_qi_layer_${layer}`]).toBe(true);

      // Verify breakthrough action is unlocked
      expect(state.unlockedActions).toContain(actionId);

      // Perform the breakthrough
      state.resources.essence = btRule.essence ?? 0;
      const btResult = resolveBreakthrough(state, actionId, () => 0.01);
      state = checkUnlocks(btResult.state);

      expect(state.realmLayer).toBe(layer);
      expect(state.choices.flags[`reached_qi_layer_${layer}`]).toBe(true);
    }

    // Now at QiCondensation layer 9 — attempt Foundation breakthrough
    expect(state.realmLayer).toBe(9);

    // Inject resources for Foundation: essence 180, qi 160, insight 25
    state.resources.essence = 200;
    state.resources.qi = 200;
    state.resources.insight = 50;
    state = checkUnlocks(state);

    // Stabilize Foundation bottleneck
    const stabResult = stabilizeBreakthrough(state);
    state = checkUnlocks(stabResult.state);
    expect(state.choices.flags.prepared_foundation).toBe(true);

    // Verify Foundation breakthrough action is unlocked
    expect(state.unlockedActions).toContain('breakthrough_foundation');

    // Perform the Foundation breakthrough
    state.resources.essence = 200;
    const btResult = resolveBreakthrough(state, 'breakthrough_foundation', () => 0.01);
    state = checkUnlocks(btResult.state);

    expect(state.realm).toBe(Realm.FoundationEstablishment);
    expect(state.realmLayer).toBe(1);
    expect(state.choices.flags.reached_foundation).toBe(true);
  });

  it('should have no resource deadlock at Foundation (essence + qi + insight all accessible)', () => {
    let state = playToQiCondensation();

    // Verify resources can be generated via available actions
    const hasQiSource = state.unlockedActions.some(
      (id) => ACTIONS[id]?.output?.qi && (ACTIONS[id]?.output?.qi as number) > 0,
    );
    expect(hasQiSource, 'Should have a way to generate qi').toBe(true);

    const hasInsightSource = state.unlockedActions.some(
      (id) => ACTIONS[id]?.output?.insight && (ACTIONS[id]?.output?.insight as number) > 0,
    );
    expect(hasInsightSource, 'Should have a way to generate insight').toBe(true);

    // Essence regenerates via tiaoxi and ticks
    expect(state.unlockedActions).toContain('tiaoxi');

    // Verify that performing many actions doesn't deadlock
    const beforeQi = state.resources.qi;
    const beforeInsight = state.resources.insight;
    state = ensureEssence(state, 60);
    state = doAction(state, 'rike_tuna');
    state = checkUnlocks(state);

    // Either qi or insight should increase from rike_tuna
    expect(
      state.resources.qi > beforeQi || state.resources.insight > beforeInsight,
      'rike_tuna should produce qi or insight',
    ).toBe(true);
  });

  it('should unlock Foundation-specific actions naturally after breakthrough', () => {
    let state = playToQiCondensation();

    // Fast-forward to Foundation using resolveBreakthrough (simulating reaching layer 9 + foundation)
    state.realmLayer = 9;
    state.choices.flags.reached_qi_layer_2 = true;
    state.choices.flags.reached_qi_layer_3 = true;
    state.choices.flags.reached_qi_layer_4 = true;
    state.choices.flags.reached_qi_layer_5 = true;
    state.choices.flags.reached_qi_layer_6 = true;
    state.choices.flags.reached_qi_layer_7 = true;
    state.choices.flags.reached_qi_layer_8 = true;
    state.choices.flags.reached_qi_layer_9 = true;

    // Set up for Foundation breakthrough
    state.resources.essence = 200;
    state.resources.qi = 200;
    state.resources.insight = 50;
    state = checkUnlocks(state);

    const stabResult = stabilizeBreakthrough(state);
    state = checkUnlocks(stabResult.state);

    const btResult = resolveBreakthrough(state, 'breakthrough_foundation', () => 0.01);
    state = checkUnlocks(btResult.state);

    expect(state.realm).toBe(Realm.FoundationEstablishment);

    // Verify Foundation unlocks appear naturally
    expect(state.unlockedActions).toContain('foundation_meditation');
    expect(state.unlockedActions).toContain('study_foundation_strengthening_formula');
    expect(state.unlockedActions).toContain('inner_gate_rumor');
    expect(state.unlockedActions).toContain('open_market_stall');
    expect(state.unlockedActions).toContain('establish_dwelling');
  });
});

// ============================================================================
// Route 3: Resource flow verification
// ============================================================================
describe('Route 3: Resource flow verification', () => {
  it('should never have negative resources after 100 actions from scratch', () => {
    let state = createInitialState(TEST_SEED);

    // Trigger jade slip early for more action variety
    state = doAction(state, 'kuzuo');
    state = doAction(state, 'kuzuo');
    state = triggerJadeSlip(state);

    // Perform 100 actions mixing various types
    const actionPool = ['kuzuo', 'tuna', 'tiaoxi'];
    const rng = createRng(TEST_SEED, state.time.tick);

    for (let i = 0; i < 100; i++) {
      // Pick an action from the pool, preferring ones we can afford
      let actionId = actionPool[i % actionPool.length];

      // If we can't afford the action, use tiaoxi to recover
      const cost = ACTIONS[actionId]?.cost?.essence ?? 0;
      if (state.resources.essence < cost) {
        actionId = 'tiaoxi';
      }

      const result = performAction(state, actionId, () => rng());
      state = checkUnlocks(result.state);

      // Check all resources are non-negative after each action
      assertNoNegativeResources(state, `After action ${i + 1} (${actionId})`);
    }

    // Final check: no negative resources
    assertNoNegativeResources(state, 'Final state after 100 actions');
  });

  it('should regenerate essence properly through ticks', () => {
    let state = createInitialState(TEST_SEED);

    // Spend essence
    state.resources.essence = 50;
    const essenceBefore = state.resources.essence;

    // Advance 30 ticks — should recover 1 essence per tick
    state = advanceTicks(state, 30);

    expect(state.resources.essence).toBe(Math.min(100, essenceBefore + 30));
  });

  it('should deduct action costs correctly', () => {
    let state = createInitialState(TEST_SEED);
    state = triggerJadeSlip(state); // unlock tuna

    // Test kuzuo: costs 5 essence, gives 1 insight
    state.resources.essence = 100;
    const essenceBeforeKuzuo = state.resources.essence;
    const insightBeforeKuzuo = state.resources.insight;

    const result = performAction(state, 'kuzuo', () => 0.9);
    expect(result.success).toBe(true);

    // Essence should decrease by 5 (cost)
    expect(result.state.resources.essence).toBeLessThan(essenceBeforeKuzuo);
    // Insight should increase by 1 (output)
    expect(result.state.resources.insight).toBeGreaterThan(insightBeforeKuzuo);

    // Test tuna: costs 10 essence, gives 1 qi
    state = result.state;
    state.resources.essence = 100;
    const essenceBeforeTuna = state.resources.essence;
    const qiBeforeTuna = state.resources.qi;

    const tunaResult = performAction(state, 'tuna', () => 0.9);
    expect(tunaResult.success).toBe(true);
    expect(tunaResult.state.resources.essence).toBeLessThan(essenceBeforeTuna);
    expect(tunaResult.state.resources.qi).toBeGreaterThan(qiBeforeTuna);
  });

  it('should decrease lifespan at a reasonable rate', () => {
    let state = createInitialState(TEST_SEED);

    const initialLifespan = state.resources.lifespan;
    const mortalLifespanYears = REALM_LIFESPAN_YEARS[Realm.Mortal];
    expect(initialLifespan).toBe(mortalLifespanYears * DAYS_PER_YEAR * TICKS_PER_DAY);

    // Advance 1 year of ticks
    const oneYearTicks = DAYS_PER_YEAR * TICKS_PER_DAY; // 3600 ticks
    state = advanceTicks(state, oneYearTicks);

    // At mortal rate (1.0), 1 year should decrease lifespan by ~1 year
    const yearsElapsed = (initialLifespan - state.resources.lifespan) / (DAYS_PER_YEAR * TICKS_PER_DAY);
    expect(yearsElapsed).toBeCloseTo(1.0, 0);

    // Should still have most of the lifespan remaining
    expect(lifespanYears(state)).toBeGreaterThan(mortalLifespanYears - 2);
  });

  it('should maintain resource invariants across action + tick cycles', () => {
    let state = createInitialState(TEST_SEED);
    state = doAction(state, 'kuzuo');
    state = doAction(state, 'kuzuo');
    state = triggerJadeSlip(state);

    const rng = createRng(TEST_SEED, state.time.tick);

    for (let i = 0; i < 50; i++) {
      // Alternate between actions and tick advancement
      const actionId = i % 3 === 0 ? 'tiaoxi' : i % 3 === 1 ? 'tuna' : 'kuzuo';
      const cost = ACTIONS[actionId]?.cost?.essence ?? 0;

      if (state.resources.essence >= cost) {
        const result = performAction(state, actionId, () => rng());
        state = checkUnlocks(result.state);
      }

      // Advance some ticks
      state = advanceTicks(state, 10);

      // Verify no resource goes negative
      assertNoNegativeResources(state, `Cycle ${i + 1}`);

      // Verify essence is within valid range [0, maxStamina]
      expect(state.resources.essence).toBeGreaterThanOrEqual(0);
      expect(state.resources.essence).toBeLessThanOrEqual(100); // mortal max stamina

      // Verify lifespan hasn't gone negative unexpectedly
      expect(state.resources.lifespan).toBeGreaterThan(0);
    }
  });

  it('should not have resource deadlock when progressing through Qi layers', () => {
    let state = createInitialState(TEST_SEED);
    state = doAction(state, 'kuzuo');
    state = doAction(state, 'kuzuo');
    state = triggerJadeSlip(state);

    // Build enough qi and insight to reach yinqi
    for (let i = 0; i < 10; i++) {
      state = ensureEssence(state, 10);
      state = doAction(state, 'tuna');
    }
    state = checkUnlocks(state);
    state = ensureEssence(state, 60);
    state = doAction(state, 'rike_tuna');
    state = checkUnlocks(state);
    state = ensureEssence(state, 30);
    state = doAction(state, 'yinqi');
    state = checkUnlocks(state);

    // Now at QiCondensation — simulate progressing through a few layers
    // Verify we can still generate resources without getting stuck
    const qiBefore = state.resources.qi;
    const insightBefore = state.resources.insight;

    // Use rike_tuna and short_retreat to build qi
    state = ensureEssence(state, 60);
    state = doAction(state, 'rike_tuna');
    state = checkUnlocks(state);

    // Verify qi increased
    expect(state.resources.qi).toBeGreaterThan(qiBefore);

    // Use kuzuo for insight
    state = ensureEssence(state, 5);
    const insightBefore2 = state.resources.insight;
    state = doAction(state, 'kuzuo');
    expect(state.resources.insight).toBeGreaterThan(insightBefore2);

    // Essence should be recoverable via tiaoxi
    state.resources.essence = 10;
    state = doAction(state, 'tiaoxi');
    expect(state.resources.essence).toBeGreaterThan(10);

    // No negative resources after all this
    assertNoNegativeResources(state, 'After Qi layer resource building');
  });
});

// ============================================================================
// Helper functions for breakthrough resource requirements
// ============================================================================

function getBreakthroughRuleForLayer(layer: number): Partial<Resources> {
  // From breakthroughs.ts
  const requirements: Record<number, Partial<Resources>> = {
    2: { essence: 60, qi: 30, insight: 3 },
    3: { essence: 70, qi: 45, insight: 5 },
    4: { essence: 80, qi: 60, insight: 8 },
    5: { essence: 90, qi: 75, insight: 10 },
    6: { essence: 100, qi: 90, insight: 12 },
    7: { essence: 110, qi: 110, insight: 15 },
    8: { essence: 130, qi: 130, insight: 18 },
    9: { essence: 150, qi: 150, insight: 22 },
  };
  return requirements[layer] ?? {};
}

function ensureBreakthroughResources(
  state: ReturnType<typeof createInitialState>,
  layer: number,
): void {
  // This function is a no-op — we handle resource building in the test loop
  // via ensureEssence and direct resource building. Keeping it as a marker
  // for clarity.
}
