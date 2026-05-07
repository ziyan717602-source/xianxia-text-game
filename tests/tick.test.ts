import { describe, it, expect } from 'vitest';
import { createInitialState, INITIAL_MAX_STAMINA, TICKS_PER_DAY, DAYS_PER_YEAR, DAYS_PER_SEASON } from '../src/game/state';
import { processTick, TICK_INTERVAL_MS } from '../src/game/tick';
import { performAction } from '../src/game/actions';
import { Realm, Season } from '../src/game/types';

describe('Tick Engine', () => {
  it('should decrease lifespan and increase tick over time', () => {
    const initialState = createInitialState();
    const initialLifespan = initialState.resources.lifespan;

    const nextState = processTick(initialState, TICK_INTERVAL_MS);

    expect(nextState.time.tick).toBe(1);
    expect(nextState.resources.lifespan).toBe(initialLifespan - 1);
  });

  it('should recover essence up to max', () => {
    let state = createInitialState();
    state.resources.essence = 50; // set below max

    state = processTick(state, TICK_INTERVAL_MS);
    expect(state.resources.essence).toBe(51);

    state.resources.essence = INITIAL_MAX_STAMINA;
    state = processTick(state, TICK_INTERVAL_MS);
    expect(state.resources.essence).toBe(INITIAL_MAX_STAMINA);
  });

  it('should process offline gains correctly', () => {
    let state = createInitialState();
    state.resources.essence = 50;

    // Simulate 10 seconds offline
    state = processTick(state, TICK_INTERVAL_MS * 10);
    expect(state.time.tick).toBe(10);
    expect(state.resources.essence).toBe(60);
  });

  it('should advance day, season, and year from total ticks', () => {
    let state = createInitialState();

    state = processTick(state, TICK_INTERVAL_MS * TICKS_PER_DAY);
    expect(state.time.day).toBe(2);
    expect(state.time.season).toBe(Season.Spring);

    state = createInitialState();
    state = processTick(state, TICK_INTERVAL_MS * TICKS_PER_DAY * DAYS_PER_SEASON);
    expect(state.time.day).toBe(DAYS_PER_SEASON + 1);
    expect(state.time.season).toBe(Season.Summer);

    state = createInitialState();
    state = processTick(state, TICK_INTERVAL_MS * TICKS_PER_DAY * DAYS_PER_YEAR);
    expect(state.time.year).toBe(2);
    expect(state.time.day).toBe(1);
    expect(state.time.season).toBe(Season.Spring);
  });
});

describe('Action System', () => {
  it('should perform "tuna" successfully with enough essence', () => {
    const state = createInitialState();
    
    // Default essence is max (100)
    const result = performAction(state, 'tuna');
    expect(result.success).toBe(true);
    expect(result.state.resources.essence).toBe(state.resources.essence - 10);
    expect(result.state.resources.qi).toBe(1);
  });

  it('should fail to perform "tuna" if essence is low', () => {
    let state = createInitialState();
    state.resources.essence = 5;

    const result = performAction(state, 'tuna');
    expect(result.success).toBe(false);
    expect(result.state.resources.essence).toBe(5);
    expect(result.state.resources.qi).toBe(0);
    expect(result.log).toContain('精元不足');
  });

  it('should handle action risk via injected random', () => {
    const state = createInitialState();
    
    // 0.9 is higher than the risk (0.3), so action succeeds
    const successResult = performAction(state, 'xunshan', () => 0.9);
    expect(successResult.success).toBe(true);
    expect(successResult.state.resources.herbs).toBe(2);

    // 0.1 is lower than the risk (0.3), so action fails
    const failResult = performAction(state, 'xunshan', () => 0.1);
    expect(failResult.success).toBe(false);
    // essence is still consumed
    expect(failResult.state.resources.essence).toBe(state.resources.essence - 30);
    // no herbs gained
    expect(failResult.state.resources.herbs).toBe(0);
    expect(failResult.log).toContain('遭遇意外');
  });

  it('should perform "bianyao" by consuming herbs for insight', () => {
    const state = createInitialState();
    state.resources.herbs = 5;

    const result = performAction(state, 'bianyao');
    expect(result.success).toBe(true);
    expect(result.state.resources.herbs).toBe(4);
    expect(result.state.resources.insight).toBe(1);
  });

  it('should enter qi condensation layer one through yinqi', () => {
    const state = createInitialState();
    state.resources.qi = 15;
    state.resources.insight = 3;
    state.resources.essence = 100;
    state.choices.flags.completed_rike_tuna = true;

    const result = performAction(state, 'yinqi');
    expect(result.success).toBe(true);
    expect(result.state.realm).toBe(Realm.QiCondensation);
    expect(result.state.realmLayer).toBe(1);
    expect(result.state.resources.qi).toBe(0);
    expect(result.state.resources.insight).toBe(0);
    expect(result.log).toContain('炼气一层');
  });

  it('should perform rike_tuna as a batch breath work routine', () => {
    const state = createInitialState();
    state.resources.essence = 100;
    const initialLifespan = state.resources.lifespan;

    const result = performAction(state, 'rike_tuna');

    expect(result.success).toBe(true);
    expect(result.state.resources.essence).toBe(40);
    expect(result.state.resources.qi).toBe(8);
    expect(result.state.time.tick).toBe(50);
    expect(result.state.resources.lifespan).toBe(initialLifespan - 50);
    expect(result.log).toContain('日课');
  });

  it('should spend game time for ordinary actions', () => {
    const state = createInitialState();
    const initialLifespan = state.resources.lifespan;

    const result = performAction(state, 'kuzuo');

    expect(result.state.time.tick).toBe(5);
    expect(result.state.resources.lifespan).toBe(initialLifespan - 5);
    expect(result.state.choices.flags.completed_kuzuo).toBe(true);
  });

  it('should record route qualities for repeated actions', () => {
    let state = createInitialState();
    state.resources.herbs = 2;

    state = performAction(state, 'caiyao', () => 0.9).state;
    state = performAction(state, 'bianyao').state;
    state = performAction(state, 'xunshan', () => 0.9).state;

    expect(state.choices.qualities.alchemy_affinity).toBe(2);
    expect(state.choices.qualities.combat_edge).toBe(1);
  });
});
