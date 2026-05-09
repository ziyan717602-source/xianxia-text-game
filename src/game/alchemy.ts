import { HERB_DIRECTION_LABELS, HERB_FLAVOR_LABELS, HERB_NATURE_LABELS, HERB_PROFILES, PILL_RECIPES } from '../content/alchemy';
import { ELEMENT_LABELS } from '../content/cultivation';
import { RESOURCE_KEYS } from './resources';
import { AlchemyState, GameState, Resources } from './types';

export const SMALL_QI_PILL_RECIPE_ID = 'small_qi_pill';
export const STABILIZING_POWDER_RECIPE_ID = 'stabilizing_powder';
export const CLEANSING_PILL_RECIPE_ID = 'cleansing_pill';
export const MERIDIAN_CLEANSING_PILL_RECIPE_ID = 'meridian_cleansing_pill';
export const FOUNDATION_STRENGTHENING_PILL_RECIPE_ID = 'foundation_strengthening_pill';
export const SPIRIT_GATHERING_PILL_RECIPE_ID = 'spirit_gathering_pill';
export const WARM_FURNACE_PILL_RECIPE_ID = 'warm_furnace_pill';
export const NIGHT_SITTING_PILL_RECIPE_ID = 'night_sitting_pill';
export const CLOUD_GATHERING_PILL_RECIPE_ID = 'cloud_gathering_pill';
export const IRON_BODY_PILL_RECIPE_ID = 'iron_body_pill';
export const DEMON_BANE_PILL_RECIPE_ID = 'demon_bane_pill';
export const FOUNDATION_EXPLOSION_PILL_RECIPE_ID = 'foundation_explosion_pill';
export const SPIRIT_VEIN_PILL_RECIPE_ID = 'spirit_vein_pill';
export const SHADOW_ESCAPE_PILL_RECIPE_ID = 'shadow_escape_pill';
export const LONGEVITY_PILL_RECIPE_ID = 'longevity_pill';
export const FIRE_FURNACE_PILL_RECIPE_ID = 'fire_furnace_pill';
export const NINE_TURN_FOUNDATION_PILL_RECIPE_ID = 'nine_turn_foundation_pill';
export const BUDDHA_HEART_PILL_RECIPE_ID = 'buddha_heart_pill';
export const GOLDEN_CORE_FORMATION_PILL_RECIPE_ID = 'golden_core_formation_pill';
export const GOLDEN_CORE_STRENGTHENING_PILL_RECIPE_ID = 'golden_core_strengthening_pill';
export const GOLDEN_CORE_FIRE_PILL_RECIPE_ID = 'golden_core_fire_pill';
export const NASCENT_SOUL_NURTURING_PILL_RECIPE_ID = 'nascent_soul_nurturing_pill';
export const NASCENT_SOUL_SEPARATION_PILL_RECIPE_ID = 'nascent_soul_separation_pill';
export const NASCENT_SOUL_PROTECTION_PILL_RECIPE_ID = 'nascent_soul_protection_pill';
export const SPIRIT_TRANSFORM_PILL_RECIPE_ID = 'spirit_transform_pill';
export const SPIRIT_TRANSFORM_FIRE_PILL_RECIPE_ID = 'spirit_transform_fire_pill';
export const INTEGRATION_PILL_RECIPE_ID = 'integration_pill';
export const INTEGRATION_BODY_PILL_RECIPE_ID = 'integration_body_pill';
export const MAHAYANA_PILL_RECIPE_ID = 'mahayana_pill';
export const MAHAYANA_ENLIGHTENMENT_PILL_RECIPE_ID = 'mahayana_enlightenment_pill';
export const TRIBULATION_PROTECTION_PILL_RECIPE_ID = 'tribulation_protection_pill';
export const HEAVENLY_TRIBULATION_PILL_RECIPE_ID = 'heavenly_tribulation_pill';
export const TRIBULATION_SOUL_PILL_RECIPE_ID = 'tribulation_soul_pill';

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
  const warmFurnaceBonus = (state.choices.flags.has_warm_furnace_pill || state.resources.warmFurnacePills > 0) ? 0.03 : 0;
  const fireFurnaceBonus = (state.choices.flags.has_fire_furnace_pill || state.resources.fireFurnacePills > 0) ? 0.05 : 0;

  return Math.max(0.25, Math.min(0.95, recipe.baseSuccess + seasonBonus + practiceBonus + phaseBonus + warmFurnaceBonus + fireFurnaceBonus - toxicityPenalty));
}

