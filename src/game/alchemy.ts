import { HERB_DIRECTION_LABELS, HERB_FLAVOR_LABELS, HERB_NATURE_LABELS, HERB_PROFILES, PILL_RECIPES } from '../content/alchemy';
import { ELEMENT_LABELS } from '../content/cultivation';
import { AlchemyState, GameState, Resources } from './types';

export const SMALL_QI_PILL_RECIPE_ID = 'small_qi_pill';
export const STABILIZING_POWDER_RECIPE_ID = 'stabilizing_powder';
const RESOURCE_KEYS = ['qi', 'essence', 'herbs', 'qiPills', 'stabilizingPowders', 'coins', 'insight', 'dantoxin', 'lifespan', 'wounds'] as const;

export function createInitialAlchemyState(): AlchemyState {
  return {
    knownRecipeIds: [],
    brewedRecipeCounts: {},
    consumedPillCounts: {},
  };
}

export function knowsRecipe(state: GameState, recipeId: string): boolean {
  return state.alchemy.knownRecipeIds.includes(recipeId);
}

export function learnRecipe(state: GameState, recipeId: string): { state: GameState; log: string } {
  const recipe = PILL_RECIPES[recipeId];
  if (!recipe) {
    return { state, log: '丹方无名，无法辨认。' };
  }

  if (knowsRecipe(state, recipeId)) {
    return { state, log: `你又温了一遍《${recipe.name}》的药性。` };
  }

  const mainHerb = HERB_PROFILES[recipe.mainHerbId];
  const assistantHerb = HERB_PROFILES[recipe.assistantHerbId];

  const nextState: GameState = {
    ...state,
    alchemy: {
      ...state.alchemy,
      knownRecipeIds: [...state.alchemy.knownRecipeIds, recipeId],
    },
    choices: {
      ...state.choices,
      flags: {
        ...state.choices.flags,
        [`known_recipe_${recipeId}`]: true,
      },
    },
  };

  return {
    state: nextState,
    log: `你辨出一张小方。主药${mainHerb.name}，佐以${assistantHerb.name}，可炼《${recipe.name}》。`,
  };
}

function getAlchemySuccessChance(state: GameState, recipeId: string): number {
  const recipe = PILL_RECIPES[recipeId];
  if (!recipe) return 0;

  const alchemyAffinity = state.choices.qualities.alchemy_affinity ?? 0;
  const phaseAffinity = state.cultivation.rootKnown
    ? state.cultivation.phaseAffinities[recipe.phase] ?? 0
    : 0;
  const seasonBonus = recipe.seasonalAffinity.includes(state.time.season) ? 0.05 : 0;
  const practiceBonus = Math.min(0.12, alchemyAffinity * 0.015);
  const phaseBonus = Math.min(0.08, phaseAffinity * 0.01);
  const toxicityPenalty = state.resources.dantoxin >= 30 ? 0.08 : state.resources.dantoxin >= 10 ? 0.03 : 0;

  return Math.max(0.25, Math.min(0.95, recipe.baseSuccess + seasonBonus + practiceBonus + phaseBonus - toxicityPenalty));
}

export function brewRecipe(
  state: GameState,
  recipeId: string,
  random: () => number = Math.random
): { state: GameState; log: string } {
  const recipe = PILL_RECIPES[recipeId];
  if (!recipe) {
    return { state, log: '炉上无此丹方。' };
  }

  if (!knowsRecipe(state, recipeId)) {
    return { state, log: '丹方未明，炉火无从安放。' };
  }

  const roll = random();
  const successChance = getAlchemySuccessChance(state, recipeId);
  const count = state.alchemy.brewedRecipeCounts[recipeId] ?? 0;
  const baseAlchemy = {
    ...state.alchemy,
    brewedRecipeCounts: {
      ...state.alchemy.brewedRecipeCounts,
      [recipeId]: count + 1,
    },
  };

  if (roll <= successChance) {
    const nextState: GameState = {
      ...state,
      resources: {
        ...state.resources,
        [recipe.outputResource]: state.resources[recipe.outputResource] + recipe.outputAmount,
      },
      alchemy: baseAlchemy,
      choices: {
        ...state.choices,
        flags: {
          ...state.choices.flags,
          [`brewed_${recipeId}`]: true,
          has_qi_pill: recipe.outputResource === 'qiPills' ? true : state.choices.flags.has_qi_pill,
          has_stabilizing_powder: recipe.outputResource === 'stabilizingPowders'
            ? true
            : state.choices.flags.has_stabilizing_powder,
        },
        qualities: {
          ...state.choices.qualities,
          alchemy_affinity: (state.choices.qualities.alchemy_affinity ?? 0) + 1,
        },
      },
    };

    return {
      state: nextState,
      log: `炉火收住，丹成一粒。${recipe.name}色不甚纯。`,
    };
  }

  const nextState: GameState = {
    ...state,
    resources: {
      ...state.resources,
      insight: state.resources.insight + 1,
      dantoxin: state.resources.dantoxin + recipe.failureDantoxin,
    },
    alchemy: baseAlchemy,
    choices: {
      ...state.choices,
      qualities: {
        ...state.choices.qualities,
        alchemy_affinity: (state.choices.qualities.alchemy_affinity ?? 0) + 1,
      },
    },
  };

  return {
    state: nextState,
    log: '炉火偏了一线。丹未成，炉底留下一撮苦灰。',
  };
}

