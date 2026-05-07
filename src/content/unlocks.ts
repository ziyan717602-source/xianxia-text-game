import { GameState, Realm } from '../game/types';

export interface UnlockRule {
  id: string;
  condition: (state: GameState) => boolean;
  effect: (state: GameState) => GameState;
}

export const UNLOCKS: UnlockRule[] = [
  {
    id: 'unlock_tuna',
    condition: (state) => state.resources.qi >= 1,
    effect: (state) => {
      const actionsToAdd = ['tuna', 'tiaoxi'].filter((actionId) => !state.unlockedActions.includes(actionId));
      if (actionsToAdd.length > 0) {
        return {
          ...state,
          unlockedActions: [...state.unlockedActions, ...actionsToAdd],
          choices: {
            ...state.choices,
            flags: { ...state.choices.flags, 'unlocked_tuna': true }
          }
        };
      }
      return state;
    }
  },
  {
    id: 'unlock_bianyao',
    condition: (state) => state.resources.herbs >= 5,
    effect: (state) => {
      if (!state.unlockedActions.includes('bianyao')) {
        return {
          ...state,
          unlockedActions: [...state.unlockedActions, 'bianyao'],
          choices: {
            ...state.choices,
            flags: { ...state.choices.flags, 'unlocked_bianyao': true }
          }
        };
      }
      return state;
    }
  },
  {
    id: 'unlock_canjuan',
    condition: (state) => state.resources.insight >= 3,
    effect: (state) => {
      if (!state.choices.flags['unlocked_canjuan']) {
        return {
          ...state,
          choices: {
            ...state.choices,
            flags: { ...state.choices.flags, 'unlocked_canjuan': true }
          }
        };
      }
      return state;
    }
  },
  {
    id: 'unlock_mountain_actions',
    condition: (state) =>
      Boolean(state.choices.flags['found_jade_slip']) ||
      Boolean(state.choices.flags['unlocked_canjuan']),
    effect: (state) => {
      const actionsToAdd = ['caiyao', 'xunshan'].filter((actionId) => !state.unlockedActions.includes(actionId));
      if (actionsToAdd.length > 0) {
        return {
          ...state,
          unlockedActions: [...state.unlockedActions, ...actionsToAdd],
          choices: {
            ...state.choices,
            flags: { ...state.choices.flags, 'unlocked_mountain_actions': true }
          }
        };
      }
      return state;
    }
  },
  {
    id: 'unlock_rike_tuna',
    condition: (state) => (state.choices.qualities['action_tuna_count'] || 0) >= 10,
    effect: (state) => {
      if (!state.choices.flags['unlocked_rike_tuna']) {
        return {
          ...state,
          unlockedActions: state.unlockedActions.includes('rike_tuna')
            ? state.unlockedActions
            : [...state.unlockedActions, 'rike_tuna'],
          choices: {
            ...state.choices,
            flags: { ...state.choices.flags, 'unlocked_rike_tuna': true }
          }
        };
      }
      return state;
    }
  },
  {
    id: 'unlock_yinqi',
    condition: (state) =>
      state.realm === Realm.Mortal &&
      state.resources.qi >= 15 &&
      state.resources.insight >= 3 &&
      Boolean(state.choices.flags['completed_rike_tuna']),
    effect: (state) => {
      if (!state.unlockedActions.includes('yinqi')) {
        return {
          ...state,
          unlockedActions: [...state.unlockedActions, 'yinqi'],
          choices: {
            ...state.choices,
            flags: { ...state.choices.flags, 'unlocked_yinqi': true }
          }
        };
      }
      return state;
    }
  },
  {
    id: 'unlock_inspect_root',
    condition: (state) =>
      state.realm === Realm.QiCondensation &&
      !state.choices.flags['root_known'],
    effect: (state) => {
      if (!state.unlockedActions.includes('inspect_root')) {
        return {
          ...state,
          unlockedActions: [...state.unlockedActions, 'inspect_root'],
          choices: {
            ...state.choices,
            flags: { ...state.choices.flags, 'unlocked_inspect_root': true }
          }
        };
      }
      return state;
    }
  },
  {
    id: 'unlock_attune_technique',
    condition: (state) =>
      state.realm === Realm.QiCondensation &&
      Boolean(state.choices.flags['root_known']),
    effect: (state) => {
      if (!state.unlockedActions.includes('attune_technique')) {
        return {
          ...state,
          unlockedActions: [...state.unlockedActions, 'attune_technique'],
          choices: {
            ...state.choices,
            flags: { ...state.choices.flags, 'unlocked_attune_technique': true }
          }
        };
      }
      return state;
    }
  },
  {
    id: 'unlock_study_qi_formula',
    condition: (state) =>
      state.realm === Realm.QiCondensation &&
      (state.choices.qualities['action_bianyao_count'] || 0) >= 2 &&
      !state.choices.flags['known_recipe_small_qi_pill'],
    effect: (state) => {
      if (!state.unlockedActions.includes('study_qi_formula')) {
        return {
          ...state,
          unlockedActions: [...state.unlockedActions, 'study_qi_formula'],
          choices: {
            ...state.choices,
            flags: { ...state.choices.flags, 'unlocked_study_qi_formula': true }
          }
        };
      }
      return state;
    }
  },
  {
    id: 'unlock_brew_qi_pill',
    condition: (state) =>
      state.realm === Realm.QiCondensation &&
      Boolean(state.choices.flags['known_recipe_small_qi_pill']),
    effect: (state) => {
      if (!state.unlockedActions.includes('brew_qi_pill')) {
        return {
          ...state,
          unlockedActions: [...state.unlockedActions, 'brew_qi_pill'],
          choices: {
            ...state.choices,
            flags: { ...state.choices.flags, 'unlocked_brew_qi_pill': true }
          }
        };
      }
      return state;
    }
  },
  {
    id: 'unlock_take_qi_pill',
    condition: (state) =>
      state.realm === Realm.QiCondensation &&
      state.resources.qiPills > 0,
    effect: (state) => {
      if (!state.unlockedActions.includes('take_qi_pill')) {
        return {
          ...state,
          unlockedActions: [...state.unlockedActions, 'take_qi_pill'],
          choices: {
            ...state.choices,
            flags: { ...state.choices.flags, 'unlocked_take_qi_pill': true, has_qi_pill: true }
          }
        };
      }
      return state;
    }
  }
];
