import { GameState, Realm } from './types';
import { TICKS_PER_DAY } from './state';

export const CAVE_DWELLING_BATCH_LAST_DAY = 'cave_dwelling_batch_last_day';
export const CAVE_HERB_PLOT_BATCH_LAST_DAY = 'cave_herb_plot_batch_last_day';
export const CAVE_BATCH_MAX_DAYS = 90;

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

function setTag(state: GameState, key: string, value: string): GameState {
  if (state.choices.tags[key] === value) return state;

  return {
    ...state,
    choices: {
      ...state.choices,
      tags: {
        ...state.choices.tags,
        [key]: value,
      },
    },
  };
}

function getBatchDays(state: GameState, lastDayKey: string): { currentDay: number; rawDays: number; effectiveDays: number } | null {
  const currentDay = absoluteDayFromTick(state.time.tick);
  const previousDay = state.choices.qualities[lastDayKey];

  if (previousDay === undefined) {
    return null;
  }

  const rawDays = Math.max(0, currentDay - previousDay);
  return {
    currentDay,
    rawDays,
    effectiveDays: Math.min(rawDays, CAVE_BATCH_MAX_DAYS),
  };
}

function processCaveDwellingBatch(state: GameState): GameState {
  if (state.realm !== Realm.FoundationEstablishment || !state.choices.flags.cave_dwelling) {
    return state;
  }

  const currentDay = absoluteDayFromTick(state.time.tick);
  if (state.choices.qualities[CAVE_DWELLING_BATCH_LAST_DAY] === undefined) {
    return setQuality(state, CAVE_DWELLING_BATCH_LAST_DAY, currentDay);
  }

  const days = getBatchDays(state, CAVE_DWELLING_BATCH_LAST_DAY);
  if (!days || days.rawDays <= 0) return state;

  const stable =
    Boolean(state.choices.flags.maintained_cave_dwelling) ||
    Boolean(state.choices.flags.cave_dwelling_supported_by_sect) ||
    state.choices.tags.dwelling === 'cave_dwelling_stable' ||
    state.choices.tags.dwelling === 'cave_dwelling_supplied';
  const supplyArranged = Boolean(state.choices.flags.cave_supply_arranged);
  const supplyDebt =
    Boolean(state.choices.flags.cave_supply_account_deferred) ||
    Boolean(state.choices.flags.cave_supply_coin_debt_open) ||
    Boolean(state.choices.flags.cave_supply_contribution_short);
  const strained =
    Boolean(state.choices.flags.cave_dwelling_neglected) ||
    Boolean(state.choices.flags.cave_supply_suspended) ||
    state.choices.tags.dwelling === 'cave_dwelling_strained';
  const qiCycleDays = supplyArranged ? (supplyDebt ? 7 : 4) : stable ? 5 : strained ? 12 : 8;
  const qiGain = Math.floor(days.effectiveDays / qiCycleDays);
  const strainPenalty = strained ? Math.floor(days.effectiveDays / 30) : 0;
  const supplyAccountDue = supplyArranged && days.effectiveDays >= 60;
  const supplyStrainDue = supplyArranged && supplyDebt && days.effectiveDays >= 45;
  const upkeepDue = !supplyArranged && days.effectiveDays >= (stable ? 60 : 45);

  if (qiGain <= 0 && strainPenalty <= 0 && !supplyStrainDue && !upkeepDue && days.rawDays <= CAVE_BATCH_MAX_DAYS) {
    return state;
  }

  let next: GameState = {
    ...state,
    resources: {
      ...state.resources,
      qi: state.resources.qi + qiGain,
      dantoxin: state.resources.dantoxin + strainPenalty,
      wounds: state.resources.wounds + strainPenalty,
    },
  };

  next = setQuality(next, CAVE_DWELLING_BATCH_LAST_DAY, days.currentDay);
  next = adjustQuality(next, 'cave_dwelling_batch_days', days.effectiveDays);

  if (qiGain > 0) {
    next = setTag(
      next,
      'dwelling',
      supplyArranged
        ? supplyDebt ? 'cave_dwelling_supply_strained' : 'cave_dwelling_supplied'
        : stable ? 'cave_dwelling_keeping' : strained ? 'cave_dwelling_strained' : 'cave_dwelling_slow'
    );
    next = adjustQuality(next, 'quiet_cultivation', Math.floor(days.effectiveDays / 30));
  }

  if (supplyStrainDue) {
    next = setFlag(next, 'cave_supply_strain_pending');
    next = setFlag(next, 'cave_supply_strain_seen', false);
    next = adjustQuality(next, 'sect_discipline', -1);
  }

  if (supplyAccountDue) {
    next = setFlag(next, 'cave_supply_account_pending');
    next = setFlag(next, 'cave_supply_account_seen', false);
  }

  if (upkeepDue) {
    next = setFlag(next, 'cave_dwelling_upkeep_pending');
    next = setFlag(next, 'cave_dwelling_upkeep_seen', false);
  }

  if (days.rawDays > CAVE_BATCH_MAX_DAYS) {
    next = setFlag(next, 'cave_dwelling_batch_capped');
  }

  return next;
}

