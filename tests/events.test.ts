import { describe, it, expect } from 'vitest';
import { createInitialState } from '../src/game/state';
import { rollEvent } from '../src/game/events';

describe('Event System', () => {
  it('should not roll event if conditions are not met', () => {
    const state = createInitialState();
    // knowledge is 0, so canjuan_heat shouldn't trigger, location is home, so others shouldn't trigger
    const event = rollEvent(state, () => 0.5);
    expect(event).toBeNull();
  });

  it('should roll canjuan_heat when knowledge >= 2', () => {
    let state = createInitialState();
    state.resources.knowledge = 2;

    const event = rollEvent(state, () => 0.5);
    expect(event).not.toBeNull();
    expect(event?.id).toBe('canjuan_heat');
  });

  it('should handle choice effect correctly', () => {
    let state = createInitialState();
    state.resources.knowledge = 2;

    const event = rollEvent(state, () => 0.5);
    expect(event).toBeDefined();

    if (event) {
      const choice = event.choices[0]; // 仔细阅读
      const result = choice.effect(state);
      expect(result.state.resources.qi).toBe(10);
      expect(result.log).toContain('灵气入体');
    }
  });

  it('should roll location specific events', () => {
    let state = createInitialState();
    state.currentLocationId = 'mountain_path';

    const event = rollEvent(state, () => 0.5);
    expect(event).not.toBeNull();
    expect(event?.id).toBe('wounded_cultivator');
  });
});
