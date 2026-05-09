import { UnlockRule, Realm } from './_types';
import { getNextBreakthroughRule } from './_types';

export const BREAKTHROUGH_UNLOCKS: UnlockRule[] = [
{
    id: 'unlock_stabilize_bottleneck',
    condition: (state) => {
      const rule = getNextBreakthroughRule(state);
      if (!rule) return false;
      const minQi = rule.id === 'foundation' ? 70 : 20;
      const minInsight = rule.id === 'foundation' ? 8 : 3;
      return state.resources.qi >= minQi && state.resources.insight >= minInsight;
    },
    effect: (state) => {
      if (!state.unlockedActions.includes('stabilize_bottleneck')) {
        return {
          ...state,
          unlockedActions: [...state.unlockedActions, 'stabilize_bottleneck'],
          choices: {
            ...state.choices,
            flags: { ...state.choices.flags, unlocked_stabilize_bottleneck: true }
          }
        };
      }
      return state;
    }
  },
{
    id: 'unlock_foundation_support',
    condition: (state) =>
      state.realm === Realm.QiCondensation &&
      state.realmLayer === 9 &&
      Boolean(state.choices.flags.bottleneck_foundation),
    effect: (state) => {
      const supportActions = [
        ...(state.choices.flags.completed_sect_errand || state.choices.flags.outer_gate_registered
          ? ['seek_foundation_guardian']
          : []),
        ...(state.choices.flags.known_recipe_small_qi_pill || (state.choices.qualities.market_ties || 0) >= 2
          ? ['borrow_foundation_pill']
          : []),
      ].filter((actionId) => !state.unlockedActions.includes(actionId));

      if (supportActions.length > 0) {
        return {
          ...state,
          unlockedActions: [...state.unlockedActions, ...supportActions],
          choices: {
            ...state.choices,
            flags: { ...state.choices.flags, unlocked_foundation_support: true }
          }
        };
      }
      return state;
    }
  },
{
    id: 'unlock_breakthrough_qi_2',
    condition: (state) =>
      state.realm === Realm.QiCondensation &&
      state.realmLayer === 1 &&
      Boolean(state.choices.flags.prepared_qi_layer_2) &&
      !state.choices.flags.reached_qi_layer_2,
    effect: (state) => {
      if (!state.unlockedActions.includes('breakthrough_qi_2')) {
        return {
          ...state,
          unlockedActions: [...state.unlockedActions, 'breakthrough_qi_2'],
          choices: {
            ...state.choices,
            flags: { ...state.choices.flags, unlocked_breakthrough_qi_2: true }
          }
        };
      }
      return state;
    }
  },
{
    id: 'unlock_breakthrough_qi_3',
    condition: (state) =>
      state.realm === Realm.QiCondensation &&
      state.realmLayer === 2 &&
      Boolean(state.choices.flags.prepared_qi_layer_3) &&
      !state.choices.flags.reached_qi_layer_3,
    effect: (state) => {
      if (!state.unlockedActions.includes('breakthrough_qi_3')) {
        return {
          ...state,
          unlockedActions: [...state.unlockedActions, 'breakthrough_qi_3'],
          choices: {
            ...state.choices,
            flags: { ...state.choices.flags, unlocked_breakthrough_qi_3: true }
          }
        };
      }
      return state;
    }
  },
{
    id: 'unlock_breakthrough_qi_4',
    condition: (state) =>
      state.realm === Realm.QiCondensation &&
      state.realmLayer === 3 &&
      Boolean(state.choices.flags.prepared_qi_layer_4) &&
      !state.choices.flags.reached_qi_layer_4,
    effect: (state) => {
      if (!state.unlockedActions.includes('breakthrough_qi_4')) {
        return {
          ...state,
          unlockedActions: [...state.unlockedActions, 'breakthrough_qi_4'],
          choices: {
            ...state.choices,
            flags: { ...state.choices.flags, unlocked_breakthrough_qi_4: true }
          }
        };
      }
      return state;
    }
  },
{
    id: 'unlock_breakthrough_qi_5',
    condition: (state) =>
      state.realm === Realm.QiCondensation &&
      state.realmLayer === 4 &&
      Boolean(state.choices.flags.prepared_qi_layer_5) &&
      !state.choices.flags.reached_qi_layer_5,
    effect: (state) => {
      if (!state.unlockedActions.includes('breakthrough_qi_5')) {
        return {
          ...state,
          unlockedActions: [...state.unlockedActions, 'breakthrough_qi_5'],
          choices: {
            ...state.choices,
            flags: { ...state.choices.flags, unlocked_breakthrough_qi_5: true }
          }
        };
      }
      return state;
    }
  },
{
    id: 'unlock_breakthrough_qi_6',
    condition: (state) =>
      state.realm === Realm.QiCondensation &&
      state.realmLayer === 5 &&
      Boolean(state.choices.flags.prepared_qi_layer_6) &&
      !state.choices.flags.reached_qi_layer_6,
    effect: (state) => {
      if (!state.unlockedActions.includes('breakthrough_qi_6')) {
        return {
          ...state,
          unlockedActions: [...state.unlockedActions, 'breakthrough_qi_6'],
          choices: {
            ...state.choices,
            flags: { ...state.choices.flags, unlocked_breakthrough_qi_6: true }
          }
        };
      }
      return state;
    }
  },
{
    id: 'unlock_breakthrough_qi_7',
    condition: (state) =>
      state.realm === Realm.QiCondensation &&
      state.realmLayer === 6 &&
      Boolean(state.choices.flags.prepared_qi_layer_7) &&
      !state.choices.flags.reached_qi_layer_7,
    effect: (state) => {
      if (!state.unlockedActions.includes('breakthrough_qi_7')) {
        return {
          ...state,
          unlockedActions: [...state.unlockedActions, 'breakthrough_qi_7'],
          choices: {
            ...state.choices,
            flags: { ...state.choices.flags, unlocked_breakthrough_qi_7: true }
          }
        };
      }
      return state;
    }
  },
{
    id: 'unlock_breakthrough_qi_8',
    condition: (state) =>
      state.realm === Realm.QiCondensation &&
      state.realmLayer === 7 &&
      Boolean(state.choices.flags.prepared_qi_layer_8) &&
      !state.choices.flags.reached_qi_layer_8,
    effect: (state) => {
      if (!state.unlockedActions.includes('breakthrough_qi_8')) {
        return {
          ...state,
          unlockedActions: [...state.unlockedActions, 'breakthrough_qi_8'],
          choices: {
            ...state.choices,
            flags: { ...state.choices.flags, unlocked_breakthrough_qi_8: true }
          }
        };
      }
      return state;
    }
  },
{
    id: 'unlock_breakthrough_qi_9',
    condition: (state) =>
      state.realm === Realm.QiCondensation &&
      state.realmLayer === 8 &&
      Boolean(state.choices.flags.prepared_qi_layer_9) &&
      !state.choices.flags.reached_qi_layer_9,
    effect: (state) => {
      if (!state.unlockedActions.includes('breakthrough_qi_9')) {
        return {
          ...state,
          unlockedActions: [...state.unlockedActions, 'breakthrough_qi_9'],
          choices: {
            ...state.choices,
            flags: { ...state.choices.flags, unlocked_breakthrough_qi_9: true }
          }
        };
      }
      return state;
    }
  },
{
    id: 'unlock_breakthrough_foundation',
    condition: (state) =>
      state.realm === Realm.QiCondensation &&
      state.realmLayer === 9 &&
      Boolean(state.choices.flags.prepared_foundation) &&
      !state.choices.flags.reached_foundation,
    effect: (state) => {
      if (!state.unlockedActions.includes('breakthrough_foundation')) {
        return {
          ...state,
          unlockedActions: [...state.unlockedActions, 'breakthrough_foundation'],
          choices: {
            ...state.choices,
            flags: { ...state.choices.flags, unlocked_breakthrough_foundation: true }
          }
        };
      }
      return state;
    }
  },
{
    id: 'unlock_withdraw_foundation',
    condition: (state) =>
      state.realm === Realm.QiCondensation &&
      state.realmLayer === 9 &&
      Boolean(state.choices.flags.prepared_foundation) &&
      !state.choices.flags.reached_foundation,
    effect: (state) => {
      if (!state.unlockedActions.includes('withdraw_foundation')) {
        return {
          ...state,
          unlockedActions: [...state.unlockedActions, 'withdraw_foundation'],
          choices: {
            ...state.choices,
            flags: { ...state.choices.flags, unlocked_withdraw_foundation: true }
          }
        };
      }
      return state;
    }
  },
{
    id: 'unlock_breakthrough_golden_core',
    condition: (state) =>
      state.realm === Realm.FoundationEstablishment &&
      state.realmLayer >= 1 &&
      state.choices.flags['prepared_golden_core'] &&
      !state.choices.flags['reached_golden_core'],
    effect: (state) => {
      if (!state.unlockedActions.includes('breakthrough_golden_core')) {
        return {
          ...state,
          unlockedActions: [...state.unlockedActions, 'breakthrough_golden_core'],
          choices: {
            ...state.choices,
            flags: { ...state.choices.flags, unlocked_breakthrough_golden_core: true }
          }
        };
      }
      return state;
    }
  },
{
    id: 'unlock_breakthrough_nascent_soul',
    condition: (state) =>
      state.realm === Realm.GoldenCore &&
      state.realmLayer >= 1 &&
      state.choices.flags['prepared_nascent_soul'] &&
      !state.choices.flags['reached_nascent_soul'],
    effect: (state) => {
      if (!state.unlockedActions.includes('breakthrough_nascent_soul')) {
        return {
          ...state,
          unlockedActions: [...state.unlockedActions, 'breakthrough_nascent_soul'],
          choices: {
            ...state.choices,
            flags: { ...state.choices.flags, unlocked_breakthrough_nascent_soul: true }
          }
        };
      }
      return state;
    }
  },
{
    id: 'unlock_attempt_ascension',
    condition: (state) =>
      state.realm === Realm.NascentSoul && state.resources.qi >= 200,
    effect: (state) => {
      if (!state.unlockedActions.includes('attempt_ascension')) {
        return {
          ...state,
          unlockedActions: [...state.unlockedActions, 'attempt_ascension'],
          choices: {
            ...state.choices,
            flags: { ...state.choices.flags, unlocked_attempt_ascension: true }
          }
        };
      }
      return state;
    }
  }
];
