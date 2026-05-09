/**
 * 秘境探索系统 — 发现、探索、收获秘境
 */

import { GameState, Realm, SecretRealmState } from './types';
import { SECRET_REALMS, SecretRealmDef } from '../content/secretRealms';
import { adjustQuality, setFlag } from './choices';

export function createInitialSecretRealmState(): SecretRealmState {
  return {
    discoveredRealms: [],
    activeExploration: null,
    explorationProgress: 0,
    completedRealms: [],
    lootCollected: {},
  };
}

/** Add a realm to discovered list */
export function discoverRealm(state: GameState, realmId: string): GameState {
  if (state.secretRealm.discoveredRealms.includes(realmId)) return state;

  const def = SECRET_REALMS[realmId];
  if (!def) return state;

  return {
    ...state,
    secretRealm: {
      ...state.secretRealm,
      discoveredRealms: [...state.secretRealm.discoveredRealms, realmId],
    },
    choices: {
      ...state.choices,
      flags: {
        ...state.choices.flags,
        [`discovered_${realmId}`]: true,
      },
    },
  };
}

/** Check if a realm can be explored by current state */
export function canExploreRealm(state: GameState, realmId: string): boolean {
  const def = SECRET_REALMS[realmId];
  if (!def) return false;

  // Must be discovered
  if (!state.secretRealm.discoveredRealms.includes(realmId)) return false;

  // Must meet required realm
  const realmOrder = [Realm.Mortal, Realm.QiCondensation, Realm.FoundationEstablishment, Realm.GoldenCore, Realm.NascentSoul, Realm.SpiritTransformation, Realm.Integration, Realm.Mahayana, Realm.Tribulation];
  const currentIdx = realmOrder.indexOf(state.realm);
  const requiredIdx = realmOrder.indexOf(def.requiredRealm);
  if (currentIdx < requiredIdx) return false;

  // Must meet required flags
  if (def.requiredFlags) {
    for (const flag of def.requiredFlags) {
      if (!state.choices.flags[flag]) return false;
    }
  }

  return true;
}

/** Begin exploring a realm */
export function beginExploration(state: GameState, realmId: string): GameState {
  if (!canExploreRealm(state, realmId)) return state;
  if (state.secretRealm.activeExploration !== null) return state;

  return {
    ...state,
    secretRealm: {
      ...state.secretRealm,
      activeExploration: realmId,
      explorationProgress: 0,
    },
  };
}

/** Advance exploration progress based on ticks */
export function advanceExploration(state: GameState, ticks: number): { state: GameState; eventTriggered: boolean; eventId: string | null } {
  if (state.secretRealm.activeExploration === null) {
    return { state, eventTriggered: false, eventId: null };
  }

  const realmId = state.secretRealm.activeExploration;
  const def = SECRET_REALMS[realmId];
  if (!def) return { state, eventTriggered: false, eventId: null };

  // Progress based on ticks and danger (higher danger = slower progress)
  const progressPerTick = 2 / def.dangerLevel;
  const newProgress = Math.min(100, state.secretRealm.explorationProgress + ticks * progressPerTick);

  // Check for event trigger at certain progress thresholds
  let eventTriggered = false;
  let eventId: string | null = null;

  // Trigger event at 50% progress (halfway)
  const prevProgress = state.secretRealm.explorationProgress;
  if (prevProgress < 50 && newProgress >= 50) {
    eventTriggered = true;
    eventId = def.eventChainId;
  }

  return {
    state: {
      ...state,
      secretRealm: {
        ...state.secretRealm,
        explorationProgress: newProgress,
      },
    },
    eventTriggered,
    eventId,
  };
}

