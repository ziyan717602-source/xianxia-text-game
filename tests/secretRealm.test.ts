import { describe, test, expect } from 'vitest';
import { createInitialState } from '../src/game/state';
import { GameState, Realm } from '../src/game/types';
import {
  createInitialSecretRealmState,
  discoverRealm,
  canExploreRealm,
  beginExploration,
  advanceExploration,
  completeExploration,
  abandonExploration,
  getSecretRealmDef,
} from '../src/game/secretRealm';

function makeState(overrides: Partial<GameState> = {}): GameState {
  const base = createInitialState(42);
  return { ...base, ...overrides };
}

function makeQiCondensationState(overrides: Partial<GameState> = {}): GameState {
  return makeState({
    realm: Realm.QiCondensation,
    realmLayer: 1,
    choices: {
      ...createInitialState(42).choices,
      flags: { ...createInitialState(42).choices.flags, heard_herb_slope_hint: true },
    },
    ...overrides,
  });
}

function makeFoundationState(overrides: Partial<GameState> = {}): GameState {
  return makeState({
    realm: Realm.FoundationEstablishment,
    realmLayer: 1,
    resources: { ...createInitialState(42).resources, coins: 200, herbs: 50, insight: 30 },
    choices: {
      ...createInitialState(42).choices,
      flags: { ...createInitialState(42).choices.flags, sect_rank_inner: true },
    },
    ...overrides,
  });
}

