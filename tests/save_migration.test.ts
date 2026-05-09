import { describe, it, expect } from 'vitest';
import {
  migrateSaveData,
  createSaveData,
  serializeSave,
  deserializeSave,
  CURRENT_SAVE_VERSION,
  MIGRATION_FALLBACK_SEED,
} from '../src/storage/save';
import { createInitialState } from '../src/game/state';
import { Realm, Season, SpiritualRoot } from '../src/game/types';

// ──────────────────────────────────────────────
// Helpers: construct minimal old-version saves
// ──────────────────────────────────────────────

/** Build a minimal v9 save (the earliest version that can realistically appear in the wild). */
function makeMinimalV9Save(overrides: Record<string, any> = {}) {
  return {
    version: 9,
    state: {
      resources: { qi: 10, essence: 100, herbs: 5, qiPills: 2, dantoxin: 0, stabilizingPowders: 1, cleansingPills: 0, coins: 3, insight: 0, lifespan: 216000, wounds: 0 },
      realm: Realm.QiCondensation,
      realmLayer: 1,
      spiritualRoot: SpiritualRoot.Mortal,
      time: { tick: 0, year: 1, season: Season.Spring, day: 1 },
      currentLocationId: 'home',
      unlockedActions: ['kuzuo'],
      relationships: {},
      choices: { flags: {}, tags: {}, qualities: {} },
      world: { recentActions: {}, logs: ['立春。山路解冻，药芽初生。'], lastSummaryTick: 0, lastSolarTermKey: '1:lichun' },
      cultivation: { rootKnown: false, latentRoot: SpiritualRoot.FiveElements, phaseAffinities: {}, dominantElement: 'Wood', knownTechniqueIds: ['small_breathing'], activeTechniqueId: 'small_breathing' },
      alchemy: { knownRecipeIds: [], brewedRecipeCounts: {}, consumedPillCounts: {} },
      breakthrough: { preparation: {}, attempts: {}, failures: {}, successes: {}, lastTargetId: null },
      seed: 555,
      ...overrides,
    },
    createdAt: 1000,
    updatedAt: 2000,
    seed: 555,
  };
}

/** Build a minimal v10 save. */
function makeMinimalV10Save(overrides: Record<string, any> = {}) {
  return {
    version: 10,
    state: {
      resources: { qi: 10, essence: 100, herbs: 5, qiPills: 2, dantoxin: 0, stabilizingPowders: 1, cleansingPills: 0, coins: 3, insight: 0, lifespan: 216000, wounds: 0 },
      realm: Realm.QiCondensation,
      realmLayer: 1,
      spiritualRoot: SpiritualRoot.Mortal,
      time: { tick: 0, year: 1, season: Season.Spring, day: 1 },
      currentLocationId: 'home',
      unlockedActions: ['kuzuo'],
      relationships: {},
      choices: { flags: {}, tags: {}, qualities: {} },
      world: { recentActions: {}, logs: ['立春。山路解冻，药芽初生。'], lastSummaryTick: 0, lastSolarTermKey: '1:lichun' },
      cultivation: { rootKnown: false, latentRoot: SpiritualRoot.FiveElements, phaseAffinities: {}, dominantElement: 'Wood', knownTechniqueIds: ['small_breathing'], activeTechniqueId: 'small_breathing' },
      alchemy: { knownRecipeIds: [], brewedRecipeCounts: {}, consumedPillCounts: {} },
      breakthrough: { preparation: {}, attempts: {}, failures: {}, successes: {}, lastTargetId: null },
      daoPath: { currentPath: null, pathAffinity: {}, pathRevealedAtTick: null },
      karma: { karmicWeight: 0, karmicEvents: [] },
      innerDemon: { activeDemon: null, demonProgress: 0, suppressedDemons: [] },
      seed: 777,
      ...overrides,
    },
    createdAt: 1000,
    updatedAt: 2000,
    seed: 777,
  };
}

