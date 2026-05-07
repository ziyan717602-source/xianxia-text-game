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
    expect(migrated.state.realmLayer).toBe(0);
    expect(migrated.seed).toBe(123);
  });

  it('should migrate V1 wrapped saves by adding realmLayer', () => {
    const state = createInitialState(456);
    const migrated = migrateSaveData({
      version: 1,
      state,
      createdAt: 1,
      updatedAt: 1,
      seed: 456,
    });

    expect(migrated.version).toBe(CURRENT_SAVE_VERSION);
    expect(migrated.state.realmLayer).toBe(0);
  });

  it('should migrate V2 saves by adding the world ledger', () => {
    const state = createInitialState(789);
    const { world, ...stateWithoutWorld } = state;
    const migrated = migrateSaveData({
      version: 2,
      state: stateWithoutWorld,
      createdAt: 1,
      updatedAt: 1,
      seed: 789,
    });

    expect(migrated.version).toBe(CURRENT_SAVE_VERSION);
    expect(migrated.state.world.logs[0]).toContain('立春');
    expect(migrated.state.world.recentActions).toEqual({});
    expect(migrated.state.choices.tags.origin).toBe('legacy_path');
  });

  it('should migrate V3 saves by marking them as legacy origin', () => {
    const state = createInitialState(321);
    const migrated = migrateSaveData({
      version: 3,
      state,
      createdAt: 1,
      updatedAt: 1,
      seed: 321,
    });

    expect(migrated.version).toBe(CURRENT_SAVE_VERSION);
    expect(migrated.state.choices.flags.selected_origin).toBe(true);
    expect(migrated.state.choices.tags.origin).toBe('legacy_path');
    expect(migrated.state.cultivation.rootKnown).toBe(false);
    expect(migrated.state.alchemy.knownRecipeIds).toEqual([]);
  });

  it('should migrate V4 saves by adding cultivation state', () => {
    const state = createInitialState(654);
    const { cultivation, ...stateWithoutCultivation } = state;
    const migrated = migrateSaveData({
      version: 4,
      state: stateWithoutCultivation,
      createdAt: 1,
      updatedAt: 1,
      seed: 654,
    });

    expect(migrated.version).toBe(CURRENT_SAVE_VERSION);
    expect(migrated.state.cultivation.rootKnown).toBe(false);
    expect(migrated.state.cultivation.activeTechniqueId).toBe('small_breathing');
    expect(migrated.state.resources.qiPills).toBe(0);
    expect(migrated.state.resources.dantoxin).toBe(0);
    expect(migrated.state.alchemy.knownRecipeIds).toEqual([]);
  });

  it('should migrate V5 saves by adding alchemy resources and ledger', () => {
    const state = createInitialState(987);
    const { alchemy, ...stateWithoutAlchemy } = state;
    const { qiPills, dantoxin, ...resourcesWithoutAlchemy } = state.resources;
    const migrated = migrateSaveData({
      version: 5,
      state: {
        ...stateWithoutAlchemy,
        resources: resourcesWithoutAlchemy,
      },
      createdAt: 1,
      updatedAt: 1,
      seed: 987,
    });

    expect(migrated.version).toBe(CURRENT_SAVE_VERSION);
    expect(migrated.state.resources.qiPills).toBe(0);
    expect(migrated.state.resources.dantoxin).toBe(0);
    expect(migrated.state.alchemy.brewedRecipeCounts).toEqual({});
  });
});
