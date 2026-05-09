import { UnlockRule, Realm } from './_types';

export const LOCATIONS_UNLOCKS: UnlockRule[] = [
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
  // NOTE: unlock_cave_crystal_actions removed — superseded by unlock_mountain_cave_actions
  // which uses the correct action IDs (mine_crystal, explore_depths)
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
{
    id: 'unlock_meditate_detox_action',
    condition: (state) => state.resources.dantoxin >= 10 && Boolean(state.choices.flags['entered_qi_condensation']),
    effect: (state) => {
      if (!state.unlockedActions.includes('meditate_detox')) {
        return { ...state, unlockedActions: [...state.unlockedActions, 'meditate_detox'], choices: { ...state.choices, flags: { ...state.choices.flags, unlocked_meditate_detox: true } } };
      }
      return state;
    }
  }
];
