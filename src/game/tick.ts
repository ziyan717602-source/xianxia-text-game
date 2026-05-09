import { GameState, Realm } from './types';
import { deriveGameTime, INITIAL_MAX_STAMINA, TICKS_PER_DAY, REALM_LIFESPAN_YEARS, DAYS_PER_YEAR, getMaxStamina } from './state';
import { advanceWorld } from './world';
import { applyDantoxinConsequences } from './alchemy';
import { getDwellingAutoIncome } from './dwelling';
import { followerTick } from './follower';
import { checkDemonTrigger, applyDemonConsequence } from './innerDemon';
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

function processTicks(state: GameState, ticks: number): GameState {
  if (ticks <= 0) return state;

  const nextTick = state.time.tick + ticks;

  const prevDay = Math.floor(state.time.tick / TICKS_PER_DAY);
  const nextDay = Math.floor(nextTick / TICKS_PER_DAY);

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

  // Apply dwelling auto-income at each day boundary
  const daysPassed = nextDay - prevDay;
  if (daysPassed > 0 && nextState.dwelling.level > 0) {
    const income = getDwellingAutoIncome(nextState);
    nextState.resources = {
      ...nextState.resources,
      qi: nextState.resources.qi + income.qi * daysPassed,
      insight: nextState.resources.insight + income.insight * daysPassed,
    };
  }

  // Process follower day ticks
  if (daysPassed > 0) {
    for (let d = 0; d < daysPassed; d++) {
      nextState = followerTick(nextState);
    }
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
