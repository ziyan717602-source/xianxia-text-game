import { BREAKTHROUGH_BY_ACTION, BREAKTHROUGH_RULES, BreakthroughRule } from '../content/breakthroughs';
import { ELEMENT_LABELS } from '../content/cultivation';
import { getKarmicBreakthroughPenalty } from './karma';
import { BreakthroughState, GameState, Realm } from './types';

export type BreakthroughOutcome = 'success' | 'partial' | 'failure';

export function createInitialBreakthroughState(): BreakthroughState {
  return {
    preparation: {},
    attempts: {},
    failures: {},
    successes: {},
    lastTargetId: null,
  };
}

export function getNextBreakthroughRule(state: GameState): BreakthroughRule | null {
  return Object.values(BREAKTHROUGH_RULES).find((rule) =>
    state.realm === rule.fromRealm &&
    state.realmLayer === rule.fromLayer &&
    !state.choices.flags[rule.successFlag]
  ) ?? null;
}

function getRulePreparation(state: GameState, rule: BreakthroughRule): number {
  return state.breakthrough.preparation[rule.id] ?? 0;
}

export function hasPreparedBreakthrough(state: GameState, rule: BreakthroughRule): boolean {
  return getRulePreparation(state, rule) > 0 || Boolean(state.choices.flags[`prepared_${rule.id}`]);
}

export function stabilizeBreakthrough(state: GameState): { state: GameState; log: string } {
  const rule = getNextBreakthroughRule(state);
  if (!rule) {
    return { state, log: '关口未显，周天照旧运行。' };
  }

  const currentPreparation = getRulePreparation(state, rule);
  const nextPreparation = Math.min(rule.preparationCap, currentPreparation + 1);

  const nextState: GameState = {
    ...state,
    breakthrough: {
      ...state.breakthrough,
      preparation: {
        ...state.breakthrough.preparation,
        [rule.id]: nextPreparation,
      },
      lastTargetId: rule.id,
    },
    choices: {
      ...state.choices,
      flags: {
        ...state.choices.flags,
        [`bottleneck_${rule.id}`]: true,
        [`prepared_${rule.id}`]: true,
      },
      qualities: {
        ...state.choices.qualities,
        quiet_cultivation: (state.choices.qualities.quiet_cultivation ?? 0) + 1,
      },
    },
  };

  return {
    state: nextState,
    log: `你收束周天，先稳${rule.name}关口。气未越界，路已窄了一分。`,
  };
}

export function getBreakthroughSuccessChance(state: GameState, rule: BreakthroughRule): number {
  const preparation = Math.min(rule.preparationCap, getRulePreparation(state, rule));
  const quietCultivation = state.choices.qualities.quiet_cultivation ?? 0;
  const alchemyAffinity = state.choices.qualities.alchemy_affinity ?? 0;
  const rootBonus = state.cultivation.rootKnown
    ? Math.min(0.08, (state.cultivation.phaseAffinities[state.cultivation.dominantElement] ?? 0) * 0.01)
    : 0;
  const preparationBonus = preparation * 0.08;
  const quietBonus = Math.min(0.1, quietCultivation * 0.01);
  const alchemyBonus = state.resources.qiPills > 0 ? Math.min(0.04, alchemyAffinity * 0.008) : 0;
  const guardBonus = state.choices.flags.guarded_breakthrough ? 0.08 : 0;
  const foundationGuardianBonus = rule.id === 'foundation' && state.choices.flags.foundation_guardian ? 0.1 : 0;
  const borrowedAidBonus = rule.id === 'foundation' && state.choices.flags.borrowed_foundation_aid ? 0.12 : 0;
  const sectTraceBonus = rule.id === 'foundation'
    ? Math.min(0.06, (state.choices.qualities.sect_trace ?? 0) * 0.008)
    : 0;
  const formationBonus = state.dwelling.formationBonus ?? 0;
  const woundPenalty = Math.min(0.18, state.resources.wounds * 0.06);
  const dantoxinPenalty = state.resources.dantoxin >= 60
    ? 0.22
    : state.resources.dantoxin >= 30
      ? 0.14
      : state.resources.dantoxin >= 10
        ? 0.05
        : 0;

  const karmicPenalty = getKarmicBreakthroughPenalty(state);

  return Math.max(
    0.2,
    Math.min(
      0.92,
      rule.baseSuccess +
      preparationBonus +
      quietBonus +
      rootBonus +
      alchemyBonus +
      guardBonus +
      foundationGuardianBonus +
      borrowedAidBonus +
      sectTraceBonus +
      formationBonus -
      woundPenalty -
      dantoxinPenalty -
      karmicPenalty
    )
  );
}

