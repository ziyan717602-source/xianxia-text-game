import { describe, test, expect } from 'vitest';
import { createInitialState } from '../src/game/state';
import { GameState, Realm } from '../src/game/types';
import {
  createInitialSectState,
  canAdvanceSectRank,
  advanceSectRank,
  failTask,
  completeTask,
  getSectBenefits,
  setCurrentTask,
  registerOuterDisciple,
  leaveSect,
} from '../src/game/sect';

function makeState(overrides: Partial<GameState> = {}): GameState {
  const base = createInitialState(42);
  return { ...base, ...overrides };
}

function makeFoundationState(overrides: Partial<GameState> = {}): GameState {
  return makeState({
    realm: Realm.FoundationEstablishment,
    realmLayer: 1,
    sect: { ...createInitialSectState(), rank: 'outer', contribution: 20, discipline: 5 },
    ...overrides,
  });
}

describe('Sect system', () => {
  test('createInitialSectState returns correct defaults', () => {
    const state = createInitialSectState();
    expect(state.rank).toBe('none');
    expect(state.contribution).toBe(0);
    expect(state.discipline).toBe(0);
    expect(state.tasksCompleted).toBe(0);
    expect(state.currentTask).toBeNull();
    expect(state.taskDeadline).toBe(0);
    expect(state.seniorRelationship).toEqual({});
  });

  test('initial game state includes sect field', () => {
    const state = createInitialState(42);
    expect(state.sect).toBeDefined();
    expect(state.sect.rank).toBe('none');
  });

  test('canAdvanceSectRank: outer to inner requires FoundationEstablishment + contribution >= 20 + discipline >= 5', () => {
    const state = makeFoundationState();
    expect(canAdvanceSectRank(state)).toBe(true);
  });

  test('canAdvanceSectRank: cannot advance with insufficient contribution', () => {
    const state = makeFoundationState({
      sect: { ...createInitialSectState(), rank: 'outer', contribution: 10, discipline: 5 },
    });
    expect(canAdvanceSectRank(state)).toBe(false);
  });

  test('canAdvanceSectRank: cannot advance with insufficient discipline', () => {
    const state = makeFoundationState({
      sect: { ...createInitialSectState(), rank: 'outer', contribution: 20, discipline: 2 },
    });
    expect(canAdvanceSectRank(state)).toBe(false);
  });

  test('canAdvanceSectRank: cannot advance from outer without FoundationEstablishment', () => {
    const state = makeState({
      realm: Realm.QiCondensation,
      realmLayer: 1,
      sect: { ...createInitialSectState(), rank: 'outer', contribution: 20, discipline: 5 },
    });
    expect(canAdvanceSectRank(state)).toBe(false);
  });

  test('advanceSectRank promotes outer to inner', () => {
    const state = makeFoundationState();
    const result = advanceSectRank(state);
    expect(result.sect.rank).toBe('inner');
    expect(result.choices.flags['sect_rank_inner']).toBe(true);
  });

  test('advanceSectRank does nothing when conditions not met', () => {
    const state = makeState();
    const result = advanceSectRank(state);
    expect(result.sect.rank).toBe('none');
  });

  test('canAdvanceSectRank: inner to core requires GoldenCore + contribution >= 50', () => {
    const state = makeState({
      realm: Realm.GoldenCore,
      realmLayer: 1,
      sect: { ...createInitialSectState(), rank: 'inner', contribution: 50, discipline: 0 },
    });
    expect(canAdvanceSectRank(state)).toBe(true);
  });

  test('advanceSectRank promotes inner to core', () => {
    const state = makeState({
      realm: Realm.GoldenCore,
      realmLayer: 1,
      sect: { ...createInitialSectState(), rank: 'inner', contribution: 50, discipline: 0 },
    });
    const result = advanceSectRank(state);
    expect(result.sect.rank).toBe('core');
    expect(result.choices.flags['sect_rank_core']).toBe(true);
  });

  test('failTask decreases discipline by 2 and clears current task', () => {
    const state = makeFoundationState({
      sect: { ...createInitialSectState(), rank: 'outer', discipline: 5, currentTask: 'test_task', taskDeadline: 100 },
    });
    const result = failTask(state);
    expect(result.sect.discipline).toBe(3);
    expect(result.sect.currentTask).toBeNull();
    expect(result.sect.taskDeadline).toBe(0);
  });

  test('completeTask increases contribution by 3 and discipline by 1, clears task', () => {
    const state = makeFoundationState({
      sect: { ...createInitialSectState(), rank: 'outer', contribution: 10, discipline: 3, currentTask: 'test_task', taskDeadline: 100 },
    });
    const result = completeTask(state);
    expect(result.sect.contribution).toBe(13);
    expect(result.sect.discipline).toBe(4);
    expect(result.sect.tasksCompleted).toBe(1);
    expect(result.sect.currentTask).toBeNull();
  });

  test('setCurrentTask sets task and deadline', () => {
    const state = makeFoundationState();
    const result = setCurrentTask(state, 'task_1', 500);
    expect(result.sect.currentTask).toBe('task_1');
    expect(result.sect.taskDeadline).toBe(500);
  });

  test('getSectBenefits returns correct benefits for each rank', () => {
    const noneState = makeState({ sect: { ...createInitialSectState(), rank: 'none' } });
    const outerState = makeState({ sect: { ...createInitialSectState(), rank: 'outer' } });
    const innerState = makeState({ sect: { ...createInitialSectState(), rank: 'inner' } });
    const coreState = makeState({ sect: { ...createInitialSectState(), rank: 'core' } });
    const elderState = makeState({ sect: { ...createInitialSectState(), rank: 'elder' } });

    expect(getSectBenefits(noneState).supplyQuality).toBe(0);
    expect(getSectBenefits(noneState).locationAccess).toEqual([]);
    expect(getSectBenefits(outerState).supplyQuality).toBe(0);
    expect(getSectBenefits(outerState).itemDiscount).toBe(0);
    expect(getSectBenefits(innerState).supplyQuality).toBe(1);
    expect(getSectBenefits(innerState).itemDiscount).toBe(10);
    expect(getSectBenefits(coreState).supplyQuality).toBe(2);
    expect(getSectBenefits(coreState).itemDiscount).toBe(20);
    expect(getSectBenefits(elderState).supplyQuality).toBe(3);
    expect(getSectBenefits(elderState).itemDiscount).toBe(30);
  });

  test('registerOuterDisciple sets rank to outer', () => {
    const state = makeState();
    const result = registerOuterDisciple(state);
    expect(result.sect.rank).toBe('outer');
    expect(result.choices.flags['sect_rank_outer']).toBe(true);
  });

  test('leaveSect resets sect rank and penalizes sect_trace', () => {
    const state = makeFoundationState({
      choices: {
        ...createInitialState(42).choices,
        qualities: { sect_trace: 5 },
      },
    });
    const result = leaveSect(state);
    expect(result.sect.rank).toBe('none');
    expect(result.sect.contribution).toBe(0);
    expect(result.sect.discipline).toBe(0);
    expect(result.choices.qualities.sect_trace).toBe(0);
    expect(result.choices.flags['left_sect']).toBe(true);
  });
});
