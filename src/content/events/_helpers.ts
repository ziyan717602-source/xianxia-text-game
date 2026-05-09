import { GameState, Realm, Season } from '../../game/types';
import { adjustQuality, removeTag, setFlag, setTag } from '../../game/choices';
import { resolveCombatEvent } from '../../game/combat';
import { addRelationship, updateRelationship } from '../../game/relationships';
import { LOCATIONS } from '../locations';
import { getDaoPathLabel, getDaoPathDescription } from '../../game/daopath';
import { confrontDemon, suppressDemon, ignoreDemon, getDemonLabel, getDemonEncounterText, DEMON_DEFS } from '../../game/innerDemon';
import { advanceSectRank, completeTask, leaveSect, setCurrentTask, registerOuterDisciple } from '../../game/sect';
import { upgradeDwelling, installFormation, canUpgradeDwelling, canInstallFormation, getDwellingUpgradeCost, getFormationInstallCost } from '../../game/dwelling';
import { recruitFollower, assignFollowerTask, collectFollowerIncome, canRecruitFollower } from '../../game/follower';
import { discoverRealm } from '../../game/secretRealm';
import { shouldShowAscensionThreshold, executeAscension } from '../../game/ascension';

// Re-export all dependencies for domain files
export type { GameState } from '../../game/types';
export { Realm, Season } from '../../game/types';
export { adjustQuality, removeTag, setFlag, setTag } from '../../game/choices';
export { resolveCombatEvent } from '../../game/combat';
export { addRelationship, updateRelationship } from '../../game/relationships';
export { LOCATIONS } from '../locations';
export { getDaoPathLabel, getDaoPathDescription } from '../../game/daopath';
export { confrontDemon, suppressDemon, ignoreDemon, getDemonLabel, getDemonEncounterText, DEMON_DEFS } from '../../game/innerDemon';
export { advanceSectRank, completeTask, leaveSect, setCurrentTask, registerOuterDisciple } from '../../game/sect';
export { upgradeDwelling, installFormation, canUpgradeDwelling, canInstallFormation, getDwellingUpgradeCost, getFormationInstallCost } from '../../game/dwelling';
export { recruitFollower, assignFollowerTask, collectFollowerIncome, canRecruitFollower } from '../../game/follower';
export { discoverRealm } from '../../game/secretRealm';
export { shouldShowAscensionThreshold, executeAscension } from '../../game/ascension';

export const WOUNDED_CULTIVATOR_ID = 'wounded_cultivator';
export const MARKET_KEEPER_ID = 'market_keeper';
export const OUTER_GATE_CLERK_ID = 'outer_gate_clerk';
export const FOUNDATION_GUARDIAN_ID = 'foundation_guardian';
export const MOUNTAIN_ELDER_ID = 'mountain_elder';
export const PATROL_DISCIPLE_ID = 'patrol_disciple';
export const WANDERING_LECTURER_ID = 'wandering_lecturer';
export const DISILLUSIONED_FELLOW_ID = 'disillusioned_fellow';
export function uniqueTags(existing: string[], added: string[]): string[] {
  return Array.from(new Set([...existing, ...added]));
}
export const REALM_ORDER = [Realm.Mortal, Realm.QiCondensation, Realm.FoundationEstablishment, Realm.GoldenCore, Realm.NascentSoul, Realm.SpiritTransformation, Realm.Integration, Realm.Mahayana, Realm.Tribulation];
export function realmAtLeast(state: GameState, requiredRealm: Realm): boolean {
  return REALM_ORDER.indexOf(state.realm) >= REALM_ORDER.indexOf(requiredRealm);
}
export function touchRelationship(
  state: GameState,
  entry: {
    id: string;
    identity: string;
  },
  changes: {
    tags?: string[];
    debtsDelta?: number;
    favorsDelta?: number;
    grudgesDelta?: number;
    state?: 'Alive' | 'Departed' | 'Deceased';
  }
): GameState {
  const baseState = addRelationship(state, {
    id: entry.id,
    identity: entry.identity,
    tags: [],
    lastInteractionTick: state.time.tick,
    debts: 0,
    favors: 0,
    grudges: 0,
    state: 'Alive',
  });
  const existing = baseState.relationships[entry.id];
  return updateRelationship(baseState, entry.id, {
    tags: uniqueTags(existing.tags, changes.tags ?? []),
    lastInteractionTick: state.time.tick,
    debts: Math.max(0, existing.debts + (changes.debtsDelta ?? 0)),
    favors: Math.max(0, existing.favors + (changes.favorsDelta ?? 0)),
    grudges: Math.max(0, existing.grudges + (changes.grudgesDelta ?? 0)),
    state: changes.state ?? existing.state,
  });
}
export function recordWoundedCultivator(
  state: GameState,
  changes: {
    tags: string[];
    debts?: number;
    favors?: number;
    grudges?: number;
  }
): GameState {
  const baseState = addRelationship(state, {
    id: WOUNDED_CULTIVATOR_ID,
    identity: '受伤散修',
    tags: [],
    lastInteractionTick: state.time.tick,
    debts: 0,
    favors: 0,
    grudges: 0,
    state: 'Alive',
  });
  const existing = baseState.relationships[WOUNDED_CULTIVATOR_ID];
  return updateRelationship(baseState, WOUNDED_CULTIVATOR_ID, {
    tags: uniqueTags(existing.tags, changes.tags),
    lastInteractionTick: state.time.tick,
    debts: changes.debts ?? existing.debts,
    favors: changes.favors ?? existing.favors,
    grudges: changes.grudges ?? existing.grudges,
    state: 'Departed',
  });
}
export function recordMarketKeeper(
  state: GameState,
  changes: {
    tags?: string[];
    debtsDelta?: number;
    favorsDelta?: number;
  }
): GameState {
  return touchRelationship(
    state,
    {
      id: MARKET_KEEPER_ID,
      identity: '坊市掌柜',
    },
    {
      ...changes,
      state: 'Alive',
    }
  );
}
export function recordOuterGateClerk(
  state: GameState,
  changes: {
    tags?: string[];
    debtsDelta?: number;
    favorsDelta?: number;
    grudgesDelta?: number;
  }
): GameState {
  return touchRelationship(
    state,
    {
      id: OUTER_GATE_CLERK_ID,
      identity: '外门书吏',
    },
    {
      ...changes,
      state: 'Alive',
    }
  );
}
export function recordFoundationGuardian(
  state: GameState,
  changes: {
    tags?: string[];
    debtsDelta?: number;
    favorsDelta?: number;
    grudgesDelta?: number;
  }
): GameState {
  return touchRelationship(
    state,
    {
      id: FOUNDATION_GUARDIAN_ID,
      identity: '外门护法',
    },
    {
      ...changes,
      state: 'Alive',
    }
  );
}
/**
 * GameEvent 需要支持更动态的条件和效果，扩展 types.ts 里的静态定义。
 * 这里使用更强类型的函数定义以便在代码中执行。
 */
// Note: ActiveEvent and EventChoice are also re-exported from index.ts
// using `export type` to satisfy rolldown's tree-shaking.
// They must also be exported here as regular exports for the domain files.
export interface ActiveEvent {
  id: string;
  text: string | ((state: GameState) => string);
  weight: (state: GameState) => number;
  condition: (state: GameState) => boolean;
  choices: EventChoice[];
}

export interface EventChoice {
  text: string;
  effect: (state: GameState, random?: () => number) => { state: GameState; log: string };
}
