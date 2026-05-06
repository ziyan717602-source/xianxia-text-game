import { describe, it, expect } from 'vitest';
import { createInitialState, INITIAL_MAX_STAMINA } from '../src/game/state';
import { processTick, TICK_INTERVAL_MS } from '../src/game/tick';
import { performAction } from '../src/game/actions';

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
    expect(result.log).toContain('体力不足');
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
});
