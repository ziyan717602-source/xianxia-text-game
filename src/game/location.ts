import { GameState, Realm, Location } from './types';
import { ACTIONS } from '../content/actions';
import { LOCATIONS } from '../content/locations';

export interface MoveResult {
  state: GameState;
  log: string;
  success: boolean;
}

/**
 * Actions available at ALL locations, regardless of the location's availableActions list.
 * The location's availableActions are additive (location-specific), not exclusive.
 * For universal actions, the requiredLocation condition is skipped — they can be done anywhere.
 */
export const UNIVERSAL_ACTION_IDS: string[] = [
  'kuzuo',
  'tuna',
  'tiaoxi',
  'meditate_detox',
  'stabilize_bottleneck',
  'rike_tuna',
  'short_retreat',
  'breakthrough_qi_2',
  'breakthrough_qi_3',
  'breakthrough_qi_4',
  'breakthrough_qi_5',
  'breakthrough_qi_6',
  'breakthrough_qi_7',
  'breakthrough_qi_8',
  'breakthrough_qi_9',
  'breakthrough_foundation',
  'breakthrough_golden_core',
  'breakthrough_nascent_soul',
  'breakthrough_spirit_transformation',
  'breakthrough_integration',
  'breakthrough_mahayana',
  'breakthrough_tribulation',
  'confront_demon',
  'suppress_demon',
  'ignore_demon',
];

const UNIVERSAL_SET = new Set(UNIVERSAL_ACTION_IDS);

/**
 * Check whether an actionId passes all condition checks.
 * If skipLocationCheck is true, the requiredLocation condition is ignored
 * (used for universal actions which are available everywhere).
 */
function isActionAvailable(actionId: string, state: GameState, skipLocationCheck: boolean): boolean {
  if (!state.unlockedActions.includes(actionId)) return false;

  const action = ACTIONS[actionId];
  if (!action) return false;

  if (!skipLocationCheck && action.conditions.requiredLocation && action.conditions.requiredLocation !== state.currentLocationId) {
    return false;
  }

  if (action.conditions.requiredRealm && action.conditions.requiredRealm !== state.realm) {
    return false;
  }

  if (action.conditions.requiredFlags?.some((flag) => !state.choices.flags[flag])) {
    return false;
  }

  if (action.conditions.forbiddenFlags?.some((flag) => state.choices.flags[flag])) {
    return false;
  }

  return true;
}

export function moveToLocation(state: GameState, locationId: string): MoveResult {
  const targetLocation = LOCATIONS[locationId];
  if (!targetLocation) {
    return { state, log: '目标地点不存在。', success: false };
  }

  if (state.currentLocationId === locationId) {
    return { state, log: `你已经在${targetLocation.name}了。`, success: false };
  }

  // To move, maybe it takes essence or time. Let's make it cost a bit of essence or just time.
  // For simplicity, let's say moving takes 5 essence.
  const costStamina = 5;
  if (state.resources.essence < costStamina) {
    return { state, log: '精元不足，无法赶路。', success: false };
  }

  const newState = { ...state };
  newState.resources = { ...state.resources, essence: state.resources.essence - costStamina };
  newState.currentLocationId = locationId;

  return {
    state: newState,
    log: `你来到了${targetLocation.name}。`,
    success: true,
  };
}

/**
 * 获取当前地点可用的行动列表
 * 会同时过滤掉玩家尚未解锁的行动
 *
 * 返回地点专属行动与全局行动的并集。
 * 全局行动（UNIVERSAL_ACTION_IDS）忽略 requiredLocation 条件，可在任何地点执行。
 */
export function getAvailableActionsAtLocation(state: GameState): string[] {
  const loc = LOCATIONS[state.currentLocationId];
  if (!loc) return [];

  // Location-specific actions: filtered by all conditions including requiredLocation
  const locationActions = loc.availableActions.filter((actionId) =>
    isActionAvailable(actionId, state, false),
  );

  // Universal actions: skip requiredLocation check (they're available everywhere)
  const universalActions = UNIVERSAL_ACTION_IDS.filter((actionId) =>
    isActionAvailable(actionId, state, true),
  );

  // Return union, deduplicating while preserving order (location actions first)
  const seen = new Set<string>();
  const result: string[] = [];
  for (const id of locationActions) {
    if (!seen.has(id)) {
      seen.add(id);
      result.push(id);
    }
  }
  for (const id of universalActions) {
    if (!seen.has(id)) {
      seen.add(id);
      result.push(id);
    }
  }
  return result;
}

// ─── Realm comparison helper ────────────────────────────────────────────────

