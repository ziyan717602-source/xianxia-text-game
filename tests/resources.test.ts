import { describe, expect, it } from 'vitest';
import { getVisibleResourceIds } from '../src/game/resources';
import { createInitialState } from '../src/game/state';

describe('Resource reveal', () => {
  it('should only show essence at the beginning', () => {
    const state = createInitialState();

    expect(getVisibleResourceIds(state)).toEqual(['essence']);
  });

  it('should reveal insight, qi, herbs, pills, coins, dantoxin, wounds, and lifespan from state context', () => {
    const state = createInitialState();
    state.resources.insight = 1;
    state.resources.qi = 1;
    state.resources.herbs = 1;
    state.resources.qiPills = 1;
    state.resources.stabilizingPowders = 1;
    state.resources.coins = 1;
    state.resources.dantoxin = 1;
    state.resources.wounds = 1;

    expect(getVisibleResourceIds(state)).toEqual([
      'essence',
      'insight',
      'qi',
      'herbs',
      'qiPills',
      'stabilizingPowders',
      'coins',
      'dantoxin',
      'wounds',
      'lifespan',
    ]);
  });
});
