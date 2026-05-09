import { Action, Realm, Season } from '../game/types';
import { DAYS_PER_YEAR, TICKS_PER_DAY } from '../game/state';
import { RESOURCE_LABELS, ResourceId } from '../game/resources';

export const ACTION_GROUP_ORDER: Action['actionGroup'][] = [
  'basic', 'cultivation', 'alchemy', 'sect', 'dwelling', 'exploration', 'breakthrough', 'combat', 'social',
];

export const ACTION_GROUP_LABELS: Record<NonNullable<Action['actionGroup']>, string> = {
  basic: '基础',
  cultivation: '修行',
  alchemy: '炼丹',
  sect: '宗门',
  dwelling: '洞府',
  exploration: '探索',
  breakthrough: '突破',
  combat: '斗法',
  social: '交往',
};

export const SEASON_LABELS: Record<Season, string> = {
  [Season.Spring]: '春',
  [Season.Summer]: '夏',
  [Season.Autumn]: '秋',
  [Season.Winter]: '冬',
};

export const REALM_LABELS: Record<Realm, string> = {
  [Realm.Mortal]: '凡人',
  [Realm.QiCondensation]: '炼气',
  [Realm.FoundationEstablishment]: '筑基',
  [Realm.GoldenCore]: '金丹',
  [Realm.NascentSoul]: '元婴',
  [Realm.SpiritTransformation]: '化神',
  [Realm.Integration]: '合体',
  [Realm.Mahayana]: '大乘',
  [Realm.Tribulation]: '渡劫',
};

export const SECT_RANK_LABELS: Record<string, string> = {
  none: '',
  outer: '外门弟子',
  inner: '内门弟子',
  core: '核心弟子',
  elder: '长老',
};

export const DWELLING_LEVEL_NAMES: Record<number, string> = {
  0: '',
  1: '简陋洞府',
  2: '灵气洞府',
  3: '阵法洞府',
};

export const FORMATION_LEVEL_NAMES: Record<number, string> = {
  0: '',
  1: '聚灵阵',
  2: '护法阵',
  3: '洞天阵',
};

export const FOLLOWER_ROLE_LABELS: Record<string, string> = {
  servant: '杂役',
  disciple: '弟子',
  guard: '护卫',
};

export const FOLLOWER_TASK_LABELS: Record<string, string> = {
  herb_gathering: '采药',
  patrol_duty: '巡值',
  cultivation_aid: '护法',
};

export function formatResourceValue(resourceId: ResourceId, value: number) {
  if (resourceId === 'lifespan') {
    return `${Math.floor(value / (DAYS_PER_YEAR * TICKS_PER_DAY))} 年`;
  }
  return Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1);
}

export function formatActionInfo(action: { cost: Partial<Record<string, number>>; output: Partial<Record<string, number>> }): string {
  const parts: string[] = [];
  const costKeys = Object.keys(action.cost);
  const outputKeys = Object.keys(action.output);

  for (const key of costKeys) {
    const val = action.cost[key];
    if (val && val > 0) {
      const label = (RESOURCE_LABELS as Record<string, string>)[key] ?? key;
      parts.push(`耗${val}${label}`);
    }
  }
  for (const key of outputKeys) {
    const val = action.output[key];
    if (val && val > 0 && key !== 'lifespan') {
      const label = (RESOURCE_LABELS as Record<string, string>)[key] ?? key;
      parts.push(`+${val}${label}`);
    }
  }
  return parts.length > 0 ? parts.join(' ') : '';
}

export function formatRealm(state: { realm: Realm; realmLayer: number }) {
  if (state.realm === Realm.QiCondensation && state.realmLayer > 0) {
    return `${REALM_LABELS[state.realm]}${state.realmLayer}层`;
  }
  if (state.realm === Realm.FoundationEstablishment ||
      state.realm === Realm.GoldenCore ||
      state.realm === Realm.NascentSoul ||
      state.realm === Realm.SpiritTransformation ||
      state.realm === Realm.Integration ||
      state.realm === Realm.Mahayana ||
      state.realm === Realm.Tribulation) {
    const layerLabels = ['初', '中', '后'];
    if (state.realmLayer >= 1 && state.realmLayer <= 3) {
      return `${REALM_LABELS[state.realm]}${layerLabels[state.realmLayer - 1]}期`;
    }
  }
  return REALM_LABELS[state.realm];
}
