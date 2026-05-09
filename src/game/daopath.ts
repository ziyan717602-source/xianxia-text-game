/**
 * 道途系统 — 行为形成道途
 *
 * 玩家的行为通过 qualities 倾向值积累道途亲和度，
 * 当最高道途亲和度达到阈值时，道途显现。
 */

import { GameState, DaoPathState } from './types';

/** 道途显现阈值 — 亲和度达到此值时道途显现 */
export const PATH_REVEAL_THRESHOLD = 15;

/** 道途定义：每个道途对应一组品质权重 */
export interface DaoPathDef {
  id: string;
  label: string;
  description: string;
  weights: Record<string, number>;
}

/** 五条道途 */
export const DAO_PATHS: DaoPathDef[] = [
  {
    id: 'alchemist',
    label: '丹道',
    description: '药炉为伴，丹火照心。草木金石皆为道路。',
    weights: { alchemy_affinity: 3, quiet_cultivation: 1 },
  },
  {
    id: 'sword_way',
    label: '剑路',
    description: '锋刃不问归路，杀伐中见真意。',
    weights: { combat_edge: 3, combat_experience: 2, combat_defeat: 1, quiet_cultivation: 1 },
  },
  {
    id: 'hermit',
    label: '清修',
    description: '闭门枯坐，不问世事。寂寞亦为道。',
    weights: { quiet_cultivation: 4, cowardice: 1, sect_trace: -1 },
  },
  {
    id: 'merchant',
    label: '商途',
    description: '坊市中来去，账簿比道经更熟。',
    weights: { market_ties: 3, sect_trace: 1 },
  },
  {
    id: 'sect_servant',
    label: '门中',
    description: '规矩在身，门内有人。外门亦是道场。',
    weights: { sect_trace: 3, sect_contribution: 2, sect_discipline: 1 },
  },
  {
    id: 'formation_way',
    label: '阵修',
    description: '以阵入道，布列为局。',
    weights: { alchemy_affinity: 1, quiet_cultivation: 2, sect_trace: 1 },
  },
  {
    id: 'talisman_way',
    label: '符修',
    description: '丹青入符，借外力入符。',
    weights: { alchemy_affinity: 2, quiet_cultivation: 2, market_ties: 1 },
  },
  {
    id: 'artifact_way',
    label: '器修',
    description: '金石铸器，火炼为工。',
    weights: { combat_edge: 1, alchemy_affinity: 2, market_ties: 2 },
  },
  {
    id: 'beast_way',
    label: '兽修',
    description: '驱兽御灵，以虫为伴。',
    weights: { combat_edge: 2, combat_experience: 1, quiet_cultivation: 1, sect_trace: 1 },
  },
  {
    id: 'demonic_way',
    label: '魔修',
    description: '偏执入道，速成而险。',
    weights: { combat_edge: 3, combat_experience: 1, combat_defeat: 1, reckless_breakthrough: 2 },
  },
  {
    id: 'buddhist_way',
    label: '禅修',
    description: '明心见性，照见本源。',
    weights: { quiet_cultivation: 4, cowardice: 1, sect_trace: -1 },
  },
  {
    id: 'ghost_way',
    label: '鬼修',
    description: '舍躯化魄，阴阳通灵。',
    weights: { quiet_cultivation: 2, combat_edge: 1, combat_defeat: 1, reckless_breakthrough: 1 },
  },
];

/** 道途ID到标签的映射 */
const PATH_LABEL_MAP: Record<string, string> = Object.fromEntries(
  DAO_PATHS.map(p => [p.id, p.label])
);

/** 道途ID到描述的映射 */
const PATH_DESC_MAP: Record<string, string> = Object.fromEntries(
  DAO_PATHS.map(p => [p.id, p.description])
);

/**
 * 根据当前品质计算各道途的亲和度
 */
export function calculatePathAffinity(state: GameState): Record<string, number> {
  const affinity: Record<string, number> = {};

  for (const path of DAO_PATHS) {
    let score = 0;
    for (const [quality, weight] of Object.entries(path.weights)) {
      const value = state.choices.qualities[quality] ?? 0;
      score += value * weight;
    }
    affinity[path.id] = Math.max(0, score);
  }

  return affinity;
}

/**
 * 判断道途是否应显现，如应显现则更新 state
 * 返回更新后的 state 和是否发生了道途显现
 */
export function revealDaoPath(state: GameState): { state: GameState; revealed: boolean; newPath: string | null } {
  const affinity = calculatePathAffinity(state);
  const sortedPaths = Object.entries(affinity).sort((a, b) => b[1] - a[1]);

  if (sortedPaths.length === 0) {
    return { state, revealed: false, newPath: null };
  }

  const [topPath, topScore] = sortedPaths[0];

  if (topScore < PATH_REVEAL_THRESHOLD) {
    // 尚未达到阈值
    return {
      state: {
        ...state,
        daoPath: {
          ...state.daoPath,
          pathAffinity: affinity,
        },
      },
      revealed: false,
      newPath: null,
    };
  }

  // 道途已显现，检查是否发生变化
  const previousPath = state.daoPath.currentPath;
  const pathChanged = previousPath !== null && previousPath !== topPath;
  const firstReveal = previousPath === null;

  return {
    state: {
      ...state,
      daoPath: {
        currentPath: topPath,
        pathAffinity: affinity,
        pathRevealedAtTick: state.daoPath.pathRevealedAtTick ?? state.time.tick,
      },
    },
    revealed: firstReveal || pathChanged,
    newPath: pathChanged ? topPath : (firstReveal ? topPath : null),
  };
}

/**
 * 获取道途的中文标签
 */
export function getDaoPathLabel(pathId: string): string {
  return PATH_LABEL_MAP[pathId] ?? '未知';
}

/**
 * 获取道途的描述
 */
export function getDaoPathDescription(pathId: string): string {
  return PATH_DESC_MAP[pathId] ?? '';
}

/**
 * 获取当前道途的显示摘要（供 UI 使用）
 */
export function getDaoPathSummary(state: GameState): string[] {
  if (state.daoPath.currentPath === null) {
    return [];
  }

  const lines: string[] = [];
  lines.push(`道途：${getDaoPathLabel(state.daoPath.currentPath)}`);
  lines.push(getDaoPathDescription(state.daoPath.currentPath));

  return lines;
}

/**
 * 创建初始道途状态
 */
export function createInitialDaoPathState(): DaoPathState {
  return {
    currentPath: null,
    pathAffinity: {},
    pathRevealedAtTick: null,
  };
}
