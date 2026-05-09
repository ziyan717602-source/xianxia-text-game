/**
 * 弟子/杂役系统 — 弟子或杂役系统 (F7)
 */
import { GameState, Realm, Resources, Follower, FollowerState } from './types';



export function createInitialFollowerState(): FollowerState {
  return {
    followers: {},
    maxFollowers: 0,
  };
}

/** Get max followers based on dwelling level */
export function getMaxFollowers(dwellingLevel: number): number {
  switch (dwellingLevel) {
    case 1: return 1;
    case 2: return 2;
    case 3: return 3;
    default: return 0;
  }
}

/** Check if player can recruit a new follower */
export function canRecruitFollower(state: GameState, role: 'servant' | 'disciple' | 'guard'): boolean {
  const maxFollowers = getMaxFollowers(state.dwelling.level);
  const currentCount = Object.keys(state.followers.followers).length;
  if (currentCount >= maxFollowers) return false;

  if (role === 'servant') {
    return state.dwelling.level >= 1;
  }
  if (role === 'disciple') {
    return state.realm === Realm.GoldenCore && state.dwelling.level >= 2;
  }
  if (role === 'guard') {
    return state.dwelling.level >= 2;
  }
  return false;
}

/** Generate a random follower name */
function generateFollowerName(seed: number, role: string): string {
  const servantNames = ['阿福', '阿贵', '小石', '阿根', '铁柱'];
  const discipleNames = ['云隐', '清风', '明月', '寒松', '碧溪'];
  const guardNames = ['铁卫', '铜壁', '石盾', '铜锤', '铁壁'];

  const names = role === 'servant' ? servantNames : role === 'disciple' ? discipleNames : guardNames;
  return names[seed % names.length];
}

/** Recruit a new follower */
export function recruitFollower(state: GameState, role: 'servant' | 'disciple' | 'guard', seed?: number): GameState {
  if (!canRecruitFollower(state, role)) return state;

  const followerCount = Object.keys(state.followers.followers).length;
  const id = `follower_${role}_${followerCount}_${state.time.tick}`;
  const nameSeed = seed ?? (state.time.tick % 5);

  const follower: Follower = {
    id,
    name: generateFollowerName(nameSeed, role),
    role,
    loyalty: role === 'servant' ? 50 : role === 'disciple' ? 60 : 55,
    skill: role === 'servant' ? (state.seed % 4) + 1 : role === 'disciple' ? ((state.seed + 2) % 4) + 3 : ((state.seed + 1) % 3) + 2,
    taskAssignment: null,
    accumulatedIncome: { herbs: 0, coins: 0, qi: 0 },
  };

  return {
    ...state,
    followers: {
      ...state.followers,
      followers: {
        ...state.followers.followers,
        [id]: follower,
      },
      maxFollowers: getMaxFollowers(state.dwelling.level),
    },
  };
}

/** Assign a follower to a task */
export function assignFollowerTask(state: GameState, followerId: string, task: string): GameState {
  const follower = state.followers.followers[followerId];
  if (!follower) return state;

  // Validate task assignment
  if (task === 'patrol_duty' && state.sect.rank === 'none') return state;

  return {
    ...state,
    followers: {
      ...state.followers,
      followers: {
        ...state.followers.followers,
        [followerId]: {
          ...follower,
          taskAssignment: task,
        },
      },
    },
  };
}

/** Get productivity of a follower based on their task and skill */
function getFollowerProductivity(follower: Follower): { herbs: number; coins: number; qi: number } {
  if (!follower.taskAssignment) return { herbs: 0, coins: 0, qi: 0 };

  const skillFactor = follower.skill * 0.5;
  const loyaltyFactor = follower.loyalty / 100;

  switch (follower.taskAssignment) {
    case 'herb_gathering':
      return { herbs: Math.floor(skillFactor * loyaltyFactor * 2), coins: 0, qi: 0 };
    case 'patrol_duty':
      return { herbs: 0, coins: Math.floor(skillFactor * loyaltyFactor * 1.5), qi: 0 };
    case 'cultivation_aid':
      return { herbs: 0, coins: 0, qi: Math.floor(skillFactor * loyaltyFactor * 3) };
    default:
      return { herbs: 0, coins: 0, qi: 0 };
  }
}

/** Collect accumulated follower income */
export function collectFollowerIncome(state: GameState): GameState {
  let newResources = { ...state.resources };
  const newFollowers = { ...state.followers.followers };

  for (const [id, follower] of Object.entries(newFollowers)) {
    if (follower.taskAssignment) {
      const income = follower.accumulatedIncome ?? { herbs: 0, coins: 0, qi: 0 };
      newResources = {
        ...newResources,
        herbs: newResources.herbs + income.herbs,
        coins: newResources.coins + income.coins,
        qi: newResources.qi + income.qi,
      };

      // Reset accumulated income after collection; loyalty decreases slightly
      newFollowers[id] = {
        ...follower,
        loyalty: Math.max(0, follower.loyalty - 1),
        accumulatedIncome: { herbs: 0, coins: 0, qi: 0 },
      };
    }
  }

  return {
    ...state,
    resources: newResources,
    followers: {
      ...state.followers,
      followers: newFollowers,
    },
  };
}

/** Process a day's worth of follower productivity (called from tick) */
export function followerTick(state: GameState): GameState {
  // Followers with low loyalty may leave; assigned followers accumulate income and lose loyalty
  const newFollowers: Record<string, Follower> = {};
  for (const [id, follower] of Object.entries(state.followers.followers)) {
    if (follower.loyalty <= 0) {
      // Follower leaves
      continue;
    }

    // Accumulate daily income for assigned followers
    if (follower.taskAssignment) {
      const productivity = getFollowerProductivity(follower);
      const currentIncome = follower.accumulatedIncome ?? { herbs: 0, coins: 0, qi: 0 };
      newFollowers[id] = {
        ...follower,
        accumulatedIncome: {
          herbs: currentIncome.herbs + productivity.herbs,
          coins: currentIncome.coins + productivity.coins,
          qi: currentIncome.qi + productivity.qi,
        },
        loyalty: Math.max(0, follower.loyalty - 1), // small daily loyalty decay for assigned followers
      };
    } else {
      newFollowers[id] = follower;
    }
  }

  return {
    ...state,
    followers: {
      ...state.followers,
      followers: newFollowers,
      maxFollowers: getMaxFollowers(state.dwelling.level),
    },
  };
}
