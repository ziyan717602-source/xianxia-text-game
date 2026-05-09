import { GameState } from './types';

export function hasFlag(state: GameState, key: string): boolean {
  return !!state.choices.flags[key];
}

export function setFlag(state: GameState, key: string, value: boolean = true): GameState {
  if (state.choices.flags[key] === value) return state;

  return {
    ...state,
    choices: {
      ...state.choices,
      flags: {
        ...state.choices.flags,
        [key]: value
      }
    }
  };
}

export function hasTag(state: GameState, key: string, value?: string): boolean {
  if (value !== undefined) {
    return state.choices.tags[key] === value;
  }
  return state.choices.tags[key] !== undefined;
}

export function setTag(state: GameState, key: string, value: string): GameState {
  if (state.choices.tags[key] === value) return state;

  return {
    ...state,
    choices: {
      ...state.choices,
      tags: {
        ...state.choices.tags,
        [key]: value
      }
    }
  };
}

export function removeTag(state: GameState, key: string): GameState {
  if (state.choices.tags[key] === undefined) return state;

  const newTags = { ...state.choices.tags };
  delete newTags[key];

  return {
    ...state,
    choices: {
      ...state.choices,
      tags: newTags
    }
  };
}

export function getQuality(state: GameState, key: string): number {
  return state.choices.qualities[key] || 0;
}

export function adjustQuality(state: GameState, key: string, delta: number): GameState {
  if (delta === 0) return state;

  const current = getQuality(state, key);
  return {
    ...state,
    choices: {
      ...state.choices,
      qualities: {
        ...state.choices.qualities,
        [key]: Math.max(0, current + delta)
      }
    }
  };
}
