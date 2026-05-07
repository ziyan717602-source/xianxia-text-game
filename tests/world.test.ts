import { describe, expect, it } from 'vitest';
import { performAction } from '../src/game/actions';
import { createInitialState, TICKS_PER_DAY } from '../src/game/state';
import { processTick, TICK_INTERVAL_MS } from '../src/game/tick';
import { getRecentSummary, getSolarTerm, SOLAR_TERM_DAYS } from '../src/game/world';

describe('World ledger', () => {
  it('should create initial solar term log', () => {
    const state = createInitialState();

    expect(getSolarTerm(state.time).name).toBe('立春');
    expect(state.world.logs[0]).toContain('立春');
    expect(state.world.recentActions).toEqual({});
  });

  it('should record successful actions into the recent summary ledger', () => {
    let state = createInitialState();

    state = performAction(state, 'kuzuo').state;

    expect(state.world.recentActions.kuzuo).toBe(1);
    expect(state.choices.qualities.quiet_cultivation).toBe(1);
    expect(getRecentSummary(state)).toContain('近十日：枯坐1次。');
  });

  it('should append a ten-day summary and clear recent action counts', () => {
    let state = createInitialState();

    state = performAction(state, 'kuzuo').state;
    state = processTick(state, TICK_INTERVAL_MS * TICKS_PER_DAY * 10);

    expect(state.world.logs.some((log) => log.includes('近十日') && log.includes('枯坐1次'))).toBe(true);
    expect(state.world.recentActions).toEqual({});
  });

  it('should include an action that crosses the summary boundary', () => {
    let state = createInitialState();
    state.time.tick = 95;
    state.world.lastSummaryTick = 0;

    state = performAction(state, 'kuzuo').state;

    expect(state.time.tick).toBe(100);
    expect(state.world.logs.some((log) => log.includes('近十日') && log.includes('枯坐1次'))).toBe(true);
    expect(state.world.recentActions).toEqual({});
  });

  it('should append solar term logs when time crosses a term boundary', () => {
    let state = createInitialState();

    state = processTick(state, TICK_INTERVAL_MS * TICKS_PER_DAY * SOLAR_TERM_DAYS);

    expect(getSolarTerm(state.time).name).toBe('雨水');
    expect(state.world.logs.some((log) => log.includes('雨水'))).toBe(true);
  });
});
