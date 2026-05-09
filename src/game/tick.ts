import { GameState, Realm } from './types';
import { deriveGameTime, INITIAL_MAX_STAMINA, TICKS_PER_DAY, REALM_LIFESPAN_YEARS, DAYS_PER_YEAR, getMaxStamina } from './state';
import { advanceWorld } from './world';
import { applyDantoxinConsequences } from './alchemy';
import { getDwellingAutoIncome } from './dwelling';
import { followerTick } from './follower';
import { checkDemonTrigger, applyDemonConsequence, DEMON_DEFS } from './innerDemon';
import { getSecretRealmDef } from './secretRealm';
import { updateKarmicWeight } from './karma';

export const TICK_INTERVAL_MS = 1000; // 1 real second = 1 tick
export const STAMINA_RECOVERY_PER_TICK = 1;

// Higher realms decay lifespan more slowly — ratio relative to mortal (1.0)
const REALM_LIFESPAN_DECAY_RATE: Record<Realm, number> = {
  [Realm.Mortal]: 1.0,
  [Realm.QiCondensation]: 1.0,
  [Realm.FoundationEstablishment]: 0.8,
  [Realm.GoldenCore]: 0.5,
  [Realm.NascentSoul]: 0.5,
  [Realm.SpiritTransformation]: 0.3,
  [Realm.Integration]: 0.2,
  [Realm.Mahayana]: 0.1,
  [Realm.Tribulation]: 0.05,
};

/** Maximum cascade depth for demon checks in batch processing */
const MAX_DEMON_CASCADE = 3;

/**
 * Batch inner demon check for offline/long-time settlement.
 * Instead of checking once per day boundary, calculates progress accumulation
 * for all day boundaries at once using O(1) math.
 *
 * Returns the updated state with demon progress scaled by daysPassed.
 */
function batchDemonCheck(state: GameState, daysPassed: number): GameState {
  let nextState = state;

  for (let cascade = 0; cascade < MAX_DEMON_CASCADE; cascade++) {
    // Check for demon trigger (handles both new triggers and active demon progress)
    const demonResult = checkDemonTrigger(nextState);
    nextState = demonResult.state;

    // If an active demon exists, scale its progress by the remaining day boundaries
    if (nextState.innerDemon.activeDemon !== null) {
      const def = DEMON_DEFS.find(d => d.id === nextState.innerDemon.activeDemon);
      if (def && def.condition(nextState)) {
        // checkDemonTrigger already applied one increment; remaining days add more
        const remainingChecks = Math.max(0, daysPassed - 1);
        const totalProgress = Math.min(
          100,
          nextState.innerDemon.demonProgress + def.progressIncrement * remainingChecks,
        );
        nextState = {
          ...nextState,
          innerDemon: {
            ...nextState.innerDemon,
            demonProgress: totalProgress,
          },
        };
      }

      // If demon progress reached 100, apply consequences and continue cascade
      if (nextState.innerDemon.demonProgress >= 100) {
        const consequence = applyDemonConsequence(nextState);
        nextState = consequence.state;
        // Loop continues to check for next demon trigger
        continue;
      }
    }

    // No active demon or progress didn't reach 100 — no more cascades needed
    break;
  }

  return nextState;
}

function processTicks(state: GameState, ticks: number): GameState {
  if (ticks <= 0) return state;

  const nextTick = state.time.tick + ticks;

  const prevDay = Math.floor(state.time.tick / TICKS_PER_DAY);
  const nextDay = Math.floor(nextTick / TICKS_PER_DAY);
  const daysPassed = nextDay - prevDay;

  const lifespanDecayRate = REALM_LIFESPAN_DECAY_RATE[state.realm] ?? 1.0;
  const lifespanDecay = ticks * lifespanDecayRate;

  let nextState = {
    ...state,
    resources: {
      ...state.resources,
      lifespan: Math.max(0, state.resources.lifespan - lifespanDecay),
      essence: Math.min(getMaxStamina(state.realm), state.resources.essence + STAMINA_RECOVERY_PER_TICK * ticks),
    },
    time: deriveGameTime(nextTick),
  };

  // Apply dwelling auto-income at each day boundary (O(1) math)
  if (daysPassed > 0 && nextState.dwelling.level > 0) {
    const income = getDwellingAutoIncome(nextState);
    nextState.resources = {
      ...nextState.resources,
      qi: nextState.resources.qi + income.qi * daysPassed,
      insight: nextState.resources.insight + income.insight * daysPassed,
    };
  }

  // Process follower day ticks — single pass is sufficient because
  // followerTick only removes followers with loyalty <= 0 and does not
  // change loyalty, making repeated calls idempotent.
  if (daysPassed > 0) {
    nextState = followerTick(nextState);
  }

  nextState = applyDantoxinConsequences(advanceWorld(nextState), ticks);

  // Check inner demon trigger periodically (every 10 ticks = every day)
  const shouldCheckDemon = ticks % 10 === 0 || nextState.time.tick % 10 === 0;
  if (shouldCheckDemon) {
    const demonResult = checkDemonTrigger(nextState);
    nextState = demonResult.state;

    // If demon progress reached 100, apply consequences automatically
    if (nextState.innerDemon.activeDemon !== null && nextState.innerDemon.demonProgress >= 100) {
      const consequence = applyDemonConsequence(nextState);
      nextState = consequence.state;
    }
  }

  // Advance secret realm exploration
  if (nextState.secretRealm.activeExploration) {
    const realmDef = getSecretRealmDef(nextState.secretRealm.activeExploration);
    if (realmDef) {
      const progressPerTick = 2 / realmDef.dangerLevel;
      nextState = {
        ...nextState,
        secretRealm: {
          ...nextState.secretRealm,
          explorationProgress: Math.min(100, nextState.secretRealm.explorationProgress + progressPerTick),
        },
      };
    }
  }

  // Check for death conditions
  if (nextState.resources.lifespan <= 0) {
    nextState = {
      ...nextState,
      choices: {
        ...nextState.choices,
        flags: { ...nextState.choices.flags, game_over: true },
        tags: { ...nextState.choices.tags, game_over_reason: 'lifespan' },
      },
    };
  } else if (nextState.resources.wounds >= 10) {
    nextState = {
      ...nextState,
      choices: {
        ...nextState.choices,
        flags: { ...nextState.choices.flags, game_over: true },
        tags: { ...nextState.choices.tags, game_over_reason: 'wounds' },
      },
    };
  }

  return updateKarmicWeight(nextState);
}

