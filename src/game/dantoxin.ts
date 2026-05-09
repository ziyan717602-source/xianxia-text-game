import { GameState, Realm } from './types';
import { TICKS_PER_DAY } from './state';

export const DANTOXIN_DRIFT_LAST_DAY = 'dantoxin_drift_last_day';
export const DANTOXIN_CHRONIC_THRESHOLD = 45;
export const DANTOXIN_CHRONIC_INTERVAL_DAYS = 30;

function absoluteDayFromTick(tick: number): number {
  return Math.floor(tick / TICKS_PER_DAY);
}

function setQuality(state: GameState, key: string, value: number): GameState {
  if (state.choices.qualities[key] === value) return state;

  return {
    ...state,
    choices: {
      ...state.choices,
      qualities: {
        ...state.choices.qualities,
        [key]: value,
      },
    },
  };
}

function adjustQuality(state: GameState, key: string, delta: number): GameState {
  if (delta === 0) return state;

  return setQuality(state, key, (state.choices.qualities[key] ?? 0) + delta);
}

function setFlag(state: GameState, key: string, value = true): GameState {
  if (state.choices.flags[key] === value) return state;

  return {
    ...state,
    choices: {
      ...state.choices,
      flags: {
        ...state.choices.flags,
        [key]: value,
      },
    },
  };
}

export function processDantoxinDrift(state: GameState): GameState {
  if (state.realm === Realm.Mortal || state.resources.dantoxin < DANTOXIN_CHRONIC_THRESHOLD) {
    return state;
  }

  const currentDay = absoluteDayFromTick(state.time.tick);
  const previousDay = state.choices.qualities[DANTOXIN_DRIFT_LAST_DAY];

  if (previousDay === undefined) {
    return setQuality(state, DANTOXIN_DRIFT_LAST_DAY, currentDay);
  }

  const elapsedDays = Math.max(0, currentDay - previousDay);
  if (elapsedDays < DANTOXIN_CHRONIC_INTERVAL_DAYS) {
    return state;
  }

  const effectiveDays = Math.min(elapsedDays, 90);
  const woundGain = state.resources.dantoxin >= 70 ? Math.floor(effectiveDays / 45) : 0;
  const lifespanLoss = state.resources.dantoxin >= 70 ? Math.floor(effectiveDays / 30) * 20 : 0;

  let next: GameState = {
    ...state,
    resources: {
      ...state.resources,
      wounds: state.resources.wounds + woundGain,
      lifespan: Math.max(0, state.resources.lifespan - lifespanLoss),
    },
  };

  next = setQuality(next, DANTOXIN_DRIFT_LAST_DAY, currentDay);
  next = adjustQuality(next, 'chronic_dantoxin_days', effectiveDays);
  next = setFlag(next, 'chronic_dantoxin_pending');
  next = setFlag(next, 'chronic_dantoxin_seen', false);

  if (woundGain > 0) {
    next = setFlag(next, 'dantoxin_rooted_in_channels');
  }

  return next;
}