/** Build a minimal v12 save. */
function makeMinimalV12Save(overrides: Record<string, any> = {}) {
  return {
    version: 12,
    state: {
      resources: { qi: 10, essence: 100, herbs: 5, qiPills: 2, dantoxin: 0, stabilizingPowders: 1, cleansingPills: 0, meridianCleansingPills: 0, foundationStrengtheningPills: 0, spiritGatheringPills: 0, coins: 3, insight: 0, lifespan: 216000, wounds: 0 },
      realm: Realm.FoundationEstablishment,
      realmLayer: 0,
      spiritualRoot: SpiritualRoot.TwoElements,
      time: { tick: 1000, year: 1, season: Season.Summer, day: 90 },
      currentLocationId: 'market',
      unlockedActions: ['kuzuo', 'tuna'],
      relationships: {},
      choices: { flags: { selected_origin: true }, tags: { origin: 'legacy_path' }, qualities: {} },
      world: { recentActions: {}, logs: [], lastSummaryTick: 1000, lastSolarTermKey: '1:lixia' },
      cultivation: { rootKnown: true, latentRoot: SpiritualRoot.TwoElements, phaseAffinities: {}, dominantElement: 'Fire', knownTechniqueIds: ['small_breathing'], activeTechniqueId: 'small_breathing' },
      alchemy: { knownRecipeIds: [], brewedRecipeCounts: {}, consumedPillCounts: {} },
      breakthrough: { preparation: { foundation: 1 }, attempts: { foundation: 1 }, failures: {}, successes: { foundation: 1 }, lastTargetId: 'foundation' },
      daoPath: { currentPath: null, pathAffinity: {}, pathRevealedAtTick: null },
      karma: { karmicWeight: 0, karmicEvents: [] },
      innerDemon: { activeDemon: null, demonProgress: 0, suppressedDemons: [] },
      sect: { rank: 'none', contribution: 0, discipline: 0, tasksCompleted: 0, currentTask: null, taskDeadline: 0, seniorRelationship: {} },
      dwelling: { level: 0, formationLevel: 0, autoQiPerDay: 0, formationBonus: 0, upgradeCost: { coins: 20, herbs: 5 } },
      followers: { followers: {}, maxFollowers: 0 },
      secretRealm: { discoveredRealms: [], activeExploration: null, explorationProgress: 0, completedRealms: [], lootCollected: {} },
      ascension: { ascended: false, ascensionCount: 0, ascensionBonuses: {}, ascensionChoice: null, finalScore: null, finalSummary: {} },
      seed: 333,
      ...overrides,
    },
    createdAt: 1000,
    updatedAt: 2000,
    seed: 333,
  };
}

// ──────────────────────────────────────────────
// Tests
// ──────────────────────────────────────────────

describe('Save Migration: v9 → v14', () => {
  it('migrates a minimal v9 save to current version', () => {
    const v9 = makeMinimalV9Save();
    const migrated = migrateSaveData(v9);

    expect(migrated.version).toBe(CURRENT_SAVE_VERSION);
    // v9→v10 adds daoPath, karma, innerDemon
    expect(migrated.state.daoPath).toBeDefined();
    expect(migrated.state.karma).toBeDefined();
    expect(migrated.state.innerDemon).toBeDefined();
    // v10→v11 adds pills + sect/dwelling/followers
    expect(migrated.state.sect).toBeDefined();
    expect(migrated.state.dwelling).toBeDefined();
    expect(migrated.state.followers).toBeDefined();
    // v11→v12 adds secretRealm + ascension
    expect(migrated.state.secretRealm).toBeDefined();
    expect(migrated.state.ascension).toBeDefined();
    // v12→v13 adds warmFurnacePills + nightSittingPills
    expect(migrated.state.resources.warmFurnacePills).toBe(0);
    expect(migrated.state.resources.nightSittingPills).toBe(0);
    // v13→v14 adds all high-realm pills
    expect(migrated.state.resources.cloudGatheringPills).toBe(0);
    expect(migrated.state.resources.goldenCorePills).toBe(0);
    expect(migrated.state.resources.heavenlyTribulationPills).toBe(0);
  });

  it('preserves existing data during v9 migration', () => {
    const v9 = makeMinimalV9Save();
    const migrated = migrateSaveData(v9);

    // Existing data should survive
    expect(migrated.state.resources.qi).toBe(10);
    expect(migrated.state.realm).toBe(Realm.QiCondensation);
    expect(migrated.state.seed).toBe(555);
    expect(migrated.seed).toBe(555);
  });
});

