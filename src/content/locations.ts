import { Location } from '../game/types';

export const LOCATIONS: Record<string, Location> = {
  'home': {
    id: 'home',
    name: '居处',
    availableActions: ['tuna', 'guanxiang', 'tiaoxi'],
    eventWeights: {
      'safe_event': 10,
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
      'encounter_event': 20,
      'discovery_event': 10,
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
      'rumor_event': 30,
      'merchant_event': 20,
    },
    qiDensity: 0.8,
    danger: 1,
    priceModifier: 1.0,
  }
};
