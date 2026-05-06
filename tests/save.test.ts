import { describe, it, expect } from 'vitest';
import { createInitialState } from '../src/game/state';
import { serializeSave, deserializeSave, migrateSaveData, CURRENT_SAVE_VERSION } from '../src/storage/save';

describe('Save and Migration System', () => {
  it('should serialize and deserialize game state accurately', () => {
    const state = createInitialState(999);
    state.resources.qi = 50;
    state.choices.flags['test_flag'] = true;

    const json = serializeSave(state);
    const loadedState = deserializeSave(json);

    expect(loadedState.seed).toBe(999);
    expect(loadedState.resources.qi).toBe(50);
    expect(loadedState.choices.flags['test_flag']).toBe(true);
  });

  it('should fallback to initial state on invalid json', () => {
    const loadedState = deserializeSave('invalid json');
    expect(loadedState.resources.qi).toBe(0); // initial state has 0 qi
  });

  it('should migrate V0 raw state to V1 save data wrapper', () => {
    const rawState = createInitialState(123);
    rawState.resources.qi = 10;

    const migrated = migrateSaveData(rawState);
    expect(migrated.version).toBe(CURRENT_SAVE_VERSION);
    expect(migrated.state.resources.qi).toBe(10);
    expect(migrated.seed).toBe(123);
  });
});