function resolveRuleForAction(state: GameState, actionId: string): BreakthroughRule | null {
  const rule = BREAKTHROUGH_BY_ACTION[actionId];
  if (!rule) return null;
  if (state.realm !== rule.fromRealm || state.realmLayer !== rule.fromLayer) return null;
  if (state.choices.flags[rule.successFlag]) return null;
  return rule;
}

export function resolveBreakthrough(
  state: GameState,
  actionId: string,
  random?: () => number, // seeded rng should be provided by callers for determinism
): { state: GameState; log: string; outcome: BreakthroughOutcome } {
  const rule = resolveRuleForAction(state, actionId);
  if (!rule) {
    return { state, log: '此关口已不在眼前。', outcome: 'failure' };
  }

  const chance = getBreakthroughSuccessChance(state, rule);
  const roll = random ? random() : 0.5;
  const isFoundation = rule.id === 'foundation';
  const attempts = (state.breakthrough.attempts[rule.id] ?? 0) + 1;
  const baseBreakthrough = {
    ...state.breakthrough,
    attempts: {
      ...state.breakthrough.attempts,
      [rule.id]: attempts,
    },
    lastTargetId: rule.id,
  };

  if (roll <= chance) {
    const successes = (state.breakthrough.successes[rule.id] ?? 0) + 1;
    const nextState: GameState = {
      ...state,
      realm: rule.toRealm,
      realmLayer: rule.toLayer,
      breakthrough: {
        ...baseBreakthrough,
        successes: {
          ...state.breakthrough.successes,
          [rule.id]: successes,
        },
      },
      choices: {
        ...state.choices,
        flags: {
          ...state.choices.flags,
          [rule.successFlag]: true,
          [`broke_${rule.id}`]: true,
          guarded_breakthrough: false,
          ...(isFoundation
            ? {
                foundation_guardian: false,
                borrowed_foundation_aid: false,
                foundation_morning_seen: true,
              }
            : {}),
        },
        qualities: {
          ...state.choices.qualities,
          quiet_cultivation: (state.choices.qualities.quiet_cultivation ?? 0) + 1,
        },
      },
    };

    return {
      state: nextState,
      log: isFoundation
        ? '晨前，气沉入骨。筑基已成，旧日周天不再照旧。'
        : `夜半，气行至关。你守住一线，入${rule.name}。`,
      outcome: 'success',
    };
  }

  if (roll <= chance + rule.partialWindow) {
    const currentPreparation = getRulePreparation(state, rule);
    const nextState: GameState = {
      ...state,
      breakthrough: {
        ...baseBreakthrough,
        preparation: {
          ...state.breakthrough.preparation,
          [rule.id]: Math.min(rule.preparationCap, currentPreparation + 1),
        },
      },
      choices: {
        ...state.choices,
        flags: {
          ...state.choices.flags,
          [`half_broke_${rule.id}`]: true,
          [`prepared_${rule.id}`]: true,
          guarded_breakthrough: false,
          ...(isFoundation
            ? {
                foundation_guardian: false,
                borrowed_foundation_aid: false,
              }
            : {}),
        },
      },
    };

    return {
      state: nextState,
      log: isFoundation
        ? '气入骨又退。筑基未成，根基倒比先前清楚。'
        : `气行至关，又退回丹田。${rule.name}未成，关口倒清楚了些。`,
      outcome: 'partial',
    };
  }

  const failures = (state.breakthrough.failures[rule.id] ?? 0) + 1;
  const rawWoundGain = isFoundation
    ? state.resources.dantoxin >= 30 ? 3 : 2
    : state.resources.dantoxin >= 30 ? 2 : 1;
  const woundGain = state.choices.flags.guarded_breakthrough ? Math.max(0, rawWoundGain - 1) : rawWoundGain;
  const lifespanLoss = isFoundation ? 180 : 20;
  const nextState: GameState = {
    ...state,
    resources: {
      ...state.resources,
      wounds: state.resources.wounds + woundGain,
      lifespan: Math.max(0, state.resources.lifespan - lifespanLoss),
    },
    breakthrough: {
      ...baseBreakthrough,
      failures: {
        ...state.breakthrough.failures,
        [rule.id]: failures,
      },
    },
    choices: {
      ...state.choices,
      flags: {
        ...state.choices.flags,
        [`failed_${rule.id}`]: true,
        guarded_breakthrough: false,
        ...(isFoundation
          ? {
              foundation_scar: true,
              foundation_guardian: false,
              borrowed_foundation_aid: false,
            }
          : {}),
      },
      qualities: {
        ...state.choices.qualities,
        reckless_breakthrough: (state.choices.qualities.reckless_breakthrough ?? 0) + 1,
      },
    },
  };

  const woundText = woundGain > 0 ? `伤添${woundGain}处` : '未添新伤';

  return {
    state: nextState,
    log: isFoundation
      ? `筑基未成。气散入骨，${woundText}。外门照旧点卯。`
      : state.choices.flags.guarded_breakthrough
      ? `气散了三成。稳息散压住乱气。${rule.name}未成，${woundText}。`
      : `气散了三成。${rule.name}未成，${woundText}。隔日，坊市照开。`,
    outcome: 'failure',
  };
}

