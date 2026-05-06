import { describe, it, expect } from 'vitest';
import { rollEvent } from '../src/game/events';
import { createInitialState } from '../src/game/state';
import { EVENTS } from '../src/content/events';

describe('Event System', () => {
  it('should not roll event if conditions are not met', () => {
    const state = createInitialState();
    state.resources.insight = 0; // Less than 2, won't trigger find_jade_slip
    const event = rollEvent(state);
    expect(event).toBeNull();
  });

  it('should roll find_jade_slip when insight >= 2', () => {
    const state = createInitialState();
    state.resources.insight = 2; // Condition met
    
    // Use a fixed random function that always returns 0.5
    const event = rollEvent(state, () => 0.5);
    expect(event).not.toBeNull();
    expect(event?.id).toBe('find_jade_slip');
  });

  it('should handle choice effect correctly', () => {
    const state = createInitialState();
    state.resources.qi = 0;
    
    const event = EVENTS.find(e => e.id === 'find_jade_slip');
    expect(event).toBeDefined();

    if (event) {
      const choice = event.choices[0]; // 探查玉简
      const result = choice.effect(state);
      expect(result.state.resources.qi).toBe(1);
      expect(result.log).toContain('玉简中记录的吐纳之法');
    }
  });

  it('should roll location specific events', () => {
    const state = createInitialState();
    state.currentLocationId = 'mountain_path';
    state.choices.flags['found_jade_slip'] = true; // prevent find_jade_slip
    
    // We expect wounded_cultivator
    const event = rollEvent(state, () => 0.5);
    expect(event?.id).toBe('wounded_cultivator');
  });
});
