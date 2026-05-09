import { UnlockRule, Realm } from './_types';

export const CORE_UNLOCKS: UnlockRule[] = [
{
    id: 'unlock_tuna',
    condition: (state) => state.resources.qi >= 1 || state.resources.insight >= 2,
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
    id: 'unlock_rike_tuna',
    condition: (state) => (state.choices.qualities['action_tuna_count'] || 0) >= 5,
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
      Boolean(state.choices.flags['unlocked_rike_tuna']),
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
    id: 'unlock_short_retreat',
    condition: (state) =>
      state.realm === Realm.QiCondensation &&
      (state.choices.qualities['action_rike_tuna_count'] || 0) >= 3 &&
      state.resources.qi >= 20,
    effect: (state) => {
      if (!state.unlockedActions.includes('short_retreat')) {
        return {
          ...state,
          unlockedActions: [...state.unlockedActions, 'short_retreat'],
          choices: {
            ...state.choices,
            flags: { ...state.choices.flags, unlocked_short_retreat: true }
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
    id: 'unlock_foundation_daily_practice',
    condition: (state) =>
      state.realm === Realm.FoundationEstablishment &&
      Boolean(state.choices.flags['foundation_morning_seen']),
    effect: (state) => {
      if (!state.unlockedActions.includes('foundation_daily_practice')) {
        return {
          ...state,
          unlockedActions: [...state.unlockedActions, 'foundation_daily_practice'],
          choices: {
            ...state.choices,
            flags: { ...state.choices.flags, unlocked_foundation_daily_practice: true }
          }
        };
      }
      return state;
    }
  },
{
    id: 'unlock_foundation_meditation',
    condition: (state) =>
      state.realm === Realm.FoundationEstablishment,
    effect: (state) => {
      if (!state.unlockedActions.includes('foundation_meditation')) {
        return {
          ...state,
          unlockedActions: [...state.unlockedActions, 'foundation_meditation'],
          choices: {
            ...state.choices,
            flags: { ...state.choices.flags, unlocked_foundation_meditation: true }
          }
        };
      }
      return state;
    }
  }
];