describe('Save Migration: v10 → v14', () => {
  it('migrates a minimal v10 save to current version', () => {
    const v10 = makeMinimalV10Save();
    const migrated = migrateSaveData(v10);

    expect(migrated.version).toBe(CURRENT_SAVE_VERSION);
    expect(migrated.state.sect).toBeDefined();
    expect(migrated.state.dwelling).toBeDefined();
    expect(migrated.state.followers).toBeDefined();
    expect(migrated.state.secretRealm).toBeDefined();
    expect(migrated.state.ascension).toBeDefined();
    expect(migrated.state.resources.warmFurnacePills).toBe(0);
    expect(migrated.state.resources.heavenlyTribulationPills).toBe(0);
  });

  it('preserves existing daoPath/karma/innerDemon from v10', () => {
    const v10 = makeMinimalV10Save({
      daoPath: { currentPath: 'alchemist', pathAffinity: { alchemist: 20 }, pathRevealedAtTick: 500 },
      karma: { karmicWeight: 5, karmicEvents: ['karmic_reckoning'] },
      innerDemon: { activeDemon: 'demon_of_rashness', demonProgress: 30, suppressedDemons: ['demon_of_attachment'] },
    });
    const migrated = migrateSaveData(v10);

    expect(migrated.state.daoPath.currentPath).toBe('alchemist');
    expect(migrated.state.daoPath.pathAffinity.alchemist).toBe(20);
    expect(migrated.state.karma.karmicWeight).toBe(5);
    expect(migrated.state.karma.karmicEvents).toContain('karmic_reckoning');
    expect(migrated.state.innerDemon.activeDemon).toBe('demon_of_rashness');
    expect(migrated.state.innerDemon.suppressedDemons).toContain('demon_of_attachment');
  });
});

describe('Save Migration: v12 → v14', () => {
  it('migrates a minimal v12 save to current version', () => {
    const v12 = makeMinimalV12Save();
    const migrated = migrateSaveData(v12);

    expect(migrated.version).toBe(CURRENT_SAVE_VERSION);
    // v12→v13 adds warmFurnacePills and nightSittingPills
    expect(migrated.state.resources.warmFurnacePills).toBe(0);
    expect(migrated.state.resources.nightSittingPills).toBe(0);
    // v13→v14 adds high-realm pills
    expect(migrated.state.resources.cloudGatheringPills).toBe(0);
    expect(migrated.state.resources.ironBodyPills).toBe(0);
    expect(migrated.state.resources.demonBanePills).toBe(0);
    expect(migrated.state.resources.foundationExplosionPills).toBe(0);
    expect(migrated.state.resources.spiritVeinPills).toBe(0);
    expect(migrated.state.resources.shadowEscapePills).toBe(0);
    expect(migrated.state.resources.longevityPills).toBe(0);
    expect(migrated.state.resources.fireFurnacePills).toBe(0);
    expect(migrated.state.resources.nineTurnFoundationPills).toBe(0);
    expect(migrated.state.resources.buddhaHeartPills).toBe(0);
    expect(migrated.state.resources.goldenCorePills).toBe(0);
    expect(migrated.state.resources.nascentSoulPills).toBe(0);
    expect(migrated.state.resources.spiritTransformPills).toBe(0);
    expect(migrated.state.resources.integrationPills).toBe(0);
    expect(migrated.state.resources.mahayanaPills).toBe(0);
    expect(migrated.state.resources.tribulationPills).toBe(0);
    expect(migrated.state.resources.heavenlyTribulationPills).toBe(0);
  });

  it('preserves existing v12 data', () => {
    const v12 = makeMinimalV12Save();
    const migrated = migrateSaveData(v12);

    expect(migrated.state.resources.qi).toBe(10);
    expect(migrated.state.realm).toBe(Realm.FoundationEstablishment);
    expect(migrated.state.breakthrough.successes.foundation).toBe(1);
    expect(migrated.state.secretRealm).toBeDefined();
    expect(migrated.state.ascension).toBeDefined();
  });
});

