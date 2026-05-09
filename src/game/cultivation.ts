import { ELEMENT_LABELS, TECHNIQUE_BY_ELEMENT, TECHNIQUES } from '../content/cultivation';
import { ACTION_ROUTE_QUALITIES } from './actions';
import { Element, GameState, Season, SpiritualRoot, CultivationState, Resources } from './types';

export const ELEMENT_ORDER = [Element.Wood, Element.Fire, Element.Earth, Element.Metal, Element.Water] as const;

const SEASON_ELEMENT: Record<Season, Element> = {
  [Season.Spring]: Element.Wood,
  [Season.Summer]: Element.Fire,
  [Season.Autumn]: Element.Metal,
  [Season.Winter]: Element.Water,
  // Earth has no dedicated season — traditionally associated with late-summer/season transitions.
  // Earth-phase cultivators benefit from location bonuses (e.g. home → Earth) rather than seasonal ones,
  // which is thematically appropriate: Earth = stable, grounded, not bound by seasonal cycles.
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

/** Low-tier practice actions that receive full technique bonus */
const LOW_TIER_PRACTICE_ACTIONS = ['tuna', 'rike_tuna', 'short_retreat'];

/** Higher-realm daily practice actions that receive technique bonus at 80% effectiveness */
const HIGHER_REALM_PRACTICE_ACTIONS = [
  'golden_core_practice',
  'nascent_soul_practice',
  'spirit_transformation_practice',
  'integration_practice',
  'mahayana_practice',
  'tribulation_practice',
  'foundation_daily_practice',
  'foundation_meditation',
];

/** All practice actions that can receive technique bonus */
const ALL_PRACTICE_ACTIONS = [...LOW_TIER_PRACTICE_ACTIONS, ...HIGHER_REALM_PRACTICE_ACTIONS];

/** Mapping from dao path ID to its primary quality (the quality with highest weight in DAO_PATHS) */
const DAO_PATH_PRIMARY_QUALITY: Record<string, string> = {
  alchemist: 'alchemy_affinity',
  sword_way: 'combat_edge',
  hermit: 'quiet_cultivation',
  merchant: 'market_ties',
  sect_servant: 'sect_trace',
  formation_way: 'quiet_cultivation',
  talisman_way: 'alchemy_affinity',
  artifact_way: 'market_ties',
  beast_way: 'combat_edge',
  demonic_way: 'combat_edge',
  buddhist_way: 'quiet_cultivation',
  ghost_way: 'quiet_cultivation',
};

export function applyCultivationOutputModifiers(
  state: GameState,
  actionId: string,
  output: Partial<Resources>
): Partial<Resources> {
  let modifiedOutput = { ...output };

  // === Technique bonus ===
  if (ALL_PRACTICE_ACTIONS.includes(actionId) && state.cultivation.rootKnown) {
    const technique = TECHNIQUES[state.cultivation.activeTechniqueId];
    if (technique?.phase) {
      const affinity = state.cultivation.phaseAffinities[technique.phase] ?? 0;
      if (affinity > 0) {
        let bonus = Math.max(1, Math.floor(affinity / 4));

        if (SEASON_ELEMENT[state.time.season] === technique.phase) {
          bonus += 1;
        }

        if (LOCATION_ELEMENT[state.currentLocationId] === technique.phase) {
          bonus += 1;
        }

        // Higher-realm practices get 80% effectiveness
        const effectiveness = HIGHER_REALM_PRACTICE_ACTIONS.includes(actionId) ? 0.8 : 1.0;
        const multiplier = actionId === 'short_retreat' ? 4 : actionId === 'rike_tuna' ? 2 : 1;

        modifiedOutput = {
          ...modifiedOutput,
          qi: (modifiedOutput.qi ?? 0) + Math.max(1, Math.round(bonus * multiplier * effectiveness)),
        };
      }
    }
  }

  // === Dao path bonus: boost output by 10% when path matches action's route quality ===
  const currentPath = state.daoPath.currentPath;
  if (currentPath) {
    const pathQuality = DAO_PATH_PRIMARY_QUALITY[currentPath];
    const actionQuality = ACTION_ROUTE_QUALITIES[actionId];
    if (pathQuality && actionQuality && pathQuality === actionQuality) {
      const boosted: Partial<Resources> = {};
      for (const key of ['qi', 'herbs', 'coins', 'insight', 'essence'] as (keyof Resources)[]) {
        const val = modifiedOutput[key] ?? 0;
        if (val > 0) {
          boosted[key] = val + Math.max(1, Math.floor(val * 0.1));
        }
      }
      modifiedOutput = { ...modifiedOutput, ...boosted };
    }
  }

  return modifiedOutput;
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
