import { GameState } from './types';
import { EVENTS, ActiveEvent } from '../content/events';
import { LOCATIONS } from '../content/locations';

/**
 * 根据权重从事件池中抽取一个事件
 * @param state 当前游戏状态
 * @param random 随机数生成器 (0-1)
 * @returns 抽取到的事件，如果没有符合条件的事件则返回 null
 */
export function rollEvent(state: GameState, random: () => number = Math.random): ActiveEvent | null {
  const possibleEvents = EVENTS.filter(e => e.condition(state));

  if (possibleEvents.length === 0) {
    return null;
  }

  // Calculate total weight
  let totalWeight = 0;
  const location = LOCATIONS[state.currentLocationId];
  const weightedEvents = possibleEvents.map(event => {
    const locationModifier = location?.eventWeights[event.id] ?? 1;
    const w = event.weight(state) * locationModifier;
    totalWeight += w;
    return { event, weight: w };
  });

  if (totalWeight <= 0) {
    return null;
  }

  let roll = random() * totalWeight;

  for (const item of weightedEvents) {
    if (roll < item.weight) {
      return item.event;
    }
    roll -= item.weight;
  }

  return possibleEvents[possibleEvents.length - 1]; // Fallback
}