describe('Stable seed defaults (no Math.random)', () => {
  it('missing seed gets stable MIGRATION_FALLBACK_SEED, not random', () => {
    // V0 raw state with no seed at all
    const rawNoSeed = {
      resources: { qi: 0, essence: 100, herbs: 0, coins: 0, insight: 0, dantoxin: 0, lifespan: 216000, wounds: 0 },
      realm: Realm.Mortal,
      realmLayer: 0,
      spiritualRoot: SpiritualRoot.Mortal,
      time: { tick: 0, year: 1, season: Season.Spring, day: 1 },
      currentLocationId: 'home',
      unlockedActions: ['kuzuo'],
      relationships: {},
      choices: { flags: {}, tags: {}, qualities: {} },
    };
    // No version, no seed → should get MIGRATION_FALLBACK_SEED
    const migrated = migrateSaveData(rawNoSeed);
    expect(migrated.seed).toBe(MIGRATION_FALLBACK_SEED);

    // Also verify it's deterministic — running twice gives same result
    const migrated2 = migrateSaveData(rawNoSeed);
    expect(migrated2.seed).toBe(MIGRATION_FALLBACK_SEED);
    expect(migrated2.seed).toBe(migrated.seed);
  });

  it('missing seed in V4 migration gets stable fallback', () => {
    // V4 save with no state.seed and no save.seed
    const v4NoSeed = {
      version: 4,
      state: {
        resources: { qi: 0, essence: 100, herbs: 0, coins: 0, insight: 0, dantoxin: 0, lifespan: 216000, wounds: 0 },
        realm: Realm.Mortal,
        realmLayer: 0,
        spiritualRoot: SpiritualRoot.Mortal,
        time: { tick: 0, year: 1, season: Season.Spring, day: 1 },
        currentLocationId: 'home',
        unlockedActions: ['kuzuo'],
        relationships: {},
        choices: { flags: {}, tags: {}, qualities: {} },
        // No seed in state
      },
      createdAt: 1000,
      updatedAt: 2000,
      // No seed at save level
    };
    const migrated = migrateSaveData(v4NoSeed);
    // Cultivation should have been created with the fallback seed
    expect(migrated.state.cultivation).toBeDefined();
    expect(migrated.state.cultivation.rootKnown).toBe(false);
    // The cultivation is deterministic because it used MIGRATION_FALLBACK_SEED
    const migrated2 = migrateSaveData(v4NoSeed);
    expect(migrated2.state.cultivation.latentRoot).toBe(migrated.state.cultivation.latentRoot);
  });

  it('MIGRATION_FALLBACK_SEED is a constant, not random', () => {
    expect(MIGRATION_FALLBACK_SEED).toBe(42);
    expect(typeof MIGRATION_FALLBACK_SEED).toBe('number');
  });
});

describe('Missing resource fields get 0, not undefined', () => {
  it('missing pill resources default to 0 in v9→v14 migration', () => {
    const v9 = makeMinimalV9Save();
    // Remove pill fields that are added in later versions
    delete v9.state.resources.meridianCleansingPills;
    delete v9.state.resources.foundationStrengtheningPills;
    delete v9.state.resources.spiritGatheringPills;

    const migrated = migrateSaveData(v9);
    expect(migrated.state.resources.meridianCleansingPills).toBe(0);
    expect(migrated.state.resources.foundationStrengtheningPills).toBe(0);
    expect(migrated.state.resources.spiritGatheringPills).toBe(0);
  });

  it('missing high-realm pill resources default to 0', () => {
    const v12 = makeMinimalV12Save();
    const migrated = migrateSaveData(v12);
    // All v14 pill fields should be present and 0
    const pillFields = [
      'cloudGatheringPills', 'ironBodyPills', 'demonBanePills', 'foundationExplosionPills',
      'spiritVeinPills', 'shadowEscapePills', 'longevityPills', 'fireFurnacePills',
      'nineTurnFoundationPills', 'buddhaHeartPills', 'goldenCorePills', 'nascentSoulPills',
      'spiritTransformPills', 'integrationPills', 'mahayanaPills', 'tribulationPills',
      'heavenlyTribulationPills',
    ] as const;
    for (const field of pillFields) {
      expect(migrated.state.resources[field]).toBe(0);
    }
  });

  it('missing resources object entirely gets safe fallback', () => {
    // V5 save with no resources at all — migration should not crash
    const v5NoResources = {
      version: 5,
      state: {
        realm: Realm.Mortal,
        realmLayer: 0,
        spiritualRoot: SpiritualRoot.Mortal,
        time: { tick: 0, year: 1, season: Season.Spring, day: 1 },
        currentLocationId: 'home',
        unlockedActions: ['kuzuo'],
        relationships: {},
        choices: { flags: {}, tags: {}, qualities: {} },
        seed: 100,
      },
      createdAt: 1000,
      updatedAt: 2000,
      seed: 100,
    };
    const migrated = migrateSaveData(v5NoResources);
    // Should not have undefined resources
    expect(migrated.state.resources).toBeDefined();
    expect(migrated.state.resources.qiPills).toBe(0);
    expect(migrated.state.resources.dantoxin).toBe(0);
  });
});

