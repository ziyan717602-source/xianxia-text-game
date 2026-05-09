import { describe, expect, it } from 'vitest';
import { performAction } from '../src/game/actions';
import { createInitialState, TICKS_PER_DAY, deriveGameTime } from '../src/game/state';
import { processTick, TICK_INTERVAL_MS } from '../src/game/tick';
import { getRecentSummary, getSolarTerm, SOLAR_TERM_DAYS, createInitialWorldState, SOLAR_TERMS } from '../src/game/world';

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

  it('should include sect traces in recent summaries', () => {
    const state = createInitialState();
    state.choices.qualities.sect_trace = 4;
    state.choices.qualities.sect_discipline = 1;
    state.choices.qualities.action_sect_errand_count = 2;
    state.choices.qualities.action_sect_patrol_count = 1;

    expect(getRecentSummary(state)).toContain('外门影子：规矩4，点卯1，短差2，巡值1。');
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

describe('createInitialWorldState', () => {
  it('should create a world state with the initial solar term', () => {
    const time = deriveGameTime(0);
    const world = createInitialWorldState(time);

    expect(world.recentActions).toEqual({});
    expect(world.logs.length).toBe(1);
    expect(world.logs[0]).toContain('立春');
    expect(world.lastSummaryTick).toBe(0);
    expect(world.lastSolarTermKey).toBe('1:lichun');
  });

  it('should create a world state for a mid-year time', () => {
    // Tick 1800 = day 181 = 立秋 (7th solar term)
    const time = deriveGameTime(1800);
    const world = createInitialWorldState(time);

    expect(world.logs[0]).toContain('立秋');
  });
});

describe('getSolarTerm', () => {
  it('returns the first solar term for day 1', () => {
    const time = deriveGameTime(0);
    expect(getSolarTerm(time).id).toBe('lichun');
    expect(getSolarTerm(time).name).toBe('立春');
  });

  it('returns the second solar term after 15 days', () => {
    // 15 days = 150 ticks
    const time = deriveGameTime(150);
    expect(getSolarTerm(time).id).toBe('yushui');
    expect(getSolarTerm(time).name).toBe('雨水');
  });

  it('returns the last solar term at end of year', () => {
    // Day 345-360 = 大寒
    const time = deriveGameTime(345 * TICKS_PER_DAY);
    expect(getSolarTerm(time).id).toBe('dahan');
  });

  it('returns 24 solar terms total in the SOLAR_TERMS array', () => {
    expect(SOLAR_TERMS.length).toBe(24);
  });

  it('each solar term has a valid id, name, and note', () => {
    for (const term of SOLAR_TERMS) {
      expect(term.id).toBeTruthy();
      expect(term.name).toBeTruthy();
      expect(term.note).toBeTruthy();
    }
  });
});

describe('formatActionSummary (via getRecentSummary)', () => {
  it('shows "无大事" when no recent actions', () => {
    const state = createInitialState();
    const summary = getRecentSummary(state);
    expect(summary).toContain('近十日：无大事。');
  });

  it('shows action counts with proper formatting', () => {
    let state = createInitialState();
    state = performAction(state, 'kuzuo').state;
    state = performAction(state, 'kuzuo').state;

    const summary = getRecentSummary(state);
    const joined = summary.join(' ');
    expect(joined).toContain('枯坐2次');
  });

  it('shows multiple different actions', () => {
    let state = createInitialState();
    state.resources.essence = 500; // Ensure enough essence
    state = performAction(state, 'kuzuo').state;
    state = performAction(state, 'tiaoxi').state;

    const summary = getRecentSummary(state);
    const joined = summary.join(' ');
    expect(joined).toContain('枯坐1次');
    expect(joined).toContain('调息1次');
  });
});
