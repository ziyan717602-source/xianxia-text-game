/**
 * 洞府与阵法系统 — 重复积累的阵法/洞府升格 (F5)
 */
import { GameState, Realm, Resources, DwellingState } from './types';



export function createInitialDwellingState(): DwellingState {
  return {
    level: 0,
    formationLevel: 0,
    autoQiPerDay: 0,
    formationBonus: 0,
    upgradeCost: { coins: 20, herbs: 5 },
  };
}

/** Get the cost to upgrade to the next dwelling level */
export function getDwellingUpgradeCost(level: number): Partial<Resources> {
  switch (level) {
    case 0: return { coins: 20, herbs: 5 };
    case 1: return { coins: 50, herbs: 10, insight: 5 };
    case 2: return { coins: 100, herbs: 20, insight: 10 };
    default: return {};
  }
}

/** Get auto qi per day for a given dwelling level (before formation bonuses) */
function getBaseAutoQiPerDay(level: number): number {
  switch (level) {
    case 1: return 2;
    case 2: return 5;
    case 3: return 10;
    default: return 0;
  }
}

/** Get the realm requirement for a dwelling level */
function getDwellingRealmRequirement(level: number): Realm | null {
  switch (level) {
    case 1: return Realm.FoundationEstablishment;
    case 2: return Realm.FoundationEstablishment;
    case 3: return Realm.GoldenCore;
    default: return null;
  }
}

/** Get the cost to install the next formation level */
export function getFormationInstallCost(formationLevel: number): Partial<Resources> {
  switch (formationLevel) {
    case 0: return { coins: 30, insight: 8 };
    case 1: return { coins: 60, insight: 12 };
    case 2: return { coins: 120, insight: 20 };
    default: return {};
  }
}

/** Check if player can upgrade dwelling */
export function canUpgradeDwelling(state: GameState): boolean {
  const { level } = state.dwelling;
  if (level >= 3) return false;

  // Check realm requirement
  const requiredRealm = getDwellingRealmRequirement(level + 1);
  if (requiredRealm && state.realm !== requiredRealm) {
    // Also accept higher realms
    const realmOrder = [Realm.Mortal, Realm.QiCondensation, Realm.FoundationEstablishment, Realm.GoldenCore, Realm.NascentSoul, Realm.SpiritTransformation, Realm.Integration, Realm.Mahayana, Realm.Tribulation];
    const currentIndex = realmOrder.indexOf(state.realm);
    const requiredIndex = realmOrder.indexOf(requiredRealm);
    if (currentIndex < requiredIndex) return false;
  }

  // Check resources
  const cost = getDwellingUpgradeCost(level);
  for (const key of Object.keys(cost) as (keyof Resources)[]) {
    if ((cost[key] ?? 0) > 0 && state.resources[key] < (cost[key] ?? 0)) return false;
  }

  return true;
}

/** Upgrade the dwelling, paying costs */
export function upgradeDwelling(state: GameState): GameState {
  if (!canUpgradeDwelling(state)) return state;

  const { level } = state.dwelling;
  const newLevel = level + 1;
  const cost = getDwellingUpgradeCost(level);
  const newResources = { ...state.resources };
  for (const key of Object.keys(cost) as (keyof Resources)[]) {
    newResources[key] -= cost[key] ?? 0;
  }

  const newAutoQi = getBaseAutoQiPerDay(newLevel) + getFormationAutoQiBonus(state.dwelling.formationLevel);

  return {
    ...state,
    resources: newResources,
    dwelling: {
      ...state.dwelling,
      level: newLevel,
      autoQiPerDay: newAutoQi,
      upgradeCost: getDwellingUpgradeCost(newLevel),
    },
    choices: {
      ...state.choices,
      flags: {
        ...state.choices.flags,
        [`dwelling_level_${newLevel}`]: true,
      },
    },
  };
}

/** Check if player can install a formation */
export function canInstallFormation(state: GameState): boolean {
  const { level, formationLevel } = state.dwelling;

  // Need at least dwelling level 2 for any formation
  if (level < 2) return false;
  if (formationLevel >= 3) return false;

  // Level 3 formation requires dwelling level 3
  if (formationLevel === 2 && level < 3) return false;

  // Check resources
  const cost = getFormationInstallCost(formationLevel);
  for (const key of Object.keys(cost) as (keyof Resources)[]) {
    if ((cost[key] ?? 0) > 0 && state.resources[key] < (cost[key] ?? 0)) return false;
  }

  return true;
}

/** Get auto qi bonus from formations */
function getFormationAutoQiBonus(formationLevel: number): number {
  let bonus = 0;
  if (formationLevel >= 1) bonus += 3; // 聚灵阵
  if (formationLevel >= 3) bonus += 5; // 洞天阵
  return bonus;
}

/** Get formation breakthrough bonus */
function getFormationBreakthroughBonus(formationLevel: number): number {
  if (formationLevel >= 3) return 0.10;
  if (formationLevel >= 2) return 0.05;
  return 0;
}

/** Install a formation, paying costs */
export function installFormation(state: GameState): GameState {
  if (!canInstallFormation(state)) return state;

  const { formationLevel } = state.dwelling;
  const newFormationLevel = formationLevel + 1;
  const cost = getFormationInstallCost(formationLevel);
  const newResources = { ...state.resources };
  for (const key of Object.keys(cost) as (keyof Resources)[]) {
    newResources[key] -= cost[key] ?? 0;
  }

  const newAutoQi = getBaseAutoQiPerDay(state.dwelling.level) + getFormationAutoQiBonus(newFormationLevel);
  const newFormationBonus = getFormationBreakthroughBonus(newFormationLevel);

  return {
    ...state,
    resources: newResources,
    dwelling: {
      ...state.dwelling,
      formationLevel: newFormationLevel,
      autoQiPerDay: newAutoQi,
      formationBonus: newFormationBonus,
    },
    choices: {
      ...state.choices,
      flags: {
        ...state.choices.flags,
        [`formation_level_${newFormationLevel}`]: true,
      },
    },
  };
}

/** Get daily auto income from dwelling and formation */
export function getDwellingAutoIncome(state: GameState): { qi: number; insight: number } {
  if (state.dwelling.level === 0) return { qi: 0, insight: 0 };

  return {
    qi: state.dwelling.autoQiPerDay,
    insight: state.dwelling.level >= 2 ? Math.floor(state.dwelling.level / 2) : 0,
  };
}
