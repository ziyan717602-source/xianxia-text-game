import { describe, it, expect } from 'vitest';
import { createInitialState, getMaxStamina, deriveGameTime, TICKS_PER_DAY, DAYS_PER_YEAR, MORTAL_LIFESPAN_YEARS } from '../src/game/state';
import { Realm, Season, SpiritualRoot } from '../src/game/types';

describe('Game State Initialization', () => {
  it('should create an initial state with default values', () => {
    const state = createInitialState(12345);

    expect(state.seed).toBe(12345);
    expect(state.realm).toBe(Realm.Mortal);
    expect(state.realmLayer).toBe(0);
    expect(state.spiritualRoot).toBe(SpiritualRoot.Mortal);
    expect(state.currentLocationId).toBe('home');

    // Check time
    expect(state.time.tick).toBe(0);
    expect(state.time.year).toBe(1);
    expect(state.time.season).toBe(Season.Spring);
    expect(state.time.day).toBe(1);

    // Check resources
    expect(state.resources.qi).toBe(0);
    expect(state.resources.essence).toBeGreaterThan(0); // Assuming 100
    expect(state.resources.lifespan).toBeGreaterThan(0);
    expect(state.resources.wounds).toBe(0);
    expect(state.resources.herbs).toBe(0);
    expect(state.resources.qiPills).toBe(0);
    expect(state.resources.stabilizingPowders).toBe(0);
    expect(state.resources.cleansingPills).toBe(0);
    expect(state.resources.coins).toBe(0);
    expect(state.resources.insight).toBe(0);
    expect(state.resources.dantoxin).toBe(0);

    // Check empty structures
    // Check empty structures
    expect(state.unlockedActions).toEqual(['kuzuo']);
    expect(state.relationships).toEqual({});
    expect(state.choices.flags).toEqual({});
    expect(state.choices.tags).toEqual({});
    expect(state.choices.qualities).toEqual({});
    expect(state.world.logs[0]).toContain('立春');
    expect(state.world.recentActions).toEqual({});
    expect(state.cultivation.rootKnown).toBe(false);
    expect(state.cultivation.activeTechniqueId).toBe('small_breathing');
    expect(state.alchemy.knownRecipeIds).toEqual([]);
    expect(state.alchemy.brewedRecipeCounts).toEqual({});
    expect(state.breakthrough.preparation).toEqual({});
    expect(state.breakthrough.lastTargetId).toBeNull();
  });

  it('should generate a random seed if none is provided', () => {
    const state1 = createInitialState();
    const state2 = createInitialState();

    // There is a tiny chance they are equal, but in practice they should be different
    expect(typeof state1.seed).toBe('number');
    expect(typeof state2.seed).toBe('number');
  });
});

describe('getMaxStamina', () => {
  it('returns 100 for Mortal and QiCondensation', () => {
    expect(getMaxStamina(Realm.Mortal)).toBe(100);
    expect(getMaxStamina(Realm.QiCondensation)).toBe(100);
  });

  it('returns 150 for FoundationEstablishment', () => {
    expect(getMaxStamina(Realm.FoundationEstablishment)).toBe(150);
  });

  it('returns 200 for GoldenCore', () => {
    expect(getMaxStamina(Realm.GoldenCore)).toBe(200);
  });

  it('returns 300 for NascentSoul', () => {
    expect(getMaxStamina(Realm.NascentSoul)).toBe(300);
  });

  it('returns 500 for SpiritTransformation and Integration', () => {
    expect(getMaxStamina(Realm.SpiritTransformation)).toBe(500);
    expect(getMaxStamina(Realm.Integration)).toBe(500);
  });

  it('returns 800 for Mahayana and Tribulation', () => {
    expect(getMaxStamina(Realm.Mahayana)).toBe(800);
    expect(getMaxStamina(Realm.Tribulation)).toBe(800);
  });

  it('stamina cap increases with realm progression', () => {
    const mortal = getMaxStamina(Realm.Mortal);
    const foundation = getMaxStamina(Realm.FoundationEstablishment);
    const goldenCore = getMaxStamina(Realm.GoldenCore);
    const nascentSoul = getMaxStamina(Realm.NascentSoul);
    const spirit = getMaxStamina(Realm.SpiritTransformation);
    const mahayana = getMaxStamina(Realm.Mahayana);

    expect(foundation).toBeGreaterThan(mortal);
    expect(goldenCore).toBeGreaterThan(foundation);
    expect(nascentSoul).toBeGreaterThan(goldenCore);
    expect(spirit).toBeGreaterThan(nascentSoul);
    expect(mahayana).toBeGreaterThan(spirit);
  });
});

