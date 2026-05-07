import { GameState, Resources, Realm } from './types';
import { ACTIONS } from '../content/actions';
import { deriveGameTime, INITIAL_MAX_STAMINA } from './state';
import { RESOURCE_LABELS } from './resources';
import { advanceWorld, recordActionInWorld } from './world';

export { ACTIONS };

export interface ActionResult {
  state: GameState;
  log: string;
  success: boolean;
}

const RESOURCE_KEYS = ['qi', 'essence', 'herbs', 'coins', 'insight', 'lifespan', 'wounds'] as const;
const ACTION_ROUTE_QUALITIES: Record<string, string> = {
  kuzuo: 'quiet_cultivation',
  tuna: 'quiet_cultivation',
  tiaoxi: 'quiet_cultivation',
  rike_tuna: 'quiet_cultivation',
  caiyao: 'alchemy_affinity',
  bianyao: 'alchemy_affinity',
  xunshan: 'combat_edge',
  trade: 'market_ties',
  gossip: 'market_ties',
  sect_chore: 'sect_trace',
  listen_lesson: 'sect_trace',
  yinqi: 'quiet_cultivation',
};

function firstMissingCost(resources: Resources, cost: Partial<Resources>): keyof Resources | null {
  for (const key of RESOURCE_KEYS) {
    const amount = cost[key] ?? 0;
    if (amount > 0 && resources[key] < amount) return key;
  }
  return null;
}

function firstMissingMinResource(resources: Resources, minResources: Partial<Resources> = {}): keyof Resources | null {
  for (const key of RESOURCE_KEYS) {
    const amount = minResources[key] ?? 0;
    if (amount > 0 && resources[key] < amount) return key;
  }
  return null;
}

function spendTicks(state: GameState, ticks: number): GameState {
  if (ticks <= 0) return state;

  return advanceWorld({
    ...state,
    resources: {
      ...state.resources,
      lifespan: Math.max(0, state.resources.lifespan - ticks),
    },
    time: deriveGameTime(state.time.tick + ticks),
  });
}

export function performAction(state: GameState, actionId: string, random?: () => number): ActionResult {
  const action = ACTIONS[actionId];
  if (!action) {
    return { state, log: `未知的行动: ${actionId}`, success: false };
  }

  const missingCost = firstMissingCost(state.resources, action.cost);
  if (missingCost) {
    return { state, log: `${RESOURCE_LABELS[missingCost]}不足，无法进行${action.name}`, success: false };
  }

  const missingMinResource = firstMissingMinResource(state.resources, action.conditions.minResources);
  if (missingMinResource) {
    return { state, log: `${RESOURCE_LABELS[missingMinResource]}不足，无法进行${action.name}`, success: false };
  }

  // Check conditions
  const missingFlag = action.conditions.requiredFlags?.find((flag) => !state.choices.flags[flag]);
  if (missingFlag) {
    return { state, log: `尚未满足${action.name}的条件。`, success: false };
  }
  if (action.conditions.requiredLocation && state.currentLocationId !== action.conditions.requiredLocation) {
    return { state, log: `此地无法进行${action.name}`, success: false };
  }
  if (action.conditions.requiredRealm && state.realm !== action.conditions.requiredRealm) {
    return { state, log: `当前境界无法进行${action.name}`, success: false };
  }

  // Deduct costs
  let newState = { ...state };
  newState.resources = { ...state.resources };

  for (const key of RESOURCE_KEYS) {
    newState.resources[key] -= action.cost[key] ?? 0;
  }
  // Risk check
  const rand = random ? random() : Math.random();
  if (rand < action.riskProbability) {
    // Basic risk consequence for now: action fails, maybe essence lost
    newState = spendTicks(newState, action.cooldown);
    return { 
      state: newState, 
      log: `进行${action.name}时遭遇意外，未能获得收益。`, 
      success: false 
    };
  }

  if (actionId === 'yinqi') {
    newState.realm = Realm.QiCondensation;
    newState.realmLayer = 1;
    newState.choices = {
      ...newState.choices,
      flags: {
        ...newState.choices.flags,
        entered_qi_condensation: true,
      },
    };
  }

  // Add outputs
  for (const key of RESOURCE_KEYS) {
    newState.resources[key] += action.output[key] ?? 0;
  }
  newState.resources.essence = Math.min(INITIAL_MAX_STAMINA, newState.resources.essence);
  newState.resources.lifespan = Math.max(0, newState.resources.lifespan);

  // Record action count
  const countKey = `action_${actionId}_count`;
  const routeQuality = ACTION_ROUTE_QUALITIES[actionId];
  newState.choices = {
    ...newState.choices,
    flags: {
      ...newState.choices.flags,
      [`completed_${actionId}`]: true,
    },
    qualities: {
      ...newState.choices.qualities,
      [countKey]: (newState.choices.qualities[countKey] || 0) + 1,
      ...(routeQuality
        ? { [routeQuality]: (newState.choices.qualities[routeQuality] || 0) + 1 }
        : {}),
    }
  };
  newState = recordActionInWorld(newState, actionId);
  newState = spendTicks(newState, action.cooldown);

  return {
    state: newState,
    log: actionId === 'yinqi'
      ? '气入丹田，周身微鸣。你踏入炼气一层。'
      : actionId === 'rike_tuna'
        ? '一段日课毕，气息在周身往复数回。'
        : `进行了${action.name}。`,
    success: true,
  };
}