export function brewRecipe(
  state: GameState,
  recipeId: string,
  random?: () => number, // seeded rng should be provided by callers for determinism
): { state: GameState; log: string } {
  const recipe = PILL_RECIPES[recipeId];
  if (!recipe) {
    return { state, log: '炉上无此丹方。' };
  }

  if (!knowsRecipe(state, recipeId)) {
    return { state, log: '丹方未明，炉火无从安放。' };
  }

  const roll = random ? random() : 0.5;
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
          has_cleansing_pill: recipe.outputResource === 'cleansingPills'
            ? true
            : state.choices.flags.has_cleansing_pill,
          has_meridian_cleansing_pill: recipe.outputResource === 'meridianCleansingPills'
            ? true
            : state.choices.flags.has_meridian_cleansing_pill,
          has_foundation_strengthening_pill: recipe.outputResource === 'foundationStrengtheningPills'
            ? true
            : state.choices.flags.has_foundation_strengthening_pill,
          has_spirit_gathering_pill: recipe.outputResource === 'spiritGatheringPills'
            ? true
            : state.choices.flags.has_spirit_gathering_pill,
          has_warm_furnace_pill: recipe.outputResource === 'warmFurnacePills'
            ? true
            : state.choices.flags.has_warm_furnace_pill,
          has_night_sitting_pill: recipe.outputResource === 'nightSittingPills'
            ? true
            : state.choices.flags.has_night_sitting_pill,
          has_cloud_gathering_pill: recipe.outputResource === 'cloudGatheringPills'
            ? true
            : state.choices.flags.has_cloud_gathering_pill,
          has_iron_body_pill: recipe.outputResource === 'ironBodyPills'
            ? true
            : state.choices.flags.has_iron_body_pill,
          has_demon_bane_pill: recipe.outputResource === 'demonBanePills'
            ? true
            : state.choices.flags.has_demon_bane_pill,
          has_foundation_explosion_pill: recipe.outputResource === 'foundationExplosionPills'
            ? true
            : state.choices.flags.has_foundation_explosion_pill,
          has_spirit_vein_pill: recipe.outputResource === 'spiritVeinPills'
            ? true
            : state.choices.flags.has_spirit_vein_pill,
          has_shadow_escape_pill: recipe.outputResource === 'shadowEscapePills'
            ? true
            : state.choices.flags.has_shadow_escape_pill,
          has_longevity_pill: recipe.outputResource === 'longevityPills'
            ? true
            : state.choices.flags.has_longevity_pill,
          has_fire_furnace_pill: recipe.outputResource === 'fireFurnacePills'
            ? true
            : state.choices.flags.has_fire_furnace_pill,
          has_nine_turn_foundation_pill: recipe.outputResource === 'nineTurnFoundationPills'
            ? true
            : state.choices.flags.has_nine_turn_foundation_pill,
          has_buddha_heart_pill: recipe.outputResource === 'buddhaHeartPills'
            ? true
            : state.choices.flags.has_buddha_heart_pill,
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
  const isCleansingPill = recipe.outputResource === 'cleansingPills';
  const isMeridianCleansingPill = recipe.outputResource === 'meridianCleansingPills';
  const isFoundationStrengtheningPill = recipe.outputResource === 'foundationStrengtheningPills';
  const isSpiritGatheringPill = recipe.outputResource === 'spiritGatheringPills';
  const isWarmFurnacePill = recipe.outputResource === 'warmFurnacePills';
  const isNightSittingPill = recipe.outputResource === 'nightSittingPills';
  const isCloudGatheringPill = recipe.outputResource === 'cloudGatheringPills';
  const isIronBodyPill = recipe.outputResource === 'ironBodyPills';
  const isDemonBanePill = recipe.outputResource === 'demonBanePills';
  const isFoundationExplosionPill = recipe.outputResource === 'foundationExplosionPills';
  const isSpiritVeinPill = recipe.outputResource === 'spiritVeinPills';
  const isShadowEscapePill = recipe.outputResource === 'shadowEscapePills';
  const isLongevityPill = recipe.outputResource === 'longevityPills';
  const isFireFurnacePill = recipe.outputResource === 'fireFurnacePills';
  const isNineTurnFoundationPill = recipe.outputResource === 'nineTurnFoundationPills';
  const isBuddhaHeartPill = recipe.outputResource === 'buddhaHeartPills';
  const affinityBonus = state.cultivation.rootKnown && state.cultivation.phaseAffinities[recipe.phase] > 0 ? 1 : 0;
  const toxicityPenalty = state.resources.dantoxin >= 30 ? 2 : state.resources.dantoxin >= 10 ? 1 : 0;
  const qiDelta = isQiPill || isSpiritGatheringPill || isCloudGatheringPill
    ? Math.max(1, (recipe.effect.qi ?? 0) + affinityBonus - toxicityPenalty)
    : recipe.effect.qi ?? 0;
  const consumedCount = state.alchemy.consumedPillCounts[recipeId] ?? 0;
  const nextResources = { ...state.resources };
  const previousDantoxin = state.resources.dantoxin;

  for (const key of RESOURCE_KEYS) {
    nextResources[key] += recipe.effect[key] ?? 0;
  }

  if (isQiPill || isSpiritGatheringPill || isCloudGatheringPill) {
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
        tasted_cleansing_pill: isCleansingPill ? true : state.choices.flags.tasted_cleansing_pill,
        tasted_meridian_cleansing_pill: isMeridianCleansingPill ? true : state.choices.flags.tasted_meridian_cleansing_pill,
        tasted_foundation_strengthening_pill: isFoundationStrengtheningPill ? true : state.choices.flags.tasted_foundation_strengthening_pill,
        tasted_spirit_gathering_pill: isSpiritGatheringPill ? true : state.choices.flags.tasted_spirit_gathering_pill,
        tasted_warm_furnace_pill: isWarmFurnacePill ? true : state.choices.flags.tasted_warm_furnace_pill,
        tasted_night_sitting_pill: isNightSittingPill ? true : state.choices.flags.tasted_night_sitting_pill,
        tasted_cloud_gathering_pill: isCloudGatheringPill ? true : state.choices.flags.tasted_cloud_gathering_pill,
        tasted_iron_body_pill: isIronBodyPill ? true : state.choices.flags.tasted_iron_body_pill,
        tasted_demon_bane_pill: isDemonBanePill ? true : state.choices.flags.tasted_demon_bane_pill,
        tasted_foundation_explosion_pill: isFoundationExplosionPill ? true : state.choices.flags.tasted_foundation_explosion_pill,
        tasted_spirit_vein_pill: isSpiritVeinPill ? true : state.choices.flags.tasted_spirit_vein_pill,
        tasted_shadow_escape_pill: isShadowEscapePill ? true : state.choices.flags.tasted_shadow_escape_pill,
        tasted_longevity_pill: isLongevityPill ? true : state.choices.flags.tasted_longevity_pill,
        tasted_fire_furnace_pill: isFireFurnacePill ? true : state.choices.flags.tasted_fire_furnace_pill,
        tasted_nine_turn_foundation_pill: isNineTurnFoundationPill ? true : state.choices.flags.tasted_nine_turn_foundation_pill,
        tasted_buddha_heart_pill: isBuddhaHeartPill ? true : state.choices.flags.tasted_buddha_heart_pill,
        guarded_breakthrough: isStabilizingPowder ? true : state.choices.flags.guarded_breakthrough,
        relieved_dantoxin_meridians: isCleansingPill && previousDantoxin >= 60 && nextResources.dantoxin < 60
          ? true
          : state.choices.flags.relieved_dantoxin_meridians,
        relieved_dantoxin_vein_decay: isMeridianCleansingPill && previousDantoxin >= 100 && nextResources.dantoxin < 100
          ? true
          : state.choices.flags.relieved_dantoxin_vein_decay,
      },
      qualities: {
        ...state.choices.qualities,
        ...(isStabilizingPowder
          ? { breakthrough_guard: (state.choices.qualities.breakthrough_guard ?? 0) + 1 }
          : {}),
        ...(isCleansingPill
          ? {
              quiet_cultivation: (state.choices.qualities.quiet_cultivation ?? 0) + 1,
              reckless_breakthrough: Math.max(0, (state.choices.qualities.reckless_breakthrough ?? 0) - 1),
            }
          : {}),
        ...(isMeridianCleansingPill
          ? {
              quiet_cultivation: (state.choices.qualities.quiet_cultivation ?? 0) + 1,
              reckless_breakthrough: Math.max(0, (state.choices.qualities.reckless_breakthrough ?? 0) - 1),
            }
          : {}),
        ...(isSpiritVeinPill
          ? {
              quiet_cultivation: (state.choices.qualities.quiet_cultivation ?? 0) + 1,
            }
          : {}),
        ...(isDemonBanePill
          ? {
              quiet_cultivation: (state.choices.qualities.quiet_cultivation ?? 0) + 2,
            }
          : {}),
        ...(isBuddhaHeartPill
          ? {
              quiet_cultivation: (state.choices.qualities.quiet_cultivation ?? 0) + 2,
              reckless_breakthrough: Math.max(0, (state.choices.qualities.reckless_breakthrough ?? 0) - 1),
            }
          : {}),
      },
    },
  };

  if (isCleansingPill || isMeridianCleansingPill) {
    const cleared = Math.max(0, previousDantoxin - nextState.resources.dantoxin);
    return {
      state: nextState,
      log: `你服下一粒${recipe.name}。苦意下行，丹毒退了${cleared}分。`,
    };
  }

  if (isWarmFurnacePill || isFireFurnacePill) {
    return {
      state: nextState,
      log: `你服下一粒${recipe.name}。药性温升，炉火之势渐盛。`,
    };
  }

  if (isNightSittingPill) {
    return {
      state: nextState,
      log: `你服下一粒${recipe.name}。心神沉静，夜修之效渐显。`,
    };
  }

  if (isStabilizingPowder) {
    return {
      state: nextState,
      log: `你服下一份${recipe.name}。药性沉下，气机慢了一分。`,
    };
  }

  if (isFoundationStrengtheningPill) {
    return {
      state: nextState,
      log: `你服下一粒${recipe.name}。药性温升，真气添了${qiDelta}缕，气机固了一分。`,
    };
  }

  if (isCloudGatheringPill) {
    return {
      state: nextState,
      log: `你服下一粒${recipe.name}。灵气如云涌来，真气添了${qiDelta}缕。`,
    };
  }

  if (isIronBodyPill) {
    return {
      state: nextState,
      log: `你服下一粒${recipe.name}。铁性入骨，筋骨坚了一分。`,
    };
  }

  if (isDemonBanePill) {
    return {
      state: nextState,
      log: `你服下一粒${recipe.name}。药性温辛，心魔之气渐退。`,
    };
  }

  if (isFoundationExplosionPill) {
    return {
      state: nextState,
      log: `你服下一粒${recipe.name}。火性猛冲，真气暴涨，但丹毒与伤势亦重。`,
    };
  }

  if (isSpiritVeinPill) {
    const cleared = Math.max(0, previousDantoxin - nextState.resources.dantoxin);
    return {
      state: nextState,
      log: `你服下一粒${recipe.name}。灵脉通透，丹毒退了${cleared}分，真气添了${qiDelta}缕。`,
    };
  }

  if (isShadowEscapePill) {
    return {
      state: nextState,
      log: `你服下一粒${recipe.name}。身形渐隐，如影入暗。`,
    };
  }

  if (isLongevityPill) {
    return {
      state: nextState,
      log: `你服下一粒${recipe.name}。古松精华入体，寿元添了百年。`,
    };
  }

  if (isNineTurnFoundationPill) {
    return {
      state: nextState,
      log: `你服下一粒${recipe.name}。九转之力灌顶，真气暴增，但代价惨重。`,
    };
  }

  if (isBuddhaHeartPill) {
    const cleared = Math.max(0, previousDantoxin - nextState.resources.dantoxin);
    return {
      state: nextState,
      log: `你服下一粒${recipe.name}。心境清明，丹毒退了${cleared}分。`,
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
  if (dantoxin >= 100) return '药毒蚀脉';
  if (dantoxin >= 60) return '丹毒入脉';
  if (dantoxin >= 30) return '药气冲突';
  if (dantoxin >= 10) return '气息浑浊';
  if (dantoxin > 0) return '微有药滞';
  return '无';
}

/**
 * 丹毒持续后果 — 在 tick 中调用
 * - dantoxin >= 100: 药毒蚀脉，每10tick（每1日）+1 wounds，精元恢复 -1/tick
 * - dantoxin >= 80: 精元恢复减半
 * - dantoxin >= 60: 已有 tiaoxi 惩罚（此处不重复）
 */
export function applyDantoxinConsequences(state: GameState, ticks: number = 1): GameState {
  if (state.resources.dantoxin < 60) return state;

  let nextResources = { ...state.resources };

  // dantoxin >= 80: essence recovery reduced by 50% — handled by reducing the recovery in tick
  // dantoxin >= 100: +1 wound per day (every 10 ticks), and -1 essence recovery per tick
  if (state.resources.dantoxin >= 100) {
    // Reduce essence recovery by 1 per tick
    nextResources.essence = Math.max(0, nextResources.essence - ticks);

    // +1 wound per day (every 10 ticks)
    const daysPassed = Math.floor(ticks / 10);
    if (daysPassed > 0) {
      nextResources.wounds = nextResources.wounds + daysPassed;
    }
  }

  // dantoxin >= 80: essence recovery reduced by 50%
  // This is applied as a penalty: the tick already added STAMINA_RECOVERY_PER_TICK * ticks,
  // so we subtract half of that here
  if (state.resources.dantoxin >= 80 && state.resources.dantoxin < 100) {
    const halfRecovery = Math.floor(ticks / 2);
    nextResources.essence = Math.max(0, nextResources.essence - halfRecovery);
  }

  return {
    ...state,
    resources: nextResources,
  };
}

export function getAlchemySummary(state: GameState): string[] {
  if (
    state.alchemy.knownRecipeIds.length === 0 &&
    state.resources.qiPills <= 0 &&
    state.resources.stabilizingPowders <= 0 &&
    state.resources.cleansingPills <= 0 &&
    state.resources.meridianCleansingPills <= 0 &&
    state.resources.foundationStrengtheningPills <= 0 &&
    state.resources.spiritGatheringPills <= 0 &&
    state.resources.warmFurnacePills <= 0 &&
    state.resources.nightSittingPills <= 0 &&
    state.resources.cloudGatheringPills <= 0 &&
    state.resources.ironBodyPills <= 0 &&
    state.resources.demonBanePills <= 0 &&
    state.resources.foundationExplosionPills <= 0 &&
    state.resources.spiritVeinPills <= 0 &&
    state.resources.shadowEscapePills <= 0 &&
    state.resources.longevityPills <= 0 &&
    state.resources.fireFurnacePills <= 0 &&
    state.resources.nineTurnFoundationPills <= 0 &&
    state.resources.buddhaHeartPills <= 0 &&
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

  if (state.resources.cleansingPills > 0 || state.choices.flags.has_cleansing_pill) {
    lines.push(`丹药：清躁丸 ${state.resources.cleansingPills.toFixed(0)} 粒`);
  }

  if (state.resources.meridianCleansingPills > 0 || state.choices.flags.has_meridian_cleansing_pill) {
    lines.push(`丹药：通脉丸 ${state.resources.meridianCleansingPills.toFixed(0)} 粒`);
  }

  if (state.resources.foundationStrengtheningPills > 0 || state.choices.flags.has_foundation_strengthening_pill) {
    lines.push(`丹药：固基丹 ${state.resources.foundationStrengtheningPills.toFixed(0)} 粒`);
  }

  if (state.resources.spiritGatheringPills > 0 || state.choices.flags.has_spirit_gathering_pill) {
    lines.push(`丹药：聚灵丸 ${state.resources.spiritGatheringPills.toFixed(0)} 粒`);
  }

  if (state.resources.warmFurnacePills > 0 || state.choices.flags.has_warm_furnace_pill) {
    lines.push(`丹药：暖炉丹 ${state.resources.warmFurnacePills.toFixed(0)} 粒`);
  }

  if (state.resources.nightSittingPills > 0 || state.choices.flags.has_night_sitting_pill) {
    lines.push(`丹药：夜坐丸 ${state.resources.nightSittingPills.toFixed(0)} 粒`);
  }

  if (state.resources.cloudGatheringPills > 0 || state.choices.flags.has_cloud_gathering_pill) {
    lines.push(`丹药：聚云丸 ${state.resources.cloudGatheringPills.toFixed(0)} 粒`);
  }

  if (state.resources.ironBodyPills > 0 || state.choices.flags.has_iron_body_pill) {
    lines.push(`丹药：铁身丹 ${state.resources.ironBodyPills.toFixed(0)} 粒`);
  }

  if (state.resources.demonBanePills > 0 || state.choices.flags.has_demon_bane_pill) {
    lines.push(`丹药：驱魔丹 ${state.resources.demonBanePills.toFixed(0)} 粒`);
  }

  if (state.resources.foundationExplosionPills > 0 || state.choices.flags.has_foundation_explosion_pill) {
    lines.push(`丹药：破基丹 ${state.resources.foundationExplosionPills.toFixed(0)} 粒`);
  }

  if (state.resources.spiritVeinPills > 0 || state.choices.flags.has_spirit_vein_pill) {
    lines.push(`丹药：通灵丸 ${state.resources.spiritVeinPills.toFixed(0)} 粒`);
  }

  if (state.resources.shadowEscapePills > 0 || state.choices.flags.has_shadow_escape_pill) {
    lines.push(`丹药：影遁丸 ${state.resources.shadowEscapePills.toFixed(0)} 粒`);
  }

  if (state.resources.longevityPills > 0 || state.choices.flags.has_longevity_pill) {
    lines.push(`丹药：延寿丹 ${state.resources.longevityPills.toFixed(0)} 粒`);
  }

  if (state.resources.fireFurnacePills > 0 || state.choices.flags.has_fire_furnace_pill) {
    lines.push(`丹药：火炉丹 ${state.resources.fireFurnacePills.toFixed(0)} 粒`);
  }

  if (state.resources.nineTurnFoundationPills > 0 || state.choices.flags.has_nine_turn_foundation_pill) {
    lines.push(`丹药：重炉筑基丹 ${state.resources.nineTurnFoundationPills.toFixed(0)} 粒`);
  }

  if (state.resources.buddhaHeartPills > 0 || state.choices.flags.has_buddha_heart_pill) {
    lines.push(`丹药：定神丸 ${state.resources.buddhaHeartPills.toFixed(0)} 粒`);
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
