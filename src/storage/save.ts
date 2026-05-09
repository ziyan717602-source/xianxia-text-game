import { GameState, Realm, SaveData } from '../game/types';
import { createInitialAlchemyState } from '../game/alchemy';
import { createInitialBreakthroughState } from '../game/breakthrough';
import { createInitialCultivationState } from '../game/cultivation';
import { createInitialState } from '../game/state';
import { createInitialWorldState } from '../game/world';
import { markLegacyOrigin } from '../game/origins';
import { createInitialDaoPathState } from '../game/daopath';
import { createInitialKarmaState } from '../game/karma';
import { createInitialInnerDemonState } from '../game/innerDemon';
import { createInitialSectState } from '../game/sect';
import { createInitialDwellingState } from '../game/dwelling';
import { createInitialFollowerState } from '../game/follower';
import { createInitialSecretRealmState } from '../game/secretRealm';
import { createInitialAscensionState } from '../game/ascension';

export const CURRENT_SAVE_VERSION = 14;

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

  if (migratedData.version === 6) {
    migratedData.state = {
      ...migratedData.state,
      breakthrough: migratedData.state.breakthrough ?? createInitialBreakthroughState(),
    };
    migratedData.version = 7;
  }

  if (migratedData.version === 7) {
    migratedData.state = {
      ...migratedData.state,
      resources: {
        ...migratedData.state.resources,
        stabilizingPowders: migratedData.state.resources?.stabilizingPowders ?? 0,
      },
    };
    migratedData.version = 8;
  }

  if (migratedData.version === 8) {
    migratedData.state = {
      ...migratedData.state,
      resources: {
        ...migratedData.state.resources,
        cleansingPills: migratedData.state.resources?.cleansingPills ?? 0,
      },
    };
    migratedData.version = 9;
  }

  if (migratedData.version === 9) {
    migratedData.state = {
      ...migratedData.state,
      daoPath: migratedData.state.daoPath ?? createInitialDaoPathState(),
      karma: migratedData.state.karma ?? createInitialKarmaState(),
      innerDemon: migratedData.state.innerDemon ?? createInitialInnerDemonState(),
    };
    migratedData.version = 10;
  }

  if (migratedData.version === 10) {
    migratedData.state = {
      ...migratedData.state,
      resources: {
        ...migratedData.state.resources,
        meridianCleansingPills: migratedData.state.resources?.meridianCleansingPills ?? 0,
        foundationStrengtheningPills: migratedData.state.resources?.foundationStrengtheningPills ?? 0,
        spiritGatheringPills: migratedData.state.resources?.spiritGatheringPills ?? 0,
      },
      sect: migratedData.state.sect ?? createInitialSectState(),
      dwelling: migratedData.state.dwelling ?? createInitialDwellingState(),
      followers: migratedData.state.followers ?? createInitialFollowerState(),
    };
    migratedData.version = 11;
  }

  if (migratedData.version === 11) {
    migratedData.state = {
      ...migratedData.state,
      secretRealm: migratedData.state.secretRealm ?? createInitialSecretRealmState(),
      ascension: migratedData.state.ascension ?? createInitialAscensionState(),
    };
    migratedData.version = 12;
  }

  if (migratedData.version === 12) {
    migratedData.state = {
      ...migratedData.state,
      resources: {
        ...migratedData.state.resources,
        warmFurnacePills: migratedData.state.resources?.warmFurnacePills ?? 0,
        nightSittingPills: migratedData.state.resources?.nightSittingPills ?? 0,
      },
    };
    migratedData.version = 13;
  }

  if (migratedData.version === 13) {
    migratedData.state = {
      ...migratedData.state,
      resources: {
        ...migratedData.state.resources,
        cloudGatheringPills: migratedData.state.resources?.cloudGatheringPills ?? 0,
        ironBodyPills: migratedData.state.resources?.ironBodyPills ?? 0,
        demonBanePills: migratedData.state.resources?.demonBanePills ?? 0,
        foundationExplosionPills: migratedData.state.resources?.foundationExplosionPills ?? 0,
        spiritVeinPills: migratedData.state.resources?.spiritVeinPills ?? 0,
        shadowEscapePills: migratedData.state.resources?.shadowEscapePills ?? 0,
        longevityPills: migratedData.state.resources?.longevityPills ?? 0,
        fireFurnacePills: migratedData.state.resources?.fireFurnacePills ?? 0,
        nineTurnFoundationPills: migratedData.state.resources?.nineTurnFoundationPills ?? 0,
        buddhaHeartPills: migratedData.state.resources?.buddhaHeartPills ?? 0,
        goldenCorePills: migratedData.state.resources?.goldenCorePills ?? 0,
        nascentSoulPills: migratedData.state.resources?.nascentSoulPills ?? 0,
        spiritTransformPills: migratedData.state.resources?.spiritTransformPills ?? 0,
        integrationPills: migratedData.state.resources?.integrationPills ?? 0,
        mahayanaPills: migratedData.state.resources?.mahayanaPills ?? 0,
        tribulationPills: migratedData.state.resources?.tribulationPills ?? 0,
        heavenlyTribulationPills: migratedData.state.resources?.heavenlyTribulationPills ?? 0,
      },
    };
    migratedData.version = 14;
  }

  return migratedData as SaveData;
}

export function createSaveData(state: GameState, existingCreatedAt?: number): SaveData {
  return {
    version: CURRENT_SAVE_VERSION,
    state: state,
    createdAt: existingCreatedAt ?? Date.now(),
    updatedAt: Date.now(),
    seed: state.seed
  };
}

export function serializeSave(state: GameState, existingCreatedAt?: number): string {
  const saveData = createSaveData(state, existingCreatedAt);
  return JSON.stringify(saveData);
}

/** Extract createdAt timestamp from raw save JSON without full deserialization */
export function extractCreatedAt(json: string): number | undefined {
  try {
    const data = JSON.parse(json);
    return data.createdAt;
  } catch {
    return undefined;
  }
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
