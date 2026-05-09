import { describe, it, expect } from 'vitest';
import { createInitialState } from '../src/game/state';
import { resolveCombatEvent, Enemy } from '../src/game/combat';
import { Realm } from '../src/game/types';

describe('Combat System', () => {
  const dummyEnemy: Enemy = {
    id: 'bandit_1',
    name: '山贼',
    realm: Realm.Mortal,
    power: 10
  };

  it('should handle flee safely', () => {
    const state = createInitialState();
    const result = resolveCombatEvent(state, 'flee', dummyEnemy);
    
    expect(result.success).toBe(false);
    expect(result.log).toContain('避让');
    expect(result.state.choices.qualities['cowardice']).toBe(1);
    expect(result.state.resources.wounds).toBe(0);
  });

  it('should handle successful negotiate', () => {
    let state = createInitialState();
    state.resources.coins = 100; // Boost negotiate chance
    
    // inject random to guarantee success
    const result = resolveCombatEvent(state, 'negotiate', dummyEnemy, () => 0.1);
    
    expect(result.success).toBe(true);
    expect(result.state.resources.coins).toBe(90); // 100 - 10
    expect(result.state.resources.wounds).toBe(0);
  });

  it('should handle failed negotiate', () => {
    let state = createInitialState();
    
    // inject random to guarantee failure
    const result = resolveCombatEvent(state, 'negotiate', dummyEnemy, () => 0.9);
    
    expect(result.success).toBe(false);
    expect(result.state.resources.wounds).toBe(1);
  });

  it('should handle successful fight', () => {
    let state = createInitialState();
    state.resources.qi = 500; // huge power
    
    const result = resolveCombatEvent(state, 'fight', dummyEnemy, () => 0.5);
    
    expect(result.success).toBe(true);
    expect(result.state.choices.qualities['combat_experience']).toBe(1);
    expect(result.state.resources.insight).toBe(2);
  });

  it('should handle failed fight', () => {
    let state = createInitialState();
    state.resources.qi = 0; // low power

    const result = resolveCombatEvent(state, 'fight', dummyEnemy, () => 0.5);

    expect(result.success).toBe(false);
    expect(result.state.resources.wounds).toBe(2);
    expect(result.state.choices.qualities['combat_defeat']).toBe(1);
  });

  it('should handle negotiate with 0 coins (no coin deduction)', () => {
    let state = createInitialState();
    state.resources.coins = 0;

    // inject random to guarantee success (base chance 0.3 + no coins bonus)
    // With 0 coins and 0 fame, negotiateChance = 0.3
    // Need random < 0.3 for success
    const result = resolveCombatEvent(state, 'negotiate', dummyEnemy, () => 0.1);

    expect(result.success).toBe(true);
    // Coins should remain 0 (no deduction when coins < 10)
    expect(result.state.resources.coins).toBe(0);
  });

  it('should handle negotiate with fewer than 10 coins on success', () => {
    let state = createInitialState();
    state.resources.coins = 5;

    const result = resolveCombatEvent(state, 'negotiate', dummyEnemy, () => 0.1);

    if (result.success) {
      // Coins < 10, so no deduction should happen
      expect(result.state.resources.coins).toBe(5);
    }
  });

  it('should return power 0 when wounds exceed qi contribution', () => {
    // This tests getPlayerPower indirectly through fight
    // power = qi * 0.1 - wounds * 2, clamped to max(0, ...)
    let state = createInitialState();
    state.resources.qi = 10; // power = 1
    state.resources.wounds = 5; // penalty = 10, so net = -9 → clamped to 0

    const result = resolveCombatEvent(state, 'fight', dummyEnemy, () => 0.5);

    // Player power = 0, should always lose
    expect(result.success).toBe(false);
    expect(result.state.resources.wounds).toBeGreaterThan(5); // Additional wounds from losing
  });

  it('should adjust cowardice quality when fleeing', () => {
    let state = createInitialState();
    state.choices.qualities['cowardice'] = 2;

    const result = resolveCombatEvent(state, 'flee', dummyEnemy);

    expect(result.state.choices.qualities['cowardice']).toBe(3); // 2 + 1
  });

  it('flee should never cause wounds', () => {
    let state = createInitialState();
    state.resources.wounds = 5;

    const result = resolveCombatEvent(state, 'flee', dummyEnemy);

    expect(result.state.resources.wounds).toBe(5); // unchanged
    expect(result.success).toBe(false);
  });
});
