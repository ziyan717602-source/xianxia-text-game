import { describe, it, expect } from 'vitest';
import { createInitialState } from '../src/game/state';
import { addRelationship, getRelationship, updateRelationship } from '../src/game/relationships';
import { setFlag, hasFlag, setTag, hasTag, removeTag, adjustQuality, getQuality } from '../src/game/choices';

describe('Relationship Ledger', () => {
  it('should add a new relationship', () => {
    let state = createInitialState();
    const entry = {
      id: 'merchant_1',
      identity: '云游商人',
      tags: ['merchant'],
      lastInteractionTick: 0,
      debts: 0,
      favors: 0,
      grudges: 0,
      state: 'Alive' as const
    };

    state = addRelationship(state, entry);
    const rel = getRelationship(state, 'merchant_1');
    expect(rel).toBeDefined();
    expect(rel?.identity).toBe('云游商人');
  });

  it('should update an existing relationship', () => {
    let state = createInitialState();
    state = addRelationship(state, {
      id: 'npc_1',
      identity: '散修',
      tags: [],
      lastInteractionTick: 0,
      debts: 0,
      favors: 0,
      grudges: 0,
      state: 'Alive'
    });

    state = updateRelationship(state, 'npc_1', { favors: 10, state: 'Departed' });
    const rel = getRelationship(state, 'npc_1');
    expect(rel?.favors).toBe(10);
    expect(rel?.state).toBe('Departed');
    expect(rel?.identity).toBe('散修'); // Ensure other fields are kept
  });
});

describe('Choice State System', () => {
  it('should manage flags', () => {
    let state = createInitialState();
    
    expect(hasFlag(state, 'met_elder')).toBe(false);
    
    state = setFlag(state, 'met_elder', true);
    expect(hasFlag(state, 'met_elder')).toBe(true);
    
    state = setFlag(state, 'met_elder', false);
    expect(hasFlag(state, 'met_elder')).toBe(false);
  });

  it('should manage tags', () => {
    let state = createInitialState();
    
    expect(hasTag(state, 'sect_status')).toBe(false);
    
    state = setTag(state, 'sect_status', 'outer');
    expect(hasTag(state, 'sect_status')).toBe(true);
    expect(hasTag(state, 'sect_status', 'outer')).toBe(true);
    expect(hasTag(state, 'sect_status', 'inner')).toBe(false);
    
    state = removeTag(state, 'sect_status');
    expect(hasTag(state, 'sect_status')).toBe(false);
  });

  it('should manage qualities', () => {
    let state = createInitialState();
    
    expect(getQuality(state, 'sword_affinity')).toBe(0);
    
    state = adjustQuality(state, 'sword_affinity', 5);
    expect(getQuality(state, 'sword_affinity')).toBe(5);
    
    state = adjustQuality(state, 'sword_affinity', -2);
    expect(getQuality(state, 'sword_affinity')).toBe(3);
  });
});
