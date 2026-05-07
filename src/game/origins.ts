import { ORIGINS, OriginId, LEGACY_ORIGIN_ID } from '../content/origins';
import { GameState, Resources } from './types';

const RESOURCE_KEYS = ['qi', 'essence', 'herbs', 'coins', 'insight', 'lifespan', 'wounds'] as const;
const WORLD_LOG_LIMIT = 12;

export function getOriginId(state: GameState): string | undefined {
  return state.choices.tags.origin;
}

export function hasSelectedOrigin(state: GameState): boolean {
  return getOriginId(state) !== undefined;
}

export function getOriginName(state: GameState): string {
  const originId = getOriginId(state) as OriginId | undefined;
  return originId && ORIGINS[originId] ? ORIGINS[originId].name : '未定';
}

function applyResourceDelta(resources: Resources, delta: Partial<Resources>): Resources {
  const next = { ...resources };

  for (const key of RESOURCE_KEYS) {
    next[key] += delta[key] ?? 0;
  }

  return next;
}

export function applyOrigin(state: GameState, originId: OriginId): GameState {
  if (hasSelectedOrigin(state)) return state;

  const origin = ORIGINS[originId];
  const unlockedActions = Array.from(new Set([...state.unlockedActions, ...origin.unlockedActions]));

  return {
    ...state,
    resources: applyResourceDelta(state.resources, origin.resources),
    currentLocationId: origin.startingLocationId,
    unlockedActions,
    choices: {
      ...state.choices,
      flags: {
        ...state.choices.flags,
        selected_origin: true,
        ...origin.flags,
      },
      tags: {
        ...state.choices.tags,
        ...origin.tags,
      },
      qualities: {
        ...state.choices.qualities,
        ...Object.fromEntries(
          Object.entries(origin.qualities).map(([key, value]) => [
            key,
            (state.choices.qualities[key] ?? 0) + value,
          ])
        ),
      },
    },
    world: {
      ...state.world,
      logs: [...state.world.logs, origin.log].slice(-WORLD_LOG_LIMIT),
    },
  };
}

export function markLegacyOrigin(state: GameState): GameState {
  if (hasSelectedOrigin(state)) return state;

  const origin = ORIGINS[LEGACY_ORIGIN_ID];

  return {
    ...state,
    choices: {
      ...state.choices,
      flags: {
        ...state.choices.flags,
        selected_origin: true,
        ...origin.flags,
      },
      tags: {
        ...state.choices.tags,
        ...origin.tags,
      },
    },
  };
}
