import { Realm, Resources } from '../game/types';

export interface BreakthroughRule {
  id: string;
  actionId: string;
  name: string;
  fromRealm: Realm;
  fromLayer: number;
  toRealm: Realm;
  toLayer: number;
  requiredResources: Partial<Resources>;
  baseSuccess: number;
  partialWindow: number;
  preparationCap: number;
  successFlag: string;
}

export const BREAKTHROUGH_RULES: Record<string, BreakthroughRule> = {
  qi_layer_2: {
    id: 'qi_layer_2',
    actionId: 'breakthrough_qi_2',
    name: '炼气二层',
    fromRealm: Realm.QiCondensation,
    fromLayer: 1,
    toRealm: Realm.QiCondensation,
    toLayer: 2,
    requiredResources: { essence: 60, qi: 30, insight: 3 },
    baseSuccess: 0.62,
    partialWindow: 0.16,
    preparationCap: 3,
    successFlag: 'reached_qi_layer_2',
  },
  qi_layer_3: {
    id: 'qi_layer_3',
    actionId: 'breakthrough_qi_3',
    name: '炼气三层',
    fromRealm: Realm.QiCondensation,
    fromLayer: 2,
    toRealm: Realm.QiCondensation,
    toLayer: 3,
    requiredResources: { essence: 70, qi: 45, insight: 5 },
    baseSuccess: 0.55,
    partialWindow: 0.14,
    preparationCap: 3,
    successFlag: 'reached_qi_layer_3',
  },
  foundation: {
    id: 'foundation',
    actionId: 'breakthrough_foundation',
    name: '筑基',
    fromRealm: Realm.QiCondensation,
    fromLayer: 3,
    toRealm: Realm.FoundationEstablishment,
    toLayer: 1,
    requiredResources: { essence: 90, qi: 95, insight: 12 },
    baseSuccess: 0.38,
    partialWindow: 0.18,
    preparationCap: 5,
    successFlag: 'reached_foundation',
  },
};

export const BREAKTHROUGH_BY_ACTION = Object.fromEntries(
  Object.values(BREAKTHROUGH_RULES).map((rule) => [rule.actionId, rule])
) as Record<string, BreakthroughRule>;