describe('Missing flags get empty object', () => {
  it('missing choices/flags gets empty object during V0 migration', () => {
    // V0 raw state with no choices at all
    const raw = {
      resources: { qi: 0, essence: 100, herbs: 0, coins: 0, insight: 0, dantoxin: 0, lifespan: 216000, wounds: 0 },
      realm: Realm.Mortal,
      realmLayer: 0,
      spiritualRoot: SpiritualRoot.Mortal,
      time: { tick: 0, year: 1, season: Season.Spring, day: 1 },
      currentLocationId: 'home',
      unlockedActions: ['kuzuo'],
      relationships: {},
      seed: 42,
    };
    const migrated = migrateSaveData(raw);
    expect(migrated.state.choices).toBeDefined();
    // After full migration, the V3→V4 step will add flags via markLegacyOrigin
    expect(migrated.state.choices.flags).toBeDefined();
    expect(typeof migrated.state.choices.flags).toBe('object');
  });
});

describe('Round-trip: createSaveData → serializeSave → deserializeSave', () => {
  it('preserves all fields through a round-trip', () => {
    const state = createInitialState(888);
    state.resources.qi = 50;
    state.resources.herbs = 10;
    state.choices.flags['test_flag'] = true;
    state.choices.tags['test_tag'] = 'value';
    state.choices.qualities['test_quality'] = 5;
    state.daoPath.currentPath = 'alchemist';
    state.karma.karmicWeight = 3;
    state.innerDemon.activeDemon = 'demon_of_rashness';
    state.sect.rank = 'outer';
    state.dwelling.level = 2;
    state.secretRealm.discoveredRealms = ['spirit_herb_garden'];
    state.ascension.ascensionCount = 1;

    const json = serializeSave(state);
    const loaded = deserializeSave(json);

    expect(loaded.seed).toBe(888);
    expect(loaded.resources.qi).toBe(50);
    expect(loaded.resources.herbs).toBe(10);
    expect(loaded.choices.flags['test_flag']).toBe(true);
    expect(loaded.choices.tags['test_tag']).toBe('value');
    expect(loaded.choices.qualities['test_quality']).toBe(5);
    expect(loaded.daoPath.currentPath).toBe('alchemist');
    expect(loaded.karma.karmicWeight).toBe(3);
    expect(loaded.innerDemon.activeDemon).toBe('demon_of_rashness');
    expect(loaded.sect.rank).toBe('outer');
    expect(loaded.dwelling.level).toBe(2);
    expect(loaded.secretRealm.discoveredRealms).toContain('spirit_herb_garden');
    expect(loaded.ascension.ascensionCount).toBe(1);
  });

  it('round-trip preserves all resource fields', () => {
    const state = createInitialState(999);
    // Set non-zero values on all resource fields
    state.resources.qi = 1;
    state.resources.essence = 2;
    state.resources.herbs = 3;
    state.resources.qiPills = 4;
    state.resources.stabilizingPowders = 5;
    state.resources.cleansingPills = 6;
    state.resources.meridianCleansingPills = 7;
    state.resources.foundationStrengtheningPills = 8;
    state.resources.spiritGatheringPills = 9;
    state.resources.warmFurnacePills = 10;
    state.resources.nightSittingPills = 11;
    state.resources.cloudGatheringPills = 12;
    state.resources.ironBodyPills = 13;
    state.resources.demonBanePills = 14;
    state.resources.foundationExplosionPills = 15;
    state.resources.spiritVeinPills = 16;
    state.resources.shadowEscapePills = 17;
    state.resources.longevityPills = 18;
    state.resources.fireFurnacePills = 19;
    state.resources.nineTurnFoundationPills = 20;
    state.resources.buddhaHeartPills = 21;
    state.resources.goldenCorePills = 22;
    state.resources.nascentSoulPills = 23;
    state.resources.spiritTransformPills = 24;
    state.resources.integrationPills = 25;
    state.resources.mahayanaPills = 26;
    state.resources.tribulationPills = 27;
    state.resources.heavenlyTribulationPills = 28;
    state.resources.coins = 29;
    state.resources.insight = 30;
    state.resources.dantoxin = 31;
    state.resources.lifespan = 32;
    state.resources.wounds = 33;

    const json = serializeSave(state);
    const loaded = deserializeSave(json);

    expect(loaded.resources.qi).toBe(1);
    expect(loaded.resources.essence).toBe(2);
    expect(loaded.resources.herbs).toBe(3);
    expect(loaded.resources.qiPills).toBe(4);
    expect(loaded.resources.stabilizingPowders).toBe(5);
    expect(loaded.resources.cleansingPills).toBe(6);
    expect(loaded.resources.meridianCleansingPills).toBe(7);
    expect(loaded.resources.foundationStrengtheningPills).toBe(8);
    expect(loaded.resources.spiritGatheringPills).toBe(9);
    expect(loaded.resources.warmFurnacePills).toBe(10);
    expect(loaded.resources.nightSittingPills).toBe(11);
    expect(loaded.resources.cloudGatheringPills).toBe(12);
    expect(loaded.resources.ironBodyPills).toBe(13);
    expect(loaded.resources.demonBanePills).toBe(14);
    expect(loaded.resources.foundationExplosionPills).toBe(15);
    expect(loaded.resources.spiritVeinPills).toBe(16);
    expect(loaded.resources.shadowEscapePills).toBe(17);
    expect(loaded.resources.longevityPills).toBe(18);
    expect(loaded.resources.fireFurnacePills).toBe(19);
    expect(loaded.resources.nineTurnFoundationPills).toBe(20);
    expect(loaded.resources.buddhaHeartPills).toBe(21);
    expect(loaded.resources.goldenCorePills).toBe(22);
    expect(loaded.resources.nascentSoulPills).toBe(23);
    expect(loaded.resources.spiritTransformPills).toBe(24);
    expect(loaded.resources.integrationPills).toBe(25);
    expect(loaded.resources.mahayanaPills).toBe(26);
    expect(loaded.resources.tribulationPills).toBe(27);
    expect(loaded.resources.heavenlyTribulationPills).toBe(28);
    expect(loaded.resources.coins).toBe(29);
    expect(loaded.resources.insight).toBe(30);
    expect(loaded.resources.dantoxin).toBe(31);
    expect(loaded.resources.lifespan).toBe(32);
    expect(loaded.resources.wounds).toBe(33);
  });
});

