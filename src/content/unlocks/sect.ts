import { UnlockRule, Realm } from './_types';

export const SECT_UNLOCKS: UnlockRule[] = [
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
    id: 'unlock_sect_hall_actions',
    condition: (state) => state.sect.rank === 'inner' || state.sect.rank === 'core' || state.sect.rank === 'elder',
    effect: (state) => {
      const toAdd = ['attend_ceremony', 'receive_mission'].filter(id => !state.unlockedActions.includes(id));
      if (toAdd.length > 0) {
        return { ...state, unlockedActions: [...state.unlockedActions, ...toAdd], choices: { ...state.choices, flags: { ...state.choices.flags, unlocked_sect_hall_actions: true } } };
      }
      return state;
    }
  }
];
