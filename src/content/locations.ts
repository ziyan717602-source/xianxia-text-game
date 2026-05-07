import { Location } from '../game/types';

export const LOCATIONS: Record<string, Location> = {
  'home': {
    id: 'home',
    name: '居处',
    availableActions: ['kuzuo', 'tuna', 'tiaoxi', 'bianyao', 'yinqi', 'rike_tuna'],
    eventWeights: {
      'find_jade_slip': 1.5,
    },
    qiDensity: 1,
    danger: 0,
    priceModifier: 1.0,
  },
  'mountain_path': {
    id: 'mountain_path',
    name: '山路',
    availableActions: ['caiyao', 'xunshan'],
    eventWeights: {
      'wounded_cultivator': 1.4,
    },
    qiDensity: 1.2,
    danger: 2,
    priceModifier: 1.0,
  },
  'market': {
    id: 'market',
    name: '坊市',
    // We haven't implemented trade/gossip actions yet, but we list them
    availableActions: ['trade', 'gossip'],
    eventWeights: {
      'market_rumor': 1.2,
    },
    qiDensity: 0.8,
    danger: 1,
    priceModifier: 1.0,
  }
};
