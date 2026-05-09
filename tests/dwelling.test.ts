import { describe, test, expect } from 'vitest';
import { createInitialState } from '../src/game/state';
import { GameState, Realm } from '../src/game/types';
import {
  createInitialDwellingState,
  canUpgradeDwelling,
  upgradeDwelling,
  canInstallFormation,
  installFormation,
  getDwellingAutoIncome,
  getDwellingUpgradeCost,
  getFormationInstallCost,
} from '../src/game/dwelling';

function makeState(overrides: Partial<GameState> = {}): GameState {
  const base = createInitialState(42);
  return { ...base, ...overrides };
}

function makeFoundationState(overrides: Partial<GameState> = {}): GameState {
  return makeState({
    realm: Realm.FoundationEstablishment,
    realmLayer: 1,
    resources: { ...createInitialState(42).resources, coins: 200, herbs: 50, insight: 30 },
    ...overrides,
  });
}

describe('Dwelling system', () => {
  test('createInitialDwellingState returns correct defaults', () => {
    const state = createInitialDwellingState();
    expect(state.level).toBe(0);
    expect(state.formationLevel).toBe(0);
    expect(state.autoQiPerDay).toBe(0);
    expect(state.formationBonus).toBe(0);
    expect(state.upgradeCost).toEqual({ coins: 20, herbs: 5 });
  });

  test('initial game state includes dwelling field', () => {
    const state = createInitialState(42);
    expect(state.dwelling).toBeDefined();
    expect(state.dwelling.level).toBe(0);
  });

  test('getDwellingUpgradeCost returns correct costs', () => {
    expect(getDwellingUpgradeCost(0)).toEqual({ coins: 20, herbs: 5 });
    expect(getDwellingUpgradeCost(1)).toEqual({ coins: 50, herbs: 10, insight: 5 });
    expect(getDwellingUpgradeCost(2)).toEqual({ coins: 100, herbs: 20, insight: 10 });
    expect(getDwellingUpgradeCost(3)).toEqual({});
  });

  test('getFormationInstallCost returns correct costs', () => {
    expect(getFormationInstallCost(0)).toEqual({ coins: 30, insight: 8 });
    expect(getFormationInstallCost(1)).toEqual({ coins: 60, insight: 12 });
    expect(getFormationInstallCost(2)).toEqual({ coins: 120, insight: 20 });
    expect(getFormationInstallCost(3)).toEqual({});
  });

  test('canUpgradeDwelling: level 0 with FoundationEstablishment and resources', () => {
    const state = makeFoundationState();
    expect(canUpgradeDwelling(state)).toBe(true);
  });

  test('canUpgradeDwelling: cannot upgrade without FoundationEstablishment', () => {
    const state = makeState({
      realm: Realm.QiCondensation,
      realmLayer: 1,
      resources: { ...createInitialState(42).resources, coins: 200, herbs: 50 },
    });
    expect(canUpgradeDwelling(state)).toBe(false);
  });

  test('canUpgradeDwelling: cannot upgrade without resources', () => {
    const state = makeFoundationState({
      resources: { ...createInitialState(42).resources, coins: 5, herbs: 0 },
    });
    expect(canUpgradeDwelling(state)).toBe(false);
  });

  test('canUpgradeDwelling: cannot upgrade at max level 3', () => {
    const state = makeState({
      realm: Realm.GoldenCore,
      realmLayer: 1,
      dwelling: { level: 3, formationLevel: 0, autoQiPerDay: 10, formationBonus: 0, upgradeCost: {} },
    });
    expect(canUpgradeDwelling(state)).toBe(false);
  });

  test('upgradeDwelling: level 0 to 1', () => {
    const state = makeFoundationState();
    const result = upgradeDwelling(state);
    expect(result.dwelling.level).toBe(1);
    expect(result.dwelling.autoQiPerDay).toBe(2);
    expect(result.choices.flags['dwelling_level_1']).toBe(true);
  });

  test('upgradeDwelling: deducts cost', () => {
    const state = makeFoundationState();
    const result = upgradeDwelling(state);
    expect(result.resources.coins).toBe(state.resources.coins - 20);
    expect(result.resources.herbs).toBe(state.resources.herbs - 5);
  });

  test('upgradeDwelling: does nothing when cannot upgrade', () => {
    const state = makeState();
    const result = upgradeDwelling(state);
    expect(result.dwelling.level).toBe(0);
  });

  test('canInstallFormation: requires dwelling level >= 2', () => {
    const state1 = makeFoundationState({
      dwelling: { level: 1, formationLevel: 0, autoQiPerDay: 2, formationBonus: 0, upgradeCost: {} },
    });
    expect(canInstallFormation(state1)).toBe(false);

    const state2 = makeFoundationState({
      dwelling: { level: 2, formationLevel: 0, autoQiPerDay: 5, formationBonus: 0, upgradeCost: {} },
      resources: { ...createInitialState(42).resources, coins: 50, insight: 10 },
    });
    expect(canInstallFormation(state2)).toBe(true);
  });

  test('installFormation: level 0 to 1', () => {
    const state = makeFoundationState({
      dwelling: { level: 2, formationLevel: 0, autoQiPerDay: 5, formationBonus: 0, upgradeCost: {} },
    });
    const result = installFormation(state);
    expect(result.dwelling.formationLevel).toBe(1);
    expect(result.dwelling.autoQiPerDay).toBe(8); // 5 base + 3 from 聚灵阵
    expect(result.dwelling.formationBonus).toBe(0);
    expect(result.choices.flags['formation_level_1']).toBe(true);
  });

  test('installFormation: level 1 to 2 adds breakthrough bonus', () => {
    const state = makeFoundationState({
      dwelling: { level: 2, formationLevel: 1, autoQiPerDay: 8, formationBonus: 0, upgradeCost: {} },
      resources: { ...createInitialState(42).resources, coins: 100, insight: 20 },
    });
    const result = installFormation(state);
    expect(result.dwelling.formationLevel).toBe(2);
    expect(result.dwelling.formationBonus).toBe(0.05);
  });

  test('installFormation: level 2 to 3 requires dwelling level 3', () => {
    const state = makeFoundationState({
      realm: Realm.GoldenCore,
      realmLayer: 1,
      dwelling: { level: 2, formationLevel: 2, autoQiPerDay: 8, formationBonus: 0.05, upgradeCost: {} },
      resources: { ...createInitialState(42).resources, coins: 200, insight: 30 },
    });
    expect(canInstallFormation(state)).toBe(false);

    const state3 = makeFoundationState({
      realm: Realm.GoldenCore,
      realmLayer: 1,
      dwelling: { level: 3, formationLevel: 2, autoQiPerDay: 10, formationBonus: 0.05, upgradeCost: {} },
      resources: { ...createInitialState(42).resources, coins: 200, insight: 30 },
    });
    expect(canInstallFormation(state3)).toBe(true);
  });

  test('installFormation: level 2 to 3 (洞天阵) adds both qi and bonus', () => {
    const state = makeState({
      realm: Realm.GoldenCore,
      realmLayer: 1,
      dwelling: { level: 3, formationLevel: 2, autoQiPerDay: 10, formationBonus: 0.05, upgradeCost: {} },
      resources: { ...createInitialState(42).resources, coins: 200, insight: 30 },
    });
    const result = installFormation(state);
    expect(result.dwelling.formationLevel).toBe(3);
    expect(result.dwelling.autoQiPerDay).toBe(18); // 10 base + 3 (聚灵) + 5 (洞天) = 18, but function recalculates: base 10 + formationBonus(3 from 聚灵 + 5 from 洞天)
    expect(result.dwelling.formationBonus).toBe(0.10);
  });

  test('getDwellingAutoIncome returns correct values', () => {
    const noDwelling = makeState();
    expect(getDwellingAutoIncome(noDwelling)).toEqual({ qi: 0, insight: 0 });

    const level1 = makeFoundationState({
      dwelling: { level: 1, formationLevel: 0, autoQiPerDay: 2, formationBonus: 0, upgradeCost: {} },
    });
    expect(getDwellingAutoIncome(level1)).toEqual({ qi: 2, insight: 0 });

    const level2 = makeFoundationState({
      dwelling: { level: 2, formationLevel: 0, autoQiPerDay: 5, formationBonus: 0, upgradeCost: {} },
    });
    expect(getDwellingAutoIncome(level2)).toEqual({ qi: 5, insight: 1 });
  });
});
