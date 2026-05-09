/**
 * 因果系统 — 行为积累因果负担
 *
 * 因果负担来源于：恩怨、债务、冒进行为、压制丹毒、劫掠等。
 * 因果负担影响突破难度和事件权重。
 */

import { GameState, KarmaState } from './types';

/** 因果清算阈值 — 因果负担达到此值时触发因果清算事件 */
export const KARMIC_RECKONING_THRESHOLD = 10;

/**
 * 计算当前因果负担
 *
 * 来源：
 * - 每条关系中的怨隙：+2
 * - 每条关系中的债务：+1
 * - reckless_breakthrough 品质：+1 每点
 * - suppressed_dantoxin_heat 标记：+3
 * - robbed_cultivator 标记：+5
 * - karmic_weight 品质：+1 每点
 */
export function calculateKarmicWeight(state: GameState): number {
  let weight = 0;

  // 关系中的怨隙和债务
  for (const rel of Object.values(state.relationships)) {
    weight += rel.grudges * 2;
    weight += rel.debts * 1;
  }

  // 品质相关的因果
  weight += (state.choices.qualities.reckless_breakthrough ?? 0) * 1;
  weight += (state.choices.qualities.karmic_weight ?? 0) * 1;

  // 标记相关的因果
  if (state.choices.flags.suppressed_dantoxin_heat) {
    weight += 3;
  }
  if (state.choices.flags.robbed_cultivator) {
    weight += 5;
  }

  return weight;
}

/**
 * 更新因果负担并返回新 state
 */
export function updateKarmicWeight(state: GameState): GameState {
  const karmicWeight = calculateKarmicWeight(state);

  return {
    ...state,
    karma: {
      ...state.karma,
      karmicWeight,
    },
  };
}

/**
 * 检查是否应触发因果清算事件
 */
export function shouldTriggerKarmicReckoning(state: GameState): boolean {
  return (
    state.karma.karmicWeight >= KARMIC_RECKONING_THRESHOLD &&
    !state.karma.karmicEvents.includes('karmic_reckoning')
  );
}

/**
 * 因果负担对突破成功率的影响（降低成功率）
 */
export function getKarmicBreakthroughPenalty(state: GameState): number {
  // 每点因果负担降低 0.5% 突破率，最多降低 15%
  return Math.min(0.15, state.karma.karmicWeight * 0.005);
}

/**
 * 因果负担对事件权重的影响（负面因果吸引负面事件）
 */
export function getKarmicEventWeightModifier(state: GameState): number {
  // 负面因果增加麻烦事件的权重
  return 1 + Math.min(2, state.karma.karmicWeight * 0.05);
}

/**
 * 创建初始因果状态
 */
export function createInitialKarmaState(): KarmaState {
  return {
    karmicWeight: 0,
    karmicEvents: [],
  };
}