const REALM_ORDER: Realm[] = [
  Realm.Mortal,
  Realm.QiCondensation,
  Realm.FoundationEstablishment,
  Realm.GoldenCore,
  Realm.NascentSoul,
  Realm.SpiritTransformation,
  Realm.Integration,
  Realm.Mahayana,
  Realm.Tribulation,
];

function realmAtLeast(state: GameState, minimum: Realm): boolean {
  return REALM_ORDER.indexOf(state.realm) >= REALM_ORDER.indexOf(minimum);
}

function isInnerOrAbove(state: GameState): boolean {
  return state.sect.rank === 'inner' || state.sect.rank === 'core' || state.sect.rank === 'elder';
}

function isCoreOrAbove(state: GameState): boolean {
  return state.sect.rank === 'core' || state.sect.rank === 'elder';
}

// ─── Location visibility ────────────────────────────────────────────────────

/**
 * Returns only the locations the player should be able to see and travel to.
 */
export function getVisibleLocations(state: GameState): Location[] {
  const flags = state.choices.flags;
  const qualities = state.choices.qualities;

  const visibleIds: string[] = [];

  // Always visible
  visibleIds.push('home', 'mountain_path', 'market', 'outer_gate');

  // Conditional visibility
  if (flags['entered_qi_condensation'] || flags['origin_mountain_dweller'] || flags['origin_wandering_roots']) {
    visibleIds.push('stream_valley');
  }

  if (flags['origin_temple_ward'] || flags['found_jade_slip'] || flags['entered_qi_condensation']) {
    visibleIds.push('abandoned_temple');
  }

  if (flags['origin_herbalist_apprentice'] || flags['known_recipe_small_qi_pill'] || state.resources.herbs >= 5) {
    visibleIds.push('herb_slope');
  }

  if (flags['origin_orphan_of_war'] || state.resources.coins >= 5 || flags['entered_qi_condensation']) {
    visibleIds.push('ferry_crossing');
  }

  if (flags['dwelling_level_1']) {
    visibleIds.push('cave_dwelling');
  }

  if (isInnerOrAbove(state)) {
    visibleIds.push('inner_gate');
  }

  if (realmAtLeast(state, Realm.FoundationEstablishment) || flags['origin_herbalist_apprentice']) {
    visibleIds.push('spirit_field');
  }

  if (realmAtLeast(state, Realm.FoundationEstablishment) || (qualities['alchemy_affinity'] ?? 0) >= 5) {
    visibleIds.push('pill_hall');
  }

  if ((state.realm === Realm.QiCondensation && state.realmLayer >= 3) || (qualities['combat_edge'] ?? 0) >= 3) {
    visibleIds.push('sword_pavilion');
  }

  if (isInnerOrAbove(state)) {
    visibleIds.push('sect_hall');
  }

  if (realmAtLeast(state, Realm.FoundationEstablishment)) {
    visibleIds.push('deep_temple');
  }

  if (realmAtLeast(state, Realm.FoundationEstablishment)) {
    visibleIds.push('mountain_cave');
  }

  if (flags['entered_qi_condensation'] || state.resources.coins >= 3) {
    visibleIds.push('tea_house');
  }

  if (realmAtLeast(state, Realm.FoundationEstablishment) || (qualities['combat_edge'] ?? 0) >= 5) {
    visibleIds.push('demonic_forest');
  }

  if (realmAtLeast(state, Realm.GoldenCore)) {
    visibleIds.push('celestial_cliff');
  }

  if (isCoreOrAbove(state)) {
    visibleIds.push('core_gate');
  }

  if (realmAtLeast(state, Realm.GoldenCore)) {
    visibleIds.push('spirit_lake');
  }

  if (realmAtLeast(state, Realm.NascentSoul)) {
    visibleIds.push('thunder_peak');
  }

  if (realmAtLeast(state, Realm.NascentSoul)) {
    visibleIds.push('ancient_battlefield');
  }

  if (realmAtLeast(state, Realm.SpiritTransformation)) {
    visibleIds.push('void_rift');
  }

  if (realmAtLeast(state, Realm.Integration)) {
    visibleIds.push('celestial_pavilion');
  }

  if (realmAtLeast(state, Realm.Mahayana)) {
    visibleIds.push('demon_seal_ground');
  }

  if (realmAtLeast(state, Realm.Mahayana)) {
    visibleIds.push('spirit_mountain');
  }

  if (realmAtLeast(state, Realm.Tribulation)) {
    visibleIds.push('tribulation_platform');
  }

  if (realmAtLeast(state, Realm.Tribulation)) {
    visibleIds.push('immortal_garden');
  }

  return visibleIds.map((id) => LOCATIONS[id]).filter(Boolean);
}
