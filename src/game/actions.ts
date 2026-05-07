import { GameState, Resources, Realm } from './types';
import { ACTIONS } from '../content/actions';
import { deriveGameTime, INITIAL_MAX_STAMINA } from './state';
import { RESOURCE_LABELS } from './resources';

export { ACTIONS };

export interface ActionResult {
  state: GameState;
  log: string;
  success: boolean;
}

const RESOURCE_KEYS = ['qi', 'essence', 'herbs', 'coins', 'insight', 'lifespan', 'wounds'] as const;

function firstMissingCost(resources: Resources, cost: Partial<Resources>): keyof Resources | null {
  for (const key of RESOURCE_KEYS) {
    const amount = cost[key] ?? 0;
    if (amount > 0 && resources[key] < amount) return key;
  }
  return null;
}

function spendTicks(state: GameState, ticks: number): GameState {
  return {
    ...state,
    resources: {
      ...state.resources,
      lifespan: Math.max(0, state.resources.lifespan - ticks),
    },
    time: deriveGameTime(state.time.tick + ticks),
  };
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

  // Check conditions
  if (action.conditions.requiredLocation && state.currentLocationId !== action.conditions.requiredLocation) {
    return { state, log: `此地无法进行${action.name}`, success: false };
  }
  if (action.conditions.requiredRealm && state.realm !== action.conditions.requiredRealm) {
    return { state, log: `当前境界无法进行${action.name}`, success: false };
  }

  // Deduct costs
  const newState = { ...state };
  newState.resources = { ...state.resources };

  for (const key of RESOURCE_KEYS) {
    newState.resources[key] -= action.cost[key] ?? 0;
  }
  // 调息消耗一日光阴，换取精元平复。
  if (actionId === 'tiaoxi') {
    Object.assign(newState, spendTicks(newState, 10));
  }
  if (actionId === 'rike_tuna') {
    Object.assign(newState, spendTicks(newState, 50));
  }

  // Risk check
  const rand = random ? random() : Math.random();
  if (rand < action.riskProbability) {
    // Basic risk consequence for now: action fails, maybe essence lost
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
  newState.choices = {
    ...newState.choices,
    qualities: {
      ...newState.choices.qualities,
      [countKey]: (newState.choices.qualities[countKey] || 0) + 1
    }
  };

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
