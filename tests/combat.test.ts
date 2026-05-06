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
    expect(result.state.resources.knowledge).toBe(2);
  });

  it('should handle failed fight', () => {
    let state = createInitialState();
    state.resources.qi = 0; // low power
    
    const result = resolveCombatEvent(state, 'fight', dummyEnemy, () => 0.5);
    
    expect(result.success).toBe(false);
    expect(result.state.resources.wounds).toBe(2);
    expect(result.state.choices.qualities['combat_defeat']).toBe(1);
  });
});