/**
 * 处理时间的流逝（可能包含离线补算多个 tick）
 * 暂时先按固定的 tick 流逝来做。
 * 如果传入了 deltaMs，可以计算需要推进多少个 tick。
 */
export function processTick(state: GameState, deltaMs: number = TICK_INTERVAL_MS): GameState {
  const ticksToProcess = Math.floor(deltaMs / TICK_INTERVAL_MS);

  return processTicks(state, ticksToProcess);
}

/**
 * Batch offline settlement: calculate results for elapsed ticks WITHOUT iterating.
 *
 * Key design decisions:
 * - Resource gains/losses use O(1) math (same as processTick)
 * - Essence is clamped to [0, maxStamina]; lifespan is clamped to [0, ∞)
 * - Follower tick: single pass (followerTick is idempotent — it only removes
 *   loyalty-0 followers and doesn't change loyalty)
 * - Inner demon: one check + progress scaled by daysPassed, with up to
 *   MAX_DEMON_CASCADE cascade levels for demon resolution chains
 * - Dantoxin consequences use O(1) math
 *
 * @param state - Current game state
 * @param elapsedTicks - Number of ticks to advance (must be >= 0)
 * @param random - Random number generator (reserved for future stochastic batch logic)
 * @returns Updated game state
 */
export function processBatchTicks(
  state: GameState,
  elapsedTicks: number,
  random?: () => number, // seeded rng should be provided by callers for determinism
): GameState {
  if (elapsedTicks <= 0) return state;

  const nextTick = state.time.tick + elapsedTicks;
  const prevDay = Math.floor(state.time.tick / TICKS_PER_DAY);
  const nextDay = Math.floor(nextTick / TICKS_PER_DAY);
  const daysPassed = nextDay - prevDay;

  // 1. Lifespan decay — O(1) math
  const lifespanDecayRate = REALM_LIFESPAN_DECAY_RATE[state.realm] ?? 1.0;
  const lifespanDecay = elapsedTicks * lifespanDecayRate;

  // 2. Essence recovery — O(1) math, clamped to max
  const maxEssence = getMaxStamina(state.realm);
  const essenceRecovery = STAMINA_RECOVERY_PER_TICK * elapsedTicks;

  let nextState: GameState = {
    ...state,
    resources: {
      ...state.resources,
      lifespan: Math.max(0, state.resources.lifespan - lifespanDecay),
      essence: Math.max(0, Math.min(maxEssence, state.resources.essence + essenceRecovery)),
    },
    time: deriveGameTime(nextTick),
  };

  // 3. Dwelling auto-income — O(1) math
  if (daysPassed > 0 && nextState.dwelling.level > 0) {
    const income = getDwellingAutoIncome(nextState);
    nextState = {
      ...nextState,
      resources: {
        ...nextState.resources,
        qi: nextState.resources.qi + income.qi * daysPassed,
        insight: nextState.resources.insight + income.insight * daysPassed,
      },
    };
  }

  // 4. Follower processing — single pass (idempotent, no per-day loop)
  if (daysPassed > 0) {
    nextState = followerTick(nextState);
  }

  // 5. World advancement + dantoxin consequences — already O(1)
  nextState = applyDantoxinConsequences(advanceWorld(nextState), elapsedTicks);

  // 6. Inner demon — batch check with scaled progress (no per-day loop)
  if (daysPassed > 0) {
    nextState = batchDemonCheck(nextState, daysPassed);
  }

  // 7. Death conditions
  if (nextState.resources.lifespan <= 0) {
    nextState = {
      ...nextState,
      choices: {
        ...nextState.choices,
        flags: { ...nextState.choices.flags, game_over: true },
        tags: { ...nextState.choices.tags, game_over_reason: 'lifespan' },
      },
    };
  } else if (nextState.resources.wounds >= 10) {
    nextState = {
      ...nextState,
      choices: {
        ...nextState.choices,
        flags: { ...nextState.choices.flags, game_over: true },
        tags: { ...nextState.choices.tags, game_over_reason: 'wounds' },
      },
    };
  }

  return updateKarmicWeight(nextState);
}
