import { UnlockRule, Realm } from './_types';

export const HIGHREALM_UNLOCKS: UnlockRule[] = [
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
  }
];
