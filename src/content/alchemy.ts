import { Element, Resources, Season } from '../game/types';

export type HerbNature = 'cold' | 'cool' | 'neutral' | 'warm' | 'hot';
export type HerbFlavor = 'pungent' | 'sweet' | 'sour' | 'bitter' | 'salty' | 'bland' | 'astringent';
export type HerbDirection = 'rise' | 'descend' | 'float' | 'sink';
export type HerbToxicity = 'none' | 'trace' | 'light' | 'medium' | 'heavy';

export interface HerbProfile {
  id: string;
  name: string;
  nature: HerbNature;
  flavor: HerbFlavor;
  phase: Element;
  direction: HerbDirection;
  toxicity: HerbToxicity;
  habitats: string[];
  seasons: Season[];
  use: string;
}

export interface PillRecipe {
  id: string;
  name: string;
  summary: string;
  mainHerbId: string;
  assistantHerbId: string;
  nature: HerbNature;
  phase: Element;
  direction: HerbDirection;
  requiredResources: Partial<Resources>;
  outputResource: keyof Resources;
  outputAmount: number;
  effect: Partial<Resources>;
  dantoxin: number;
  failureDantoxin: number;
  baseSuccess: number;
  seasonalAffinity: Season[];
}

export const HERB_NATURE_LABELS: Record<HerbNature, string> = {
  cold: '寒',
  cool: '凉',
  neutral: '平',
  warm: '温',
  hot: '热',
};

export const HERB_FLAVOR_LABELS: Record<HerbFlavor, string> = {
  pungent: '辛',
  sweet: '甘',
  sour: '酸',
  bitter: '苦',
  salty: '咸',
  bland: '淡',
  astringent: '涩',
};

export const HERB_DIRECTION_LABELS: Record<HerbDirection, string> = {
  rise: '升',
  descend: '降',
  float: '浮',
  sink: '沉',
};

export const HERB_PROFILES: Record<string, HerbProfile> = {
  dew_vein_grass: {
    id: 'dew_vein_grass',
    name: '露脉草',
    nature: 'cool',
    flavor: 'sweet',
    phase: Element.Water,
    direction: 'float',
    toxicity: 'trace',
    habitats: ['mountain_path'],
    seasons: [Season.Spring, Season.Autumn],
    use: '引气入脉，适合低阶聚气。',
  },
  yellow_dust_seed: {
    id: 'yellow_dust_seed',
    name: '黄尘籽',
    nature: 'neutral',
    flavor: 'sweet',
    phase: Element.Earth,
    direction: 'rise',
    toxicity: 'none',
    habitats: ['market', 'mountain_path'],
    seasons: [Season.Spring, Season.Summer, Season.Autumn],
    use: '调和药性，减少药气散逸。',
  },
  stone_sinew_root: {
    id: 'stone_sinew_root',
    name: '石筋根',
    nature: 'neutral',
    flavor: 'astringent',
    phase: Element.Earth,
    direction: 'sink',
    toxicity: 'none',
    habitats: ['mountain_path'],
    seasons: [Season.Autumn, Season.Winter],
    use: '收束气机，适合稳固关口。',
  },
  mist_leaf: {
    id: 'mist_leaf',
    name: '雾叶',
    nature: 'cool',
    flavor: 'bland',
    phase: Element.Wood,
    direction: 'float',
    toxicity: 'trace',
    habitats: ['mountain_path'],
    seasons: [Season.Spring, Season.Summer],
    use: '缓和躁气，略降药滞。',
  },
  green_bitter_vine: {
    id: 'green_bitter_vine',
    name: '青苦藤',
    nature: 'cold',
    flavor: 'bitter',
    phase: Element.Wood,
    direction: 'descend',
    toxicity: 'trace',
    habitats: ['mountain_path'],
    seasons: [Season.Spring, Season.Summer],
    use: '清降躁热，适合处理药气上冲。',
  },
  white_stone_lift: {
    id: 'white_stone_lift',
    name: '白石衣',
    nature: 'neutral',
    flavor: 'bland',
    phase: Element.Earth,
    direction: 'sink',
    toxicity: 'none',
    habitats: ['mountain_path'],
    seasons: [Season.Winter],
    use: '沉药入土，缓解丹毒入脉。',
  },
};

export const PILL_RECIPES: Record<string, PillRecipe> = {
  small_qi_pill: {
    id: 'small_qi_pill',
    name: '小聚气丸',
    summary: '凉甘而浮，水土相和。服后添真气，兼生丹毒。',
    mainHerbId: 'dew_vein_grass',
    assistantHerbId: 'yellow_dust_seed',
    nature: 'cool',
    phase: Element.Water,
    direction: 'float',
    requiredResources: { essence: 30, herbs: 3, insight: 1 },
    outputResource: 'qiPills',
    outputAmount: 1,
    effect: { qi: 6 },
    dantoxin: 3,
    failureDantoxin: 1,
    baseSuccess: 0.72,
    seasonalAffinity: [Season.Spring, Season.Winter],
  },
  stabilizing_powder: {
    id: 'stabilizing_powder',
    name: '稳息散',
    summary: '平涩而沉，木土相调。服后气机转慢，可护下一次冲关。',
    mainHerbId: 'stone_sinew_root',
    assistantHerbId: 'mist_leaf',
    nature: 'neutral',
    phase: Element.Earth,
    direction: 'sink',
    requiredResources: { essence: 35, herbs: 4, insight: 2 },
    outputResource: 'stabilizingPowders',
    outputAmount: 1,
    effect: { qi: -2, dantoxin: -2 },
    dantoxin: 1,
    failureDantoxin: 1,
    baseSuccess: 0.66,
    seasonalAffinity: [Season.Autumn, Season.Winter],
  },
  cleansing_pill: {
    id: 'cleansing_pill',
    name: '清躁丸',
    summary: '寒苦而降，木土相济。服后清药躁，退丹毒，伤精元。',
    mainHerbId: 'green_bitter_vine',
    assistantHerbId: 'white_stone_lift',
    nature: 'cold',
    phase: Element.Wood,
    direction: 'descend',
    requiredResources: { essence: 40, herbs: 5, insight: 3 },
    outputResource: 'cleansingPills',
    outputAmount: 1,
    effect: { essence: -8, dantoxin: -16, wounds: -1 },
    dantoxin: 1,
    failureDantoxin: 0,
    baseSuccess: 0.62,
    seasonalAffinity: [Season.Spring, Season.Winter],
  },
};
