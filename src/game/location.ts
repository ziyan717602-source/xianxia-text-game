import { GameState } from './types';
import { LOCATIONS } from '../content/locations';

export interface MoveResult {
  state: GameState;
  log: string;
  success: boolean;
}

export function moveToLocation(state: GameState, locationId: string): MoveResult {
  const targetLocation = LOCATIONS[locationId];
  if (!targetLocation) {
    return { state, log: '目标地点不存在。', success: false };
  }

  if (state.currentLocationId === locationId) {
    return { state, log: `你已经在${targetLocation.name}了。`, success: false };
  }

  // To move, maybe it takes essence or time. Let's make it cost a bit of essence or just time.
  // For simplicity, let's say moving takes 5 essence.
  const costStamina = 5;
  if (state.resources.essence < costStamina) {
    return { state, log: '体力不足，无法赶路。', success: false };
  }

  const newState = { ...state };
  newState.resources = { ...state.resources, essence: state.resources.essence - costStamina };
  newState.currentLocationId = locationId;

  return {
    state: newState,
    log: `你来到了${targetLocation.name}。`,
    success: true,
  };
}

/**
 * 获取当前地点可用的行动列表
 * 会同时过滤掉玩家尚未解锁的行动
 */
export function getAvailableActionsAtLocation(state: GameState): string[] {
  const loc = LOCATIONS[state.currentLocationId];
  if (!loc) return [];

  return loc.availableActions.filter(actionId => state.unlockedActions.includes(actionId));
}