export function getBreakthroughSummary(state: GameState): string[] {
  const rule = getNextBreakthroughRule(state);
  const lastRule = state.breakthrough.lastTargetId
    ? BREAKTHROUGH_RULES[state.breakthrough.lastTargetId]
    : null;
  const shownRule = rule ?? lastRule;

  if (!shownRule) return [];

  if (state.realm !== Realm.QiCondensation && state.realm !== Realm.FoundationEstablishment && state.realm !== Realm.GoldenCore && state.realm !== Realm.NascentSoul && state.realm !== Realm.SpiritTransformation && state.realm !== Realm.Integration && state.realm !== Realm.Mahayana) return [];

  const preparation = getRulePreparation(state, shownRule);
  const attempts = state.breakthrough.attempts[shownRule.id] ?? 0;
  const failures = state.breakthrough.failures[shownRule.id] ?? 0;
  const chance = rule ? Math.round(getBreakthroughSuccessChance(state, rule) * 100) : null;
  const lines = [
    `关口：${shownRule.name}`,
    `稳固：${preparation}/${shownRule.preparationCap}`,
  ];

  if (chance !== null && hasPreparedBreakthrough(state, shownRule)) {
    lines.push(`成算：约${chance}%`);
  }

  if (state.cultivation.rootKnown && rule) {
    lines.push(`主相：${ELEMENT_LABELS[state.cultivation.dominantElement]}`);
  }

  if (state.choices.flags.guarded_breakthrough) {
    lines.push('护持：稳息散');
  }

  if (state.choices.flags.foundation_guardian) {
    lines.push('护法：外门');
  }

  if (state.choices.flags.borrowed_foundation_aid) {
    lines.push('借丹：在身');
  }

  if (attempts > 0 || failures > 0) {
    lines.push(`冲关：${attempts}次，失败${failures}次`);
  }

  return lines;
}
