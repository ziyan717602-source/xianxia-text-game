import { GameState, Realm } from '../game/types';
import { getNextBreakthroughRule } from '../game/breakthrough';

export interface UnlockRule {
  id: string;
  condition: (state: GameState) => boolean;
  effect: (state: GameState) => GameState;
}

export const UNLOCKS: UnlockRule[] = [
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
    id: 'unlock_study_steady_formula',
    condition: (state) =>
      state.realm === Realm.QiCondensation &&
      Boolean(state.choices.flags['known_recipe_small_qi_pill']) &&
      (
        state.resources.dantoxin >= 10 ||
        state.resources.wounds > 0 ||
        Boolean(state.choices.flags['bottleneck_qi_layer_2']) ||
        Boolean(state.choices.flags['failed_qi_layer_2']) ||
        Boolean(state.choices.flags['half_broke_qi_layer_2'])
      ) &&
      !state.choices.flags['known_recipe_stabilizing_powder'],
    effect: (state) => {
      if (!state.unlockedActions.includes('study_steady_formula')) {
        return {
          ...state,
          unlockedActions: [...state.unlockedActions, 'study_steady_formula'],
          choices: {
            ...state.choices,
            flags: { ...state.choices.flags, unlocked_study_steady_formula: true }
          }
        };
      }
      return state;
    }
  },
  {
    id: 'unlock_brew_stabilizing_powder',
    condition: (state) =>
      state.realm === Realm.QiCondensation &&
      Boolean(state.choices.flags['known_recipe_stabilizing_powder']),
    effect: (state) => {
      if (!state.unlockedActions.includes('brew_stabilizing_powder')) {
        return {
          ...state,
          unlockedActions: [...state.unlockedActions, 'brew_stabilizing_powder'],
          choices: {
            ...state.choices,
            flags: { ...state.choices.flags, unlocked_brew_stabilizing_powder: true }
          }
        };
      }
      return state;
    }
  },
  {
    id: 'unlock_study_cleansing_formula',
    condition: (state) =>
      state.realm === Realm.QiCondensation &&
      Boolean(state.choices.flags['known_recipe_small_qi_pill']) &&
      (
        state.resources.dantoxin >= 30 ||
        Boolean(state.choices.flags['dantoxin_in_meridians_seen']) ||
        Boolean(state.choices.flags['sought_cleansing_formula'])
      ) &&
      !state.choices.flags['known_recipe_cleansing_pill'],
    effect: (state) => {
      if (!state.unlockedActions.includes('study_cleansing_formula')) {
        return {
          ...state,
          unlockedActions: [...state.unlockedActions, 'study_cleansing_formula'],
          choices: {
            ...state.choices,
            flags: { ...state.choices.flags, unlocked_study_cleansing_formula: true }
          }
        };
      }
      return state;
    }
  },
  {
    id: 'unlock_brew_cleansing_pill',
    condition: (state) =>
      state.realm === Realm.QiCondensation &&
      Boolean(state.choices.flags['known_recipe_cleansing_pill']),
    effect: (state) => {
      if (!state.unlockedActions.includes('brew_cleansing_pill')) {
        return {
          ...state,
          unlockedActions: [...state.unlockedActions, 'brew_cleansing_pill'],
          choices: {
            ...state.choices,
            flags: { ...state.choices.flags, unlocked_brew_cleansing_pill: true }
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
  },
  {
    id: 'unlock_take_stabilizing_powder',
    condition: (state) =>
      state.realm === Realm.QiCondensation &&
      state.resources.stabilizingPowders > 0,
    effect: (state) => {
      if (!state.unlockedActions.includes('take_stabilizing_powder')) {
        return {
          ...state,
          unlockedActions: [...state.unlockedActions, 'take_stabilizing_powder'],
          choices: {
            ...state.choices,
            flags: {
              ...state.choices.flags,
              unlocked_take_stabilizing_powder: true,
              has_stabilizing_powder: true
            }
          }
        };
      }
      return state;
    }
  },
  {
    id: 'unlock_take_cleansing_pill',
    condition: (state) =>
      state.realm === Realm.QiCondensation &&
      state.resources.cleansingPills > 0,
    effect: (state) => {
      if (!state.unlockedActions.includes('take_cleansing_pill')) {
        return {
          ...state,
          unlockedActions: [...state.unlockedActions, 'take_cleansing_pill'],
          choices: {
            ...state.choices,
            flags: {
              ...state.choices.flags,
              unlocked_take_cleansing_pill: true,
              has_cleansing_pill: true
            }
          }
        };
      }
      return state;
    }
  },
  {
    id: 'unlock_sect_errand',
    condition: (state) =>
      state.realm === Realm.QiCondensation &&
      Boolean(state.choices.flags['heard_outer_gate_rules']) &&
      (
        Boolean(state.choices.flags['accepted_outer_gate_errand']) ||
        Boolean(state.choices.flags['outer_gate_registered']) ||
        (state.choices.qualities['sect_trace'] || 0) >= 2
      ),
    effect: (state) => {
      if (!state.unlockedActions.includes('sect_errand')) {
        return {
          ...state,
          unlockedActions: [...state.unlockedActions, 'sect_errand'],
          choices: {
            ...state.choices,
            flags: { ...state.choices.flags, unlocked_sect_errand: true }
          }
        };
      }
      return state;
    }
  },
  {
    id: 'unlock_sect_supply',
    condition: (state) =>
      state.realm === Realm.QiCondensation &&
      (Boolean(state.choices.flags['completed_sect_errand']) || Boolean(state.choices.flags['completed_sect_patrol'])) &&
      (state.choices.qualities['sect_trace'] || 0) >= 4,
    effect: (state) => {
      if (!state.unlockedActions.includes('sect_supply')) {
        return {
          ...state,
          unlockedActions: [...state.unlockedActions, 'sect_supply'],
          choices: {
            ...state.choices,
            flags: { ...state.choices.flags, unlocked_sect_supply: true }
          }
        };
      }
      return state;
    }
  },
  {
    id: 'unlock_sect_roll_call',
    condition: (state) =>
      state.realm === Realm.QiCondensation &&
      Boolean(state.choices.flags['outer_gate_registered']),
    effect: (state) => {
      if (!state.unlockedActions.includes('sect_roll_call')) {
        return {
          ...state,
          unlockedActions: [...state.unlockedActions, 'sect_roll_call'],
          choices: {
            ...state.choices,
            flags: { ...state.choices.flags, unlocked_sect_roll_call: true }
          }
        };
      }
      return state;
    }
  },
  {
    id: 'unlock_sect_patrol',
    condition: (state) =>
      state.realm === Realm.QiCondensation &&
      Boolean(state.choices.flags['attended_outer_gate_roll_call']) &&
      (state.choices.qualities['sect_trace'] || 0) >= 3,
    effect: (state) => {
      if (!state.unlockedActions.includes('sect_patrol')) {
        return {
          ...state,
          unlockedActions: [...state.unlockedActions, 'sect_patrol'],
          choices: {
            ...state.choices,
            flags: { ...state.choices.flags, unlocked_sect_patrol: true }
          }
        };
      }
      return state;
    }
  },
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
  },
  {
    id: 'unlock_inner_gate_rumor',
    condition: (state) =>
      state.realm === Realm.FoundationEstablishment,
    effect: (state) => {
      if (!state.unlockedActions.includes('inner_gate_rumor')) {
        return {
          ...state,
          unlockedActions: [...state.unlockedActions, 'inner_gate_rumor'],
          choices: {
            ...state.choices,
            flags: { ...state.choices.flags, unlocked_inner_gate_rumor: true }
          }
        };
      }
      return state;
    }
  },
  {
    id: 'unlock_study_meridian_cleansing_formula',
    condition: (state) =>
      state.realm === Realm.FoundationEstablishment &&
      state.resources.dantoxin >= 30,
    effect: (state) => {
      if (!state.unlockedActions.includes('study_meridian_cleansing_formula')) {
        return {
          ...state,
          unlockedActions: [...state.unlockedActions, 'study_meridian_cleansing_formula'],
          choices: {
            ...state.choices,
            flags: { ...state.choices.flags, unlocked_study_meridian_cleansing_formula: true }
          }
        };
      }
      return state;
    }
  },
  {
    id: 'unlock_study_foundation_strengthening_formula',
    condition: (state) =>
      state.realm === Realm.FoundationEstablishment,
    effect: (state) => {
      if (!state.unlockedActions.includes('study_foundation_strengthening_formula')) {
        return {
          ...state,
          unlockedActions: [...state.unlockedActions, 'study_foundation_strengthening_formula'],
          choices: {
            ...state.choices,
            flags: { ...state.choices.flags, unlocked_study_foundation_strengthening_formula: true }
          }
        };
      }
      return state;
    }
  },
  {
    id: 'unlock_study_spirit_gathering_formula',
    condition: (state) =>
      state.realm === Realm.FoundationEstablishment &&
      Boolean(state.choices.flags['completed_foundation_daily_practice']),
    effect: (state) => {
      if (!state.unlockedActions.includes('study_spirit_gathering_formula')) {
        return {
          ...state,
          unlockedActions: [...state.unlockedActions, 'study_spirit_gathering_formula'],
          choices: {
            ...state.choices,
            flags: { ...state.choices.flags, unlocked_study_spirit_gathering_formula: true }
          }
        };
      }
      return state;
    }
  },
  {
    id: 'unlock_brew_meridian_cleansing_pill',
    condition: (state) =>
      state.realm === Realm.FoundationEstablishment &&
      Boolean(state.choices.flags['known_recipe_meridian_cleansing_pill']),
    effect: (state) => {
      if (!state.unlockedActions.includes('brew_meridian_cleansing_pill')) {
        return {
          ...state,
          unlockedActions: [...state.unlockedActions, 'brew_meridian_cleansing_pill'],
          choices: {
            ...state.choices,
            flags: { ...state.choices.flags, unlocked_brew_meridian_cleansing_pill: true }
          }
        };
      }
      return state;
    }
  },
  {
    id: 'unlock_brew_foundation_strengthening_pill',
    condition: (state) =>
      state.realm === Realm.FoundationEstablishment &&
      Boolean(state.choices.flags['known_recipe_foundation_strengthening_pill']),
    effect: (state) => {
      if (!state.unlockedActions.includes('brew_foundation_strengthening_pill')) {
        return {
          ...state,
          unlockedActions: [...state.unlockedActions, 'brew_foundation_strengthening_pill'],
          choices: {
            ...state.choices,
            flags: { ...state.choices.flags, unlocked_brew_foundation_strengthening_pill: true }
          }
        };
      }
      return state;
    }
  },
  {
    id: 'unlock_brew_spirit_gathering_pill',
    condition: (state) =>
      state.realm === Realm.FoundationEstablishment &&
      Boolean(state.choices.flags['known_recipe_spirit_gathering_pill']),
    effect: (state) => {
      if (!state.unlockedActions.includes('brew_spirit_gathering_pill')) {
        return {
          ...state,
          unlockedActions: [...state.unlockedActions, 'brew_spirit_gathering_pill'],
          choices: {
            ...state.choices,
            flags: { ...state.choices.flags, unlocked_brew_spirit_gathering_pill: true }
          }
        };
      }
      return state;
    }
  },
  {
    id: 'unlock_take_meridian_cleansing_pill',
    condition: (state) =>
      state.realm === Realm.FoundationEstablishment &&
      state.resources.meridianCleansingPills > 0,
    effect: (state) => {
      if (!state.unlockedActions.includes('take_meridian_cleansing_pill')) {
        return {
          ...state,
          unlockedActions: [...state.unlockedActions, 'take_meridian_cleansing_pill'],
          choices: {
            ...state.choices,
            flags: {
              ...state.choices.flags,
              unlocked_take_meridian_cleansing_pill: true,
              has_meridian_cleansing_pill: true
            }
          }
        };
      }
      return state;
    }
  },
  {
    id: 'unlock_take_foundation_strengthening_pill',
    condition: (state) =>
      state.realm === Realm.FoundationEstablishment &&
      state.resources.foundationStrengtheningPills > 0,
    effect: (state) => {
      if (!state.unlockedActions.includes('take_foundation_strengthening_pill')) {
        return {
          ...state,
          unlockedActions: [...state.unlockedActions, 'take_foundation_strengthening_pill'],
          choices: {
            ...state.choices,
            flags: {
              ...state.choices.flags,
              unlocked_take_foundation_strengthening_pill: true,
              has_foundation_strengthening_pill: true
            }
          }
        };
      }
      return state;
    }
  },
  {
    id: 'unlock_take_spirit_gathering_pill',
    condition: (state) =>
      state.realm === Realm.FoundationEstablishment &&
      state.resources.spiritGatheringPills > 0,
    effect: (state) => {
      if (!state.unlockedActions.includes('take_spirit_gathering_pill')) {
        return {
          ...state,
          unlockedActions: [...state.unlockedActions, 'take_spirit_gathering_pill'],
          choices: {
            ...state.choices,
            flags: {
              ...state.choices.flags,
              unlocked_take_spirit_gathering_pill: true,
              has_spirit_gathering_pill: true
            }
          }
        };
      }
      return state;
    }
  },
  // F4: Sect deepening unlocks
  {
    id: 'unlock_establish_dwelling',
    condition: (state) =>
      state.realm === Realm.FoundationEstablishment &&
      !state.choices.flags['dwelling_level_1'],
    effect: (state) => {
      if (!state.unlockedActions.includes('establish_dwelling')) {
        return {
          ...state,
          unlockedActions: [...state.unlockedActions, 'establish_dwelling'],
          choices: {
            ...state.choices,
            flags: { ...state.choices.flags, unlocked_establish_dwelling: true }
          }
        };
      }
      return state;
    }
  },
  {
    id: 'unlock_upgrade_dwelling',
    condition: (state) =>
      Boolean(state.choices.flags['dwelling_level_1']),
    effect: (state) => {
      if (!state.unlockedActions.includes('upgrade_dwelling')) {
        return {
          ...state,
          unlockedActions: [...state.unlockedActions, 'upgrade_dwelling'],
          choices: {
            ...state.choices,
            flags: { ...state.choices.flags, unlocked_upgrade_dwelling: true }
          }
        };
      }
      return state;
    }
  },
  {
    id: 'unlock_install_formation',
    condition: (state) =>
      Boolean(state.choices.flags['dwelling_level_2']),
    effect: (state) => {
      if (!state.unlockedActions.includes('install_formation')) {
        return {
          ...state,
          unlockedActions: [...state.unlockedActions, 'install_formation'],
          choices: {
            ...state.choices,
            flags: { ...state.choices.flags, unlocked_install_formation: true }
          }
        };
      }
      return state;
    }
  },
  {
    id: 'unlock_cave_dwelling_location',
    condition: (state) =>
      state.dwelling.level >= 1,
    effect: (state) => {
      if (!state.choices.flags['unlocked_cave_dwelling']) {
        return {
          ...state,
          choices: {
            ...state.choices,
            flags: { ...state.choices.flags, unlocked_cave_dwelling: true }
          }
        };
      }
      return state;
    }
  },
  {
    id: 'unlock_inner_gate_location',
    condition: (state) =>
      state.sect.rank === 'inner' || state.sect.rank === 'core' || state.sect.rank === 'elder',
    effect: (state) => {
      if (!state.choices.flags['unlocked_inner_gate']) {
        return {
          ...state,
          choices: {
            ...state.choices,
            flags: { ...state.choices.flags, unlocked_inner_gate: true }
          }
        };
      }
      return state;
    }
  },
  {
    id: 'unlock_sect_actions',
    condition: (state) =>
      state.sect.rank === 'inner',
    effect: (state) => {
      const actionsToAdd = ['inner_gate_task', 'attend_sect_ceremony'].filter((actionId) => !state.unlockedActions.includes(actionId));
      if (actionsToAdd.length > 0) {
        return {
          ...state,
          unlockedActions: [...state.unlockedActions, ...actionsToAdd],
          choices: {
            ...state.choices,
            flags: { ...state.choices.flags, unlocked_sect_actions: true }
          }
        };
      }
      return state;
    }
  },
  // F6: Market deeper actions
  {
    id: 'unlock_market_stall',
    condition: (state) =>
      state.realm === Realm.FoundationEstablishment,
    effect: (state) => {
      const actionsToAdd = ['open_market_stall', 'buy_rare_herbs'].filter((actionId) => !state.unlockedActions.includes(actionId));
      if (actionsToAdd.length > 0) {
        return {
          ...state,
          unlockedActions: [...state.unlockedActions, ...actionsToAdd],
          choices: {
            ...state.choices,
            flags: { ...state.choices.flags, unlocked_market_stall: true }
          }
        };
      }
      return state;
    }
  },
  // F7: Follower unlocks
  {
    id: 'unlock_recruit_servant',
    condition: (state) =>
      state.dwelling.level >= 1,
    effect: (state) => {
      if (!state.unlockedActions.includes('recruit_servant')) {
        return {
          ...state,
          unlockedActions: [...state.unlockedActions, 'recruit_servant'],
          choices: {
            ...state.choices,
            flags: { ...state.choices.flags, unlocked_recruit_servant: true }
          }
        };
      }
      return state;
    }
  },
  {
    id: 'unlock_recruit_disciple',
    condition: (state) =>
      state.realm === Realm.GoldenCore && state.dwelling.level >= 2,
    effect: (state) => {
      if (!state.unlockedActions.includes('recruit_disciple')) {
        return {
          ...state,
          unlockedActions: [...state.unlockedActions, 'recruit_disciple'],
          choices: {
            ...state.choices,
            flags: { ...state.choices.flags, unlocked_recruit_disciple: true }
          }
        };
      }
      return state;
    }
  },
  {
    id: 'unlock_follower_actions',
    condition: (state) =>
      Object.keys(state.followers.followers).length > 0,
    effect: (state) => {
      const actionsToAdd = ['assign_herb_gathering', 'assign_patrol_duty', 'collect_follower_income'].filter((actionId) => !state.unlockedActions.includes(actionId));
      if (actionsToAdd.length > 0) {
        return {
          ...state,
          unlockedActions: [...state.unlockedActions, ...actionsToAdd],
          choices: {
            ...state.choices,
            flags: { ...state.choices.flags, unlocked_follower_actions: true, has_follower: true }
          }
        };
      }
      return state;
    }
  },
  // F8: Secret Realm unlocks
  {
    id: 'unlock_explore_secret_realm',
    condition: (state) =>
      state.secretRealm.discoveredRealms.length > 0 && state.currentLocationId === 'home',
    effect: (state) => {
      if (!state.unlockedActions.includes('explore_secret_realm')) {
        return {
          ...state,
          unlockedActions: [...state.unlockedActions, 'explore_secret_realm'],
          choices: {
            ...state.choices,
            flags: { ...state.choices.flags, unlocked_explore_secret_realm: true, has_discovered_realm: true }
          }
        };
      }
      return state;
    }
  },
  {
    id: 'unlock_continue_exploration',
    condition: (state) =>
      state.secretRealm.activeExploration !== null,
    effect: (state) => {
      const actionsToAdd = ['continue_exploration', 'abandon_exploration'].filter((actionId) => !state.unlockedActions.includes(actionId));
      if (actionsToAdd.length > 0) {
        return {
          ...state,
          unlockedActions: [...state.unlockedActions, ...actionsToAdd],
          choices: {
            ...state.choices,
            flags: { ...state.choices.flags, exploring_secret_realm: true }
          }
        };
      }
      return state;
    }
  },
  {
    id: 'unlock_claim_exploration_loot',
    condition: (state) =>
      state.secretRealm.activeExploration !== null && state.secretRealm.explorationProgress >= 100,
    effect: (state) => {
      if (!state.unlockedActions.includes('claim_exploration_loot')) {
        return {
          ...state,
          unlockedActions: [...state.unlockedActions, 'claim_exploration_loot'],
          choices: {
            ...state.choices,
            flags: { ...state.choices.flags, exploration_complete: true }
          }
        };
      }
      return state;
    }
  },
  // F9: Ascension and new realm unlocks
  {
    id: 'unlock_golden_core_practice',
    condition: (state) => state.realm === Realm.GoldenCore,
    effect: (state) => {
      if (!state.unlockedActions.includes('golden_core_practice')) {
        return {
          ...state,
          unlockedActions: [...state.unlockedActions, 'golden_core_practice'],
          choices: {
            ...state.choices,
            flags: { ...state.choices.flags, unlocked_golden_core_practice: true }
          }
        };
      }
      return state;
    }
  },
  {
    id: 'unlock_nascent_soul_practice',
    condition: (state) => state.realm === Realm.NascentSoul,
    effect: (state) => {
      if (!state.unlockedActions.includes('nascent_soul_practice')) {
        return {
          ...state,
          unlockedActions: [...state.unlockedActions, 'nascent_soul_practice'],
          choices: {
            ...state.choices,
            flags: { ...state.choices.flags, unlocked_nascent_soul_practice: true }
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
  },
  // New location unlocks
  {
    id: 'unlock_stream_valley',
    condition: (state) =>
      Boolean(state.choices.flags['found_rain_after_sprouts']) || state.resources.insight >= 5,
    effect: (state) => {
      if (!state.choices.flags['unlocked_stream_valley']) {
        return {
          ...state,
          choices: {
            ...state.choices,
            flags: { ...state.choices.flags, unlocked_stream_valley: true }
          }
        };
      }
      return state;
    }
  },
  {
    id: 'unlock_abandoned_temple',
    condition: (state) =>
      Boolean(state.choices.flags['found_jade_slip']) && state.realm === Realm.QiCondensation,
    effect: (state) => {
      if (!state.choices.flags['unlocked_abandoned_temple']) {
        return {
          ...state,
          choices: {
            ...state.choices,
            flags: { ...state.choices.flags, unlocked_abandoned_temple: true }
          }
        };
      }
      return state;
    }
  },
  {
    id: 'unlock_herb_slope',
    condition: (state) =>
      Boolean(state.choices.flags['marked_herb_patch']) || Boolean(state.choices.flags['heard_herb_slope_hint']),
    effect: (state) => {
      if (!state.choices.flags['unlocked_herb_slope']) {
        return {
          ...state,
          choices: {
            ...state.choices,
            flags: { ...state.choices.flags, unlocked_herb_slope: true }
          }
        };
      }
      return state;
    }
  },
  {
    id: 'unlock_ferry_crossing',
    condition: (state) =>
      Boolean(state.choices.flags['heard_outer_gate_rules']) || (state.choices.qualities['market_ties'] ?? 0) >= 3,
    effect: (state) => {
      if (!state.choices.flags['unlocked_ferry_crossing']) {
        return {
          ...state,
          choices: {
            ...state.choices,
            flags: { ...state.choices.flags, unlocked_ferry_crossing: true }
          }
        };
      }
      return state;
    }
  },


  {
    id: 'unlock_read_stone_tablet',
    condition: (state) =>
      Boolean(state.choices.flags['found_jade_slip']) && state.currentLocationId === 'abandoned_temple',
    effect: (state) => {
      if (!state.unlockedActions.includes('read_stone_tablet')) {
        return {
          ...state,
          unlockedActions: [...state.unlockedActions, 'read_stone_tablet'],
          choices: {
            ...state.choices,
            flags: { ...state.choices.flags, unlocked_read_stone_tablet: true }
          }
        };
      }
      return state;
    }
  },


  // New alchemy unlocks: warm furnace pill
  {
    id: 'unlock_study_warm_furnace_formula',
    condition: (state) =>
      state.realm === Realm.QiCondensation &&
      (
        state.resources.dantoxin >= 10 ||
        state.resources.wounds > 0 ||
        Boolean(state.choices.flags['known_recipe_small_qi_pill'])
      ) &&
      !state.choices.flags['known_recipe_warm_furnace_pill'],
    effect: (state) => {
      if (!state.unlockedActions.includes('study_warm_furnace_formula')) {
        return {
          ...state,
          unlockedActions: [...state.unlockedActions, 'study_warm_furnace_formula'],
          choices: {
            ...state.choices,
            flags: { ...state.choices.flags, unlocked_study_warm_furnace_formula: true }
          }
        };
      }
      return state;
    }
  },
  {
    id: 'unlock_brew_warm_furnace_pill',
    condition: (state) =>
      Boolean(state.choices.flags['known_recipe_warm_furnace_pill']),
    effect: (state) => {
      if (!state.unlockedActions.includes('brew_warm_furnace_pill')) {
        return {
          ...state,
          unlockedActions: [...state.unlockedActions, 'brew_warm_furnace_pill'],
          choices: {
            ...state.choices,
            flags: { ...state.choices.flags, unlocked_brew_warm_furnace_pill: true }
          }
        };
      }
      return state;
    }
  },
  {
    id: 'unlock_take_warm_furnace_pill',
    condition: (state) =>
      state.resources.warmFurnacePills > 0,
    effect: (state) => {
      if (!state.unlockedActions.includes('take_warm_furnace_pill')) {
        return {
          ...state,
          unlockedActions: [...state.unlockedActions, 'take_warm_furnace_pill'],
          choices: {
            ...state.choices,
            flags: {
              ...state.choices.flags,
              unlocked_take_warm_furnace_pill: true,
              has_warm_furnace_pill: true
            }
          }
        };
      }
      return state;
    }
  },
  // === New location unlocks ===
  {
    id: 'unlock_spirit_field_location',
    condition: (state) =>
      state.realm === Realm.QiCondensation &&
      Boolean(state.choices.flags['unlocked_herb_slope']),
    effect: (state) => {
      if (!state.choices.flags['unlocked_spirit_field']) {
        return {
          ...state,
          choices: {
            ...state.choices,
            flags: { ...state.choices.flags, unlocked_spirit_field: true }
          }
        };
      }
      return state;
    }
  },
  {
    id: 'unlock_pill_hall_location',
    condition: (state) =>
      state.realm === Realm.FoundationEstablishment &&
      Boolean(state.choices.flags['known_recipe_small_qi_pill']),
    effect: (state) => {
      if (!state.choices.flags['unlocked_pill_hall']) {
        return {
          ...state,
          choices: {
            ...state.choices,
            flags: { ...state.choices.flags, unlocked_pill_hall: true }
          }
        };
      }
      return state;
    }
  },
  {
    id: 'unlock_sword_pavilion_location',
    condition: (state) =>
      state.realm === Realm.FoundationEstablishment &&
      (state.choices.qualities['action_tuna_count'] || 0) >= 15,
    effect: (state) => {
      if (!state.choices.flags['unlocked_sword_pavilion']) {
        return {
          ...state,
          choices: {
            ...state.choices,
            flags: { ...state.choices.flags, unlocked_sword_pavilion: true }
          }
        };
      }
      return state;
    }
  },
  {
    id: 'unlock_sect_hall_location',
    condition: (state) =>
      state.realm === Realm.FoundationEstablishment &&
      (state.sect.rank === 'inner' || state.sect.rank === 'core' || state.sect.rank === 'elder'),
    effect: (state) => {
      if (!state.choices.flags['unlocked_sect_hall']) {
        return {
          ...state,
          choices: {
            ...state.choices,
            flags: { ...state.choices.flags, unlocked_sect_hall: true }
          }
        };
      }
      return state;
    }
  },
  {
    id: 'unlock_deep_temple_location',
    condition: (state) =>
      state.realm === Realm.FoundationEstablishment &&
      Boolean(state.choices.flags['unlocked_abandoned_temple']),
    effect: (state) => {
      if (!state.choices.flags['unlocked_deep_temple']) {
        return {
          ...state,
          choices: {
            ...state.choices,
            flags: { ...state.choices.flags, unlocked_deep_temple: true }
          }
        };
      }
      return state;
    }
  },
  {
    id: 'unlock_mountain_cave_location',
    condition: (state) =>
      state.realm === Realm.FoundationEstablishment &&
      Boolean(state.choices.flags['found_jade_slip']),
    effect: (state) => {
      if (!state.choices.flags['unlocked_mountain_cave']) {
        return {
          ...state,
          choices: {
            ...state.choices,
            flags: { ...state.choices.flags, unlocked_mountain_cave: true }
          }
        };
      }
      return state;
    }
  },
  {
    id: 'unlock_tea_house_location',
    condition: (state) =>
      state.realm === Realm.QiCondensation &&
      (state.resources.coins >= 2 || (state.choices.qualities['market_ties'] ?? 0) >= 1),
    effect: (state) => {
      if (!state.choices.flags['unlocked_tea_house']) {
        return {
          ...state,
          choices: {
            ...state.choices,
            flags: { ...state.choices.flags, unlocked_tea_house: true }
          }
        };
      }
      return state;
    }
  },
  {
    id: 'unlock_demonic_forest_location',
    condition: (state) =>
      state.realm === Realm.FoundationEstablishment &&
      state.resources.insight >= 10,
    effect: (state) => {
      if (!state.choices.flags['unlocked_demonic_forest']) {
        return {
          ...state,
          choices: {
            ...state.choices,
            flags: { ...state.choices.flags, unlocked_demonic_forest: true }
          }
        };
      }
      return state;
    }
  },
  {
    id: 'unlock_celestial_cliff_location',
    condition: (state) =>
      state.realm === Realm.FoundationEstablishment &&
      state.resources.qi >= 50,
    effect: (state) => {
      if (!state.choices.flags['unlocked_celestial_cliff']) {
        return {
          ...state,
          choices: {
            ...state.choices,
            flags: { ...state.choices.flags, unlocked_celestial_cliff: true }
          }
        };
      }
      return state;
    }
  },


  {
    id: 'unlock_study_advanced_formula',
    condition: (state) =>
      state.realm === Realm.FoundationEstablishment &&
      state.currentLocationId === 'pill_hall' &&
      Boolean(state.choices.flags['known_recipe_foundation_strengthening_pill']),
    effect: (state) => {
      if (!state.unlockedActions.includes('study_advanced_formula')) {
        return {
          ...state,
          unlockedActions: [...state.unlockedActions, 'study_advanced_formula'],
          choices: {
            ...state.choices,
            flags: { ...state.choices.flags, unlocked_study_advanced_formula: true }
          }
        };
      }
      return state;
    }
  },


  {
    id: 'unlock_receive_mission',
    condition: (state) =>
      state.currentLocationId === 'sect_hall' &&
      (state.sect.rank === 'outer' || state.sect.rank === 'inner' || state.sect.rank === 'core'),
    effect: (state) => {
      if (!state.unlockedActions.includes('receive_mission')) {
        return {
          ...state,
          unlockedActions: [...state.unlockedActions, 'receive_mission'],
          choices: {
            ...state.choices,
            flags: { ...state.choices.flags, unlocked_receive_mission: true, sect_rank_outer: true }
          }
        };
      }
      return state;
    }
  },


  {
    id: 'unlock_explore_depths',
    condition: (state) =>
      state.realm === Realm.FoundationEstablishment &&
      state.currentLocationId === 'mountain_cave' &&
      (state.choices.qualities['action_mine_crystal_count'] || 0) >= 2,
    effect: (state) => {
      if (!state.unlockedActions.includes('explore_depths')) {
        return {
          ...state,
          unlockedActions: [...state.unlockedActions, 'explore_depths'],
          choices: {
            ...state.choices,
            flags: { ...state.choices.flags, unlocked_explore_depths: true }
          }
        };
      }
      return state;
    }
  },


  {
    id: 'unlock_hunt_beast',
    condition: (state) =>
      state.realm === Realm.FoundationEstablishment &&
      state.currentLocationId === 'demonic_forest' &&
      state.resources.qi >= 10,
    effect: (state) => {
      if (!state.unlockedActions.includes('hunt_beast')) {
        return {
          ...state,
          unlockedActions: [...state.unlockedActions, 'hunt_beast'],
          choices: {
            ...state.choices,
            flags: { ...state.choices.flags, unlocked_hunt_beast: true }
          }
        };
      }
      return state;
    }
  },

  // === New alchemy unlocks: cloud gathering pill ===
  {
    id: 'unlock_study_cloud_gathering_formula',
    condition: (state) =>
      state.realm === Realm.FoundationEstablishment &&
      Boolean(state.choices.flags['known_recipe_foundation_strengthening_pill']) &&
      !state.choices.flags['known_recipe_cloud_gathering_pill'],
    effect: (state) => {
      if (!state.unlockedActions.includes('study_cloud_gathering_formula')) {
        return {
          ...state,
          unlockedActions: [...state.unlockedActions, 'study_cloud_gathering_formula'],
          choices: {
            ...state.choices,
            flags: { ...state.choices.flags, unlocked_study_cloud_gathering_formula: true }
          }
        };
      }
      return state;
    }
  },
  {
    id: 'unlock_brew_cloud_gathering_pill',
    condition: (state) =>
      Boolean(state.choices.flags['known_recipe_cloud_gathering_pill']),
    effect: (state) => {
      if (!state.unlockedActions.includes('brew_cloud_gathering_pill')) {
        return {
          ...state,
          unlockedActions: [...state.unlockedActions, 'brew_cloud_gathering_pill'],
          choices: {
            ...state.choices,
            flags: { ...state.choices.flags, unlocked_brew_cloud_gathering_pill: true }
          }
        };
      }
      return state;
    }
  },
  {
    id: 'unlock_take_cloud_gathering_pill',
    condition: (state) =>
      state.resources.cloudGatheringPills > 0,
    effect: (state) => {
      if (!state.unlockedActions.includes('take_cloud_gathering_pill')) {
        return {
          ...state,
          unlockedActions: [...state.unlockedActions, 'take_cloud_gathering_pill'],
          choices: {
            ...state.choices,
            flags: {
              ...state.choices.flags,
              unlocked_take_cloud_gathering_pill: true,
              has_cloud_gathering_pill: true
            }
          }
        };
      }
      return state;
    }
  },
  // New alchemy unlocks: iron body pill
  {
    id: 'unlock_study_iron_body_formula',
    condition: (state) =>
      state.realm === Realm.FoundationEstablishment &&
      Boolean(state.choices.flags['known_recipe_foundation_strengthening_pill']) &&
      !state.choices.flags['known_recipe_iron_body_pill'],
    effect: (state) => {
      if (!state.unlockedActions.includes('study_iron_body_formula')) {
        return {
          ...state,
          unlockedActions: [...state.unlockedActions, 'study_iron_body_formula'],
          choices: {
            ...state.choices,
            flags: { ...state.choices.flags, unlocked_study_iron_body_formula: true }
          }
        };
      }
      return state;
    }
  },
  {
    id: 'unlock_brew_iron_body_pill',
    condition: (state) =>
      Boolean(state.choices.flags['known_recipe_iron_body_pill']),
    effect: (state) => {
      if (!state.unlockedActions.includes('brew_iron_body_pill')) {
        return {
          ...state,
          unlockedActions: [...state.unlockedActions, 'brew_iron_body_pill'],
          choices: {
            ...state.choices,
            flags: { ...state.choices.flags, unlocked_brew_iron_body_pill: true }
          }
        };
      }
      return state;
    }
  },
  {
    id: 'unlock_take_iron_body_pill',
    condition: (state) =>
      state.resources.ironBodyPills > 0,
    effect: (state) => {
      if (!state.unlockedActions.includes('take_iron_body_pill')) {
        return {
          ...state,
          unlockedActions: [...state.unlockedActions, 'take_iron_body_pill'],
          choices: {
            ...state.choices,
            flags: {
              ...state.choices.flags,
              unlocked_take_iron_body_pill: true,
              has_iron_body_pill: true
            }
          }
        };
      }
      return state;
    }
  },
  // New alchemy unlocks: demon bane pill
  {
    id: 'unlock_study_demon_bane_formula',
    condition: (state) =>
      state.realm === Realm.FoundationEstablishment &&
      Boolean(state.choices.flags['known_recipe_meridian_cleansing_pill']) &&
      !state.choices.flags['known_recipe_demon_bane_pill'],
    effect: (state) => {
      if (!state.unlockedActions.includes('study_demon_bane_formula')) {
        return {
          ...state,
          unlockedActions: [...state.unlockedActions, 'study_demon_bane_formula'],
          choices: {
            ...state.choices,
            flags: { ...state.choices.flags, unlocked_study_demon_bane_formula: true }
          }
        };
      }
      return state;
    }
  },
  {
    id: 'unlock_brew_demon_bane_pill',
    condition: (state) =>
      Boolean(state.choices.flags['known_recipe_demon_bane_pill']),
    effect: (state) => {
      if (!state.unlockedActions.includes('brew_demon_bane_pill')) {
        return {
          ...state,
          unlockedActions: [...state.unlockedActions, 'brew_demon_bane_pill'],
          choices: {
            ...state.choices,
            flags: { ...state.choices.flags, unlocked_brew_demon_bane_pill: true }
          }
        };
      }
      return state;
    }
  },
  {
    id: 'unlock_take_demon_bane_pill',
    condition: (state) =>
      state.resources.demonBanePills > 0,
    effect: (state) => {
      if (!state.unlockedActions.includes('take_demon_bane_pill')) {
        return {
          ...state,
          unlockedActions: [...state.unlockedActions, 'take_demon_bane_pill'],
          choices: {
            ...state.choices,
            flags: {
              ...state.choices.flags,
              unlocked_take_demon_bane_pill: true,
              has_demon_bane_pill: true
            }
          }
        };
      }
      return state;
    }
  },
  // New alchemy unlocks: foundation explosion pill
  {
    id: 'unlock_study_foundation_explosion_formula',
    condition: (state) =>
      state.realm === Realm.FoundationEstablishment &&
      Boolean(state.choices.flags['known_recipe_foundation_strengthening_pill']) &&
      (
        Boolean(state.choices.flags['bottleneck_foundation']) ||
        Boolean(state.choices.flags['bottleneck_golden_core'])
      ) &&
      !state.choices.flags['known_recipe_foundation_explosion_pill'],
    effect: (state) => {
      if (!state.unlockedActions.includes('study_foundation_explosion_formula')) {
        return {
          ...state,
          unlockedActions: [...state.unlockedActions, 'study_foundation_explosion_formula'],
          choices: {
            ...state.choices,
            flags: { ...state.choices.flags, unlocked_study_foundation_explosion_formula: true }
          }
        };
      }
      return state;
    }
  },
  {
    id: 'unlock_brew_foundation_explosion_pill',
    condition: (state) =>
      Boolean(state.choices.flags['known_recipe_foundation_explosion_pill']),
    effect: (state) => {
      if (!state.unlockedActions.includes('brew_foundation_explosion_pill')) {
        return {
          ...state,
          unlockedActions: [...state.unlockedActions, 'brew_foundation_explosion_pill'],
          choices: {
            ...state.choices,
            flags: { ...state.choices.flags, unlocked_brew_foundation_explosion_pill: true }
          }
        };
      }
      return state;
    }
  },
  {
    id: 'unlock_take_foundation_explosion_pill',
    condition: (state) =>
      state.resources.foundationExplosionPills > 0,
    effect: (state) => {
      if (!state.unlockedActions.includes('take_foundation_explosion_pill')) {
        return {
          ...state,
          unlockedActions: [...state.unlockedActions, 'take_foundation_explosion_pill'],
          choices: {
            ...state.choices,
            flags: {
              ...state.choices.flags,
              unlocked_take_foundation_explosion_pill: true,
              has_foundation_explosion_pill: true
            }
          }
        };
      }
      return state;
    }
  },
  // New alchemy unlocks: spirit vein pill
  {
    id: 'unlock_study_spirit_vein_formula',
    condition: (state) =>
      state.realm === Realm.FoundationEstablishment &&
      Boolean(state.choices.flags['known_recipe_meridian_cleansing_pill']) &&
      !state.choices.flags['known_recipe_spirit_vein_pill'],
    effect: (state) => {
      if (!state.unlockedActions.includes('study_spirit_vein_formula')) {
        return {
          ...state,
          unlockedActions: [...state.unlockedActions, 'study_spirit_vein_formula'],
          choices: {
            ...state.choices,
            flags: { ...state.choices.flags, unlocked_study_spirit_vein_formula: true }
          }
        };
      }
      return state;
    }
  },
  {
    id: 'unlock_brew_spirit_vein_pill',
    condition: (state) =>
      Boolean(state.choices.flags['known_recipe_spirit_vein_pill']),
    effect: (state) => {
      if (!state.unlockedActions.includes('brew_spirit_vein_pill')) {
        return {
          ...state,
          unlockedActions: [...state.unlockedActions, 'brew_spirit_vein_pill'],
          choices: {
            ...state.choices,
            flags: { ...state.choices.flags, unlocked_brew_spirit_vein_pill: true }
          }
        };
      }
      return state;
    }
  },
  {
    id: 'unlock_take_spirit_vein_pill',
    condition: (state) =>
      state.resources.spiritVeinPills > 0,
    effect: (state) => {
      if (!state.unlockedActions.includes('take_spirit_vein_pill')) {
        return {
          ...state,
          unlockedActions: [...state.unlockedActions, 'take_spirit_vein_pill'],
          choices: {
            ...state.choices,
            flags: {
              ...state.choices.flags,
              unlocked_take_spirit_vein_pill: true,
              has_spirit_vein_pill: true
            }
          }
        };
      }
      return state;
    }
  },
  // New alchemy unlocks: shadow escape pill
  {
    id: 'unlock_study_shadow_escape_formula',
    condition: (state) =>
      state.realm === Realm.FoundationEstablishment &&
      Boolean(state.choices.flags['known_recipe_spirit_gathering_pill']) &&
      !state.choices.flags['known_recipe_shadow_escape_pill'],
    effect: (state) => {
      if (!state.unlockedActions.includes('study_shadow_escape_formula')) {
        return {
          ...state,
          unlockedActions: [...state.unlockedActions, 'study_shadow_escape_formula'],
          choices: {
            ...state.choices,
            flags: { ...state.choices.flags, unlocked_study_shadow_escape_formula: true }
          }
        };
      }
      return state;
    }
  },
  {
    id: 'unlock_brew_shadow_escape_pill',
    condition: (state) =>
      Boolean(state.choices.flags['known_recipe_shadow_escape_pill']),
    effect: (state) => {
      if (!state.unlockedActions.includes('brew_shadow_escape_pill')) {
        return {
          ...state,
          unlockedActions: [...state.unlockedActions, 'brew_shadow_escape_pill'],
          choices: {
            ...state.choices,
            flags: { ...state.choices.flags, unlocked_brew_shadow_escape_pill: true }
          }
        };
      }
      return state;
    }
  },
  {
    id: 'unlock_take_shadow_escape_pill',
    condition: (state) =>
      state.resources.shadowEscapePills > 0,
    effect: (state) => {
      if (!state.unlockedActions.includes('take_shadow_escape_pill')) {
        return {
          ...state,
          unlockedActions: [...state.unlockedActions, 'take_shadow_escape_pill'],
          choices: {
            ...state.choices,
            flags: {
              ...state.choices.flags,
              unlocked_take_shadow_escape_pill: true,
              has_shadow_escape_pill: true
            }
          }
        };
      }
      return state;
    }
  },
  // New alchemy unlocks: longevity pill
  {
    id: 'unlock_study_longevity_formula',
    condition: (state) =>
      state.realm === Realm.GoldenCore &&
      !state.choices.flags['known_recipe_longevity_pill'],
    effect: (state) => {
      if (!state.unlockedActions.includes('study_longevity_formula')) {
        return {
          ...state,
          unlockedActions: [...state.unlockedActions, 'study_longevity_formula'],
          choices: {
            ...state.choices,
            flags: { ...state.choices.flags, unlocked_study_longevity_formula: true }
          }
        };
      }
      return state;
    }
  },
  {
    id: 'unlock_brew_longevity_pill',
    condition: (state) =>
      Boolean(state.choices.flags['known_recipe_longevity_pill']),
    effect: (state) => {
      if (!state.unlockedActions.includes('brew_longevity_pill')) {
        return {
          ...state,
          unlockedActions: [...state.unlockedActions, 'brew_longevity_pill'],
          choices: {
            ...state.choices,
            flags: { ...state.choices.flags, unlocked_brew_longevity_pill: true }
          }
        };
      }
      return state;
    }
  },
  {
    id: 'unlock_take_longevity_pill',
    condition: (state) =>
      state.resources.longevityPills > 0,
    effect: (state) => {
      if (!state.unlockedActions.includes('take_longevity_pill')) {
        return {
          ...state,
          unlockedActions: [...state.unlockedActions, 'take_longevity_pill'],
          choices: {
            ...state.choices,
            flags: {
              ...state.choices.flags,
              unlocked_take_longevity_pill: true,
              has_longevity_pill: true
            }
          }
        };
      }
      return state;
    }
  },
  // New alchemy unlocks: fire furnace pill
  {
    id: 'unlock_study_fire_furnace_formula',
    condition: (state) =>
      state.realm === Realm.FoundationEstablishment &&
      Boolean(state.choices.flags['known_recipe_warm_furnace_pill']) &&
      !state.choices.flags['known_recipe_fire_furnace_pill'],
    effect: (state) => {
      if (!state.unlockedActions.includes('study_fire_furnace_formula')) {
        return {
          ...state,
          unlockedActions: [...state.unlockedActions, 'study_fire_furnace_formula'],
          choices: {
            ...state.choices,
            flags: { ...state.choices.flags, unlocked_study_fire_furnace_formula: true }
          }
        };
      }
      return state;
    }
  },
  {
    id: 'unlock_brew_fire_furnace_pill',
    condition: (state) =>
      Boolean(state.choices.flags['known_recipe_fire_furnace_pill']),
    effect: (state) => {
      if (!state.unlockedActions.includes('brew_fire_furnace_pill')) {
        return {
          ...state,
          unlockedActions: [...state.unlockedActions, 'brew_fire_furnace_pill'],
          choices: {
            ...state.choices,
            flags: { ...state.choices.flags, unlocked_brew_fire_furnace_pill: true }
          }
        };
      }
      return state;
    }
  },
  {
    id: 'unlock_take_fire_furnace_pill',
    condition: (state) =>
      state.resources.fireFurnacePills > 0,
    effect: (state) => {
      if (!state.unlockedActions.includes('take_fire_furnace_pill')) {
        return {
          ...state,
          unlockedActions: [...state.unlockedActions, 'take_fire_furnace_pill'],
          choices: {
            ...state.choices,
            flags: {
              ...state.choices.flags,
              unlocked_take_fire_furnace_pill: true,
              has_fire_furnace_pill: true
            }
          }
        };
      }
      return state;
    }
  },
  // New alchemy unlocks: nine turn foundation pill
  {
    id: 'unlock_study_nine_turn_foundation_formula',
    condition: (state) =>
      state.realm === Realm.GoldenCore &&
      Boolean(state.choices.flags['known_recipe_foundation_strengthening_pill']) &&
      !state.choices.flags['known_recipe_nine_turn_foundation_pill'],
    effect: (state) => {
      if (!state.unlockedActions.includes('study_nine_turn_foundation_formula')) {
        return {
          ...state,
          unlockedActions: [...state.unlockedActions, 'study_nine_turn_foundation_formula'],
          choices: {
            ...state.choices,
            flags: { ...state.choices.flags, unlocked_study_nine_turn_foundation_formula: true }
          }
        };
      }
      return state;
    }
  },
  {
    id: 'unlock_brew_nine_turn_foundation_pill',
    condition: (state) =>
      Boolean(state.choices.flags['known_recipe_nine_turn_foundation_pill']),
    effect: (state) => {
      if (!state.unlockedActions.includes('brew_nine_turn_foundation_pill')) {
        return {
          ...state,
          unlockedActions: [...state.unlockedActions, 'brew_nine_turn_foundation_pill'],
          choices: {
            ...state.choices,
            flags: { ...state.choices.flags, unlocked_brew_nine_turn_foundation_pill: true }
          }
        };
      }
      return state;
    }
  },
  {
    id: 'unlock_take_nine_turn_foundation_pill',
    condition: (state) =>
      state.resources.nineTurnFoundationPills > 0,
    effect: (state) => {
      if (!state.unlockedActions.includes('take_nine_turn_foundation_pill')) {
        return {
          ...state,
          unlockedActions: [...state.unlockedActions, 'take_nine_turn_foundation_pill'],
          choices: {
            ...state.choices,
            flags: {
              ...state.choices.flags,
              unlocked_take_nine_turn_foundation_pill: true,
              has_nine_turn_foundation_pill: true
            }
          }
        };
      }
      return state;
    }
  },
  // New alchemy unlocks: buddha heart pill
  {
    id: 'unlock_study_buddha_heart_formula',
    condition: (state) =>
      state.realm === Realm.FoundationEstablishment &&
      Boolean(state.choices.flags['known_recipe_cleansing_pill']) &&
      !state.choices.flags['known_recipe_buddha_heart_pill'],
    effect: (state) => {
      if (!state.unlockedActions.includes('study_buddha_heart_formula')) {
        return {
          ...state,
          unlockedActions: [...state.unlockedActions, 'study_buddha_heart_formula'],
          choices: {
            ...state.choices,
            flags: { ...state.choices.flags, unlocked_study_buddha_heart_formula: true }
          }
        };
      }
      return state;
    }
  },
  {
    id: 'unlock_brew_buddha_heart_pill',
    condition: (state) =>
      Boolean(state.choices.flags['known_recipe_buddha_heart_pill']),
    effect: (state) => {
      if (!state.unlockedActions.includes('brew_buddha_heart_pill')) {
        return {
          ...state,
          unlockedActions: [...state.unlockedActions, 'brew_buddha_heart_pill'],
          choices: {
            ...state.choices,
            flags: { ...state.choices.flags, unlocked_brew_buddha_heart_pill: true }
          }
        };
      }
      return state;
    }
  },
  {
    id: 'unlock_take_buddha_heart_pill',
    condition: (state) =>
      state.resources.buddhaHeartPills > 0,
    effect: (state) => {
      if (!state.unlockedActions.includes('take_buddha_heart_pill')) {
        return {
          ...state,
          unlockedActions: [...state.unlockedActions, 'take_buddha_heart_pill'],
          choices: {
            ...state.choices,
            flags: {
              ...state.choices.flags,
              unlocked_take_buddha_heart_pill: true,
              has_buddha_heart_pill: true
            }
          }
        };
      }
      return state;
    }
  },
  // New alchemy unlocks: night sitting pill
  {
    id: 'unlock_study_night_sitting_formula',
    condition: (state) =>
      state.realm === Realm.FoundationEstablishment &&
      (
        (state.choices.qualities['quiet_cultivation'] ?? 0) >= 3 ||
        Boolean(state.choices.flags['completed_foundation_daily_practice'])
      ) &&
      !state.choices.flags['known_recipe_night_sitting_pill'],
    effect: (state) => {
      if (!state.unlockedActions.includes('study_night_sitting_formula')) {
        return {
          ...state,
          unlockedActions: [...state.unlockedActions, 'study_night_sitting_formula'],
          choices: {
            ...state.choices,
            flags: { ...state.choices.flags, unlocked_study_night_sitting_formula: true }
          }
        };
      }
      return state;
    }
  },
  {
    id: 'unlock_brew_night_sitting_pill',
    condition: (state) =>
      Boolean(state.choices.flags['known_recipe_night_sitting_pill']),
    effect: (state) => {
      if (!state.unlockedActions.includes('brew_night_sitting_pill')) {
        return {
          ...state,
          unlockedActions: [...state.unlockedActions, 'brew_night_sitting_pill'],
          choices: {
            ...state.choices,
            flags: { ...state.choices.flags, unlocked_brew_night_sitting_pill: true }
          }
        };
      }
      return state;
    }
  },
  {
    id: 'unlock_take_night_sitting_pill',
    condition: (state) =>
      state.resources.nightSittingPills > 0,
    effect: (state) => {
      if (!state.unlockedActions.includes('take_night_sitting_pill')) {
        return {
          ...state,
          unlockedActions: [...state.unlockedActions, 'take_night_sitting_pill'],
          choices: {
            ...state.choices,
            flags: {
              ...state.choices.flags,
              unlocked_take_night_sitting_pill: true,
              has_night_sitting_pill: true
            }
          }
        };
      }
      return state;
    }
  },
  // Inner demon actions
  {
    id: 'unlock_confront_demon',
    condition: (state) => state.innerDemon.activeDemon !== null,
    effect: (state) => {
      const actionsToAdd = ['confront_demon', 'suppress_demon', 'ignore_demon'].filter((actionId) => !state.unlockedActions.includes(actionId));
      if (actionsToAdd.length > 0) {
        return {
          ...state,
          unlockedActions: [...state.unlockedActions, ...actionsToAdd],
          choices: {
            ...state.choices,
            flags: { ...state.choices.flags, unlocked_demon_actions: true }
          }
        };
      }
      return state;
    }
  },


  // Fix 1: High-realm breakthrough unlocks
  {
    id: 'unlock_breakthrough_spirit_transformation',
    condition: (state) =>
      state.realm === Realm.NascentSoul &&
      state.realmLayer >= 1 &&
      state.choices.flags['prepared_spirit_transformation'],
    effect: (state) => {
      if (!state.unlockedActions.includes('breakthrough_spirit_transformation')) {
        return {
          ...state,
          unlockedActions: [...state.unlockedActions, 'breakthrough_spirit_transformation'],
          choices: { ...state.choices, flags: { ...state.choices.flags, unlocked_breakthrough_spirit_transformation: true } }
        };
      }
      return state;
    }
  },
  {
    id: 'unlock_breakthrough_integration',
    condition: (state) =>
      state.realm === Realm.SpiritTransformation &&
      state.realmLayer >= 1 &&
      state.choices.flags['prepared_integration'],
    effect: (state) => {
      if (!state.unlockedActions.includes('breakthrough_integration')) {
        return {
          ...state,
          unlockedActions: [...state.unlockedActions, 'breakthrough_integration'],
          choices: { ...state.choices, flags: { ...state.choices.flags, unlocked_breakthrough_integration: true } }
        };
      }
      return state;
    }
  },
  {
    id: 'unlock_breakthrough_mahayana',
    condition: (state) =>
      state.realm === Realm.Integration &&
      state.realmLayer >= 1 &&
      state.choices.flags['prepared_mahayana'],
    effect: (state) => {
      if (!state.unlockedActions.includes('breakthrough_mahayana')) {
        return {
          ...state,
          unlockedActions: [...state.unlockedActions, 'breakthrough_mahayana'],
          choices: { ...state.choices, flags: { ...state.choices.flags, unlocked_breakthrough_mahayana: true } }
        };
      }
      return state;
    }
  },
  {
    id: 'unlock_breakthrough_tribulation',
    condition: (state) =>
      state.realm === Realm.Mahayana &&
      state.realmLayer >= 1 &&
      state.choices.flags['prepared_tribulation'],
    effect: (state) => {
      if (!state.unlockedActions.includes('breakthrough_tribulation')) {
        return {
          ...state,
          unlockedActions: [...state.unlockedActions, 'breakthrough_tribulation'],
          choices: { ...state.choices, flags: { ...state.choices.flags, unlocked_breakthrough_tribulation: true } }
        };
      }
      return state;
    }
  },
  // Fix 2: New location unlocks (set flags)
  {
    id: 'unlock_spirit_field',
    condition: (state) => state.realm === Realm.QiCondensation && state.resources.herbs >= 10,
    effect: (state) => {
      if (!state.choices.flags['unlocked_spirit_field']) {
        return { ...state, choices: { ...state.choices, flags: { ...state.choices.flags, unlocked_spirit_field: true } } };
      }
      return state;
    }
  },
  {
    id: 'unlock_alchemy_room',
    condition: (state) => state.realm === Realm.QiCondensation && Boolean(state.choices.flags['known_recipe_small_qi_pill']),
    effect: (state) => {
      if (!state.choices.flags['unlocked_alchemy_room']) {
        return { ...state, choices: { ...state.choices, flags: { ...state.choices.flags, unlocked_alchemy_room: true } } };
      }
      return state;
    }
  },
  {
    id: 'unlock_sword_pavilion',
    condition: (state) => state.realm === Realm.FoundationEstablishment,
    effect: (state) => {
      if (!state.choices.flags['unlocked_sword_pavilion']) {
        return { ...state, choices: { ...state.choices, flags: { ...state.choices.flags, unlocked_sword_pavilion: true } } };
      }
      return state;
    }
  },
  {
    id: 'unlock_sect_hall',
    condition: (state) => state.realm === Realm.FoundationEstablishment && state.sect.rank !== 'none',
    effect: (state) => {
      if (!state.choices.flags['unlocked_sect_hall']) {
        return { ...state, choices: { ...state.choices, flags: { ...state.choices.flags, unlocked_sect_hall: true } } };
      }
      return state;
    }
  },
  {
    id: 'unlock_deep_temple',
    condition: (state) => state.realm === Realm.FoundationEstablishment && Boolean(state.choices.flags['unlocked_abandoned_temple']),
    effect: (state) => {
      if (!state.choices.flags['unlocked_deep_temple']) {
        return { ...state, choices: { ...state.choices, flags: { ...state.choices.flags, unlocked_deep_temple: true } } };
      }
      return state;
    }
  },
  {
    id: 'unlock_cave_crystal',
    condition: (state) => state.realm === Realm.FoundationEstablishment && state.dwelling.level >= 1,
    effect: (state) => {
      if (!state.choices.flags['unlocked_cave_crystal']) {
        return { ...state, choices: { ...state.choices, flags: { ...state.choices.flags, unlocked_cave_crystal: true } } };
      }
      return state;
    }
  },
  {
    id: 'unlock_tea_house',
    condition: (state) => state.resources.coins >= 10 || (state.choices.qualities['market_ties'] ?? 0) >= 3,
    effect: (state) => {
      if (!state.choices.flags['unlocked_tea_house']) {
        return { ...state, choices: { ...state.choices, flags: { ...state.choices.flags, unlocked_tea_house: true } } };
      }
      return state;
    }
  },
  {
    id: 'unlock_demonic_forest',
    condition: (state) => state.realm === Realm.FoundationEstablishment && state.resources.wounds > 0,
    effect: (state) => {
      if (!state.choices.flags['unlocked_demonic_forest']) {
        return { ...state, choices: { ...state.choices, flags: { ...state.choices.flags, unlocked_demonic_forest: true } } };
      }
      return state;
    }
  },
  {
    id: 'unlock_celestial_cliff',
    condition: (state) => state.realm === Realm.FoundationEstablishment,
    effect: (state) => {
      if (!state.choices.flags['unlocked_celestial_cliff']) {
        return { ...state, choices: { ...state.choices, flags: { ...state.choices.flags, unlocked_celestial_cliff: true } } };
      }
      return state;
    }
  },
  {
    id: 'unlock_core_peak',
    condition: (state) => state.realm === Realm.GoldenCore,
    effect: (state) => {
      if (!state.choices.flags['unlocked_core_peak']) {
        return { ...state, choices: { ...state.choices, flags: { ...state.choices.flags, unlocked_core_peak: true } } };
      }
      return state;
    }
  },
  {
    id: 'unlock_spirit_lake',
    condition: (state) => state.realm === Realm.GoldenCore,
    effect: (state) => {
      if (!state.choices.flags['unlocked_spirit_lake']) {
        return { ...state, choices: { ...state.choices, flags: { ...state.choices.flags, unlocked_spirit_lake: true } } };
      }
      return state;
    }
  },
  {
    id: 'unlock_thunder_peak',
    condition: (state) => state.realm === Realm.GoldenCore,
    effect: (state) => {
      if (!state.choices.flags['unlocked_thunder_peak']) {
        return { ...state, choices: { ...state.choices, flags: { ...state.choices.flags, unlocked_thunder_peak: true } } };
      }
      return state;
    }
  },
  {
    id: 'unlock_ancient_battlefield',
    condition: (state) => state.realm === Realm.NascentSoul,
    effect: (state) => {
      if (!state.choices.flags['unlocked_ancient_battlefield']) {
        return { ...state, choices: { ...state.choices, flags: { ...state.choices.flags, unlocked_ancient_battlefield: true } } };
      }
      return state;
    }
  },
  {
    id: 'unlock_void_rift',
    condition: (state) => state.realm === Realm.SpiritTransformation,
    effect: (state) => {
      if (!state.choices.flags['unlocked_void_rift']) {
        return { ...state, choices: { ...state.choices, flags: { ...state.choices.flags, unlocked_void_rift: true } } };
      }
      return state;
    }
  },
  {
    id: 'unlock_celestial_pavilion',
    condition: (state) => state.realm === Realm.SpiritTransformation,
    effect: (state) => {
      if (!state.choices.flags['unlocked_celestial_pavilion']) {
        return { ...state, choices: { ...state.choices, flags: { ...state.choices.flags, unlocked_celestial_pavilion: true } } };
      }
      return state;
    }
  },
  {
    id: 'unlock_demon_seal_ground',
    condition: (state) => state.realm === Realm.Integration,
    effect: (state) => {
      if (!state.choices.flags['unlocked_demon_seal_ground']) {
        return { ...state, choices: { ...state.choices, flags: { ...state.choices.flags, unlocked_demon_seal_ground: true } } };
      }
      return state;
    }
  },
  {
    id: 'unlock_spirit_mountain',
    condition: (state) => state.realm === Realm.Integration,
    effect: (state) => {
      if (!state.choices.flags['unlocked_spirit_mountain']) {
        return { ...state, choices: { ...state.choices, flags: { ...state.choices.flags, unlocked_spirit_mountain: true } } };
      }
      return state;
    }
  },
  {
    id: 'unlock_tribulation_platform',
    condition: (state) => state.realm === Realm.Mahayana,
    effect: (state) => {
      if (!state.choices.flags['unlocked_tribulation_platform']) {
        return { ...state, choices: { ...state.choices, flags: { ...state.choices.flags, unlocked_tribulation_platform: true } } };
      }
      return state;
    }
  },
  {
    id: 'unlock_immortal_garden',
    condition: (state) => state.realm === Realm.Tribulation,
    effect: (state) => {
      if (!state.choices.flags['unlocked_immortal_garden']) {
        return { ...state, choices: { ...state.choices, flags: { ...state.choices.flags, unlocked_immortal_garden: true } } };
      }
      return state;
    }
  },

  {
    id: 'unlock_alchemy_room_actions',
    condition: (state) => Boolean(state.choices.flags['unlocked_alchemy_room']),
    effect: (state) => {
      const actionsToAdd = ['borrow_furnace', 'study_advanced_formula'].filter((a) => !state.unlockedActions.includes(a));
      if (actionsToAdd.length > 0) {
        return { ...state, unlockedActions: [...state.unlockedActions, ...actionsToAdd], choices: { ...state.choices, flags: { ...state.choices.flags, unlocked_alchemy_room_actions: true } } };
      }
      return state;
    }
  },


  {
    id: 'unlock_cave_crystal_actions',
    condition: (state) => Boolean(state.choices.flags['unlocked_cave_crystal']),
    effect: (state) => {
      const actionsToAdd = ['mine_spirit_crystal', 'deep_exploration'].filter((a) => !state.unlockedActions.includes(a));
      if (actionsToAdd.length > 0) {
        return { ...state, unlockedActions: [...state.unlockedActions, ...actionsToAdd], choices: { ...state.choices, flags: { ...state.choices.flags, unlocked_cave_crystal_actions: true } } };
      }
      return state;
    }
  },


  {
    id: 'unlock_core_peak_actions',
    condition: (state) => Boolean(state.choices.flags['unlocked_core_peak']),
    effect: (state) => {
      const actionsToAdd = ['core_gate_cultivation', 'core_gate_exchange', 'seek_elder_guidance'].filter((a) => !state.unlockedActions.includes(a));
      if (actionsToAdd.length > 0) {
        return { ...state, unlockedActions: [...state.unlockedActions, ...actionsToAdd], choices: { ...state.choices, flags: { ...state.choices.flags, unlocked_core_peak_actions: true } } };
      }
      return state;
    }
  },


  // High-realm pill unlock rules: study/brew/take patterns
  // GoldenCore tier
  {
    id: 'unlock_study_golden_core_formation_formula',
    condition: (state) => state.realm === Realm.GoldenCore,
    effect: (state) => {
      if (!state.unlockedActions.includes('study_golden_core_formation_formula')) {
        return { ...state, unlockedActions: [...state.unlockedActions, 'study_golden_core_formation_formula'], choices: { ...state.choices, flags: { ...state.choices.flags, unlocked_study_golden_core_formation_formula: true } } };
      }
      return state;
    }
  },
  {
    id: 'unlock_brew_golden_core_formation_pill',
    condition: (state) => state.realm === Realm.GoldenCore && Boolean(state.choices.flags['known_recipe_golden_core_formation_pill']),
    effect: (state) => {
      if (!state.unlockedActions.includes('brew_golden_core_formation_pill')) {
        return { ...state, unlockedActions: [...state.unlockedActions, 'brew_golden_core_formation_pill'], choices: { ...state.choices, flags: { ...state.choices.flags, unlocked_brew_golden_core_formation_pill: true } } };
      }
      return state;
    }
  },
  {
    id: 'unlock_take_golden_core_formation_pill',
    condition: (state) => state.realm === Realm.GoldenCore && state.resources.goldenCorePills > 0,
    effect: (state) => {
      if (!state.unlockedActions.includes('take_golden_core_formation_pill')) {
        return { ...state, unlockedActions: [...state.unlockedActions, 'take_golden_core_formation_pill'], choices: { ...state.choices, flags: { ...state.choices.flags, unlocked_take_golden_core_formation_pill: true, has_golden_core_formation_pill: true } } };
      }
      return state;
    }
  },
  {
    id: 'unlock_study_golden_core_strengthening_formula',
    condition: (state) => state.realm === Realm.GoldenCore,
    effect: (state) => {
      if (!state.unlockedActions.includes('study_golden_core_strengthening_formula')) {
        return { ...state, unlockedActions: [...state.unlockedActions, 'study_golden_core_strengthening_formula'], choices: { ...state.choices, flags: { ...state.choices.flags, unlocked_study_golden_core_strengthening_formula: true } } };
      }
      return state;
    }
  },
  {
    id: 'unlock_brew_golden_core_strengthening_pill',
    condition: (state) => state.realm === Realm.GoldenCore && Boolean(state.choices.flags['known_recipe_golden_core_strengthening_pill']),
    effect: (state) => {
      if (!state.unlockedActions.includes('brew_golden_core_strengthening_pill')) {
        return { ...state, unlockedActions: [...state.unlockedActions, 'brew_golden_core_strengthening_pill'], choices: { ...state.choices, flags: { ...state.choices.flags, unlocked_brew_golden_core_strengthening_pill: true } } };
      }
      return state;
    }
  },
  {
    id: 'unlock_take_golden_core_strengthening_pill',
    condition: (state) => state.realm === Realm.GoldenCore && state.resources.goldenCorePills > 0,
    effect: (state) => {
      if (!state.unlockedActions.includes('take_golden_core_strengthening_pill')) {
        return { ...state, unlockedActions: [...state.unlockedActions, 'take_golden_core_strengthening_pill'], choices: { ...state.choices, flags: { ...state.choices.flags, unlocked_take_golden_core_strengthening_pill: true, has_golden_core_strengthening_pill: true } } };
      }
      return state;
    }
  },
  {
    id: 'unlock_study_golden_core_fire_formula',
    condition: (state) => state.realm === Realm.GoldenCore,
    effect: (state) => {
      if (!state.unlockedActions.includes('study_golden_core_fire_formula')) {
        return { ...state, unlockedActions: [...state.unlockedActions, 'study_golden_core_fire_formula'], choices: { ...state.choices, flags: { ...state.choices.flags, unlocked_study_golden_core_fire_formula: true } } };
      }
      return state;
    }
  },
  {
    id: 'unlock_brew_golden_core_fire_pill',
    condition: (state) => state.realm === Realm.GoldenCore && Boolean(state.choices.flags['known_recipe_golden_core_fire_pill']),
    effect: (state) => {
      if (!state.unlockedActions.includes('brew_golden_core_fire_pill')) {
        return { ...state, unlockedActions: [...state.unlockedActions, 'brew_golden_core_fire_pill'], choices: { ...state.choices, flags: { ...state.choices.flags, unlocked_brew_golden_core_fire_pill: true } } };
      }
      return state;
    }
  },
  {
    id: 'unlock_take_golden_core_fire_pill',
    condition: (state) => state.realm === Realm.GoldenCore && state.resources.goldenCorePills > 0,
    effect: (state) => {
      if (!state.unlockedActions.includes('take_golden_core_fire_pill')) {
        return { ...state, unlockedActions: [...state.unlockedActions, 'take_golden_core_fire_pill'], choices: { ...state.choices, flags: { ...state.choices.flags, unlocked_take_golden_core_fire_pill: true, has_golden_core_fire_pill: true } } };
      }
      return state;
    }
  },
  // NascentSoul tier
  {
    id: 'unlock_study_nascent_soul_nurturing_formula',
    condition: (state) => state.realm === Realm.NascentSoul,
    effect: (state) => {
      if (!state.unlockedActions.includes('study_nascent_soul_nurturing_formula')) {
        return { ...state, unlockedActions: [...state.unlockedActions, 'study_nascent_soul_nurturing_formula'], choices: { ...state.choices, flags: { ...state.choices.flags, unlocked_study_nascent_soul_nurturing_formula: true } } };
      }
      return state;
    }
  },
  {
    id: 'unlock_brew_nascent_soul_nurturing_pill',
    condition: (state) => state.realm === Realm.NascentSoul && Boolean(state.choices.flags['known_recipe_nascent_soul_nurturing_pill']),
    effect: (state) => {
      if (!state.unlockedActions.includes('brew_nascent_soul_nurturing_pill')) {
        return { ...state, unlockedActions: [...state.unlockedActions, 'brew_nascent_soul_nurturing_pill'], choices: { ...state.choices, flags: { ...state.choices.flags, unlocked_brew_nascent_soul_nurturing_pill: true } } };
      }
      return state;
    }
  },
  {
    id: 'unlock_take_nascent_soul_nurturing_pill',
    condition: (state) => state.realm === Realm.NascentSoul && state.resources.nascentSoulPills > 0,
    effect: (state) => {
      if (!state.unlockedActions.includes('take_nascent_soul_nurturing_pill')) {
        return { ...state, unlockedActions: [...state.unlockedActions, 'take_nascent_soul_nurturing_pill'], choices: { ...state.choices, flags: { ...state.choices.flags, unlocked_take_nascent_soul_nurturing_pill: true, has_nascent_soul_nurturing_pill: true } } };
      }
      return state;
    }
  },
  {
    id: 'unlock_study_nascent_soul_separation_formula',
    condition: (state) => state.realm === Realm.NascentSoul,
    effect: (state) => {
      if (!state.unlockedActions.includes('study_nascent_soul_separation_formula')) {
        return { ...state, unlockedActions: [...state.unlockedActions, 'study_nascent_soul_separation_formula'], choices: { ...state.choices, flags: { ...state.choices.flags, unlocked_study_nascent_soul_separation_formula: true } } };
      }
      return state;
    }
  },
  {
    id: 'unlock_brew_nascent_soul_separation_pill',
    condition: (state) => state.realm === Realm.NascentSoul && Boolean(state.choices.flags['known_recipe_nascent_soul_separation_pill']),
    effect: (state) => {
      if (!state.unlockedActions.includes('brew_nascent_soul_separation_pill')) {
        return { ...state, unlockedActions: [...state.unlockedActions, 'brew_nascent_soul_separation_pill'], choices: { ...state.choices, flags: { ...state.choices.flags, unlocked_brew_nascent_soul_separation_pill: true } } };
      }
      return state;
    }
  },
  {
    id: 'unlock_take_nascent_soul_separation_pill',
    condition: (state) => state.realm === Realm.NascentSoul && state.resources.nascentSoulPills > 0,
    effect: (state) => {
      if (!state.unlockedActions.includes('take_nascent_soul_separation_pill')) {
        return { ...state, unlockedActions: [...state.unlockedActions, 'take_nascent_soul_separation_pill'], choices: { ...state.choices, flags: { ...state.choices.flags, unlocked_take_nascent_soul_separation_pill: true, has_nascent_soul_separation_pill: true } } };
      }
      return state;
    }
  },
  {
    id: 'unlock_study_nascent_soul_protection_formula',
    condition: (state) => state.realm === Realm.NascentSoul,
    effect: (state) => {
      if (!state.unlockedActions.includes('study_nascent_soul_protection_formula')) {
        return { ...state, unlockedActions: [...state.unlockedActions, 'study_nascent_soul_protection_formula'], choices: { ...state.choices, flags: { ...state.choices.flags, unlocked_study_nascent_soul_protection_formula: true } } };
      }
      return state;
    }
  },
  {
    id: 'unlock_brew_nascent_soul_protection_pill',
    condition: (state) => state.realm === Realm.NascentSoul && Boolean(state.choices.flags['known_recipe_nascent_soul_protection_pill']),
    effect: (state) => {
      if (!state.unlockedActions.includes('brew_nascent_soul_protection_pill')) {
        return { ...state, unlockedActions: [...state.unlockedActions, 'brew_nascent_soul_protection_pill'], choices: { ...state.choices, flags: { ...state.choices.flags, unlocked_brew_nascent_soul_protection_pill: true } } };
      }
      return state;
    }
  },
  {
    id: 'unlock_take_nascent_soul_protection_pill',
    condition: (state) => state.realm === Realm.NascentSoul && state.resources.nascentSoulPills > 0,
    effect: (state) => {
      if (!state.unlockedActions.includes('take_nascent_soul_protection_pill')) {
        return { ...state, unlockedActions: [...state.unlockedActions, 'take_nascent_soul_protection_pill'], choices: { ...state.choices, flags: { ...state.choices.flags, unlocked_take_nascent_soul_protection_pill: true, has_nascent_soul_protection_pill: true } } };
      }
      return state;
    }
  },
  // SpiritTransform tier
  {
    id: 'unlock_study_spirit_transform_formula',
    condition: (state) => state.realm === Realm.SpiritTransformation,
    effect: (state) => {
      if (!state.unlockedActions.includes('study_spirit_transform_formula')) {
        return { ...state, unlockedActions: [...state.unlockedActions, 'study_spirit_transform_formula'], choices: { ...state.choices, flags: { ...state.choices.flags, unlocked_study_spirit_transform_formula: true } } };
      }
      return state;
    }
  },
  {
    id: 'unlock_brew_spirit_transform_pill',
    condition: (state) => state.realm === Realm.SpiritTransformation && Boolean(state.choices.flags['known_recipe_spirit_transform_pill']),
    effect: (state) => {
      if (!state.unlockedActions.includes('brew_spirit_transform_pill')) {
        return { ...state, unlockedActions: [...state.unlockedActions, 'brew_spirit_transform_pill'], choices: { ...state.choices, flags: { ...state.choices.flags, unlocked_brew_spirit_transform_pill: true } } };
      }
      return state;
    }
  },
  {
    id: 'unlock_take_spirit_transform_pill',
    condition: (state) => state.realm === Realm.SpiritTransformation && state.resources.spiritTransformPills > 0,
    effect: (state) => {
      if (!state.unlockedActions.includes('take_spirit_transform_pill')) {
        return { ...state, unlockedActions: [...state.unlockedActions, 'take_spirit_transform_pill'], choices: { ...state.choices, flags: { ...state.choices.flags, unlocked_take_spirit_transform_pill: true, has_spirit_transform_pill: true } } };
      }
      return state;
    }
  },
  {
    id: 'unlock_study_spirit_transform_fire_formula',
    condition: (state) => state.realm === Realm.SpiritTransformation,
    effect: (state) => {
      if (!state.unlockedActions.includes('study_spirit_transform_fire_formula')) {
        return { ...state, unlockedActions: [...state.unlockedActions, 'study_spirit_transform_fire_formula'], choices: { ...state.choices, flags: { ...state.choices.flags, unlocked_study_spirit_transform_fire_formula: true } } };
      }
      return state;
    }
  },
  {
    id: 'unlock_brew_spirit_transform_fire_pill',
    condition: (state) => state.realm === Realm.SpiritTransformation && Boolean(state.choices.flags['known_recipe_spirit_transform_fire_pill']),
    effect: (state) => {
      if (!state.unlockedActions.includes('brew_spirit_transform_fire_pill')) {
        return { ...state, unlockedActions: [...state.unlockedActions, 'brew_spirit_transform_fire_pill'], choices: { ...state.choices, flags: { ...state.choices.flags, unlocked_brew_spirit_transform_fire_pill: true } } };
      }
      return state;
    }
  },
  {
    id: 'unlock_take_spirit_transform_fire_pill',
    condition: (state) => state.realm === Realm.SpiritTransformation && state.resources.spiritTransformPills > 0,
    effect: (state) => {
      if (!state.unlockedActions.includes('take_spirit_transform_fire_pill')) {
        return { ...state, unlockedActions: [...state.unlockedActions, 'take_spirit_transform_fire_pill'], choices: { ...state.choices, flags: { ...state.choices.flags, unlocked_take_spirit_transform_fire_pill: true, has_spirit_transform_fire_pill: true } } };
      }
      return state;
    }
  },
  // Integration tier
  {
    id: 'unlock_study_integration_formula',
    condition: (state) => state.realm === Realm.Integration,
    effect: (state) => {
      if (!state.unlockedActions.includes('study_integration_formula')) {
        return { ...state, unlockedActions: [...state.unlockedActions, 'study_integration_formula'], choices: { ...state.choices, flags: { ...state.choices.flags, unlocked_study_integration_formula: true } } };
      }
      return state;
    }
  },
  {
    id: 'unlock_brew_integration_pill',
    condition: (state) => state.realm === Realm.Integration && Boolean(state.choices.flags['known_recipe_integration_pill']),
    effect: (state) => {
      if (!state.unlockedActions.includes('brew_integration_pill')) {
        return { ...state, unlockedActions: [...state.unlockedActions, 'brew_integration_pill'], choices: { ...state.choices, flags: { ...state.choices.flags, unlocked_brew_integration_pill: true } } };
      }
      return state;
    }
  },
  {
    id: 'unlock_take_integration_pill',
    condition: (state) => state.realm === Realm.Integration && state.resources.integrationPills > 0,
    effect: (state) => {
      if (!state.unlockedActions.includes('take_integration_pill')) {
        return { ...state, unlockedActions: [...state.unlockedActions, 'take_integration_pill'], choices: { ...state.choices, flags: { ...state.choices.flags, unlocked_take_integration_pill: true, has_integration_pill: true } } };
      }
      return state;
    }
  },
  {
    id: 'unlock_study_integration_body_formula',
    condition: (state) => state.realm === Realm.Integration,
    effect: (state) => {
      if (!state.unlockedActions.includes('study_integration_body_formula')) {
        return { ...state, unlockedActions: [...state.unlockedActions, 'study_integration_body_formula'], choices: { ...state.choices, flags: { ...state.choices.flags, unlocked_study_integration_body_formula: true } } };
      }
      return state;
    }
  },
  {
    id: 'unlock_brew_integration_body_pill',
    condition: (state) => state.realm === Realm.Integration && Boolean(state.choices.flags['known_recipe_integration_body_pill']),
    effect: (state) => {
      if (!state.unlockedActions.includes('brew_integration_body_pill')) {
        return { ...state, unlockedActions: [...state.unlockedActions, 'brew_integration_body_pill'], choices: { ...state.choices, flags: { ...state.choices.flags, unlocked_brew_integration_body_pill: true } } };
      }
      return state;
    }
  },
  {
    id: 'unlock_take_integration_body_pill',
    condition: (state) => state.realm === Realm.Integration && state.resources.integrationPills > 0,
    effect: (state) => {
      if (!state.unlockedActions.includes('take_integration_body_pill')) {
        return { ...state, unlockedActions: [...state.unlockedActions, 'take_integration_body_pill'], choices: { ...state.choices, flags: { ...state.choices.flags, unlocked_take_integration_body_pill: true, has_integration_body_pill: true } } };
      }
      return state;
    }
  },
  // Mahayana tier
  {
    id: 'unlock_study_mahayana_formula',
    condition: (state) => state.realm === Realm.Mahayana,
    effect: (state) => {
      if (!state.unlockedActions.includes('study_mahayana_formula')) {
        return { ...state, unlockedActions: [...state.unlockedActions, 'study_mahayana_formula'], choices: { ...state.choices, flags: { ...state.choices.flags, unlocked_study_mahayana_formula: true } } };
      }
      return state;
    }
  },
  {
    id: 'unlock_brew_mahayana_pill',
    condition: (state) => state.realm === Realm.Mahayana && Boolean(state.choices.flags['known_recipe_mahayana_pill']),
    effect: (state) => {
      if (!state.unlockedActions.includes('brew_mahayana_pill')) {
        return { ...state, unlockedActions: [...state.unlockedActions, 'brew_mahayana_pill'], choices: { ...state.choices, flags: { ...state.choices.flags, unlocked_brew_mahayana_pill: true } } };
      }
      return state;
    }
  },
  {
    id: 'unlock_take_mahayana_pill',
    condition: (state) => state.realm === Realm.Mahayana && state.resources.mahayanaPills > 0,
    effect: (state) => {
      if (!state.unlockedActions.includes('take_mahayana_pill')) {
        return { ...state, unlockedActions: [...state.unlockedActions, 'take_mahayana_pill'], choices: { ...state.choices, flags: { ...state.choices.flags, unlocked_take_mahayana_pill: true, has_mahayana_pill: true } } };
      }
      return state;
    }
  },
  {
    id: 'unlock_study_mahayana_enlightenment_formula',
    condition: (state) => state.realm === Realm.Mahayana,
    effect: (state) => {
      if (!state.unlockedActions.includes('study_mahayana_enlightenment_formula')) {
        return { ...state, unlockedActions: [...state.unlockedActions, 'study_mahayana_enlightenment_formula'], choices: { ...state.choices, flags: { ...state.choices.flags, unlocked_study_mahayana_enlightenment_formula: true } } };
      }
      return state;
    }
  },
  {
    id: 'unlock_brew_mahayana_enlightenment_pill',
    condition: (state) => state.realm === Realm.Mahayana && Boolean(state.choices.flags['known_recipe_mahayana_enlightenment_pill']),
    effect: (state) => {
      if (!state.unlockedActions.includes('brew_mahayana_enlightenment_pill')) {
        return { ...state, unlockedActions: [...state.unlockedActions, 'brew_mahayana_enlightenment_pill'], choices: { ...state.choices, flags: { ...state.choices.flags, unlocked_brew_mahayana_enlightenment_pill: true } } };
      }
      return state;
    }
  },
  {
    id: 'unlock_take_mahayana_enlightenment_pill',
    condition: (state) => state.realm === Realm.Mahayana && state.resources.mahayanaPills > 0,
    effect: (state) => {
      if (!state.unlockedActions.includes('take_mahayana_enlightenment_pill')) {
        return { ...state, unlockedActions: [...state.unlockedActions, 'take_mahayana_enlightenment_pill'], choices: { ...state.choices, flags: { ...state.choices.flags, unlocked_take_mahayana_enlightenment_pill: true, has_mahayana_enlightenment_pill: true } } };
      }
      return state;
    }
  },
  // Tribulation tier
  {
    id: 'unlock_study_tribulation_protection_formula',
    condition: (state) => state.realm === Realm.Tribulation,
    effect: (state) => {
      if (!state.unlockedActions.includes('study_tribulation_protection_formula')) {
        return { ...state, unlockedActions: [...state.unlockedActions, 'study_tribulation_protection_formula'], choices: { ...state.choices, flags: { ...state.choices.flags, unlocked_study_tribulation_protection_formula: true } } };
      }
      return state;
    }
  },
  {
    id: 'unlock_brew_tribulation_protection_pill',
    condition: (state) => state.realm === Realm.Tribulation && Boolean(state.choices.flags['known_recipe_tribulation_protection_pill']),
    effect: (state) => {
      if (!state.unlockedActions.includes('brew_tribulation_protection_pill')) {
        return { ...state, unlockedActions: [...state.unlockedActions, 'brew_tribulation_protection_pill'], choices: { ...state.choices, flags: { ...state.choices.flags, unlocked_brew_tribulation_protection_pill: true } } };
      }
      return state;
    }
  },
  {
    id: 'unlock_take_tribulation_protection_pill',
    condition: (state) => state.realm === Realm.Tribulation && state.resources.tribulationPills > 0,
    effect: (state) => {
      if (!state.unlockedActions.includes('take_tribulation_protection_pill')) {
        return { ...state, unlockedActions: [...state.unlockedActions, 'take_tribulation_protection_pill'], choices: { ...state.choices, flags: { ...state.choices.flags, unlocked_take_tribulation_protection_pill: true, has_tribulation_protection_pill: true } } };
      }
      return state;
    }
  },
  {
    id: 'unlock_study_heavenly_tribulation_formula',
    condition: (state) => state.realm === Realm.Tribulation,
    effect: (state) => {
      if (!state.unlockedActions.includes('study_heavenly_tribulation_formula')) {
        return { ...state, unlockedActions: [...state.unlockedActions, 'study_heavenly_tribulation_formula'], choices: { ...state.choices, flags: { ...state.choices.flags, unlocked_study_heavenly_tribulation_formula: true } } };
      }
      return state;
    }
  },
  {
    id: 'unlock_brew_heavenly_tribulation_pill',
    condition: (state) => state.realm === Realm.Tribulation && Boolean(state.choices.flags['known_recipe_heavenly_tribulation_pill']),
    effect: (state) => {
      if (!state.unlockedActions.includes('brew_heavenly_tribulation_pill')) {
        return { ...state, unlockedActions: [...state.unlockedActions, 'brew_heavenly_tribulation_pill'], choices: { ...state.choices, flags: { ...state.choices.flags, unlocked_brew_heavenly_tribulation_pill: true } } };
      }
      return state;
    }
  },
  {
    id: 'unlock_take_heavenly_tribulation_pill',
    condition: (state) => state.realm === Realm.Tribulation && state.resources.heavenlyTribulationPills > 0,
    effect: (state) => {
      if (!state.unlockedActions.includes('take_heavenly_tribulation_pill')) {
        return { ...state, unlockedActions: [...state.unlockedActions, 'take_heavenly_tribulation_pill'], choices: { ...state.choices, flags: { ...state.choices.flags, unlocked_take_heavenly_tribulation_pill: true, has_heavenly_tribulation_pill: true } } };
      }
      return state;
    }
  },
  {
    id: 'unlock_study_tribulation_soul_formula',
    condition: (state) => state.realm === Realm.Tribulation,
    effect: (state) => {
      if (!state.unlockedActions.includes('study_tribulation_soul_formula')) {
        return { ...state, unlockedActions: [...state.unlockedActions, 'study_tribulation_soul_formula'], choices: { ...state.choices, flags: { ...state.choices.flags, unlocked_study_tribulation_soul_formula: true } } };
      }
      return state;
    }
  },
  {
    id: 'unlock_brew_tribulation_soul_pill',
    condition: (state) => state.realm === Realm.Tribulation && Boolean(state.choices.flags['known_recipe_tribulation_soul_pill']),
    effect: (state) => {
      if (!state.unlockedActions.includes('brew_tribulation_soul_pill')) {
        return { ...state, unlockedActions: [...state.unlockedActions, 'brew_tribulation_soul_pill'], choices: { ...state.choices, flags: { ...state.choices.flags, unlocked_brew_tribulation_soul_pill: true } } };
      }
      return state;
    }
  },
  {
    id: 'unlock_take_tribulation_soul_pill',
    condition: (state) => state.realm === Realm.Tribulation && state.resources.tribulationPills > 0,
    effect: (state) => {
      if (!state.unlockedActions.includes('take_tribulation_soul_pill')) {
        return { ...state, unlockedActions: [...state.unlockedActions, 'take_tribulation_soul_pill'], choices: { ...state.choices, flags: { ...state.choices.flags, unlocked_take_tribulation_soul_pill: true, has_tribulation_soul_pill: true } } };
      }
      return state;
    }
  },
  // P3: Meditate detox unlock
  {
    id: 'unlock_meditate_detox',
    condition: (state) =>
      Boolean(state.choices.flags['entered_qi_condensation']) &&
      state.resources.dantoxin >= 10,
    effect: (state) => {
      if (!state.unlockedActions.includes('meditate_detox')) {
        return {
          ...state,
          unlockedActions: [...state.unlockedActions, 'meditate_detox'],
          choices: {
            ...state.choices,
            flags: { ...state.choices.flags, unlocked_meditate_detox: true }
          }
        };
      }
      return state;
    }
  },
  // Stream valley actions
  {
    id: 'unlock_water_meditation',
    condition: (state) => Boolean(state.choices.flags['entered_qi_condensation']) || Boolean(state.choices.flags['origin_mountain_dweller']),
    effect: (state) => {
      if (!state.unlockedActions.includes('water_meditation')) {
        return { ...state, unlockedActions: [...state.unlockedActions, 'water_meditation'], choices: { ...state.choices, flags: { ...state.choices.flags, unlocked_water_meditation: true } } };
      }
      return state;
    }
  },
  {
    id: 'unlock_collect_night_dew',
    condition: (state) => Boolean(state.choices.flags['origin_herbalist_apprentice']) || (state.choices.qualities['alchemy_affinity'] || 0) >= 3,
    effect: (state) => {
      if (!state.unlockedActions.includes('collect_night_dew')) {
        return { ...state, unlockedActions: [...state.unlockedActions, 'collect_night_dew'], choices: { ...state.choices, flags: { ...state.choices.flags, unlocked_collect_night_dew: true } } };
      }
      return state;
    }
  },
  // Abandoned temple actions
  {
    id: 'unlock_explore_ruins',
    condition: (state) => Boolean(state.choices.flags['entered_qi_condensation']),
    effect: (state) => {
      if (!state.unlockedActions.includes('explore_ruins')) {
        return { ...state, unlockedActions: [...state.unlockedActions, 'explore_ruins'], choices: { ...state.choices, flags: { ...state.choices.flags, unlocked_explore_ruins: true } } };
      }
      return state;
    }
  },
  {
    id: 'unlock_sweep_temple',
    condition: (state) => Boolean(state.choices.flags['origin_temple_ward']) || (Boolean(state.choices.flags['entered_qi_condensation']) && Boolean(state.choices.flags['found_jade_slip'])),
    effect: (state) => {
      if (!state.unlockedActions.includes('sweep_temple')) {
        return { ...state, unlockedActions: [...state.unlockedActions, 'sweep_temple'], choices: { ...state.choices, flags: { ...state.choices.flags, unlocked_sweep_temple: true } } };
      }
      return state;
    }
  },
  // Herb slope actions
  {
    id: 'unlock_identify_herb',
    condition: (state) => state.resources.herbs >= 2,
    effect: (state) => {
      if (!state.unlockedActions.includes('identify_herb')) {
        return { ...state, unlockedActions: [...state.unlockedActions, 'identify_herb'], choices: { ...state.choices, flags: { ...state.choices.flags, unlocked_identify_herb: true } } };
      }
      return state;
    }
  },
  {
    id: 'unlock_protect_seedling',
    condition: (state) => (state.choices.qualities['alchemy_affinity'] || 0) >= 2 || Boolean(state.choices.flags['origin_herbalist_apprentice']),
    effect: (state) => {
      if (!state.unlockedActions.includes('protect_seedling')) {
        return { ...state, unlockedActions: [...state.unlockedActions, 'protect_seedling'], choices: { ...state.choices, flags: { ...state.choices.flags, unlocked_protect_seedling: true } } };
      }
      return state;
    }
  },
  // Ferry crossing actions
  {
    id: 'unlock_listen_traveler',
    condition: (state) => Boolean(state.choices.flags['origin_orphan_of_war']) || (Boolean(state.choices.flags['entered_qi_condensation']) && state.resources.insight >= 1),
    effect: (state) => {
      if (!state.unlockedActions.includes('listen_traveler')) {
        return { ...state, unlockedActions: [...state.unlockedActions, 'listen_traveler'], choices: { ...state.choices, flags: { ...state.choices.flags, unlocked_listen_traveler: true } } };
      }
      return state;
    }
  },
  {
    id: 'unlock_hire_boat',
    condition: (state) => state.resources.coins >= 5,
    effect: (state) => {
      if (!state.unlockedActions.includes('hire_boat')) {
        return { ...state, unlockedActions: [...state.unlockedActions, 'hire_boat'], choices: { ...state.choices, flags: { ...state.choices.flags, unlocked_hire_boat: true } } };
      }
      return state;
    }
  },
  // Spirit field actions
  {
    id: 'unlock_spirit_field_actions',
    condition: (state) => state.realm === Realm.FoundationEstablishment,
    effect: (state) => {
      const toAdd = ['plant_herb', 'harvest_herb', 'tend_field'].filter(id => !state.unlockedActions.includes(id));
      if (toAdd.length > 0) {
        return { ...state, unlockedActions: [...state.unlockedActions, ...toAdd], choices: { ...state.choices, flags: { ...state.choices.flags, unlocked_spirit_field_actions: true } } };
      }
      return state;
    }
  },
  // Pill hall actions
  {
    id: 'unlock_pill_hall_actions',
    condition: (state) => state.realm === Realm.FoundationEstablishment && (state.choices.qualities['alchemy_affinity'] || 0) >= 5,
    effect: (state) => {
      const toAdd = ['use_furnace', 'study_advanced_formula'].filter(id => !state.unlockedActions.includes(id));
      if (toAdd.length > 0) {
        return { ...state, unlockedActions: [...state.unlockedActions, ...toAdd], choices: { ...state.choices, flags: { ...state.choices.flags, unlocked_pill_hall_actions: true } } };
      }
      return state;
    }
  },
  // Sword pavilion actions
  {
    id: 'unlock_sword_pavilion_actions',
    condition: (state) => state.realm === Realm.QiCondensation && state.realmLayer >= 1,
    effect: (state) => {
      const toAdd = ['practice_sword'].filter(id => !state.unlockedActions.includes(id));
      if (toAdd.length > 0) {
        return { ...state, unlockedActions: [...state.unlockedActions, ...toAdd], choices: { ...state.choices, flags: { ...state.choices.flags, unlocked_sword_pavilion_actions: true } } };
      }
      return state;
    }
  },
  {
    id: 'unlock_observe_sword_intent',
    condition: (state) => state.realm === Realm.FoundationEstablishment,
    effect: (state) => {
      if (!state.unlockedActions.includes('observe_sword_intent')) {
        return { ...state, unlockedActions: [...state.unlockedActions, 'observe_sword_intent'], choices: { ...state.choices, flags: { ...state.choices.flags, unlocked_observe_sword_intent: true } } };
      }
      return state;
    }
  },
  // Sect hall actions
  {
    id: 'unlock_sect_hall_actions',
    condition: (state) => state.sect.rank === 'inner' || state.sect.rank === 'core' || state.sect.rank === 'elder',
    effect: (state) => {
      const toAdd = ['attend_ceremony', 'receive_mission'].filter(id => !state.unlockedActions.includes(id));
      if (toAdd.length > 0) {
        return { ...state, unlockedActions: [...state.unlockedActions, ...toAdd], choices: { ...state.choices, flags: { ...state.choices.flags, unlocked_sect_hall_actions: true } } };
      }
      return state;
    }
  },
  // Deep temple actions
  {
    id: 'unlock_deep_temple_actions',
    condition: (state) => state.realm === Realm.FoundationEstablishment,
    effect: (state) => {
      const toAdd = ['search_altar', 'meditate_dark'].filter(id => !state.unlockedActions.includes(id));
      if (toAdd.length > 0) {
        return { ...state, unlockedActions: [...state.unlockedActions, ...toAdd], choices: { ...state.choices, flags: { ...state.choices.flags, unlocked_deep_temple_actions: true } } };
      }
      return state;
    }
  },
  // Mountain cave actions
  {
    id: 'unlock_mountain_cave_actions',
    condition: (state) => state.realm === Realm.FoundationEstablishment,
    effect: (state) => {
      const toAdd = ['mine_crystal', 'explore_depths'].filter(id => !state.unlockedActions.includes(id));
      if (toAdd.length > 0) {
        return { ...state, unlockedActions: [...state.unlockedActions, ...toAdd], choices: { ...state.choices, flags: { ...state.choices.flags, unlocked_mountain_cave_actions: true } } };
      }
      return state;
    }
  },
  // Tea house actions
  {
    id: 'unlock_tea_house_actions',
    condition: (state) => Boolean(state.choices.flags['entered_qi_condensation']) || state.resources.coins >= 3,
    effect: (state) => {
      const toAdd = ['drink_tea', 'listen_rumor', 'gamble_dice'].filter(id => !state.unlockedActions.includes(id));
      if (toAdd.length > 0) {
        return { ...state, unlockedActions: [...state.unlockedActions, ...toAdd], choices: { ...state.choices, flags: { ...state.choices.flags, unlocked_tea_house_actions: true } } };
      }
      return state;
    }
  },
  // Demonic forest actions
  {
    id: 'unlock_demonic_forest_actions',
    condition: (state) => state.realm === Realm.FoundationEstablishment,
    effect: (state) => {
      const toAdd = ['hunt_beast', 'gather_demonic_herb', 'set_trap'].filter(id => !state.unlockedActions.includes(id));
      if (toAdd.length > 0) {
        return { ...state, unlockedActions: [...state.unlockedActions, ...toAdd], choices: { ...state.choices, flags: { ...state.choices.flags, unlocked_demonic_forest_actions: true } } };
      }
      return state;
    }
  },
  // Celestial cliff actions
  {
    id: 'unlock_celestial_cliff_actions',
    condition: (state) => state.realm === Realm.GoldenCore,
    effect: (state) => {
      const toAdd = ['cliff_meditation', 'face_heavenly_wind'].filter(id => !state.unlockedActions.includes(id));
      if (toAdd.length > 0) {
        return { ...state, unlockedActions: [...state.unlockedActions, ...toAdd], choices: { ...state.choices, flags: { ...state.choices.flags, unlocked_celestial_cliff_actions: true } } };
      }
      return state;
    }
  },
  // Core gate actions
  {
    id: 'unlock_core_gate_actions',
    condition: (state) => state.sect.rank === 'core' || state.sect.rank === 'elder',
    effect: (state) => {
      const toAdd = ['core_gate_cultivation', 'core_gate_exchange', 'seek_elder_guidance'].filter(id => !state.unlockedActions.includes(id));
      if (toAdd.length > 0) {
        return { ...state, unlockedActions: [...state.unlockedActions, ...toAdd], choices: { ...state.choices, flags: { ...state.choices.flags, unlocked_core_gate_actions: true } } };
      }
      return state;
    }
  },
  // Spirit lake actions
  {
    id: 'unlock_spirit_lake_actions',
    condition: (state) => state.realm === Realm.GoldenCore,
    effect: (state) => {
      const toAdd = ['spirit_lake_meditation', 'dive_for_treasure'].filter(id => !state.unlockedActions.includes(id));
      if (toAdd.length > 0) {
        return { ...state, unlockedActions: [...state.unlockedActions, ...toAdd], choices: { ...state.choices, flags: { ...state.choices.flags, unlocked_spirit_lake_actions: true } } };
      }
      return state;
    }
  },
  // Thunder peak actions
  {
    id: 'unlock_thunder_peak_actions',
    condition: (state) => state.realm === Realm.NascentSoul,
    effect: (state) => {
      const toAdd = ['face_tribulation', 'thunder_cultivation'].filter(id => !state.unlockedActions.includes(id));
      if (toAdd.length > 0) {
        return { ...state, unlockedActions: [...state.unlockedActions, ...toAdd], choices: { ...state.choices, flags: { ...state.choices.flags, unlocked_thunder_peak_actions: true } } };
      }
      return state;
    }
  },
  // Ancient battlefield actions
  {
    id: 'unlock_ancient_battlefield_actions',
    condition: (state) => state.realm === Realm.NascentSoul,
    effect: (state) => {
      const toAdd = ['search_battlefield', 'commune_with_remnants'].filter(id => !state.unlockedActions.includes(id));
      if (toAdd.length > 0) {
        return { ...state, unlockedActions: [...state.unlockedActions, ...toAdd], choices: { ...state.choices, flags: { ...state.choices.flags, unlocked_ancient_battlefield_actions: true } } };
      }
      return state;
    }
  },
  // Void rift actions
  {
    id: 'unlock_void_rift_actions',
    condition: (state) => state.realm === Realm.SpiritTransformation,
    effect: (state) => {
      const toAdd = ['explore_void', 'gather_void_essence'].filter(id => !state.unlockedActions.includes(id));
      if (toAdd.length > 0) {
        return { ...state, unlockedActions: [...state.unlockedActions, ...toAdd], choices: { ...state.choices, flags: { ...state.choices.flags, unlocked_void_rift_actions: true } } };
      }
      return state;
    }
  },
  // Celestial pavilion actions
  {
    id: 'unlock_celestial_pavilion_actions',
    condition: (state) => state.realm === Realm.Integration,
    effect: (state) => {
      const toAdd = ['study_celestial_script', 'meditate_on_dao'].filter(id => !state.unlockedActions.includes(id));
      if (toAdd.length > 0) {
        return { ...state, unlockedActions: [...state.unlockedActions, ...toAdd], choices: { ...state.choices, flags: { ...state.choices.flags, unlocked_celestial_pavilion_actions: true } } };
      }
      return state;
    }
  },
  // Demon seal ground actions
  {
    id: 'unlock_demon_seal_ground_actions',
    condition: (state) => state.realm === Realm.Mahayana,
    effect: (state) => {
      const toAdd = ['patrol_seal', 'gather_demonic_material'].filter(id => !state.unlockedActions.includes(id));
      if (toAdd.length > 0) {
        return { ...state, unlockedActions: [...state.unlockedActions, ...toAdd], choices: { ...state.choices, flags: { ...state.choices.flags, unlocked_demon_seal_ground_actions: true } } };
      }
      return state;
    }
  },
  // Spirit mountain actions
  {
    id: 'unlock_spirit_mountain_actions',
    condition: (state) => state.realm === Realm.Mahayana,
    effect: (state) => {
      const toAdd = ['spirit_mountain_retreat', 'comprehend_dao'].filter(id => !state.unlockedActions.includes(id));
      if (toAdd.length > 0) {
        return { ...state, unlockedActions: [...state.unlockedActions, ...toAdd], choices: { ...state.choices, flags: { ...state.choices.flags, unlocked_spirit_mountain_actions: true } } };
      }
      return state;
    }
  },
  // Tribulation platform actions
  {
    id: 'unlock_tribulation_platform_actions',
    condition: (state) => state.realm === Realm.Tribulation,
    effect: (state) => {
      const toAdd = ['face_heavenly_tribulation', 'stabilize_dao_foundation'].filter(id => !state.unlockedActions.includes(id));
      if (toAdd.length > 0) {
        return { ...state, unlockedActions: [...state.unlockedActions, ...toAdd], choices: { ...state.choices, flags: { ...state.choices.flags, unlocked_tribulation_platform_actions: true } } };
      }
      return state;
    }
  },
  // Immortal garden actions
  {
    id: 'unlock_immortal_garden_actions',
    condition: (state) => state.realm === Realm.Tribulation,
    effect: (state) => {
      const toAdd = ['gather_immortal_herb', 'meditate_garden'].filter(id => !state.unlockedActions.includes(id));
      if (toAdd.length > 0) {
        return { ...state, unlockedActions: [...state.unlockedActions, ...toAdd], choices: { ...state.choices, flags: { ...state.choices.flags, unlocked_immortal_garden_actions: true } } };
      }
      return state;
    }
  },
  // High-realm practice actions
  {
    id: 'unlock_spirit_transformation_practice',
    condition: (state) => state.realm === Realm.SpiritTransformation,
    effect: (state) => {
      if (!state.unlockedActions.includes('spirit_transformation_practice')) {
        return { ...state, unlockedActions: [...state.unlockedActions, 'spirit_transformation_practice'], choices: { ...state.choices, flags: { ...state.choices.flags, unlocked_spirit_transformation_practice: true } } };
      }
      return state;
    }
  },
  {
    id: 'unlock_integration_practice',
    condition: (state) => state.realm === Realm.Integration,
    effect: (state) => {
      if (!state.unlockedActions.includes('integration_practice')) {
        return { ...state, unlockedActions: [...state.unlockedActions, 'integration_practice'], choices: { ...state.choices, flags: { ...state.choices.flags, unlocked_integration_practice: true } } };
      }
      return state;
    }
  },
  {
    id: 'unlock_mahayana_practice',
    condition: (state) => state.realm === Realm.Mahayana,
    effect: (state) => {
      if (!state.unlockedActions.includes('mahayana_practice')) {
        return { ...state, unlockedActions: [...state.unlockedActions, 'mahayana_practice'], choices: { ...state.choices, flags: { ...state.choices.flags, unlocked_mahayana_practice: true } } };
      }
      return state;
    }
  },
  {
    id: 'unlock_tribulation_practice',
    condition: (state) => state.realm === Realm.Tribulation,
    effect: (state) => {
      if (!state.unlockedActions.includes('tribulation_practice')) {
        return { ...state, unlockedActions: [...state.unlockedActions, 'tribulation_practice'], choices: { ...state.choices, flags: { ...state.choices.flags, unlocked_tribulation_practice: true } } };
      }
      return state;
    }
  },
  // Secret realm actions
  {
    id: 'unlock_explore_secret_realm_action',
    condition: (state) => state.secretRealm.discoveredRealms.length > 0 && state.currentLocationId === 'home',
    effect: (state) => {
      if (!state.unlockedActions.includes('explore_secret_realm')) {
        return { ...state, unlockedActions: [...state.unlockedActions, 'explore_secret_realm'], choices: { ...state.choices, flags: { ...state.choices.flags, unlocked_explore_secret_realm: true, has_discovered_realm: true } } };
      }
      return state;
    }
  },
  {
    id: 'unlock_continue_exploration_action',
    condition: (state) => state.secretRealm.activeExploration !== null,
    effect: (state) => {
      const toAdd = ['continue_exploration', 'abandon_exploration'].filter(id => !state.unlockedActions.includes(id));
      if (toAdd.length > 0) {
        return { ...state, unlockedActions: [...state.unlockedActions, ...toAdd], choices: { ...state.choices, flags: { ...state.choices.flags, exploring_secret_realm: true } } };
      }
      return state;
    }
  },
  {
    id: 'unlock_claim_exploration_loot_action',
    condition: (state) => state.secretRealm.activeExploration !== null && state.secretRealm.explorationProgress >= 100,
    effect: (state) => {
      if (!state.unlockedActions.includes('claim_exploration_loot')) {
        return { ...state, unlockedActions: [...state.unlockedActions, 'claim_exploration_loot'], choices: { ...state.choices, flags: { ...state.choices.flags, exploration_complete: true } } };
      }
      return state;
    }
  },
  // Meditate detox action
  {
    id: 'unlock_meditate_detox_action',
    condition: (state) => state.resources.dantoxin >= 10 && Boolean(state.choices.flags['entered_qi_condensation']),
    effect: (state) => {
      if (!state.unlockedActions.includes('meditate_detox')) {
        return { ...state, unlockedActions: [...state.unlockedActions, 'meditate_detox'], choices: { ...state.choices, flags: { ...state.choices.flags, unlocked_meditate_detox: true } } };
      }
      return state;
    }
  },
];
