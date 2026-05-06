import { GameState, Realm, SpiritualRoot, Season } from './types';

export const INITIAL_MAX_STAMINA = 100;
export const INITIAL_LIFESPAN = 100 * 360 * 10; // Assume 1 tick is a fraction of a day, or roughly 10 ticks per day. Let's say lifespan is abstract ticks.
// Wait, we need a standard for lifespan. Let's use ticks. 
// If 1 year = 360 days, and 1 day = 10 ticks, 1 year = 3600 ticks.
// 60 years of mortal life = 216,000 ticks.
export const TICKS_PER_DAY = 10;
export const DAYS_PER_YEAR = 360;
export const MORTAL_LIFESPAN_YEARS = 60;

export function createInitialState(seed?: number): GameState {
  return {
    resources: {
      qi: 0,
      stamina: INITIAL_MAX_STAMINA,
      herbs: 0,
      coins: 0,
      knowledge: 0,
      lifespan: MORTAL_LIFESPAN_YEARS * DAYS_PER_YEAR * TICKS_PER_DAY,
      wounds: 0,
    },
    realm: Realm.Mortal,
    spiritualRoot: SpiritualRoot.Mortal,
    time: {
      tick: 0,
      year: 1,
      season: Season.Spring,
      day: 1,
    },
    currentLocationId: 'home', // '居处'
    unlockedActions: [], // Empty at start, or maybe just basic actions
    relationships: {},
    choices: {
      flags: {},
      tags: {},
      qualities: {},
    },
    seed: seed ?? Math.floor(Math.random() * 1000000),
  };
}
