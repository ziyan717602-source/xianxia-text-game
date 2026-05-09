import { GameState, GameTime, Realm, SaveData, Season } from '../game/types';
import { createInitialAlchemyState } from '../game/alchemy';
import { createInitialBreakthroughState } from '../game/breakthrough';
import { createInitialCultivationState } from '../game/cultivation';
import { createInitialState, deriveGameTime } from '../game/state';
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

/**
 * Safe fallback time used when a legacy save has no time field.
 * Represents the start of the game (tick 0, year 1, Spring, day 1).
 */
const MIGRATION_FALLBACK_TIME: GameTime = {
  tick: 0,
  year: 1,
  season: Season.Spring,
  day: 1,
};

export const CURRENT_SAVE_VERSION = 14;

/**
 * Stable fallback seed used when a legacy save has no seed field.
 * Using a constant (42) ensures migration is deterministic and reproducible,
 * so the same old save always produces the same migrated result.
 */
export const MIGRATION_FALLBACK_SEED = 42;

/**
 * 迁移旧版本存档到当前版本
 *
 * Each version step adds missing fields with stable, deterministic defaults.
 * No migration step should use Math.random() — that would make migration
 * non-deterministic and break reproducibility of loaded saves.
 */
export function migrateSaveData(data: any): SaveData {
  let migratedData = { ...data };

  // ── V0 → V1: Wrap raw GameState into SaveData envelope ──
  // Old saves before versioning stored the GameState directly without
  // the SaveData wrapper (version, createdAt, updatedAt, seed).
  if (!migratedData.version) {
    migratedData.version = 1;
    if (!migratedData.state) {
      // If it was just the GameState serialized directly
      migratedData = {
        version: 1,
        state: migratedData,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        seed: migratedData.seed || MIGRATION_FALLBACK_SEED,
      };
    }
  }

  // ── V1 → V2: Add realmLayer field ──
  // realmLayer tracks progress within a realm; QiCondensation starts at layer 1.
  if (migratedData.version === 1) {
    migratedData.state = {
      ...migratedData.state,
      realmLayer: migratedData.state.realm === Realm.QiCondensation ? 1 : 0,
    };
    migratedData.version = 2;
  }

  // ── V2 → V3: Add world ledger ──
  // WorldState tracks recent actions, logs, summaries, and solar terms.
  // Defensive: use fallback time if state.time is missing (e.g. bare-bones old saves).
  if (migratedData.version === 2) {
    const safeTime = migratedData.state.time ?? MIGRATION_FALLBACK_TIME;
    migratedData.state = {
      ...migratedData.state,
      time: safeTime,
      world: migratedData.state.world ?? createInitialWorldState(safeTime),
    };
    migratedData.version = 3;
  }

  // ── V3 → V4: Mark legacy origin ──
  // Older saves had no origin selection; mark them as legacy_path.
  // Defensive: ensure choices object exists before markLegacyOrigin accesses it.
  if (migratedData.version === 3) {
    if (!migratedData.state.choices) {
      migratedData.state = {
        ...migratedData.state,
        choices: { flags: {}, tags: {}, qualities: {} },
      };
    }
    migratedData.state = markLegacyOrigin(migratedData.state);
    migratedData.version = 4;
  }

  // ── V4 → V5: Add cultivation ledger ──
  // CultivationState tracks spiritual root, phase affinities, and techniques.
  // Uses stable fallback seed (42) when both state.seed and save.seed are missing.
  if (migratedData.version === 4) {
    const stateSeed = migratedData.state.seed ?? migratedData.seed ?? MIGRATION_FALLBACK_SEED;
    migratedData.state = {
      ...migratedData.state,
      cultivation: migratedData.state.cultivation ?? createInitialCultivationState(stateSeed),
    };
    migratedData.version = 5;
  }

  // ── V5 → V6: Add alchemy resources and ledger ──
  // Adds qiPills, dantoxin to resources and the AlchemyState ledger.
  if (migratedData.version === 5) {
    migratedData.state = {
      ...migratedData.state,
      resources: {
        ...(migratedData.state.resources ?? {}),
        qiPills: migratedData.state.resources?.qiPills ?? 0,
        dantoxin: migratedData.state.resources?.dantoxin ?? 0,
      },
      alchemy: migratedData.state.alchemy ?? createInitialAlchemyState(),
    };
    migratedData.version = 6;
  }

  // ── V6 → V7: Add breakthrough ledger ──
  // BreakthroughState tracks preparation, attempts, failures, and successes.
  if (migratedData.version === 6) {
    migratedData.state = {
      ...migratedData.state,
      breakthrough: migratedData.state.breakthrough ?? createInitialBreakthroughState(),
    };
    migratedData.version = 7;
  }

  // ── V7 → V8: Add stabilizingPowders resource ──
  if (migratedData.version === 7) {
    migratedData.state = {
      ...migratedData.state,
      resources: {
        ...(migratedData.state.resources ?? {}),
        stabilizingPowders: migratedData.state.resources?.stabilizingPowders ?? 0,
      },
    };
    migratedData.version = 8;
  }

  // ── V8 → V9: Add cleansingPills resource ──
  if (migratedData.version === 8) {
    migratedData.state = {
      ...migratedData.state,
      resources: {
        ...(migratedData.state.resources ?? {}),
        cleansingPills: migratedData.state.resources?.cleansingPills ?? 0,
      },
    };
    migratedData.version = 9;
  }

  // ── V9 → V10: Add daoPath, karma, and innerDemon ledgers ──
  // These subsystems were added in the F1–F3 feature batch.
  if (migratedData.version === 9) {
    migratedData.state = {
      ...migratedData.state,
      daoPath: migratedData.state.daoPath ?? createInitialDaoPathState(),
      karma: migratedData.state.karma ?? createInitialKarmaState(),
      innerDemon: migratedData.state.innerDemon ?? createInitialInnerDemonState(),
    };
    migratedData.version = 10;
  }

  // ── V10 → V11: Add pill resources and sect/dwelling/follower ledgers ──
  // F4–F7 feature batch: meridianCleansingPills, foundationStrengtheningPills,
  // spiritGatheringPills, sect, dwelling, followers.
  if (migratedData.version === 10) {
    migratedData.state = {
      ...migratedData.state,
      resources: {
        ...(migratedData.state.resources ?? {}),
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

  // ── V11 → V12: Add secretRealm and ascension ledgers ──
  // F8–F9 feature batch: secret realm exploration and ascension system.
  if (migratedData.version === 11) {
    migratedData.state = {
      ...migratedData.state,
      secretRealm: migratedData.state.secretRealm ?? createInitialSecretRealmState(),
      ascension: migratedData.state.ascension ?? createInitialAscensionState(),
    };
    migratedData.version = 12;
  }

  // ── V12 → V13: Add warmFurnacePills and nightSittingPills resources ──
  if (migratedData.version === 12) {
    migratedData.state = {
      ...migratedData.state,
      resources: {
        ...(migratedData.state.resources ?? {}),
        warmFurnacePills: migratedData.state.resources?.warmFurnacePills ?? 0,
        nightSittingPills: migratedData.state.resources?.nightSittingPills ?? 0,
      },
    };
    migratedData.version = 13;
  }

  // ── V13 → V14: Add high-realm pill resources ──
  // Batch addition of pills for Golden Core through Tribulation realms.
  if (migratedData.version === 13) {
    migratedData.state = {
      ...migratedData.state,
      resources: {
        ...(migratedData.state.resources ?? {}),
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
