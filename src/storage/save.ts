import { GameState, Realm, SaveData } from '../game/types';
import { createInitialAlchemyState } from '../game/alchemy';
import { createInitialCultivationState } from '../game/cultivation';
import { createInitialState } from '../game/state';
import { createInitialWorldState } from '../game/world';
import { markLegacyOrigin } from '../game/origins';

export const CURRENT_SAVE_VERSION = 6;

/**
 * 迁移旧版本存档到当前版本
 */
export function migrateSaveData(data: any): SaveData {
  let migratedData = { ...data };

  // Example migration from V0 (e.g. before SaveData had version) to V1
  if (!migratedData.version) {
    migratedData.version = 1;
    if (!migratedData.state) {
      // If it was just the GameState serialized directly
      migratedData = {
        version: 1,
        state: migratedData,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        seed: migratedData.seed || Math.floor(Math.random() * 1000000)
      };
    }
  }

  if (migratedData.version === 1) {
    migratedData.state = {
      ...migratedData.state,
      realmLayer: migratedData.state.realm === Realm.QiCondensation ? 1 : 0,
    };
    migratedData.version = 2;
  }

  if (migratedData.version === 2) {
    migratedData.state = {
      ...migratedData.state,
      world: migratedData.state.world ?? createInitialWorldState(migratedData.state.time),
    };
    migratedData.version = 3;
  }

  if (migratedData.version === 3) {
    migratedData.state = markLegacyOrigin(migratedData.state);
    migratedData.version = 4;
  }

  if (migratedData.version === 4) {
    const stateSeed = migratedData.state.seed ?? migratedData.seed ?? Math.floor(Math.random() * 1000000);
    migratedData.state = {
      ...migratedData.state,
      cultivation: migratedData.state.cultivation ?? createInitialCultivationState(stateSeed),
    };
    migratedData.version = 5;
  }

  if (migratedData.version === 5) {
    migratedData.state = {
      ...migratedData.state,
      resources: {
        ...migratedData.state.resources,
        qiPills: migratedData.state.resources?.qiPills ?? 0,
        dantoxin: migratedData.state.resources?.dantoxin ?? 0,
      },
      alchemy: migratedData.state.alchemy ?? createInitialAlchemyState(),
    };
    migratedData.version = 6;
  }

  return migratedData as SaveData;
}

export function createSaveData(state: GameState): SaveData {
  return {
    version: CURRENT_SAVE_VERSION,
    state: state,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    seed: state.seed
  };
}

export function serializeSave(state: GameState): string {
  const saveData = createSaveData(state);
  return JSON.stringify(saveData);
}

export function deserializeSave(json: string): GameState {
  try {
    const data = JSON.parse(json);
    const migratedSave = migrateSaveData(data);
    return migratedSave.state;
  } catch (error) {
    console.error('Failed to load save', error);
    return createInitialState(); // fallback
  }
}
