import { GameState, Resources } from './types';

export type ResourceId = keyof Resources;

export const RESOURCE_LABELS: Record<ResourceId, string> = {
  essence: '精元',
  qi: '真气',
  herbs: '草药',
  qiPills: '小聚气丸',
  stabilizingPowders: '稳息散',
  cleansingPills: '清躁丸',
  coins: '钱币',
  insight: '神识',
  dantoxin: '丹毒',
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

  if (state.resources.qiPills > 0 || Boolean(state.choices.flags.has_qi_pill)) {
    visible.push('qiPills');
  }

  if (state.resources.stabilizingPowders > 0 || Boolean(state.choices.flags.has_stabilizing_powder)) {
    visible.push('stabilizingPowders');
  }

  if (state.resources.cleansingPills > 0 || Boolean(state.choices.flags.has_cleansing_pill)) {
    visible.push('cleansingPills');
  }

  if (state.resources.coins > 0 || state.currentLocationId === 'market') {
    visible.push('coins');
  }

  if (state.resources.dantoxin > 0 || Boolean(state.choices.flags.tasted_qi_pill)) {
    visible.push('dantoxin');
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
