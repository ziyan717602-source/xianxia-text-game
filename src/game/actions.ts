import { GameState, Resources, Realm } from './types';
import { ACTIONS } from '../content/actions';
import {
  applyAlchemyOutputModifiers,
  brewRecipe,
  CLEANSING_PILL_RECIPE_ID,
  consumePill,
  learnRecipe,
  SMALL_QI_PILL_RECIPE_ID,
  STABILIZING_POWDER_RECIPE_ID,
} from './alchemy';
import { resolveBreakthrough, stabilizeBreakthrough } from './breakthrough';
import { applyCultivationOutputModifiers, attuneTechnique, revealRoot } from './cultivation';
import { deriveGameTime, INITIAL_MAX_STAMINA } from './state';
import { RESOURCE_LABELS } from './resources';
import { advanceWorld, recordActionInWorld } from './world';

export { ACTIONS };

export interface ActionResult {
  state: GameState;
  log: string;
  success: boolean;
}

const RESOURCE_KEYS = ['qi', 'essence', 'herbs', 'qiPills', 'stabilizingPowders', 'cleansingPills', 'coins', 'insight', 'dantoxin', 'lifespan', 'wounds'] as const;
const ACTION_ROUTE_QUALITIES: Record<string, string> = {
  kuzuo: 'quiet_cultivation',
  tuna: 'quiet_cultivation',
  tiaoxi: 'quiet_cultivation',
  rike_tuna: 'quiet_cultivation',
  short_retreat: 'quiet_cultivation',
  inspect_root: 'quiet_cultivation',
  attune_technique: 'quiet_cultivation',
  study_qi_formula: 'alchemy_affinity',
  study_steady_formula: 'alchemy_affinity',
  study_cleansing_formula: 'alchemy_affinity',
  brew_qi_pill: 'alchemy_affinity',
  brew_stabilizing_powder: 'alchemy_affinity',
  brew_cleansing_pill: 'alchemy_affinity',
  take_qi_pill: 'alchemy_affinity',
  take_stabilizing_powder: 'alchemy_affinity',
  take_cleansing_pill: 'alchemy_affinity',
  stabilize_bottleneck: 'quiet_cultivation',
  breakthrough_qi_2: 'quiet_cultivation',
  breakthrough_qi_3: 'quiet_cultivation',
  breakthrough_foundation: 'quiet_cultivation',
  withdraw_foundation: 'quiet_cultivation',
  arrange_qi_array: 'formation_craft',
  array_retreat: 'quiet_cultivation',
  seek_foundation_guardian: 'sect_trace',
  borrow_foundation_pill: 'reckless_breakthrough',
  caiyao: 'alchemy_affinity',
  bianyao: 'alchemy_affinity',
  xunshan: 'combat_edge',
  trade: 'market_ties',
  gossip: 'market_ties',
  sect_chore: 'sect_trace',
  sect_errand: 'sect_trace',
  sect_supply: 'sect_trace',
  sect_roll_call: 'sect_trace',
  sect_patrol: 'sect_trace',
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
  const forbiddenFlag = action.conditions.forbiddenFlags?.find((flag) => state.choices.flags[flag]);
  if (forbiddenFlag) {
    return { state, log: `${action.name}已无须重复。`, success: false };
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
  const rand = action.riskProbability > 0 ? (random ? random() : Math.random()) : 1;
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

  let customLog: string | null = null;

  if (actionId === 'inspect_root') {
    const result = revealRoot(newState);
    newState = result.state;
    customLog = result.log;
  }

  if (actionId === 'attune_technique') {
    const result = attuneTechnique(newState);
    newState = result.state;
    customLog = result.log;
  }

  if (actionId === 'study_qi_formula') {
    const result = learnRecipe(newState, SMALL_QI_PILL_RECIPE_ID);
    newState = result.state;
    customLog = result.log;
  }

  if (actionId === 'study_steady_formula') {
    const result = learnRecipe(newState, STABILIZING_POWDER_RECIPE_ID);
    newState = result.state;
    customLog = result.log;
  }

  if (actionId === 'study_cleansing_formula') {
    const result = learnRecipe(newState, CLEANSING_PILL_RECIPE_ID);
    newState = result.state;
    customLog = result.log;
  }

  if (actionId === 'brew_qi_pill') {
    const result = brewRecipe(newState, SMALL_QI_PILL_RECIPE_ID, random);
    newState = result.state;
    customLog = result.log;
  }

  if (actionId === 'brew_stabilizing_powder') {
    const result = brewRecipe(newState, STABILIZING_POWDER_RECIPE_ID, random);
    newState = result.state;
    customLog = result.log;
  }

  if (actionId === 'brew_cleansing_pill') {
    const result = brewRecipe(newState, CLEANSING_PILL_RECIPE_ID, random);
    newState = result.state;
    customLog = result.log;
  }

  if (actionId === 'take_qi_pill') {
    const result = consumePill(newState, SMALL_QI_PILL_RECIPE_ID);
    newState = result.state;
    customLog = result.log;
  }

  if (actionId === 'take_stabilizing_powder') {
    const result = consumePill(newState, STABILIZING_POWDER_RECIPE_ID);
    newState = result.state;
    customLog = result.log;
  }

  if (actionId === 'take_cleansing_pill') {
    const result = consumePill(newState, CLEANSING_PILL_RECIPE_ID);
    newState = result.state;
    customLog = result.log;
  }

  if (actionId === 'stabilize_bottleneck') {
    const result = stabilizeBreakthrough(newState);
    newState = result.state;
    customLog = result.log;
  }

  if (actionId === 'breakthrough_qi_2' || actionId === 'breakthrough_qi_3' || actionId === 'breakthrough_foundation') {
    const result = resolveBreakthrough(newState, actionId, random);
    newState = result.state;
    customLog = result.log;
  }

  if (actionId === 'seek_foundation_guardian') {
    newState = {
      ...newState,
      choices: {
        ...newState.choices,
        flags: {
          ...newState.choices.flags,
          foundation_guardian: true,
          sought_foundation_guardian: true,
          foundation_guardian_account_open: true,
        },
        tags: {
          ...newState.choices.tags,
          sect_trace: 'guardian',
        },
        qualities: {
          ...newState.choices.qualities,
          sect_trace: (newState.choices.qualities.sect_trace ?? 0) + 1,
        },
      },
    };
    customLog = '外门有人应下护法。话不多，价钱记在前头。';
  }

  if (actionId === 'borrow_foundation_pill') {
    newState = {
      ...newState,
      choices: {
        ...newState.choices,
        flags: {
          ...newState.choices.flags,
          borrowed_foundation_aid: true,
          foundation_pill_debt_open: true,
        },
        tags: {
          ...newState.choices.tags,
          market_debt: 'foundation_pill',
        },
        qualities: {
          ...newState.choices.qualities,
          market_ties: (newState.choices.qualities.market_ties ?? 0) + 1,
          reckless_breakthrough: (newState.choices.qualities.reckless_breakthrough ?? 0) + 1,
        },
      },
    };
    customLog = '坊市有人借你一枚筑基用丹。药气重，账也重。';
  }

  if (actionId === 'withdraw_foundation') {
    const currentPreparation = newState.breakthrough.preparation.foundation ?? 0;
    newState = {
      ...newState,
      resources: {
        ...newState.resources,
        dantoxin: Math.max(0, newState.resources.dantoxin - 3),
        wounds: Math.max(0, newState.resources.wounds - 1),
      },
      breakthrough: {
        ...newState.breakthrough,
        preparation: {
          ...newState.breakthrough.preparation,
          foundation: Math.max(1, currentPreparation - 1),
        },
        lastTargetId: 'foundation',
      },
      choices: {
        ...newState.choices,
        flags: {
          ...newState.choices.flags,
          withdrew_foundation: true,
          foundation_guardian: false,
          borrowed_foundation_aid: false,
        },
        tags: {
          ...newState.choices.tags,
          foundation_pause: 'withdrew',
        },
        qualities: {
          ...newState.choices.qualities,
          reckless_breakthrough: Math.max(0, (newState.choices.qualities.reckless_breakthrough ?? 0) - 1),
        },
      },
    };
    customLog = '你把筑基关口压回周天。气未散尽，护法与借丹都暂且作罢。';
  }

  if (actionId === 'arrange_qi_array') {
    newState = {
      ...newState,
      choices: {
        ...newState.choices,
        flags: {
          ...newState.choices.flags,
          home_qi_array: true,
        },
        tags: {
          ...newState.choices.tags,
          dwelling: 'qi_array',
        },
      },
    };
    customLog = '你在居处布下聚气阵。阵纹不繁，足够承接一段闭关。';
  }

  if (actionId === 'array_retreat') {
    newState = {
      ...newState,
      choices: {
        ...newState.choices,
        flags: {
          ...newState.choices.flags,
          qi_array_maintenance_pending: true,
          qi_array_maintenance_seen: false,
          used_qi_array: true,
        },
        tags: {
          ...newState.choices.tags,
          dwelling: 'qi_array_active',
        },
      },
    };
    customLog = '阵中一闭，外声隔在阵脚之外。气来得慢，却连成一段。';
  }

  if (actionId === 'short_retreat') {
    customLog = '你闭门三日。日课并作一段，气息涨落有常。';
  }

  if (actionId === 'sect_roll_call') {
    newState = {
      ...newState,
      choices: {
        ...newState.choices,
        flags: {
          ...newState.choices.flags,
          attended_outer_gate_roll_call: true,
        },
        tags: {
          ...newState.choices.tags,
          sect_status: 'roll_called',
        },
        qualities: {
          ...newState.choices.qualities,
          sect_discipline: (newState.choices.qualities.sect_discipline ?? 0) + 1,
        },
      },
    };
    customLog = '外门点过名。薄簿合上，规矩落在纸上。';
  }

  if (actionId === 'sect_patrol') {
    newState = {
      ...newState,
      choices: {
        ...newState.choices,
        flags: {
          ...newState.choices.flags,
          accepted_outer_gate_patrol: true,
        },
        tags: {
          ...newState.choices.tags,
          sect_status: 'patrol',
        },
        qualities: {
          ...newState.choices.qualities,
          sect_contribution: (newState.choices.qualities.sect_contribution ?? 0) + 1,
          sect_discipline: (newState.choices.qualities.sect_discipline ?? 0) + 1,
        },
      },
    };
    customLog = '你领了外门巡值。山门内外走一圈，事归薄簿。';
  }

  if (actionId === 'sect_errand') {
    customLog = '你领了一件外门短差。事小，规矩不少。';
  }

  if (actionId === 'sect_supply') {
    customLog = '外门按册给了些供给。数目不多，账上有名。';
  }

  const adjustedOutput = applyAlchemyOutputModifiers(
    newState,
    actionId,
    applyCultivationOutputModifiers(newState, actionId, action.output)
  );

  // Add outputs
  for (const key of RESOURCE_KEYS) {
    newState.resources[key] += adjustedOutput[key] ?? 0;
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
      : customLog
        ? customLog
      : actionId === 'rike_tuna'
        ? '一段日课毕，气息在周身往复数回。'
        : `进行了${action.name}。`,
    success: true,
  };
}