describe('Secret Realm system', () => {
  test('createInitialSecretRealmState returns correct defaults', () => {
    const state = createInitialSecretRealmState();
    expect(state.discoveredRealms).toEqual([]);
    expect(state.activeExploration).toBeNull();
    expect(state.explorationProgress).toBe(0);
    expect(state.completedRealms).toEqual([]);
    expect(state.lootCollected).toEqual({});
  });

  test('initial game state includes secretRealm field', () => {
    const state = createInitialState(42);
    expect(state.secretRealm).toBeDefined();
    expect(state.secretRealm.discoveredRealms).toEqual([]);
    expect(state.secretRealm.activeExploration).toBeNull();
  });

  test('discoverRealm adds realm to discoveredRealms', () => {
    const state = makeQiCondensationState();
    const result = discoverRealm(state, 'misty_herb_valley');
    expect(result.secretRealm.discoveredRealms).toContain('misty_herb_valley');
    expect(result.choices.flags['discovered_misty_herb_valley']).toBe(true);
  });

  test('discoverRealm does not add duplicate', () => {
    const state = makeQiCondensationState();
    const first = discoverRealm(state, 'misty_herb_valley');
    const second = discoverRealm(first, 'misty_herb_valley');
    expect(second.secretRealm.discoveredRealms.filter(r => r === 'misty_herb_valley').length).toBe(1);
  });

  test('discoverRealm ignores unknown realm', () => {
    const state = makeQiCondensationState();
    const result = discoverRealm(state, 'nonexistent_realm');
    expect(result.secretRealm.discoveredRealms).toEqual([]);
  });

  test('canExploreRealm: misty_herb_valley requires QiCondensation + flag', () => {
    const state = makeQiCondensationState();
    // Not discovered yet
    expect(canExploreRealm(state, 'misty_herb_valley')).toBe(false);

    const discovered = discoverRealm(state, 'misty_herb_valley');
    expect(canExploreRealm(discovered, 'misty_herb_valley')).toBe(true);
  });

  test('canExploreRealm: misty_herb_valley requires heard_herb_slope_hint', () => {
    const state = makeQiCondensationState({
      choices: {
        ...createInitialState(42).choices,
        flags: {},
      },
    });
    const discovered = discoverRealm(state, 'misty_herb_valley');
    expect(canExploreRealm(discovered, 'misty_herb_valley')).toBe(false);
  });

  test('canExploreRealm: ancient_ruins requires FoundationEstablishment + inner gate', () => {
    const qiState = makeQiCondensationState();
    const discoveredQi = discoverRealm(qiState, 'ancient_ruins');
    expect(canExploreRealm(discoveredQi, 'ancient_ruins')).toBe(false);

    const foundationState = makeFoundationState();
    const discoveredFoundation = discoverRealm(foundationState, 'ancient_ruins');
    expect(canExploreRealm(discoveredFoundation, 'ancient_ruins')).toBe(true);
  });

  test('canExploreRealm: demonic_cave requires FoundationEstablishment', () => {
    const foundationState = makeFoundationState({
      choices: {
        ...createInitialState(42).choices,
        qualities: { ...createInitialState(42).choices.qualities, combat_edge: 6 },
      },
    });
    const discovered = discoverRealm(foundationState, 'demonic_cave');
    expect(canExploreRealm(discovered, 'demonic_cave')).toBe(true);
  });

  test('canExploreRealm: heavenly_peak requires GoldenCore', () => {
    const goldenState = makeState({
      realm: Realm.GoldenCore,
      realmLayer: 1,
    });
    const discovered = discoverRealm(goldenState, 'heavenly_peak');
    expect(canExploreRealm(discovered, 'heavenly_peak')).toBe(true);
  });

  test('beginExploration: starts exploration on valid realm', () => {
    const state = makeQiCondensationState();
    const discovered = discoverRealm(state, 'misty_herb_valley');
    const result = beginExploration(discovered, 'misty_herb_valley');
    expect(result.secretRealm.activeExploration).toBe('misty_herb_valley');
    expect(result.secretRealm.explorationProgress).toBe(0);
  });

  test('beginExploration: cannot start if already exploring', () => {
    const state = makeQiCondensationState();
    const discovered = discoverRealm(state, 'misty_herb_valley');
    const started = beginExploration(discovered, 'misty_herb_valley');
    const result = beginExploration(started, 'misty_herb_valley');
    // Should remain the same (already exploring)
    expect(result.secretRealm.activeExploration).toBe('misty_herb_valley');
  });

  test('beginExploration: cannot start on undiscovered realm', () => {
    const state = makeQiCondensationState();
    const result = beginExploration(state, 'misty_herb_valley');
    expect(result.secretRealm.activeExploration).toBeNull();
  });

  test('advanceExploration: increments progress', () => {
    const state = makeQiCondensationState();
    const discovered = discoverRealm(state, 'misty_herb_valley');
    const started = beginExploration(discovered, 'misty_herb_valley');
    const result = advanceExploration(started, 10);
    expect(result.state.secretRealm.explorationProgress).toBeGreaterThan(0);
  });

  test('advanceExploration: progress caps at 100', () => {
    const state = makeQiCondensationState();
    const discovered = discoverRealm(state, 'misty_herb_valley');
    const started = beginExploration(discovered, 'misty_herb_valley');
    const result = advanceExploration(started, 1000);
    expect(result.state.secretRealm.explorationProgress).toBe(100);
  });

  test('advanceExploration: no effect without active exploration', () => {
    const state = makeQiCondensationState();
    const result = advanceExploration(state, 10);
    expect(result.state).toBe(state);
    expect(result.eventTriggered).toBe(false);
  });

  test('advanceExploration: event triggers at 50% progress', () => {
    const state = makeQiCondensationState();
    const discovered = discoverRealm(state, 'misty_herb_valley');
    const started = beginExploration(discovered, 'misty_herb_valley');
    // Advance to 49%, then one more tick
    const advanced49 = advanceExploration(started, 49);
    const result = advanceExploration(advanced49.state, 5);
    expect(result.eventTriggered).toBe(true);
    expect(result.eventId).toBe('herb_valley_discovery');
  });

  test('completeExploration: grants rewards', () => {
    const state = makeQiCondensationState({
      resources: { ...createInitialState(42).resources },
    });
    const discovered = discoverRealm(state, 'misty_herb_valley');
    const started = beginExploration(discovered, 'misty_herb_valley');
    // Set progress to 100
    const fullProgress: GameState = {
      ...started,
      secretRealm: { ...started.secretRealm, explorationProgress: 100 },
    };
    const result = completeExploration(fullProgress, () => 0.5);
    expect(result.state.secretRealm.activeExploration).toBeNull();
    expect(result.state.secretRealm.completedRealms).toContain('misty_herb_valley');
    // Misty herb valley: herbs +8, insight +3
    expect(result.state.resources.herbs).toBeGreaterThan(state.resources.herbs);
    expect(result.state.resources.insight).toBeGreaterThan(state.resources.insight);
  });

  test('completeExploration: rare loot can be found', () => {
    const state = makeQiCondensationState();
    const discovered = discoverRealm(state, 'misty_herb_valley');
    const started = beginExploration(discovered, 'misty_herb_valley');
    const fullProgress: GameState = {
      ...started,
      secretRealm: { ...started.secretRealm, explorationProgress: 100 },
    };
    // Force rare loot by having random return 0
    const result = completeExploration(fullProgress, () => 0);
    expect(result.rareLootFound).toBe(true);
    expect(result.state.choices.flags['rare_herb_manual']).toBe(true);
  });

  test('completeExploration: rare loot may not be found', () => {
    const state = makeQiCondensationState();
    const discovered = discoverRealm(state, 'misty_herb_valley');
    const started = beginExploration(discovered, 'misty_herb_valley');
    const fullProgress: GameState = {
      ...started,
      secretRealm: { ...started.secretRealm, explorationProgress: 100 },
    };
    // Force no rare loot by having random return 1
    const result = completeExploration(fullProgress, () => 1);
    expect(result.rareLootFound).toBe(false);
    expect(result.state.choices.flags['rare_herb_manual']).toBeFalsy();
  });

  test('completeExploration: fails without active exploration', () => {
    const state = makeQiCondensationState();
    const result = completeExploration(state, () => 0.5);
    expect(result.log).toContain('没有');
  });

  test('completeExploration: fails without full progress', () => {
    const state = makeQiCondensationState();
    const discovered = discoverRealm(state, 'misty_herb_valley');
    const started = beginExploration(discovered, 'misty_herb_valley');
    const result = completeExploration(started, () => 0.5);
    expect(result.log).toContain('尚未完成');
  });

  test('abandonExploration: grants partial rewards and clears exploration', () => {
    const state = makeQiCondensationState();
    const discovered = discoverRealm(state, 'misty_herb_valley');
    const started = beginExploration(discovered, 'misty_herb_valley');
    const partial: GameState = {
      ...started,
      secretRealm: { ...started.secretRealm, explorationProgress: 50 },
    };
    const result = abandonExploration(partial);
    expect(result.state.secretRealm.activeExploration).toBeNull();
    expect(result.state.secretRealm.explorationProgress).toBe(0);
  });

  test('abandonExploration: no effect without active exploration', () => {
    const state = makeQiCondensationState();
    const result = abandonExploration(state);
    expect(result.log).toContain('没有');
  });

  test('getSecretRealmDef: returns correct definition', () => {
    const def = getSecretRealmDef('misty_herb_valley');
    expect(def).toBeDefined();
    expect(def!.name).toBe('雾中药谷');
    expect(def!.dangerLevel).toBe(2);
  });

  test('getSecretRealmDef: returns undefined for unknown realm', () => {
    const def = getSecretRealmDef('nonexistent');
    expect(def).toBeUndefined();
  });

  test('ascension bonus applies to qi rewards', () => {
    const state = makeQiCondensationState({
      ascension: {
        ascended: false,
        ascensionCount: 1,
        ascensionBonuses: { qi_gain_pct: 10 },
        ascensionChoice: null,
        finalScore: null,
        finalSummary: {},
      },
    });
    const discovered = discoverRealm(state, 'misty_herb_valley');
    const started = beginExploration(discovered, 'misty_herb_valley');
    const fullProgress: GameState = {
      ...started,
      secretRealm: { ...started.secretRealm, explorationProgress: 100 },
    };
    const result = completeExploration(fullProgress, () => 1);
    // misty_herb_valley has qiReward: 0, so no qi gain to test here
    // Test with ancient_ruins instead (qiReward: 20)
    const foundationState = makeFoundationState({
      ascension: {
        ascended: false,
        ascensionCount: 1,
        ascensionBonuses: { qi_gain_pct: 10 },
        ascensionChoice: null,
        finalScore: null,
        finalSummary: {},
      },
    });
    const discovered2 = discoverRealm(foundationState, 'ancient_ruins');
    const started2 = beginExploration(discovered2, 'ancient_ruins');
    const full2: GameState = {
      ...started2,
      secretRealm: { ...started2.secretRealm, explorationProgress: 100 },
    };
    const result2 = completeExploration(full2, () => 1);
    // 20 * 1.10 = 22
    expect(result2.state.resources.qi - foundationState.resources.qi).toBe(22);
  });

  test('lootCollected tracks completions', () => {
    const state = makeQiCondensationState();
    const discovered = discoverRealm(state, 'misty_herb_valley');
    const started = beginExploration(discovered, 'misty_herb_valley');
    const fullProgress: GameState = {
      ...started,
      secretRealm: { ...started.secretRealm, explorationProgress: 100 },
    };
    const result = completeExploration(fullProgress, () => 1);
    expect(result.state.secretRealm.lootCollected['misty_herb_valley']).toBe(1);
  });
});
