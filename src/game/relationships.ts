import { GameState, Relationship, RelationshipState } from './types';

export function getRelationship(state: GameState, id: string): Relationship | undefined {
  return state.relationships[id];
}

export function addRelationship(state: GameState, entry: Relationship): GameState {
  if (state.relationships[entry.id]) {
    // Already exists
    return state;
  }
  return {
    ...state,
    relationships: {
      ...state.relationships,
      [entry.id]: entry,
    }
  };
}

export function updateRelationship(
  state: GameState, 
  id: string, 
  changes: Partial<Omit<Relationship, 'id'>>
): GameState {
  const existing = state.relationships[id];
  if (!existing) return state;

  return {
    ...state,
    relationships: {
      ...state.relationships,
      [id]: {
        ...existing,
        ...changes,
      }
    }
  };
}
