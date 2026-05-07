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
};