export function consumePill(state: GameState, recipeId: string): { state: GameState; log: string } {
  const recipe = PILL_RECIPES[recipeId];
  if (!recipe) {
    return { state, log: '丹药无名，不宜入口。' };
  }

  const isQiPill = recipe.outputResource === 'qiPills';
  const isStabilizingPowder = recipe.outputResource === 'stabilizingPowders';
  const affinityBonus = state.cultivation.rootKnown && state.cultivation.phaseAffinities[recipe.phase] > 0 ? 1 : 0;
  const toxicityPenalty = state.resources.dantoxin >= 30 ? 2 : state.resources.dantoxin >= 10 ? 1 : 0;
  const qiDelta = isQiPill
    ? Math.max(1, (recipe.effect.qi ?? 0) + affinityBonus - toxicityPenalty)
    : recipe.effect.qi ?? 0;
  const consumedCount = state.alchemy.consumedPillCounts[recipeId] ?? 0;
  const nextResources = { ...state.resources };

  for (const key of RESOURCE_KEYS) {
    nextResources[key] += recipe.effect[key] ?? 0;
  }

  if (isQiPill) {
    nextResources.qi = state.resources.qi + qiDelta;
  }

  nextResources.dantoxin += recipe.dantoxin;
  nextResources.qi = Math.max(0, nextResources.qi);
  nextResources.essence = Math.max(0, nextResources.essence);
  nextResources.herbs = Math.max(0, nextResources.herbs);
  nextResources.coins = Math.max(0, nextResources.coins);
  nextResources.insight = Math.max(0, nextResources.insight);
  nextResources.dantoxin = Math.max(0, nextResources.dantoxin);
  nextResources.lifespan = Math.max(0, nextResources.lifespan);
  nextResources.wounds = Math.max(0, nextResources.wounds);

  const nextState: GameState = {
    ...state,
    resources: nextResources,
    alchemy: {
      ...state.alchemy,
      consumedPillCounts: {
        ...state.alchemy.consumedPillCounts,
        [recipeId]: consumedCount + 1,
      },
    },
    choices: {
      ...state.choices,
      flags: {
        ...state.choices.flags,
        tasted_qi_pill: isQiPill ? true : state.choices.flags.tasted_qi_pill,
        tasted_stabilizing_powder: isStabilizingPowder ? true : state.choices.flags.tasted_stabilizing_powder,
        guarded_breakthrough: isStabilizingPowder ? true : state.choices.flags.guarded_breakthrough,
      },
      qualities: {
        ...state.choices.qualities,
        ...(isStabilizingPowder
          ? { breakthrough_guard: (state.choices.qualities.breakthrough_guard ?? 0) + 1 }
          : {}),
      },
    },
  };

  if (isStabilizingPowder) {
    return {
      state: nextState,
      log: `你服下一份${recipe.name}。药性沉下，气机慢了一分。`,
    };
  }

  return {
    state: nextState,
    log: `你服下一粒${recipe.name}。药气浮起，真气添了${qiDelta}缕。`,
  };
}

export function applyAlchemyOutputModifiers(
  state: GameState,
  actionId: string,
  output: Partial<Resources>
): Partial<Resources> {
  if (actionId !== 'tiaoxi') return output;

  const baseEssence = output.essence ?? 0;
  if (baseEssence <= 0 || state.resources.dantoxin < 10) return output;

  const penalty = state.resources.dantoxin >= 30 ? 10 : 5;
  return {
    ...output,
    essence: Math.max(1, baseEssence - penalty),
  };
}

export function getDantoxinStageLabel(dantoxin: number): string {
  if (dantoxin >= 60) return '丹毒入脉';
  if (dantoxin >= 30) return '药气冲突';
  if (dantoxin >= 10) return '气息浑浊';
  if (dantoxin > 0) return '微有药滞';
  return '无';
}

export function getAlchemySummary(state: GameState): string[] {
  if (
    state.alchemy.knownRecipeIds.length === 0 &&
    state.resources.qiPills <= 0 &&
    state.resources.stabilizingPowders <= 0 &&
    state.resources.dantoxin <= 0
  ) {
    return [];
  }

  const lines: string[] = [];

  if (state.alchemy.knownRecipeIds.length > 0) {
    const recipeNames = state.alchemy.knownRecipeIds
      .map((recipeId) => PILL_RECIPES[recipeId]?.name)
      .filter(Boolean)
      .join('、');
    lines.push(`丹方：${recipeNames}`);
  }

  if (state.resources.qiPills > 0 || state.choices.flags.has_qi_pill) {
    lines.push(`丹药：小聚气丸 ${state.resources.qiPills.toFixed(0)} 粒`);
  }

  if (state.resources.stabilizingPowders > 0 || state.choices.flags.has_stabilizing_powder) {
    lines.push(`丹药：稳息散 ${state.resources.stabilizingPowders.toFixed(0)} 份`);
  }

  if (state.choices.flags.guarded_breakthrough) {
    lines.push('护持：稳息散');
  }

  if (state.resources.dantoxin > 0 || state.choices.flags.tasted_qi_pill) {
    lines.push(`丹毒：${state.resources.dantoxin.toFixed(0)}，${getDantoxinStageLabel(state.resources.dantoxin)}`);
  }

  const recipeLines = state.alchemy.knownRecipeIds
    .map((recipeId) => PILL_RECIPES[recipeId])
    .filter(Boolean)
    .map((recipe) => {
      const mainHerb = HERB_PROFILES[recipe.mainHerbId];
      return `${recipe.name}${HERB_NATURE_LABELS[recipe.nature]}${HERB_FLAVOR_LABELS[mainHerb.flavor]}/${ELEMENT_LABELS[recipe.phase]}相/${HERB_DIRECTION_LABELS[recipe.direction]}`;
    });

  if (recipeLines.length > 0) {
    lines.push(`药性：${recipeLines.join('；')}`);
  }

  return lines;
}
