import { ELEMENT_LABELS, TECHNIQUE_BY_ELEMENT, TECHNIQUES } from '../content/cultivation';
import { Element, GameState, Season, SpiritualRoot, CultivationState, Resources } from './types';

export const ELEMENT_ORDER = [Element.Wood, Element.Fire, Element.Earth, Element.Metal, Element.Water] as const;

const SEASON_ELEMENT: Record<Season, Element> = {
  [Season.Spring]: Element.Wood,
  [Season.Summer]: Element.Fire,
  [Season.Autumn]: Element.Metal,
  [Season.Winter]: Element.Water,
};

const LOCATION_ELEMENT: Record<string, Element> = {
  home: Element.Earth,
  mountain_path: Element.Wood,
  market: Element.Metal,
  outer_gate: Element.Metal,
};

function seededUnit(seed: number, salt: number): number {
  const value = Math.sin(seed * 12.9898 + salt * 78.233) * 43758.5453;
  return value - Math.floor(value);
}

function deriveRootType(seed: number): SpiritualRoot {
  const roll = seededUnit(seed, 1);

  if (roll < 0.46) return SpiritualRoot.FiveElements;
  if (roll < 0.72) return SpiritualRoot.FourElements;
  if (roll < 0.9) return SpiritualRoot.ThreeElements;
  if (roll < 0.985) return SpiritualRoot.TwoElements;
  return SpiritualRoot.Heavenly;
}

function getActiveElementCount(root: SpiritualRoot): number {
  switch (root) {
    case SpiritualRoot.Heavenly:
      return 1;
    case SpiritualRoot.TwoElements:
      return 2;
    case SpiritualRoot.ThreeElements:
      return 3;
    case SpiritualRoot.FourElements:
      return 4;
    case SpiritualRoot.FiveElements:
    default:
      return 5;
  }
}

function pickRankedElements(seed: number): Element[] {
  return [...ELEMENT_ORDER].sort((a, b) => {
    const left = seededUnit(seed, ELEMENT_ORDER.indexOf(a) + 10);
    const right = seededUnit(seed, ELEMENT_ORDER.indexOf(b) + 10);
    return right - left;
  });
}

function createAffinities(seed: number, root: SpiritualRoot): Record<Element, number> {
  const ranked = pickRankedElements(seed);
  const activeCount = getActiveElementCount(root);
  const active = new Set(ranked.slice(0, activeCount));

  return Object.fromEntries(
    ELEMENT_ORDER.map((element, index) => {
      if (!active.has(element)) return [element, 0];

      const rank = ranked.indexOf(element);
      const base = root === SpiritualRoot.Heavenly ? 8 : Math.max(1, 6 - activeCount);
      const taper = Math.max(0, activeCount - rank - 1);
      const noise = Math.floor(seededUnit(seed, index + 30) * 2);
      return [element, Math.min(9, base + taper + noise)];
    })
  ) as Record<Element, number>;
}

export function getDominantElement(affinities: Record<Element, number>): Element {
  return ELEMENT_ORDER.reduce((best, element) =>
    affinities[element] > affinities[best] ? element : best
  , ELEMENT_ORDER[0]);
}

export function createInitialCultivationState(seed: number): CultivationState {
  const latentRoot = deriveRootType(seed);
  const phaseAffinities = createAffinities(seed, latentRoot);

  return {
    rootKnown: false,
    latentRoot,
    phaseAffinities,
    dominantElement: getDominantElement(phaseAffinities),
    knownTechniqueIds: ['small_breathing'],
    activeTechniqueId: 'small_breathing',
  };
}

export function getRecommendedTechniqueId(state: GameState): string {
  return TECHNIQUE_BY_ELEMENT[state.cultivation.dominantElement];
}

export function revealRoot(state: GameState): { state: GameState; log: string } {
  if (state.cultivation.rootKnown) {
    return { state, log: '你已辨过灵根。气机仍按旧路行走。' };
  }

  const nextState: GameState = {
    ...state,
    spiritualRoot: state.cultivation.latentRoot,
    cultivation: {
      ...state.cultivation,
      rootKnown: true,
    },
    choices: {
      ...state.choices,
      flags: {
        ...state.choices.flags,
        root_known: true,
      },
    },
  };

  return {
    state: nextState,
    log: `你照见灵根。${getRootLabel(nextState.spiritualRoot)}，${ELEMENT_LABELS[nextState.cultivation.dominantElement]}相较明。`,
  };
}

export function attuneTechnique(state: GameState): { state: GameState; log: string } {
  if (!state.cultivation.rootKnown) {
    return { state, log: '灵根未辨，功法无从修订。' };
  }

  const techniqueId = getRecommendedTechniqueId(state);
  const technique = TECHNIQUES[techniqueId];

  const nextState: GameState = {
    ...state,
    cultivation: {
      ...state.cultivation,
      activeTechniqueId: techniqueId,
      knownTechniqueIds: Array.from(new Set([...state.cultivation.knownTechniqueIds, techniqueId])),
    },
    choices: {
      ...state.choices,
      flags: {
        ...state.choices.flags,
        attuned_technique: true,
      },
    },
  };

  return {
    state: nextState,
    log: `你按${ELEMENT_LABELS[state.cultivation.dominantElement]}相修订行气，暂以《${technique.name}》运转。`,
  };
}

export function applyCultivationOutputModifiers(
  state: GameState,
  actionId: string,
  output: Partial<Resources>
): Partial<Resources> {
  if (!['tuna', 'rike_tuna', 'short_retreat', 'array_retreat', 'foundation_daily_practice'].includes(actionId)) return output;
  if (!state.cultivation.rootKnown) return output;

  const technique = TECHNIQUES[state.cultivation.activeTechniqueId];
  if (!technique?.phase) return output;

  const affinity = state.cultivation.phaseAffinities[technique.phase] ?? 0;
  if (affinity <= 0) return output;

  let bonus = Math.max(1, Math.floor(affinity / 4));

  if (SEASON_ELEMENT[state.time.season] === technique.phase) {
    bonus += 1;
  }

  if (LOCATION_ELEMENT[state.currentLocationId] === technique.phase) {
    bonus += 1;
  }

  const multiplier = actionId === 'foundation_daily_practice'
    ? 7
    : actionId === 'array_retreat'
      ? 6
      : actionId === 'short_retreat'
        ? 4
        : actionId === 'rike_tuna'
          ? 2
          : 1;

  return {
    ...output,
    qi: (output.qi ?? 0) + bonus * multiplier,
  };
}

export function getRootLabel(root: SpiritualRoot): string {
  switch (root) {
    case SpiritualRoot.FiveElements:
      return '五行杂根';
    case SpiritualRoot.FourElements:
      return '四灵根';
    case SpiritualRoot.ThreeElements:
      return '三灵根';
    case SpiritualRoot.TwoElements:
      return '双灵根';
    case SpiritualRoot.Heavenly:
      return '天灵根';
    case SpiritualRoot.Mutated:
      return '异灵根';
    case SpiritualRoot.Mortal:
    default:
      return '未辨';
  }
}

export function getCultivationSummary(state: GameState): string[] {
  if (!state.cultivation.rootKnown) return [];

  const technique = TECHNIQUES[state.cultivation.activeTechniqueId];
  const affinities = ELEMENT_ORDER
    .map((element) => `${ELEMENT_LABELS[element]}${state.cultivation.phaseAffinities[element]}`)
    .join(' ');

  return [
    `灵根：${getRootLabel(state.spiritualRoot)}`,
    `相性：${affinities}`,
    `功法：${technique?.name ?? '未定'}`,
  ];
}
