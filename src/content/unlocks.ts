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
    // 假设用 flags 来记录某个动作被执行了多少次，或者简单起见目前如果没有累计次数，我们先判断 qi > 20
    // 为了真实反映 "累计吐纳 10 次"，需要在 performAction 里记录。这里我们先简化，或者去改 performAction。
    // 我们去改 actions.ts 加上 quality 记录。这里先根据 resources 或者 quality 检查。
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
      state.resources.qi >= 10 &&
      state.resources.insight >= 3,
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
  }
];
