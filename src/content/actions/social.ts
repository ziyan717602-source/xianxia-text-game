import { Action, Realm } from '../../game/types';

export const SOCIAL_ACTIONS: Record<string, Action> = {
recruit_servant: {
    id: 'recruit_servant',
    actionGroup: 'social',
    name: '招杂役',
    cost: { coins: 15 },
    output: {},
    cooldown: 200,
    riskProbability: 0,
    conditions: {
      requiredLocation: 'home',
      requiredFlags: ['dwelling_level_1'],
    },
  },
recruit_disciple: {
    id: 'recruit_disciple',
    actionGroup: 'social',
    name: '收弟子',
    cost: { coins: 25, insight: 3 },
    output: {},
    cooldown: 300,
    riskProbability: 0,
    conditions: {
      requiredRealm: Realm.GoldenCore,
      requiredLocation: 'home',
      requiredFlags: ['dwelling_level_2'],
    },
  },
recruit_guard: {
    id: 'recruit_guard',
    actionGroup: 'social',
    name: '招护卫',
    cost: { coins: 20 },
    output: {},
    cooldown: 250,
    riskProbability: 0,
    conditions: {
      requiredLocation: 'home',
      requiredFlags: ['dwelling_level_2'],
    },
  },
assign_herb_gathering: {
    id: 'assign_herb_gathering',
    actionGroup: 'social',
    name: '派采药',
    cost: {},
    output: {},
    cooldown: 20,
    riskProbability: 0,
    conditions: {
      requiredLocation: 'home',
      requiredFlags: ['has_follower'],
    },
  },
assign_patrol_duty: {
    id: 'assign_patrol_duty',
    actionGroup: 'social',
    name: '派巡山',
    cost: {},
    output: {},
    cooldown: 20,
    riskProbability: 0,
    conditions: {
      requiredLocation: 'home',
      requiredFlags: ['has_follower', 'sect_rank_outer'],
    },
  },
collect_follower_income: {
    id: 'collect_follower_income',
    actionGroup: 'social',
    name: '收杂役成果',
    cost: {},
    output: {},
    cooldown: 50,
    riskProbability: 0,
    conditions: {
      requiredLocation: 'home',
      requiredFlags: ['has_follower'],
    },
  }
};
