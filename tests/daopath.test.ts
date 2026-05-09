import { describe, it, expect } from 'vitest';
import { createInitialState } from '../src/game/state';
import {
  calculatePathAffinity,
  revealDaoPath,
  getDaoPathLabel,
  getDaoPathDescription,
  getDaoPathSummary,
  PATH_REVEAL_THRESHOLD,
  DAO_PATHS,
} from '../src/game/daopath';

describe('Dao Path System', () => {
  it('should calculate path affinity from qualities', () => {
    const state = createInitialState(1);
    state.choices.qualities.alchemy_affinity = 5;
    state.choices.qualities.quiet_cultivation = 3;

    const affinity = calculatePathAffinity(state);

    // alchemist: 5*3 + 3*1 = 18
    expect(affinity.alchemist).toBe(18);
    // sword_way: 0*3 + 3*1 = 3
    expect(affinity.sword_way).toBe(3);
    // hermit: 3*4 + 0*(-1) = 12
    expect(affinity.hermit).toBe(12);
    // merchant: 0*3 + 0*1 = 0
    expect(affinity.merchant).toBe(0);
    // sect_servant: 0*3 + 0*2 + 0*1 = 0
    expect(affinity.sect_servant).toBe(0);
  });

  it('should calculate hermit path with negative sect_trace weight', () => {
    const state = createInitialState(2);
    state.choices.qualities.quiet_cultivation = 5;
    state.choices.qualities.sect_trace = 10;

    const affinity = calculatePathAffinity(state);

    // hermit: 5*4 + 10*(-1) = 10
    expect(affinity.hermit).toBe(10);
    // sect_servant: 10*3 + 0*2 + 0*1 = 30
    expect(affinity.sect_servant).toBe(30);
  });

  it('should not reveal path when affinity is below threshold', () => {
    const state = createInitialState(3);
    state.choices.qualities.quiet_cultivation = 3;

    const result = revealDaoPath(state);

    expect(result.revealed).toBe(false);
    expect(result.newPath).toBeNull();
    expect(result.state.daoPath.currentPath).toBeNull();
  });

  it('should reveal path when highest affinity reaches threshold', () => {
    const state = createInitialState(4);
    state.choices.qualities.alchemy_affinity = 6; // alchemist: 6*3 = 18 (>= 15)

    const result = revealDaoPath(state);

    expect(result.revealed).toBe(true);
    expect(result.newPath).toBe('alchemist');
    expect(result.state.daoPath.currentPath).toBe('alchemist');
    expect(result.state.daoPath.pathRevealedAtTick).toBe(state.time.tick);
  });

  it('should reveal the path with highest affinity', () => {
    const state = createInitialState(5);
    state.choices.qualities.combat_edge = 6; // sword_way: 6*3 = 18
    state.choices.qualities.alchemy_affinity = 4; // alchemist: 4*3 = 12

    const result = revealDaoPath(state);

    expect(result.revealed).toBe(true);
    expect(result.newPath).toBe('sword_way');
    expect(result.state.daoPath.currentPath).toBe('sword_way');
  });

  it('should detect path change when dominant quality shifts', () => {
    let state = createInitialState(6);
    state.choices.qualities.quiet_cultivation = 5; // hermit: 5*4 = 20
    state.daoPath.currentPath = 'hermit';
    state.daoPath.pathRevealedAtTick = 100;
    state.choices.qualities.combat_edge = 8; // sword_way: 8*3 = 24

    const result = revealDaoPath(state);

    expect(result.revealed).toBe(true);
    expect(result.newPath).toBe('sword_way');
    expect(result.state.daoPath.currentPath).toBe('sword_way');
    // pathRevealedAtTick should keep original value
    expect(result.state.daoPath.pathRevealedAtTick).toBe(100);
  });

  it('should not re-reveal if path has not changed', () => {
    let state = createInitialState(7);
    state.choices.qualities.alchemy_affinity = 6;
    state.daoPath.currentPath = 'alchemist';
    state.daoPath.pathRevealedAtTick = 100;

    const result = revealDaoPath(state);

    expect(result.revealed).toBe(false);
    expect(result.newPath).toBeNull();
    expect(result.state.daoPath.currentPath).toBe('alchemist');
  });

  it('should return correct labels for all paths', () => {
    expect(getDaoPathLabel('alchemist')).toBe('丹道');
    expect(getDaoPathLabel('sword_way')).toBe('剑路');
    expect(getDaoPathLabel('hermit')).toBe('清修');
    expect(getDaoPathLabel('merchant')).toBe('商途');
    expect(getDaoPathLabel('sect_servant')).toBe('门中');
  });

  it('should return descriptions for all paths', () => {
    for (const path of DAO_PATHS) {
      expect(getDaoPathDescription(path.id).length).toBeGreaterThan(0);
    }
  });

  it('should return empty summary when no path is revealed', () => {
    const state = createInitialState(8);
    expect(getDaoPathSummary(state)).toEqual([]);
  });

  it('should return summary when path is revealed', () => {
    const state = createInitialState(9);
    state.daoPath.currentPath = 'alchemist';

    const summary = getDaoPathSummary(state);

    expect(summary.length).toBeGreaterThan(0);
    expect(summary[0]).toContain('丹道');
  });

  it('should reveal sect_servant path with combined qualities', () => {
    const state = createInitialState(10);
    state.choices.qualities.sect_trace = 3;
    state.choices.qualities.sect_contribution = 2;
    state.choices.qualities.sect_discipline = 1;
    // sect_servant: 3*3 + 2*2 + 1*1 = 9 + 4 + 1 = 14 (just below)

    let result = revealDaoPath(state);
    expect(result.revealed).toBe(false);

    state.choices.qualities.sect_discipline = 2;
    // sect_servant: 3*3 + 2*2 + 2*1 = 9 + 4 + 2 = 15

    result = revealDaoPath(state);
    expect(result.revealed).toBe(true);
    expect(result.newPath).toBe('sect_servant');
  });
});
