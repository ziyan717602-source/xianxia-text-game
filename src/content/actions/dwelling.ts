import { Action, Realm } from '../../game/types';

export const DWELLING_ACTIONS: Record<string, Action> = {
establish_dwelling: {
    id: 'establish_dwelling',
    actionGroup: 'dwelling',
    name: '开辟洞府',
    cost: { coins: 20, herbs: 5 },
    output: {},
    cooldown: 100,
    riskProbability: 0,
    conditions: {
      requiredRealm: Realm.FoundationEstablishment,
    },
  },
upgrade_dwelling: {
    id: 'upgrade_dwelling',
    actionGroup: 'dwelling',
    name: '扩建洞府',
    cost: { coins: 50, herbs: 10, insight: 5 },
    output: {},
    cooldown: 150,
    riskProbability: 0,
    conditions: {
      requiredFlags: ['dwelling_level_1'],
    },
  },
install_formation: {
    id: 'install_formation',
    actionGroup: 'dwelling',
    name: '布阵',
    cost: { coins: 30, insight: 8 },
    output: {},
    cooldown: 200,
    riskProbability: 0,
    conditions: {
      requiredFlags: ['dwelling_level_2'],
    },
  }
};