describe('Old save with minimal fields migrates without error', () => {
  it('V0 bare-minimum save (just a few fields) migrates to current version', () => {
    const bare = {
      resources: { qi: 5 },
      realm: Realm.Mortal,
    };
    // Should not throw
    const migrated = migrateSaveData(bare);
    expect(migrated.version).toBe(CURRENT_SAVE_VERSION);
    // Existing data preserved
    expect(migrated.state.resources.qi).toBe(5);
    // Missing fields get stable defaults
    expect(migrated.seed).toBe(MIGRATION_FALLBACK_SEED);
  });

  it('V9 save with empty resources object migrates without crash', () => {
    const v9Empty = makeMinimalV9Save({ resources: {} });
    const migrated = migrateSaveData(v9Empty);
    expect(migrated.version).toBe(CURRENT_SAVE_VERSION);
    // Resources should have been merged safely
    expect(migrated.state.resources).toBeDefined();
  });

  it('V10 save with null resources migrates without crash', () => {
    const v10Null = makeMinimalV10Save({ resources: null });
    // @ts-expect-error — intentionally testing malformed data
    const migrated = migrateSaveData(v10Null);
    expect(migrated.version).toBe(CURRENT_SAVE_VERSION);
    expect(migrated.state.resources).toBeDefined();
  });

  it('current-version save passes through unchanged', () => {
    const state = createInitialState(42);
    const save = createSaveData(state, 1000);
    const migrated = migrateSaveData(save);
    expect(migrated.version).toBe(CURRENT_SAVE_VERSION);
    expect(migrated.seed).toBe(42);
    expect(migrated.state.resources.qi).toBe(state.resources.qi);
  });
});

describe('createSaveData produces valid structure', () => {
  it('includes version, state, createdAt, updatedAt, seed', () => {
    const state = createInitialState(123);
    const save = createSaveData(state, 5000);
    expect(save.version).toBe(CURRENT_SAVE_VERSION);
    expect(save.state).toBe(state);
    expect(save.createdAt).toBe(5000);
    expect(save.updatedAt).toBeGreaterThan(0);
    expect(save.seed).toBe(123);
  });
});
