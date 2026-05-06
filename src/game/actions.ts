import { GameState, Action } from './types';

// Hardcoded actions for now, can be moved to src/content/actions.ts later
export const ACTIONS: Record<string, Action> = {
  'tuna': {
    id: 'tuna',
    name: '吐纳',
    cost: { stamina: 10 },
    output: { qi: 1 },
    cooldown: 0,
    riskProbability: 0,
    conditions: {},
  },
  'caiyao': {
    id: 'caiyao',
    name: '采药',
    cost: { stamina: 20 },
    output: { herbs: 1 },
    cooldown: 0,
    riskProbability: 0.1, // Maybe encounter something
    conditions: {},
  },
  'dushu': {
    id: 'dushu',
    name: '读书',
    cost: { stamina: 15 },
    output: { knowledge: 1 },
    cooldown: 0,
    riskProbability: 0,
    conditions: {},
  },
  'xunshan': {
    id: 'xunshan',
    name: '巡山',
    cost: { stamina: 30 },
    output: { knowledge: 1, herbs: 2 },
    cooldown: 0,
    riskProbability: 0.3,
    conditions: {},
  },
  'xiuxi': {
    id: 'xiuxi',
    name: '休息',
    cost: {},
    // 休息通常是消耗时间换取体力，目前 tick 机制自带恢复，这里暂定立即回复少量体力并消耗部分寿元(时间)
    output: { stamina: 30 }, 
    cooldown: 0,
    riskProbability: 0,
    conditions: {},
  }
};

export interface ActionResult {
  state: GameState;
  log: string;
  success: boolean;
}

export function performAction(state: GameState, actionId: string, random?: () => number): ActionResult {
  const action = ACTIONS[actionId];
  if (!action) {
    return { state, log: `未知的行动: ${actionId}`, success: false };
  }

  // Check costs
  if (action.cost.stamina && state.resources.stamina < action.cost.stamina) {
    return { state, log: `体力不足，无法进行${action.name}`, success: false };
  }
  if (action.cost.qi && state.resources.qi < action.cost.qi) {
    return { state, log: `灵气不足，无法进行${action.name}`, success: false };
  }

  // Check conditions
  if (action.conditions.requiredLocation && state.currentLocationId !== action.conditions.requiredLocation) {
    return { state, log: `此地无法进行${action.name}`, success: false };
  }

  // Deduct costs
  const newState = { ...state };
  newState.resources = { ...state.resources };

  if (action.cost.stamina) newState.resources.stamina -= action.cost.stamina;
  if (action.cost.qi) newState.resources.qi -= action.cost.qi;
  // xiuxi special case: cost time (lifespan)
  if (actionId === 'xiuxi') {
    newState.resources.lifespan -= 10; // cost some time
    newState.time = { ...newState.time, tick: newState.time.tick + 10 };
  }

  // Risk check
  const rand = random ? random() : Math.random();
  if (rand < action.riskProbability) {
    // Basic risk consequence for now: action fails, maybe stamina lost
    return { 
      state: newState, 
      log: `进行${action.name}时遭遇意外，未能获得收益。`, 
      success: false 
    };
  }

  // Add outputs
  if (action.output.qi) newState.resources.qi += action.output.qi;
  if (action.output.stamina) {
    newState.resources.stamina = Math.min(
      100, // INITIAL_MAX_STAMINA, TODO refactor to central config
      newState.resources.stamina + action.output.stamina
    );
  }
  if (action.output.herbs) newState.resources.herbs += action.output.herbs;
  if (action.output.coins) newState.resources.coins += action.output.coins;
  if (action.output.knowledge) newState.resources.knowledge += action.output.knowledge;

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
    log: `进行了${action.name}。`,
    success: true,
  };
}