function processCaveHerbPlotBatch(state: GameState): GameState {
  if (state.realm !== Realm.FoundationEstablishment || !state.choices.flags.cave_herb_plot) {
    return state;
  }

  const currentDay = absoluteDayFromTick(state.time.tick);
  if (state.choices.qualities[CAVE_HERB_PLOT_BATCH_LAST_DAY] === undefined) {
    return setQuality(state, CAVE_HERB_PLOT_BATCH_LAST_DAY, currentDay);
  }

  const days = getBatchDays(state, CAVE_HERB_PLOT_BATCH_LAST_DAY);
  if (!days || days.rawDays <= 0) return state;

  const seedStock = Boolean(state.choices.flags.cave_herb_seed_stock) || state.choices.tags.cave_support === 'herb_seed_stock';
  const harvested = Boolean(state.choices.flags.harvested_cave_herb_plot);
  const supplyArranged = Boolean(state.choices.flags.cave_supply_arranged);
  const supplyDebt =
    Boolean(state.choices.flags.cave_supply_account_deferred) ||
    Boolean(state.choices.flags.cave_supply_coin_debt_open) ||
    Boolean(state.choices.flags.cave_supply_contribution_short);
  const herbCycleDays = supplyArranged
    ? supplyDebt ? (seedStock ? 7 : harvested ? 9 : 12) : (seedStock ? 4 : harvested ? 6 : 8)
    : seedStock ? 5 : harvested ? 7 : 10;
  const herbGain = Math.floor(days.effectiveDays / herbCycleDays);

  if (herbGain <= 0 && days.rawDays <= CAVE_BATCH_MAX_DAYS) {
    return state;
  }

  let next: GameState = {
    ...state,
    resources: {
      ...state.resources,
      herbs: state.resources.herbs + herbGain,
    },
  };

  next = setQuality(next, CAVE_HERB_PLOT_BATCH_LAST_DAY, days.currentDay);
  next = adjustQuality(next, 'cave_herb_plot_batch_days', days.effectiveDays);

  if (herbGain > 0) {
    next = setTag(next, 'cave_support', 'herb_plot_regular');
    next = adjustQuality(next, 'alchemy_affinity', Math.floor(days.effectiveDays / 45));
  }

  if (days.effectiveDays >= 20) {
    next = setFlag(next, 'cave_herb_plot_ripening_pending');
    next = setFlag(next, 'cave_herb_plot_ripens_seen', false);
  }

  if (days.rawDays > CAVE_BATCH_MAX_DAYS) {
    next = setFlag(next, 'cave_herb_plot_batch_capped');
  }

  return next;
}

export function processDwellingBatch(state: GameState): GameState {
  return processCaveHerbPlotBatch(processCaveDwellingBatch(state));
}
