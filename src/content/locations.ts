import { Location } from '../game/types';

export const LOCATIONS: Record<string, Location> = {
  'home': {
    id: 'home',
    name: '居处',
    availableActions: ['kuzuo', 'tuna', 'tiaoxi', 'bianyao', 'yinqi', 'rike_tuna'],
    eventWeights: {
      'find_jade_slip': 1.5,
      'winter_stillness': 1.2,
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
      'rain_after_sprouts': 1.3,
      'wounded_cultivator_return': 1.2,
      'wounded_cultivator_grudge': 1.3,
    },
    qiDensity: 1.2,
    danger: 2,
    priceModifier: 1.0,
  },
  'market': {
    id: 'market',
    name: '坊市',
    availableActions: ['trade', 'gossip'],
    eventWeights: {
      'market_rumor': 1.2,
      'market_price_rise': 1.2,
      'outer_gate_rules': 1.2,
    },
    qiDensity: 0.8,
    danger: 1,
    priceModifier: 1.0,
  },
  'outer_gate': {
    id: 'outer_gate',
    name: '外门',
    availableActions: ['sect_chore', 'listen_lesson', 'gossip'],
    eventWeights: {
      'outer_gate_rules': 1.4,
      'market_rumor': 0.5,
    },
    qiDensity: 0.9,
    danger: 1,
    priceModifier: 1.05,
  }
};