/** Complete exploration and collect rewards */
export function completeExploration(
  state: GameState,
  random?: () => number, // seeded rng should be provided by callers for determinism
): { state: GameState; log: string; rareLootFound: boolean } {
  if (state.secretRealm.activeExploration === null) {
    return { state, log: '当前没有正在探索的秘境。', rareLootFound: false };
  }

  if (state.secretRealm.explorationProgress < 100) {
    return { state, log: '探索尚未完成。', rareLootFound: false };
  }

  const realmId = state.secretRealm.activeExploration;
  const def = SECRET_REALMS[realmId];
  if (!def) return { state, log: '未知秘境。', rareLootFound: false };

  // Apply ascension bonus to qi reward
  const qiBonusMultiplier = 1 + (state.ascension.ascensionBonuses['qi_gain_pct'] ?? 0) / 100;
  const qiReward = Math.floor(def.qiReward * qiBonusMultiplier);

  let newState: GameState = {
    ...state,
    resources: {
      ...state.resources,
      qi: state.resources.qi + qiReward,
      insight: state.resources.insight + def.insightReward,
      herbs: state.resources.herbs + def.herbReward,
      coins: state.resources.coins + def.coinReward,
    },
    secretRealm: {
      ...state.secretRealm,
      activeExploration: null,
      explorationProgress: 0,
      completedRealms: [...state.secretRealm.completedRealms, realmId],
      lootCollected: {
        ...state.secretRealm.lootCollected,
        [realmId]: (state.secretRealm.lootCollected[realmId] ?? 0) + 1,
      },
    },
  };

  // Check rare loot
  const rareLootRoll = random ? random() : 0;
  let rareLootFound = false;
  if (rareLootRoll < def.rareLootChance) {
    newState = setFlag(newState, def.rareLootId);
    rareLootFound = true;
  }

  newState = adjustQuality(newState, 'quiet_cultivation', 1);

  const lootText = rareLootFound ? ' 途中偶得珍物。' : '';
  return {
    state: newState,
    log: `${def.name}探索完毕。收获：气+${qiReward}，见闻+${def.insightReward}，药+${def.herbReward}，钱+${def.coinReward}。${lootText}`,
    rareLootFound,
  };
}

/** Abandon exploration with partial rewards */
export function abandonExploration(state: GameState, random?: () => number): { state: GameState; log: string } {
  if (state.secretRealm.activeExploration === null) {
    return { state, log: '当前没有正在探索的秘境。' };
  }

  const realmId = state.secretRealm.activeExploration;
  const def = SECRET_REALMS[realmId];
  if (!def) return { state, log: '未知秘境。' };

  // Partial rewards at 30% of full value based on progress
  const progressFraction = state.secretRealm.explorationProgress / 100;
  const rewardFraction = 0.3 * progressFraction;

  // Risk: chance of wound based on danger level and progress
  const woundChance = def.dangerLevel * 0.05 * progressFraction;
  const wounds = (random ? random() : 0) < woundChance ? 1 : 0;

  // For demonic cave, also risk inner demon trigger
  let innerDemonFlag = false;
  if (realmId === 'demonic_cave' && progressFraction > 0.3) {
    innerDemonFlag = true;
  }

  let newState: GameState = {
    ...state,
    resources: {
      ...state.resources,
      qi: state.resources.qi + Math.floor(def.qiReward * rewardFraction),
      insight: state.resources.insight + Math.floor(def.insightReward * rewardFraction),
      herbs: state.resources.herbs + Math.floor(def.herbReward * rewardFraction),
      coins: state.resources.coins + Math.floor(def.coinReward * rewardFraction),
      wounds: state.resources.wounds + wounds,
    },
    secretRealm: {
      ...state.secretRealm,
      activeExploration: null,
      explorationProgress: 0,
    },
  };

  if (innerDemonFlag) {
    newState = setFlag(newState, 'demonic_cave_inner_demon_trigger');
  }

  const woundText = wounds > 0 ? ' 仓促撤离，添了一处伤。' : '';
  const demonText = innerDemonFlag ? ' 魔气侵体，心神不安。' : '';

  return {
    state: newState,
    log: `你放弃了${def.name}的探索，带走部分收获。${woundText}${demonText}`,
  };
}

/** Get the definition for a realm */
export function getSecretRealmDef(realmId: string): SecretRealmDef | undefined {
  return SECRET_REALMS[realmId];
}
