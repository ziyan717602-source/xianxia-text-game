import { describe, expect, it } from 'vitest';
import { getVisibleResourceIds } from '../src/game/resources';
import { createInitialState } from '../src/game/state';

describe('Resource reveal', () => {
  it('should only show essence at the beginning', () => {
    const state = createInitialState();

    expect(getVisibleResourceIds(state)).toEqual(['essence']);
  });

  it('should reveal insight, qi, herbs, coins, wounds, and lifespan from state context', () => {
    const state = createInitialState();
    state.resources.insight = 1;
    state.resources.qi = 1;
    state.resources.herbs = 1;
    state.resources.coins = 1;
    state.resources.wounds = 1;

    expect(getVisibleResourceIds(state)).toEqual([
      'essence',
      'insight',
      'qi',
      'herbs',
      'coins',
      'wounds',
      'lifespan',
    ]);
  });
});
