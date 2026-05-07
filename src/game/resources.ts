import { GameState, Resources } from './types';

export type ResourceId = keyof Resources;

export const RESOURCE_LABELS: Record<ResourceId, string> = {
  essence: '精元',
  qi: '真气',
  herbs: '草药',
  coins: '钱币',
  insight: '神识',
  lifespan: '寿元',
  wounds: '伤势',
};

export function getVisibleResourceIds(state: GameState): ResourceId[] {
  const visible: ResourceId[] = ['essence'];

  if (state.resources.insight > 0 || Boolean(state.choices.qualities.action_kuzuo_count)) {
    visible.push('insight');
  }

  if (state.resources.qi > 0 || state.choices.flags.found_jade_slip || state.choices.flags.unlocked_tuna) {
    visible.push('qi');
  }

  if (state.resources.herbs > 0 || state.currentLocationId === 'mountain_path') {
    visible.push('herbs');
  }

  if (state.resources.coins > 0 || state.currentLocationId === 'market') {
    visible.push('coins');
  }

  if (state.resources.wounds > 0) {
    visible.push('wounds');
  }

  if (
    state.resources.wounds > 0 ||
    Boolean(state.choices.qualities.action_tiaoxi_count) ||
    state.time.year > 1
  ) {
    visible.push('lifespan');
  }

  return visible;
}
