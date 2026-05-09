import { UnlockRule, Realm } from './_types';

export const ALCHEMY_UNLOCKS: UnlockRule[] = [
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
  }
];
