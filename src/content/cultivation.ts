import { Element } from '../game/types';

export interface CultivationTechnique {
  id: string;
  name: string;
  phase: Element | null;
  description: string;
}

export const ELEMENT_LABELS: Record<Element, string> = {
  [Element.Wood]: '木',
  [Element.Fire]: '火',
  [Element.Earth]: '土',
  [Element.Metal]: '金',
  [Element.Water]: '水',
};

export const TECHNIQUES: Record<string, CultivationTechnique> = {
  small_breathing: {
    id: 'small_breathing',
    name: '小吐纳法',
    phase: null,
    description: '不偏五行，慢而少险。',
  },
  wood_breathing: {
    id: 'wood_breathing',
    name: '引木诀',
    phase: Element.Wood,
    description: '顺木相生发，春日和药地较顺。',
  },
  fire_breathing: {
    id: 'fire_breathing',
    name: '伏火诀',
    phase: Element.Fire,
    description: '借火相催动，进境快而躁。',
  },
  earth_breathing: {
    id: 'earth_breathing',
    name: '守土诀',
    phase: Element.Earth,
    description: '守中调和，适合居处日课。',
  },
  metal_breathing: {
    id: 'metal_breathing',
    name: '敛金诀',
    phase: Element.Metal,
    description: '收束气机，秋日和规矩之地较顺。',
  },
  water_breathing: {
    id: 'water_breathing',
    name: '听水诀',
    phase: Element.Water,
    description: '藏息入静，冬日和闭关较顺。',
  },
};

export const TECHNIQUE_BY_ELEMENT: Record<Element, string> = {
  [Element.Wood]: 'wood_breathing',
  [Element.Fire]: 'fire_breathing',
  [Element.Earth]: 'earth_breathing',
  [Element.Metal]: 'metal_breathing',
  [Element.Water]: 'water_breathing',
};
