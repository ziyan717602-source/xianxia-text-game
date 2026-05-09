import { GameState, Resources } from './types';

export type ResourceId = keyof Resources;

export const RESOURCE_KEYS: readonly (keyof Resources)[] = ['qi', 'essence', 'herbs', 'qiPills', 'stabilizingPowders', 'cleansingPills', 'meridianCleansingPills', 'foundationStrengtheningPills', 'spiritGatheringPills', 'warmFurnacePills', 'nightSittingPills', 'cloudGatheringPills', 'ironBodyPills', 'demonBanePills', 'foundationExplosionPills', 'spiritVeinPills', 'shadowEscapePills', 'longevityPills', 'fireFurnacePills', 'nineTurnFoundationPills', 'buddhaHeartPills', 'goldenCorePills', 'nascentSoulPills', 'spiritTransformPills', 'integrationPills', 'mahayanaPills', 'tribulationPills', 'heavenlyTribulationPills', 'coins', 'insight', 'dantoxin', 'lifespan', 'wounds'] as const;

export const RESOURCE_LABELS: Record<ResourceId, string> = {
  essence: '精元',
  qi: '真气',
  herbs: '草药',
  qiPills: '小聚气丸',
  stabilizingPowders: '稳息散',
  cleansingPills: '清躁丸',
  meridianCleansingPills: '通脉丸',
  foundationStrengtheningPills: '固基丹',
  spiritGatheringPills: '聚灵丸',
  warmFurnacePills: '暖炉丹',
  nightSittingPills: '夜坐丸',
  cloudGatheringPills: '聚云丸',
  ironBodyPills: '铁身丹',
  demonBanePills: '驱魔丹',
  foundationExplosionPills: '破基丹',
  spiritVeinPills: '通灵丸',
  shadowEscapePills: '影遁丸',
  longevityPills: '延寿丹',
  fireFurnacePills: '火炉丹',
  nineTurnFoundationPills: '重炉筑基丹',
  buddhaHeartPills: '定神丸',
  goldenCorePills: '凝丹丸',
  nascentSoulPills: '培婴丹',
  spiritTransformPills: '化神丹',
  integrationPills: '合体丹',
  mahayanaPills: '大乘丹',
  tribulationPills: '渡劫丹',
  heavenlyTribulationPills: '天劫护体丹',
  coins: '钱币',
  insight: '神识',
  dantoxin: '丹毒',
  lifespan: '寿元',
  wounds: '伤势',
};

