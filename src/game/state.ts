import { GameState, GameTime, Realm, SpiritualRoot, Season } from './types';
import { createInitialAlchemyState } from './alchemy';
import { createInitialBreakthroughState } from './breakthrough';
import { createInitialCultivationState } from './cultivation';
import { createInitialWorldState } from './world';
import { createInitialDaoPathState } from './daopath';
import { createInitialKarmaState } from './karma';
import { createInitialInnerDemonState } from './innerDemon';
import { createInitialSectState } from './sect';
import { createInitialDwellingState } from './dwelling';
import { createInitialFollowerState } from './follower';
import { createInitialSecretRealmState } from './secretRealm';
import { createInitialAscensionState } from './ascension';

/**
 * Create a deterministic PRNG from a seed and tick.
 * Uses the mulberry32 algorithm for fast, high-quality 32-bit randomness.
 * Each call to the returned function advances the internal counter,
 * producing a deterministic sequence for the same seed+tick combination.
 */
export function createRng(seed: number, tick: number = 0): () => number {
  // Combine seed and tick into a single 32-bit state
  let state = (seed ^ (tick * 374761393)) >>> 0;
  if (state === 0) state = 1; // avoid zero state
  return () => {
    state |= 0;
    state = (state + 0x6D2B79F5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const INITIAL_MAX_STAMINA = 100;

export function getMaxStamina(realm: Realm): number {
  switch (realm) {
    case Realm.Mortal:
    case Realm.QiCondensation:
      return 100;
    case Realm.FoundationEstablishment:
      return 150;
    case Realm.GoldenCore:
      return 200;
    case Realm.NascentSoul:
      return 300;
    case Realm.SpiritTransformation:
    case Realm.Integration:
      return 500;
    case Realm.Mahayana:
    case Realm.Tribulation:
      return 800;
    default:
      return 100;
  }
}
export const INITIAL_LIFESPAN = 100 * 360 * 10; // Assume 1 tick is a fraction of a day, or roughly 10 ticks per day. Let's say lifespan is abstract ticks.
// Wait, we need a standard for lifespan. Let's use ticks. 
// If 1 year = 360 days, and 1 day = 10 ticks, 1 year = 3600 ticks.
// 60 years of mortal life = 216,000 ticks.
export const TICKS_PER_DAY = 10;
export const DAYS_PER_YEAR = 360;
export const DAYS_PER_SEASON = DAYS_PER_YEAR / 4;
export const MORTAL_LIFESPAN_YEARS = 60;

export const REALM_LIFESPAN_YEARS: Record<Realm, number> = {
  [Realm.Mortal]: 60,
  [Realm.QiCondensation]: 100,
  [Realm.FoundationEstablishment]: 200,
  [Realm.GoldenCore]: 500,
  [Realm.NascentSoul]: 1000,
  [Realm.SpiritTransformation]: 2000,
  [Realm.Integration]: 5000,
  [Realm.Mahayana]: 10000,
  [Realm.Tribulation]: 50000,
};

const SEASONS = [Season.Spring, Season.Summer, Season.Autumn, Season.Winter];

export function deriveGameTime(tick: number): GameTime {
  const elapsedDays = Math.floor(tick / TICKS_PER_DAY);
  const dayOfYear = (elapsedDays % DAYS_PER_YEAR) + 1;
  const seasonIndex = Math.min(SEASONS.length - 1, Math.floor((dayOfYear - 1) / DAYS_PER_SEASON));

  return {
    tick,
    year: Math.floor(elapsedDays / DAYS_PER_YEAR) + 1,
    season: SEASONS[seasonIndex],
    day: dayOfYear,
  };
}

export function createInitialState(seed?: number): GameState {
  // Math.random() is acceptable here: this is only used at initial game creation
  // when no seed is provided. Once a game exists, the seed is persisted and reused.
  const stateSeed = seed ?? Math.floor(Math.random() * 1000000);
  const time = deriveGameTime(0);

  return {
    resources: {
      qi: 0,
      essence: INITIAL_MAX_STAMINA,
      herbs: 0,
      qiPills: 0,
      stabilizingPowders: 0,
      cleansingPills: 0,
      meridianCleansingPills: 0,
      foundationStrengtheningPills: 0,
      spiritGatheringPills: 0,
      warmFurnacePills: 0,
      nightSittingPills: 0,
      cloudGatheringPills: 0,
      ironBodyPills: 0,
      demonBanePills: 0,
      foundationExplosionPills: 0,
      spiritVeinPills: 0,
      shadowEscapePills: 0,
      longevityPills: 0,
      fireFurnacePills: 0,
      nineTurnFoundationPills: 0,
      buddhaHeartPills: 0,
      goldenCorePills: 0,
      nascentSoulPills: 0,
      spiritTransformPills: 0,
      integrationPills: 0,
      mahayanaPills: 0,
      tribulationPills: 0,
      heavenlyTribulationPills: 0,
      coins: 0,
      insight: 0,
      dantoxin: 0,
      lifespan: MORTAL_LIFESPAN_YEARS * DAYS_PER_YEAR * TICKS_PER_DAY,
      wounds: 0,
    },
    realm: Realm.Mortal,
    realmLayer: 0,
    spiritualRoot: SpiritualRoot.Mortal,
    time,
    currentLocationId: 'home', // '居处'
    unlockedActions: ['kuzuo'], // Basic actions to start the game
    relationships: {},
    choices: {
      flags: {},
      tags: {},
      qualities: {},
    },
    world: createInitialWorldState(time),
    cultivation: createInitialCultivationState(stateSeed),
    alchemy: createInitialAlchemyState(),
    breakthrough: createInitialBreakthroughState(),
    daoPath: createInitialDaoPathState(),
    karma: createInitialKarmaState(),
    innerDemon: createInitialInnerDemonState(),
    sect: createInitialSectState(),
    dwelling: createInitialDwellingState(),
    followers: createInitialFollowerState(),
    secretRealm: createInitialSecretRealmState(),
    ascension: createInitialAscensionState(),
    activeEventId: null,
    seed: stateSeed,
  };
}