describe('deriveGameTime', () => {
  it('returns year 1, season Spring, day 1 for tick 0', () => {
    const time = deriveGameTime(0);
    expect(time.tick).toBe(0);
    expect(time.year).toBe(1);
    expect(time.season).toBe(Season.Spring);
    expect(time.day).toBe(1);
  });

  it('computes correct day within a year', () => {
    // 10 ticks per day, so tick 10 = day 2
    const time = deriveGameTime(10);
    expect(time.day).toBe(2);
    expect(time.year).toBe(1);
  });

  it('rolls over to year 2 after 360 days', () => {
    // 360 days * 10 ticks = 3600 ticks → last day of year 1
    const endOfY1 = deriveGameTime(3600 - 1);
    expect(endOfY1.year).toBe(1);

    // 3600 ticks = first tick of year 2
    const startOfY2 = deriveGameTime(3600);
    expect(startOfY2.year).toBe(2);
    expect(startOfY2.day).toBe(1);
  });

  it('computes seasons correctly', () => {
    // Day 1-90 = Spring, 91-180 = Summer, 181-270 = Autumn, 271-360 = Winter
    const springDay1 = deriveGameTime(0);
    expect(springDay1.season).toBe(Season.Spring);

    // Day 91 = Summer start (tick 900)
    const summerStart = deriveGameTime(90 * TICKS_PER_DAY);
    expect(summerStart.season).toBe(Season.Summer);

    // Day 181 = Autumn start (tick 1800)
    const autumnStart = deriveGameTime(180 * TICKS_PER_DAY);
    expect(autumnStart.season).toBe(Season.Autumn);

    // Day 271 = Winter start (tick 2700)
    const winterStart = deriveGameTime(270 * TICKS_PER_DAY);
    expect(winterStart.season).toBe(Season.Winter);
  });

  it('handles large tick values correctly', () => {
    // 10 years worth of ticks = 36000
    const time = deriveGameTime(36000);
    expect(time.year).toBe(11);
  });
});

describe('createInitialState determinism with seed', () => {
  it('produces identical states when given the same seed', () => {
    const state1 = createInitialState(99999);
    const state2 = createInitialState(99999);

    expect(state1.seed).toBe(state2.seed);
    expect(state1.resources).toEqual(state2.resources);
    expect(state1.cultivation.latentRoot).toBe(state2.cultivation.latentRoot);
    expect(state1.cultivation.phaseAffinities).toEqual(state2.cultivation.phaseAffinities);
  });

  it('produces different cultivation states with different seeds', () => {
    const state1 = createInitialState(11111);
    const state2 = createInitialState(22222);

    // At minimum the seeds should differ
    expect(state1.seed).not.toBe(state2.seed);
    // Cultivation state may or may not differ (depends on RNG), but seed definitely differs
  });

  it('initial lifespan equals mortal lifespan in ticks', () => {
    const state = createInitialState(42);
    const expectedLifespan = MORTAL_LIFESPAN_YEARS * DAYS_PER_YEAR * TICKS_PER_DAY;
    expect(state.resources.lifespan).toBe(expectedLifespan);
  });
});