export function getVisibleResourceIds(state: GameState): ResourceId[] {
  const visible: ResourceId[] = ['essence'];

  if (state.resources.insight > 0 || Boolean(state.choices.qualities.action_kuzuo_count)) {
    visible.push('insight');
  }

  if (state.resources.qi > 0 || state.choices.flags.found_jade_slip || state.choices.flags.unlocked_tuna) {
    visible.push('qi');
  }

  if (state.resources.herbs > 0 || state.currentLocationId === 'mountain_path') {
    visible.push('herbs');
  }

  if (state.resources.qiPills > 0 || Boolean(state.choices.flags.has_qi_pill)) {
    visible.push('qiPills');
  }

  if (state.resources.stabilizingPowders > 0 || Boolean(state.choices.flags.has_stabilizing_powder)) {
    visible.push('stabilizingPowders');
  }

  if (state.resources.cleansingPills > 0 || Boolean(state.choices.flags.has_cleansing_pill)) {
    visible.push('cleansingPills');
  }

  if (state.resources.meridianCleansingPills > 0 || Boolean(state.choices.flags.has_meridian_cleansing_pill)) {
    visible.push('meridianCleansingPills');
  }

  if (state.resources.foundationStrengtheningPills > 0 || Boolean(state.choices.flags.has_foundation_strengthening_pill)) {
    visible.push('foundationStrengtheningPills');
  }

  if (state.resources.spiritGatheringPills > 0 || Boolean(state.choices.flags.has_spirit_gathering_pill)) {
    visible.push('spiritGatheringPills');
  }

  if (state.resources.warmFurnacePills > 0 || Boolean(state.choices.flags.has_warm_furnace_pill)) {
    visible.push('warmFurnacePills');
  }

  if (state.resources.nightSittingPills > 0 || Boolean(state.choices.flags.has_night_sitting_pill)) {
    visible.push('nightSittingPills');
  }

  if (state.resources.cloudGatheringPills > 0 || Boolean(state.choices.flags.has_cloud_gathering_pill)) {
    visible.push('cloudGatheringPills');
  }

  if (state.resources.ironBodyPills > 0 || Boolean(state.choices.flags.has_iron_body_pill)) {
    visible.push('ironBodyPills');
  }

  if (state.resources.demonBanePills > 0 || Boolean(state.choices.flags.has_demon_bane_pill)) {
    visible.push('demonBanePills');
  }

  if (state.resources.foundationExplosionPills > 0 || Boolean(state.choices.flags.has_foundation_explosion_pill)) {
    visible.push('foundationExplosionPills');
  }

  if (state.resources.spiritVeinPills > 0 || Boolean(state.choices.flags.has_spirit_vein_pill)) {
    visible.push('spiritVeinPills');
  }

  if (state.resources.shadowEscapePills > 0 || Boolean(state.choices.flags.has_shadow_escape_pill)) {
    visible.push('shadowEscapePills');
  }

  if (state.resources.longevityPills > 0 || Boolean(state.choices.flags.has_longevity_pill)) {
    visible.push('longevityPills');
  }

  if (state.resources.fireFurnacePills > 0 || Boolean(state.choices.flags.has_fire_furnace_pill)) {
    visible.push('fireFurnacePills');
  }

  if (state.resources.nineTurnFoundationPills > 0 || Boolean(state.choices.flags.has_nine_turn_foundation_pill)) {
    visible.push('nineTurnFoundationPills');
  }

  if (state.resources.buddhaHeartPills > 0 || Boolean(state.choices.flags.has_buddha_heart_pill)) {
    visible.push('buddhaHeartPills');
  }
  if (state.resources.goldenCorePills > 0 || Boolean(state.choices.flags.has_golden_core_formation_pill) || Boolean(state.choices.flags.has_golden_core_strengthening_pill) || Boolean(state.choices.flags.has_golden_core_fire_pill)) {
    visible.push('goldenCorePills');
  }

  if (state.resources.nascentSoulPills > 0 || Boolean(state.choices.flags.has_nascent_soul_nurturing_pill) || Boolean(state.choices.flags.has_nascent_soul_separation_pill) || Boolean(state.choices.flags.has_nascent_soul_protection_pill)) {
    visible.push('nascentSoulPills');
  }

  if (state.resources.spiritTransformPills > 0 || Boolean(state.choices.flags.has_spirit_transform_pill) || Boolean(state.choices.flags.has_spirit_transform_fire_pill)) {
    visible.push('spiritTransformPills');
  }

  if (state.resources.integrationPills > 0 || Boolean(state.choices.flags.has_integration_pill) || Boolean(state.choices.flags.has_integration_body_pill)) {
    visible.push('integrationPills');
  }

  if (state.resources.mahayanaPills > 0 || Boolean(state.choices.flags.has_mahayana_pill) || Boolean(state.choices.flags.has_mahayana_enlightenment_pill)) {
    visible.push('mahayanaPills');
  }

  if (state.resources.tribulationPills > 0 || Boolean(state.choices.flags.has_tribulation_protection_pill) || Boolean(state.choices.flags.has_tribulation_soul_pill)) {
    visible.push('tribulationPills');
  }

  if (state.resources.heavenlyTribulationPills > 0 || Boolean(state.choices.flags.has_heavenly_tribulation_pill)) {
    visible.push('heavenlyTribulationPills');
  }


  if (state.resources.coins > 0 || state.currentLocationId === 'market') {
    visible.push('coins');
  }

  if (state.resources.dantoxin > 0 || Boolean(state.choices.flags.tasted_qi_pill)) {
    visible.push('dantoxin');
  }

  if (state.resources.wounds > 0) {
    visible.push('wounds');
  }

  if (
    state.resources.wounds > 0 ||
    Boolean(state.choices.qualities.action_tiaoxi_count) ||
    state.time.year > 1
  ) {
    visible.push('lifespan');
  }

  return visible;
}

/**
 * 道途是否可见（供 UI 使用）
 */
export function isDaoPathVisible(state: GameState): boolean {
  return state.daoPath.currentPath !== null;
}

/**
 * 因果负担是否可见
 */
export function isKarmaVisible(state: GameState): boolean {
  return state.karma.karmicWeight >= 5;
}

/**
 * 心魔是否可见
 */
export function isInnerDemonVisible(state: GameState): boolean {
  return state.innerDemon.activeDemon !== null;
}
