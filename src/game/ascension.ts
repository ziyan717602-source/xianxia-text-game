/**
 * 飞升/重置系统 — 修行的终点与新的开始
 */

import { AscensionState, GameState, Realm } from './types';
import { createInitialState } from './state';
import { MORTAL_LIFESPAN_YEARS, DAYS_PER_YEAR, TICKS_PER_DAY } from './state';

export interface AscensionRecord {
  daoPath: string | null;
  karmicWeight: number;
  lifespanSpent: number;
  relationshipsForged: number;
  realmsReached: string;
  choicesMade: number;
}

export function createInitialAscensionState(): AscensionState {
  return {
    ascended: false,
    ascensionCount: 0,
    ascensionBonuses: {},
    ascensionChoice: null,
    finalScore: null,
    finalSummary: {},
  };
}

/** Check if player can attempt ascension */
export function canAscend(state: GameState): boolean {
  const realmOrder = [Realm.Mortal, Realm.QiCondensation, Realm.FoundationEstablishment, Realm.GoldenCore, Realm.NascentSoul, Realm.SpiritTransformation, Realm.Integration, Realm.Mahayana, Realm.Tribulation];
  const currentIdx = realmOrder.indexOf(state.realm);
  return currentIdx >= realmOrder.indexOf(Realm.NascentSoul) && state.resources.qi >= 200;
}

/** Calculate final score */
export function calculateFinalScore(state: GameState): number {
  const realmOrder = [Realm.Mortal, Realm.QiCondensation, Realm.FoundationEstablishment, Realm.GoldenCore, Realm.NascentSoul, Realm.SpiritTransformation, Realm.Integration, Realm.Mahayana, Realm.Tribulation];
  const realmScore = (realmOrder.indexOf(state.realm) + 1) * 20;

  // Dao path bonus
  const daoPathScore = state.daoPath.currentPath ? 15 : 0;

  // Karma: lower is better (less burden)
  const karmaScore = Math.max(0, 20 - state.karma.karmicWeight);

  // Relationships: more positive = more score
  let relationshipScore = 0;
  for (const rel of Object.values(state.relationships)) {
    relationshipScore += rel.favors * 2 - rel.grudges;
  }
  relationshipScore = Math.max(0, relationshipScore);

  // Penalties
  const dantoxinPenalty = Math.floor(state.resources.dantoxin / 2);
  const woundPenalty = state.resources.wounds * 3;

  return realmScore + daoPathScore + karmaScore + relationshipScore - dantoxinPenalty - woundPenalty;
}

/** Generate a summary of the playthrough */
export function generateFinalSummary(state: GameState): Record<string, number | string> {
  const realmOrder = [Realm.Mortal, Realm.QiCondensation, Realm.FoundationEstablishment, Realm.GoldenCore, Realm.NascentSoul, Realm.SpiritTransformation, Realm.Integration, Realm.Mahayana, Realm.Tribulation];
  const currentIdx = realmOrder.indexOf(state.realm);
  const realmsReached = realmOrder.slice(0, currentIdx + 1).join(', ');

  let totalQualities = 0;
  for (const v of Object.values(state.choices.qualities)) {
    totalQualities += v;
  }

  const lifespanSpent = MORTAL_LIFESPAN_YEARS * DAYS_PER_YEAR * TICKS_PER_DAY - state.resources.lifespan;

  return {
    realm: state.realm,
    realmLayer: state.realmLayer,
    daoPath: state.daoPath.currentPath ?? 'none',
    karmicWeight: state.karma.karmicWeight,
    lifespanSpent,
    relationshipsForged: Object.keys(state.relationships).length,
    realmsReached,
    choicesMade: totalQualities,
    finalQi: state.resources.qi,
    finalInsight: state.resources.insight,
    ascensionCount: state.ascension.ascensionCount,
  };
}

/** Present the ascension choice as a special event trigger */
export function triggerAscensionChoice(state: GameState): GameState {
  if (!canAscend(state)) return state;

  return {
    ...state,
    ascension: {
      ...state.ascension,
      ascensionChoice: 'pending',
    },
    activeEventId: 'ascension_choice_event',
  };
}

