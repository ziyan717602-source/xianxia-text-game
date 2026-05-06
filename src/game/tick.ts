import { GameState } from './types';
import { INITIAL_MAX_STAMINA, TICKS_PER_DAY } from './state';

export const TICK_INTERVAL_MS = 1000; // 1 real second = 1 tick
export const STAMINA_RECOVERY_PER_TICK = 1;

/**
 * 推进游戏时间 1 tick
 */
function processSingleTick(state: GameState): GameState {
  const newState = { ...state };
  
  // 深拷贝 resources 和 time
  newState.resources = { ...state.resources };
  newState.time = { ...state.time };

  // 增加 tick
  newState.time.tick += 1;

  // 更新时间：每天 TICKS_PER_DAY，每年 360 天等，这一步可以在未来写到 calendar.ts 中，暂时只加 tick

  // 消耗寿元
  if (newState.resources.lifespan > 0) {
    newState.resources.lifespan -= 1;
  }

  // 恢复体力
  if (newState.resources.essence < INITIAL_MAX_STAMINA) {
    newState.resources.essence = Math.min(INITIAL_MAX_STAMINA, newState.resources.essence + STAMINA_RECOVERY_PER_TICK);
  }

  return newState;
}

/**
 * 处理时间的流逝（可能包含离线补算多个 tick）
 * 暂时先按固定的 tick 流逝来做。
 * 如果传入了 deltaMs，可以计算需要推进多少个 tick。
 */
export function processTick(state: GameState, deltaMs: number = TICK_INTERVAL_MS): GameState {
  let ticksToProcess = Math.floor(deltaMs / TICK_INTERVAL_MS);
  
  let currentState = state;
  while (ticksToProcess > 0) {
    currentState = processSingleTick(currentState);
    ticksToProcess -= 1;
  }
  
  return currentState;
}
