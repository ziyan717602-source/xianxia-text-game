/**
 * 宗门系统 — 同门关系、宗门规矩深化 (F4)
 */
import { GameState, Realm, SectState } from './types';



export function createInitialSectState(): SectState {
  return {
    rank: 'none',
    contribution: 0,
    discipline: 0,
    tasksCompleted: 0,
    currentTask: null,
    taskDeadline: 0,
    seniorRelationship: {},
  };
}

/** Check if player can advance to the next sect rank */
export function canAdvanceSectRank(state: GameState): boolean {
  const { rank, contribution, discipline } = state.sect;
  if (rank === 'outer') {
    return contribution >= 20 && discipline >= 5 && state.realm === Realm.FoundationEstablishment;
  }
  if (rank === 'inner') {
    return contribution >= 50 && state.realm === Realm.GoldenCore;
  }
  return false;
}

/** Advance the player's sect rank if conditions are met */
export function advanceSectRank(state: GameState): GameState {
  if (!canAdvanceSectRank(state)) return state;

  const { rank } = state.sect;
  let newRank: SectState['rank'] = rank;

  if (rank === 'outer') {
    newRank = 'inner';
  } else if (rank === 'inner') {
    newRank = 'core';
  } else {
    return state;
  }

  return {
    ...state,
    sect: {
      ...state.sect,
      rank: newRank,
    },
    choices: {
      ...state.choices,
      flags: {
        ...state.choices.flags,
        [`sect_rank_${newRank}`]: true,
      },
    },
  };
}

/** Fail a task — discipline -2, may trigger punishment */
export function failTask(state: GameState): GameState {
  return {
    ...state,
    sect: {
      ...state.sect,
      discipline: state.sect.discipline - 2,
      currentTask: null,
      taskDeadline: 0,
    },
  };
}

/** Complete a task — contribution +3, discipline +1 */
export function completeTask(state: GameState): GameState {
  return {
    ...state,
    sect: {
      ...state.sect,
      contribution: state.sect.contribution + 3,
      discipline: state.sect.discipline + 1,
      tasksCompleted: state.sect.tasksCompleted + 1,
      currentTask: null,
      taskDeadline: 0,
    },
  };
}

/** Get benefits available by rank */
export function getSectBenefits(state: GameState): {
  supplyQuality: number;    // 0-3 quality of sect supplies
  locationAccess: string[]; // accessible locations
  itemDiscount: number;     // percentage discount (0-30)
} {
  const { rank } = state.sect;
  switch (rank) {
    case 'elder':
      return { supplyQuality: 3, locationAccess: ['outer_gate', 'inner_gate', 'cave_dwelling', 'market'], itemDiscount: 30 };
    case 'core':
      return { supplyQuality: 2, locationAccess: ['outer_gate', 'inner_gate', 'cave_dwelling', 'market'], itemDiscount: 20 };
    case 'inner':
      return { supplyQuality: 1, locationAccess: ['outer_gate', 'inner_gate', 'cave_dwelling', 'market'], itemDiscount: 10 };
    case 'outer':
      return { supplyQuality: 0, locationAccess: ['outer_gate', 'market'], itemDiscount: 0 };
    default:
      return { supplyQuality: 0, locationAccess: [], itemDiscount: 0 };
  }
}

/** Set a task for the player */
export function setCurrentTask(state: GameState, taskId: string, deadline: number): GameState {
  return {
    ...state,
    sect: {
      ...state.sect,
      currentTask: taskId,
      taskDeadline: deadline,
    },
  };
}

/** Register as outer disciple */
export function registerOuterDisciple(state: GameState): GameState {
  return {
    ...state,
    sect: {
      ...state.sect,
      rank: 'outer',
    },
    choices: {
      ...state.choices,
      flags: {
        ...state.choices.flags,
        sect_rank_outer: true,
      },
    },
  };
}

/** Leave the sect (flee discipline hearing, etc.) */
export function leaveSect(state: GameState): GameState {
  return {
    ...state,
    sect: {
      ...state.sect,
      rank: 'none',
      contribution: 0,
      discipline: 0,
      currentTask: null,
      taskDeadline: 0,
    },
    choices: {
      ...state.choices,
      flags: {
        ...state.choices.flags,
        left_sect: true,
      },
      qualities: {
        ...state.choices.qualities,
        sect_trace: (state.choices.qualities.sect_trace ?? 0) - 5,
      },
    },
  };
}
