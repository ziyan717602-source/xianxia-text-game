import { GameState, GameTime, Realm, SpiritualRoot, Season } from './types';
import { createInitialAlchemyState } from './alchemy';
import { createInitialBreakthroughState } from './breakthrough';
import { createInitialCultivationState } from './cultivation';
import { createInitialWorldState } from './world';

export const INITIAL_MAX_STAMINA = 100;
export const INITIAL_LIFESPAN = 100 * 360 * 10; // Assume 1 tick is a fraction of a day, or roughly 10 ticks per day. Let's say lifespan is abstract ticks.
// Wait, we need a standard for lifespan. Let's use ticks. 
// If 1 year = 360 days, and 1 day = 10 ticks, 1 year = 3600 ticks.
// 60 years of mortal life = 216,000 ticks.
export const TICKS_PER_DAY = 10;
export const DAYS_PER_YEAR = 360;
export const DAYS_PER_SEASON = DAYS_PER_YEAR / 4;
export const MORTAL_LIFESPAN_YEARS = 60;

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
  const stateSeed = seed ?? Math.floor(Math.random() * 1000000);
  const time = deriveGameTime(0);

  return {
    resources: {
      qi: 0,
      essence: INITIAL_MAX_STAMINA,
      herbs: 0,
      qiPills: 0,
      stabilizingPowders: 0,
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
    activeEventId: null,
    seed: stateSeed,
  };
}
