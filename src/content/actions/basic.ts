import { Action } from '../../game/types';

export const BASIC_ACTIONS: Record<string, Action> = {
kuzuo: {
    id: 'kuzuo',
    actionGroup: 'basic',
    name: '枯坐',
    cost: { essence: 5 },
    output: { insight: 1 },
    cooldown: 5,
    riskProbability: 0,
    conditions: {},
    isGlobalAction: true, // Basic cultivation — available everywhere
  },
tuna: {
    id: 'tuna',
    actionGroup: 'basic',
    name: '吐纳',
    cost: { essence: 10 },
    output: { qi: 1 },
    cooldown: 5,
    riskProbability: 0,
    conditions: {},
    isGlobalAction: true, // Basic cultivation — available everywhere
  },
tiaoxi: {
    id: 'tiaoxi',
    actionGroup: 'basic',
    name: '调息',
    cost: {},
    output: { essence: 30 },
    cooldown: 10,
    riskProbability: 0,
    conditions: {},
    isGlobalAction: true, // Basic recovery — available everywhere
  }
};