/** Execute the chosen ascension path */
export function executeAscension(
  state: GameState,
  choice: 'ascend' | 'remain' | 'transcend' | 'dissipate'
): { state: GameState; log: string; gameOver: boolean } {
  const score = calculateFinalScore(state);
  const summary = generateFinalSummary(state);

  switch (choice) {
    case 'ascend': {
      const newState: GameState = {
        ...state,
        ascension: {
          ...state.ascension,
          ascended: true,
          ascensionChoice: 'ascend',
          finalScore: score,
          finalSummary: summary,
        },
      };
      return {
        state: newState,
        log: '天门大开，灵光照彻。你舍去凡躯，踏入更高层次。修行之路，此为一程。终分：' + score,
        gameOver: true,
      };
    }

    case 'remain': {
      const newState: GameState = {
        ...state,
        ascension: {
          ...state.ascension,
          ascended: true,
          ascensionChoice: 'remain',
          finalScore: score,
          finalSummary: summary,
        },
        choices: {
          ...state.choices,
          flags: {
            ...state.choices.flags,
            chose_to_remain: true,
            ascension_blocked: true,
          },
        },
      };
      return {
        state: newState,
        log: '你选择留下。天门在身后合拢，灵光散去。你已是此界最强之人，但前路已尽。终分：' + score,
        gameOver: false,
      };
    }

    case 'transcend': {
      // New Game+ : reset with bonuses
      const newCount = state.ascension.ascensionCount + 1;
      const newBonuses: Record<string, number> = {
        ...state.ascension.ascensionBonuses,
        qi_gain_pct: (state.ascension.ascensionBonuses['qi_gain_pct'] ?? 0) + 10,
        starting_insight: (state.ascension.ascensionBonuses['starting_insight'] ?? 0) + 5,
      };

      // Preserve some qualities
      const preservedQualities: Record<string, number> = {};
      for (const [key, value] of Object.entries(state.choices.qualities)) {
        // Keep a fraction of qualities
        preservedQualities[key] = Math.floor(value * 0.3);
      }

      // Create fresh state and apply bonuses
      const freshState = createInitialState(state.seed);
      const transcendedState: GameState = {
        ...freshState,
        resources: {
          ...freshState.resources,
          insight: (newBonuses['starting_insight'] ?? 0),
        },
        choices: {
          ...freshState.choices,
          qualities: preservedQualities,
          flags: {
            ...freshState.choices.flags,
            transcended_previous_life: true,
          },
        },
        ascension: {
          ascended: false,
          ascensionCount: newCount,
          ascensionBonuses: newBonuses,
          ascensionChoice: null,
          finalScore: null,
          finalSummary: {},
        },
      };

      return {
        state: transcendedState,
        log: `你选择超脱。旧身散去，新途始开。第${newCount}次轮回。真气获取+10%，初始见闻+${newBonuses['starting_insight']}。终分：${score}`,
        gameOver: false,
      };
    }

    case 'dissipate': {
      const newState: GameState = {
        ...state,
        ascension: {
          ...state.ascension,
          ascended: true,
          ascensionChoice: 'dissipate',
          finalScore: score,
          finalSummary: summary,
        },
      };
      return {
        state: newState,
        log: '你安然而坐，气息渐无。道途化作传说，留在山中。终分：' + score,
        gameOver: true,
      };
    }
  }
}

/** Apply permanent bonuses from previous ascensions to a fresh state */
export function applyAscensionBonuses(state: GameState): GameState {
  if (state.ascension.ascensionCount === 0) return state;

  let newState = { ...state };

  // Apply starting insight bonus
  const startingInsight = state.ascension.ascensionBonuses['starting_insight'] ?? 0;
  if (startingInsight > 0) {
    newState.resources = {
      ...newState.resources,
      insight: newState.resources.insight + startingInsight,
    };
  }

  return newState;
}

/** Check if ascension threshold event should fire */
export function shouldShowAscensionThreshold(state: GameState): boolean {
  const realmOrder = [Realm.Mortal, Realm.QiCondensation, Realm.FoundationEstablishment, Realm.GoldenCore, Realm.NascentSoul, Realm.SpiritTransformation, Realm.Integration, Realm.Mahayana, Realm.Tribulation];
  const currentIdx = realmOrder.indexOf(state.realm);
  return currentIdx >= realmOrder.indexOf(Realm.NascentSoul)
    && state.resources.qi >= 150
    && !state.choices.flags['ascension_threshold_seen']
    && !state.ascension.ascended;
}
