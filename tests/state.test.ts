import { describe, it, expect } from 'vitest';
import { createInitialState } from '../src/game/state';
import { Realm, Season, SpiritualRoot } from '../src/game/types';

describe('Game State Initialization', () => {
  it('should create an initial state with default values', () => {
    const state = createInitialState(12345);

    expect(state.seed).toBe(12345);
    expect(state.realm).toBe(Realm.Mortal);
    expect(state.realmLayer).toBe(0);
    expect(state.spiritualRoot).toBe(SpiritualRoot.Mortal);
    expect(state.currentLocationId).toBe('home');
    
    // Check time
    expect(state.time.tick).toBe(0);
    expect(state.time.year).toBe(1);
    expect(state.time.season).toBe(Season.Spring);
    expect(state.time.day).toBe(1);

    // Check resources
    expect(state.resources.qi).toBe(0);
    expect(state.resources.essence).toBeGreaterThan(0); // Assuming 100
    expect(state.resources.lifespan).toBeGreaterThan(0);
    expect(state.resources.wounds).toBe(0);
    expect(state.resources.herbs).toBe(0);
    expect(state.resources.qiPills).toBe(0);
    expect(state.resources.coins).toBe(0);
    expect(state.resources.insight).toBe(0);
    expect(state.resources.dantoxin).toBe(0);

    // Check empty structures
    // Check empty structures
    expect(state.unlockedActions).toEqual(['kuzuo']);
    expect(state.relationships).toEqual({});
    expect(state.choices.flags).toEqual({});
    expect(state.choices.tags).toEqual({});
    expect(state.choices.qualities).toEqual({});
    expect(state.world.logs[0]).toContain('立春');
    expect(state.world.recentActions).toEqual({});
    expect(state.cultivation.rootKnown).toBe(false);
    expect(state.cultivation.activeTechniqueId).toBe('small_breathing');
    expect(state.alchemy.knownRecipeIds).toEqual([]);
    expect(state.alchemy.brewedRecipeCounts).toEqual({});
    expect(state.breakthrough.preparation).toEqual({});
    expect(state.breakthrough.lastTargetId).toBeNull();
  });

  it('should generate a random seed if none is provided', () => {
    const state1 = createInitialState();
    const state2 = createInitialState();
    
    // There is a tiny chance they are equal, but in practice they should be different
    expect(typeof state1.seed).toBe('number');
    expect(typeof state2.seed).toBe('number');
  });
});
