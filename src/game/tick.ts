import { GameState } from './types';
import { deriveGameTime, INITIAL_MAX_STAMINA } from './state';
import { advanceWorld } from './world';

export const TICK_INTERVAL_MS = 1000; // 1 real second = 1 tick
export const STAMINA_RECOVERY_PER_TICK = 1;

function processTicks(state: GameState, ticks: number): GameState {
  if (ticks <= 0) return state;

  const nextTick = state.time.tick + ticks;

  const nextState = {
    ...state,
    resources: {
      ...state.resources,
      lifespan: Math.max(0, state.resources.lifespan - ticks),
      essence: Math.min(INITIAL_MAX_STAMINA, state.resources.essence + STAMINA_RECOVERY_PER_TICK * ticks),
    },
    time: deriveGameTime(nextTick),
  };

  return advanceWorld(nextState);
}

/**
 * 处理时间的流逝（可能包含离线补算多个 tick）
 * 暂时先按固定的 tick 流逝来做。
 * 如果传入了 deltaMs，可以计算需要推进多少个 tick。
 */
export function processTick(state: GameState, deltaMs: number = TICK_INTERVAL_MS): GameState {
  const ticksToProcess = Math.floor(deltaMs / TICK_INTERVAL_MS);

  return processTicks(state, ticksToProcess);
}
