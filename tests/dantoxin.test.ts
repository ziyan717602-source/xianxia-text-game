import { describe, expect, it } from 'vitest';
import { createInitialState, TICKS_PER_DAY } from '../src/game/state';
import { processTick, TICK_INTERVAL_MS } from '../src/game/tick';
import { DANTOXIN_DRIFT_LAST_DAY } from '../src/game/dantoxin';
import { Realm } from '../src/game/types';

describe('Dantoxin long-term drift', () => {
  it('should turn heavy dantoxin into a chronic pending consequence over time', () => {
    let state = createInitialState();
    state.realm = Realm.QiCondensation;
    state.realmLayer = 1;
    state.resources.dantoxin = 70;
    state.resources.lifespan = 1000;
    state.choices.qualities[DANTOXIN_DRIFT_LAST_DAY] = 0;

    state = processTick(state, TICK_INTERVAL_MS * TICKS_PER_DAY * 45);

    expect(state.choices.flags.chronic_dantoxin_pending).toBe(true);
    expect(state.choices.flags.chronic_dantoxin_seen).toBe(false);
    expect(state.choices.flags.dantoxin_rooted_in_channels).toBe(true);
    expect(state.choices.qualities[DANTOXIN_DRIFT_LAST_DAY]).toBe(45);
    expect(state.choices.qualities.chronic_dantoxin_days).toBe(45);
    expect(state.resources.wounds).toBe(1);
    expect(state.resources.lifespan).toBe(530);
  });

  it('should keep residual days until chronic dantoxin reaches its interval', () => {
    let state = createInitialState();
    state.realm = Realm.QiCondensation;
    state.realmLayer = 1;
    state.resources.dantoxin = 50;
    state.choices.qualities[DANTOXIN_DRIFT_LAST_DAY] = 0;

    state = processTick(state, TICK_INTERVAL_MS * TICKS_PER_DAY * 20);

    expect(state.choices.flags.chronic_dantoxin_pending).toBeUndefined();
    expect(state.choices.qualities[DANTOXIN_DRIFT_LAST_DAY]).toBe(0);
  });
});
