import { Action, Realm } from '../../game/types';
import { QI_LAYER_2_COST, QI_LAYER_3_COST, QI_LAYER_4_COST, QI_LAYER_5_COST, QI_LAYER_6_COST, QI_LAYER_7_COST, QI_LAYER_8_COST, QI_LAYER_9_COST, FOUNDATION_COST } from './_costs';

export const BREAKTHROUGH_ACTIONS: Record<string, Action> = {
yinqi: {
    id: 'yinqi',
    actionGroup: 'cultivation',
    name: '引气入体',
    cost: { qi: 15, insight: 3, essence: 30 },
    output: {},
    cooldown: 30,
    riskProbability: 0,
    conditions: {
      requiredFlags: ['completed_rike_tuna'],
      requiredLocation: 'home',
      requiredRealm: Realm.Mortal,
    },
  },
withdraw_foundation: {
    id: 'withdraw_foundation',
    actionGroup: 'breakthrough',
    name: '筑基收功',
    cost: { essence: 25, qi: 6 },
    output: {},
    cooldown: 80,
    riskProbability: 0,
    conditions: {
      requiredFlags: ['prepared_foundation'],
      forbiddenFlags: ['reached_foundation'],
      requiredLocation: 'home',
      requiredRealm: Realm.QiCondensation,
    },
  },
stabilize_bottleneck: {
    id: 'stabilize_bottleneck',
    actionGroup: 'basic',
    name: '稳固关口',
    cost: { essence: 35, qi: 3, insight: 1 },
    output: {},
    cooldown: 30,
    riskProbability: 0,
    conditions: {
    },
    isGlobalAction: true, // Internal cultivation state — not location-dependent
  },
breakthrough_qi_2: {
    id: 'breakthrough_qi_2',
    actionGroup: 'breakthrough',
    name: '冲炼气二层',
    cost: QI_LAYER_2_COST,
    output: {},
    cooldown: 60,
    riskProbability: 0,
    conditions: {
      requiredFlags: ['prepared_qi_layer_2'],
      forbiddenFlags: ['reached_qi_layer_2'],
      requiredLocation: 'home',
      requiredRealm: Realm.QiCondensation,
    },
    isGlobalAction: true, // Breakthrough — internal cultivation event, not location-bound
  },
breakthrough_qi_3: {
    id: 'breakthrough_qi_3',
    actionGroup: 'breakthrough',
    name: '冲炼气三层',
    cost: QI_LAYER_3_COST,
    output: {},
    cooldown: 70,
    riskProbability: 0,
    conditions: {
      requiredFlags: ['prepared_qi_layer_3'],
      forbiddenFlags: ['reached_qi_layer_3'],
      requiredLocation: 'home',
      requiredRealm: Realm.QiCondensation,
    },
    isGlobalAction: true, // Breakthrough — internal cultivation event, not location-bound
  },
breakthrough_qi_4: {
    id: 'breakthrough_qi_4',
    actionGroup: 'breakthrough',
    name: '冲炼气四层',
    cost: QI_LAYER_4_COST,
    output: {},
    cooldown: 80,
    riskProbability: 0,
    conditions: {
      requiredFlags: ['prepared_qi_layer_4'],
      forbiddenFlags: ['reached_qi_layer_4'],
      requiredLocation: 'home',
      requiredRealm: Realm.QiCondensation,
    },
    isGlobalAction: true, // Breakthrough — internal cultivation event, not location-bound
  },
breakthrough_qi_5: {
    id: 'breakthrough_qi_5',
    actionGroup: 'breakthrough',
    name: '冲炼气五层',
    cost: QI_LAYER_5_COST,
    output: {},
    cooldown: 90,
    riskProbability: 0,
    conditions: {
      requiredFlags: ['prepared_qi_layer_5'],
      forbiddenFlags: ['reached_qi_layer_5'],
      requiredLocation: 'home',
      requiredRealm: Realm.QiCondensation,
    },
    isGlobalAction: true, // Breakthrough — internal cultivation event, not location-bound
  },
breakthrough_qi_6: {
    id: 'breakthrough_qi_6',
    actionGroup: 'breakthrough',
    name: '冲炼气六层',
    cost: QI_LAYER_6_COST,
    output: {},
    cooldown: 100,
    riskProbability: 0,
    conditions: {
      requiredFlags: ['prepared_qi_layer_6'],
      forbiddenFlags: ['reached_qi_layer_6'],
      requiredLocation: 'home',
      requiredRealm: Realm.QiCondensation,
    },
    isGlobalAction: true, // Breakthrough — internal cultivation event, not location-bound
  },
breakthrough_qi_7: {
    id: 'breakthrough_qi_7',
    actionGroup: 'breakthrough',
    name: '冲炼气七层',
    cost: QI_LAYER_7_COST,
    output: {},
    cooldown: 110,
    riskProbability: 0,
    conditions: {
      requiredFlags: ['prepared_qi_layer_7'],
      forbiddenFlags: ['reached_qi_layer_7'],
      requiredLocation: 'home',
      requiredRealm: Realm.QiCondensation,
    },
    isGlobalAction: true, // Breakthrough — internal cultivation event, not location-bound
  },
breakthrough_qi_8: {
    id: 'breakthrough_qi_8',
    actionGroup: 'breakthrough',
    name: '冲炼气八层',
    cost: QI_LAYER_8_COST,
    output: {},
    cooldown: 120,
    riskProbability: 0,
    conditions: {
      requiredFlags: ['prepared_qi_layer_8'],
      forbiddenFlags: ['reached_qi_layer_8'],
      requiredLocation: 'home',
      requiredRealm: Realm.QiCondensation,
    },
    isGlobalAction: true, // Breakthrough — internal cultivation event, not location-bound
  },
breakthrough_qi_9: {
    id: 'breakthrough_qi_9',
    actionGroup: 'breakthrough',
    name: '冲炼气九层',
    cost: QI_LAYER_9_COST,
    output: {},
    cooldown: 130,
    riskProbability: 0,
    conditions: {
      requiredFlags: ['prepared_qi_layer_9'],
      forbiddenFlags: ['reached_qi_layer_9'],
      requiredLocation: 'home',
      requiredRealm: Realm.QiCondensation,
    },
    isGlobalAction: true, // Breakthrough — internal cultivation event, not location-bound
  },
breakthrough_foundation: {
    id: 'breakthrough_foundation',
    actionGroup: 'breakthrough',
    name: '冲筑基',
    cost: FOUNDATION_COST,
    output: {},
    cooldown: 120,
    riskProbability: 0,
    conditions: {
      requiredFlags: ['prepared_foundation'],
      forbiddenFlags: ['reached_foundation'],
      requiredLocation: 'home',
      requiredRealm: Realm.QiCondensation,
    },
    isGlobalAction: true, // Breakthrough — internal cultivation event, not location-bound
  },
attempt_ascension: {
    id: 'attempt_ascension',
    actionGroup: 'breakthrough',
    name: '尝试飞升',
    cost: { qi: 200 },
    output: {},
    cooldown: 0,
    riskProbability: 0,
    conditions: {
      requiredRealm: Realm.NascentSoul,
    },
  }
};
