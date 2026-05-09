import { describe, test, expect } from 'vitest';
import { createInitialState } from '../src/game/state';
import { GameState, Realm } from '../src/game/types';
import {
  createInitialFollowerState,
  canRecruitFollower,
  recruitFollower,
  assignFollowerTask,
  collectFollowerIncome,
  followerTick,
  getMaxFollowers,
} from '../src/game/follower';

function makeState(overrides: Partial<GameState> = {}): GameState {
  const base = createInitialState(42);
  return { ...base, ...overrides };
}

function makeFoundationWithDwelling(overrides: Partial<GameState> = {}): GameState {
  return makeState({
    realm: Realm.FoundationEstablishment,
    realmLayer: 1,
    dwelling: { level: 1, formationLevel: 0, autoQiPerDay: 2, formationBonus: 0, upgradeCost: {} },
    resources: { ...createInitialState(42).resources, coins: 100 },
    ...overrides,
  });
}

describe('Follower system', () => {
  test('createInitialFollowerState returns correct defaults', () => {
    const state = createInitialFollowerState();
    expect(state.followers).toEqual({});
    expect(state.maxFollowers).toBe(0);
  });

  test('initial game state includes followers field', () => {
    const state = createInitialState(42);
    expect(state.followers).toBeDefined();
    expect(state.followers.followers).toEqual({});
    expect(state.followers.maxFollowers).toBe(0);
  });

  test('getMaxFollowers returns correct values', () => {
    expect(getMaxFollowers(0)).toBe(0);
    expect(getMaxFollowers(1)).toBe(1);
    expect(getMaxFollowers(2)).toBe(2);
    expect(getMaxFollowers(3)).toBe(3);
  });

  test('canRecruitFollower: servant requires dwelling level >= 1', () => {
    const noDwelling = makeState();
    expect(canRecruitFollower(noDwelling, 'servant')).toBe(false);

    const withDwelling = makeFoundationWithDwelling();
    expect(canRecruitFollower(withDwelling, 'servant')).toBe(true);
  });

  test('canRecruitFollower: disciple requires GoldenCore + dwelling >= 2', () => {
    const foundation = makeFoundationWithDwelling();
    expect(canRecruitFollower(foundation, 'disciple')).toBe(false);

    const goldenCore = makeState({
      realm: Realm.GoldenCore,
      realmLayer: 1,
      dwelling: { level: 2, formationLevel: 0, autoQiPerDay: 5, formationBonus: 0, upgradeCost: {} },
      resources: { ...createInitialState(42).resources, coins: 100 },
    });
    expect(canRecruitFollower(goldenCore, 'disciple')).toBe(true);

    const goldenCoreDwelling1 = makeState({
      realm: Realm.GoldenCore,
      realmLayer: 1,
      dwelling: { level: 1, formationLevel: 0, autoQiPerDay: 2, formationBonus: 0, upgradeCost: {} },
      resources: { ...createInitialState(42).resources, coins: 100 },
    });
    expect(canRecruitFollower(goldenCoreDwelling1, 'disciple')).toBe(false);
  });

  test('canRecruitFollower: cannot exceed max followers', () => {
    const state = makeFoundationWithDwelling({
      followers: {
        followers: { 'test_servant': { id: 'test_servant', name: '阿福', role: 'servant', loyalty: 50, skill: 3, taskAssignment: null } },
        maxFollowers: 1,
      },
    });
    expect(canRecruitFollower(state, 'servant')).toBe(false);
  });

  test('recruitFollower: creates a new servant', () => {
    const state = makeFoundationWithDwelling();
    const result = recruitFollower(state, 'servant', 0);
    const followers = Object.values(result.followers.followers);
    expect(followers.length).toBe(1);
    expect(followers[0].role).toBe('servant');
    expect(followers[0].loyalty).toBe(50);
    expect(followers[0].taskAssignment).toBeNull();
  });

  test('recruitFollower: creates a new disciple', () => {
    const state = makeState({
      realm: Realm.GoldenCore,
      realmLayer: 1,
      dwelling: { level: 2, formationLevel: 0, autoQiPerDay: 5, formationBonus: 0, upgradeCost: {} },
      resources: { ...createInitialState(42).resources, coins: 100, insight: 10 },
    });
    const result = recruitFollower(state, 'disciple', 0);
    const followers = Object.values(result.followers.followers);
    expect(followers.length).toBe(1);
    expect(followers[0].role).toBe('disciple');
    expect(followers[0].loyalty).toBe(60);
  });

  test('recruitFollower: does nothing when cannot recruit', () => {
    const state = makeState();
    const result = recruitFollower(state, 'servant');
    expect(Object.keys(result.followers.followers).length).toBe(0);
  });

  test('assignFollowerTask: assigns a task to an unassigned follower', () => {
    const state = makeFoundationWithDwelling({
      followers: {
        followers: {
          'f1': { id: 'f1', name: '阿福', role: 'servant', loyalty: 50, skill: 3, taskAssignment: null },
        },
        maxFollowers: 1,
      },
    });
    const result = assignFollowerTask(state, 'f1', 'herb_gathering');
    expect(result.followers.followers['f1'].taskAssignment).toBe('herb_gathering');
  });

  test('assignFollowerTask: patrol_duty requires sect rank', () => {
    const noSect = makeFoundationWithDwelling({
      followers: {
        followers: {
          'f1': { id: 'f1', name: '阿福', role: 'servant', loyalty: 50, skill: 3, taskAssignment: null },
        },
        maxFollowers: 1,
      },
    });
    const result = assignFollowerTask(noSect, 'f1', 'patrol_duty');
    expect(result.followers.followers['f1'].taskAssignment).toBeNull();

    const withSect = makeFoundationWithDwelling({
      sect: { ...createInitialState(42).sect, rank: 'outer' },
      followers: {
        followers: {
          'f1': { id: 'f1', name: '阿福', role: 'servant', loyalty: 50, skill: 3, taskAssignment: null },
        },
        maxFollowers: 1,
      },
    });
    const result2 = assignFollowerTask(withSect, 'f1', 'patrol_duty');
    expect(result2.followers.followers['f1'].taskAssignment).toBe('patrol_duty');
  });

  test('assignFollowerTask: returns unchanged state for non-existent follower', () => {
    const state = makeFoundationWithDwelling();
    const result = assignFollowerTask(state, 'nonexistent', 'herb_gathering');
    expect(result).toBe(state);
  });

  test('collectFollowerIncome: collects from assigned followers', () => {
    const state = makeFoundationWithDwelling({
      followers: {
        followers: {
          'f1': { id: 'f1', name: '阿福', role: 'servant', loyalty: 80, skill: 5, taskAssignment: 'herb_gathering' },
        },
        maxFollowers: 1,
      },
    });
    const initialHerbs = state.resources.herbs;
    const result = collectFollowerIncome(state);
    // Herb gathering: skill=5, loyalty=80, factor = 5*0.5*0.8*2 = 4
    expect(result.resources.herbs).toBeGreaterThan(initialHerbs);
    // Loyalty decreases
    expect(result.followers.followers['f1'].loyalty).toBeLessThan(80);
  });

  test('collectFollowerIncome: unassigned followers produce nothing', () => {
    const state = makeFoundationWithDwelling({
      followers: {
        followers: {
          'f1': { id: 'f1', name: '阿福', role: 'servant', loyalty: 50, skill: 3, taskAssignment: null },
        },
        maxFollowers: 1,
      },
    });
    const result = collectFollowerIncome(state);
    expect(result.resources.herbs).toBe(state.resources.herbs);
  });

  test('followerTick: removes followers with 0 loyalty', () => {
    const state = makeFoundationWithDwelling({
      followers: {
        followers: {
          'f1': { id: 'f1', name: '阿福', role: 'servant', loyalty: 0, skill: 3, taskAssignment: null },
          'f2': { id: 'f2', name: '小石', role: 'servant', loyalty: 50, skill: 2, taskAssignment: null },
        },
        maxFollowers: 1,
      },
    });
    const result = followerTick(state);
    expect(result.followers.followers['f1']).toBeUndefined();
    expect(result.followers.followers['f2']).toBeDefined();
  });

  test('followerTick: updates maxFollowers based on dwelling level', () => {
    const state = makeFoundationWithDwelling({
      dwelling: { level: 2, formationLevel: 0, autoQiPerDay: 5, formationBonus: 0, upgradeCost: {} },
    });
    const result = followerTick(state);
    expect(result.followers.maxFollowers).toBe(2);
  });
});
