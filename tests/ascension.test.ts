import { describe, test, expect } from 'vitest';
import { createInitialState, MORTAL_LIFESPAN_YEARS, DAYS_PER_YEAR, TICKS_PER_DAY } from '../src/game/state';
import { GameState, Realm } from '../src/game/types';
import {
  createInitialAscensionState,
  canAscend,
  calculateFinalScore,
  generateFinalSummary,
  triggerAscensionChoice,
  executeAscension,
  applyAscensionBonuses,
  shouldShowAscensionThreshold,
} from '../src/game/ascension';

function makeState(overrides: Partial<GameState> = {}): GameState {
  const base = createInitialState(42);
  return { ...base, ...overrides };
}

function makeNascentSoulState(overrides: Partial<GameState> = {}): GameState {
  return makeState({
    realm: Realm.NascentSoul,
    realmLayer: 1,
    resources: {
      ...createInitialState(42).resources,
      qi: 250,
      insight: 50,
      coins: 100,
    },
    daoPath: {
      currentPath: 'sword',
      pathAffinity: { sword: 30 },
      pathRevealedAtTick: 100,
    },
    karma: {
      karmicWeight: 3,
      karmicEvents: [],
    },
    ...overrides,
  });
}

describe('Ascension system', () => {
  test('createInitialAscensionState returns correct defaults', () => {
    const state = createInitialAscensionState();
    expect(state.ascended).toBe(false);
    expect(state.ascensionCount).toBe(0);
    expect(state.ascensionBonuses).toEqual({});
    expect(state.ascensionChoice).toBeNull();
    expect(state.finalScore).toBeNull();
    expect(state.finalSummary).toEqual({});
  });

  test('initial game state includes ascension field', () => {
    const state = createInitialState(42);
    expect(state.ascension).toBeDefined();
    expect(state.ascension.ascended).toBe(false);
    expect(state.ascension.ascensionCount).toBe(0);
  });

  test('canAscend: true when NascentSoul + qi >= 200', () => {
    const state = makeNascentSoulState({ resources: { ...createInitialState(42).resources, qi: 250 } });
    expect(canAscend(state)).toBe(true);
  });

  test('canAscend: false when qi < 200', () => {
    const state = makeNascentSoulState({ resources: { ...createInitialState(42).resources, qi: 150 } });
    expect(canAscend(state)).toBe(false);
  });

  test('canAscend: false when not NascentSoul', () => {
    const state = makeState({
      realm: Realm.GoldenCore,
      realmLayer: 1,
      resources: { ...createInitialState(42).resources, qi: 250 },
    });
    expect(canAscend(state)).toBe(false);
  });

  test('calculateFinalScore: includes realm and dao path', () => {
    const state = makeNascentSoulState();
    const score = calculateFinalScore(state);
    // NascentSoul = 5 * 20 = 100
    // Dao path = 15
    // Karma = max(0, 20 - 3) = 17
    // Relationships = 0
    // Dantoxin = 0
    // Wounds = 0
    expect(score).toBe(100 + 15 + 17);
  });

  test('calculateFinalScore: deducts dantoxin and wounds', () => {
    const state = makeNascentSoulState({
      resources: {
        ...createInitialState(42).resources,
        qi: 250,
        dantoxin: 20,
        wounds: 3,
      },
    });
    const score = calculateFinalScore(state);
    // Base: 100 + 15 + 17 = 132
    // Dantoxin penalty: floor(20/2) = 10
    // Wound penalty: 3 * 3 = 9
    expect(score).toBe(132 - 10 - 9);
  });

  test('triggerAscensionChoice: sets ascensionChoice to pending', () => {
    const state = makeNascentSoulState();
    const result = triggerAscensionChoice(state);
    expect(result.ascension.ascensionChoice).toBe('pending');
    expect(result.activeEventId).toBe('ascension_choice_event');
  });

  test('triggerAscensionChoice: no effect if cannot ascend', () => {
    const state = makeState({ realm: Realm.GoldenCore });
    const result = triggerAscensionChoice(state);
    expect(result).toBe(state);
  });

  test('executeAscension: ascend ends game', () => {
    const state = makeNascentSoulState();
    const result = executeAscension(state, 'ascend');
    expect(result.gameOver).toBe(true);
    expect(result.state.ascension.ascended).toBe(true);
    expect(result.state.ascension.ascensionChoice).toBe('ascend');
    expect(result.state.ascension.finalScore).not.toBeNull();
    expect(result.log).toContain('终分');
  });

  test('executeAscension: remain continues game', () => {
    const state = makeNascentSoulState();
    const result = executeAscension(state, 'remain');
    expect(result.gameOver).toBe(false);
    expect(result.state.ascension.ascended).toBe(true);
    expect(result.state.ascension.ascensionChoice).toBe('remain');
    expect(result.state.choices.flags['chose_to_remain']).toBe(true);
    expect(result.state.choices.flags['ascension_blocked']).toBe(true);
  });

  test('executeAscension: transcend resets with bonuses', () => {
    const state = makeNascentSoulState({
      choices: {
        ...createInitialState(42).choices,
        qualities: { quiet_cultivation: 10, combat_edge: 5 },
      },
    });
    const result = executeAscension(state, 'transcend');
    expect(result.gameOver).toBe(false);
    expect(result.state.ascension.ascensionCount).toBe(1);
    expect(result.state.ascension.ascensionBonuses['qi_gain_pct']).toBe(10);
    expect(result.state.ascension.ascensionBonuses['starting_insight']).toBe(5);
    expect(result.state.realm).toBe(Realm.Mortal);
    expect(result.state.resources.insight).toBe(5);
    // Should preserve some qualities
    expect(result.state.choices.qualities['quiet_cultivation']).toBe(3); // 10 * 0.3 = 3
  });

  test('executeAscension: dissipate ends game', () => {
    const state = makeNascentSoulState();
    const result = executeAscension(state, 'dissipate');
    expect(result.gameOver).toBe(true);
    expect(result.state.ascension.ascended).toBe(true);
    expect(result.state.ascension.ascensionChoice).toBe('dissipate');
  });

  test('applyAscensionBonuses: applies starting insight', () => {
    const state = makeState({
      ascension: {
        ascended: false,
        ascensionCount: 1,
        ascensionBonuses: { starting_insight: 10, qi_gain_pct: 10 },
        ascensionChoice: null,
        finalScore: null,
        finalSummary: {},
      },
    });
    const result = applyAscensionBonuses(state);
    expect(result.resources.insight).toBe(10);
  });

  test('applyAscensionBonuses: no effect with zero ascensionCount', () => {
    const state = createInitialState(42);
    const result = applyAscensionBonuses(state);
    expect(result.resources.insight).toBe(state.resources.insight);
  });

  test('generateFinalSummary: includes key stats', () => {
    const state = makeNascentSoulState();
    const summary = generateFinalSummary(state);
    expect(summary.realm).toBe(Realm.NascentSoul);
    expect(summary.daoPath).toBe('sword');
    expect(summary.karmicWeight).toBe(3);
    expect(summary.ascensionCount).toBe(0);
  });

  test('shouldShowAscensionThreshold: true when NascentSoul + qi >= 150', () => {
    const state = makeNascentSoulState({
      resources: { ...createInitialState(42).resources, qi: 150 },
    });
    expect(shouldShowAscensionThreshold(state)).toBe(true);
  });

  test('shouldShowAscensionThreshold: false when already seen', () => {
    const state = makeNascentSoulState({
      resources: { ...createInitialState(42).resources, qi: 150 },
      choices: {
        ...createInitialState(42).choices,
        flags: { ascension_threshold_seen: true },
      },
    });
    expect(shouldShowAscensionThreshold(state)).toBe(false);
  });

  test('shouldShowAscensionThreshold: false when already ascended', () => {
    const state = makeNascentSoulState({
      resources: { ...createInitialState(42).resources, qi: 150 },
      ascension: {
        ascended: true,
        ascensionCount: 1,
        ascensionBonuses: {},
        ascensionChoice: 'ascend',
        finalScore: 100,
        finalSummary: {},
      },
    });
    expect(shouldShowAscensionThreshold(state)).toBe(false);
  });

  test('shouldShowAscensionThreshold: false when qi < 150', () => {
    const state = makeNascentSoulState({
      resources: { ...createInitialState(42).resources, qi: 100 },
    });
    expect(shouldShowAscensionThreshold(state)).toBe(false);
  });

  test('transcend accumulates bonuses across multiple ascensions', () => {
    const state = makeNascentSoulState({
      ascension: {
        ascended: false,
        ascensionCount: 1,
        ascensionBonuses: { qi_gain_pct: 10, starting_insight: 5 },
        ascensionChoice: null,
        finalScore: null,
        finalSummary: {},
      },
    });
    const result = executeAscension(state, 'transcend');
    expect(result.state.ascension.ascensionCount).toBe(2);
    expect(result.state.ascension.ascensionBonuses['qi_gain_pct']).toBe(20);
    expect(result.state.ascension.ascensionBonuses['starting_insight']).toBe(10);
  });
});
