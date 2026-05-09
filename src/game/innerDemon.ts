/**
 * 心魔系统 — 因果和行为积累引发心魔
 *
 * 心魔由特定条件触发，逐渐积累进度。
 * 玩家可选择直面、压制或无视。
 * 进度满100时造成严重后果。
 */

import { GameState, InnerDemonState } from './types';
import { adjustQuality } from './choices';

/** 心魔定义 */
export interface DemonDef {
  id: string;
  label: string;
  description: string;
  encounterText: string;
  /** 触发条件 */
  condition: (state: GameState) => boolean;
  /** 每次检查时的进度增量 */
  progressIncrement: number;
}

/** 四种心魔 */
export const DEMON_DEFS: DemonDef[] = [
  {
    id: 'demon_of_rashness',
    label: '冒进之魔',
    description: '贪功冒进，急躁入骨。药气乱行，气脉难安。',
    encounterText: '闭目时见火。不是外头的火，是丹田里烧出来的。你越想压，它越旺。',
    condition: (state) =>
      (state.choices.qualities.reckless_breakthrough ?? 0) >= 5 &&
      state.resources.dantoxin >= 30,
    progressIncrement: 15,
  },
  {
    id: 'demon_of_attachment',
    label: '执念之魔',
    description: '人情债重，牵挂太多。心不净，道难行。',
    encounterText: '闭目时不是黑暗，是一张张面孔。债主、恩人、旧识。他们不走。',
    condition: (state) => {
      let totalTies = 0;
      for (const rel of Object.values(state.relationships)) {
        totalTies += rel.debts + rel.favors;
      }
      return totalTies >= 8;
    },
    progressIncrement: 12,
  },
  {
    id: 'demon_of_pride',
    label: '傲慢之魔',
    description: '一途独大，目中无人。道越窄，心越骄。',
    encounterText: '你觉得自己已经无需旁人。这个念头很轻，却很执拗。',
    condition: (state) => {
      const qualities = Object.values(state.choices.qualities);
      return qualities.some(v => typeof v === 'number' && v >= 25);
    },
    progressIncrement: 10,
  },
  {
    id: 'demon_of_toxicity',
    label: '药毒之魔',
    description: '药毒侵体，丹气入心。毒即是道，道即是毒。',
    encounterText: '气机过处，不是经脉的凉意，是药气的灼热。你分不清真气和药气了。',
    condition: (state) => state.resources.dantoxin >= 80,
    progressIncrement: 20,
  },
  {
    id: 'demon_of_doubt',
    label: '疑道之魔',
    description: '道心不坚，反复自疑。前路茫茫，进退两难。',
    encounterText: '这条路对吗？你忽然不确定了。不是外头有人说，是心底的声音。',
    condition: (state) =>
      state.realmLayer >= 5 &&
      Object.values(state.breakthrough.failures).reduce((sum, f) => sum + f, 0) >= 3,
    progressIncrement: 12,
  },
  {
    id: 'demon_of_greed',
    label: '贪欲之魔',
    description: '财迷心窍，物欲障目。聚而不散，道终难圆。',
    encounterText: '又多了几两银子。你本该知足，可手还是伸了出去。停不下来。',
    condition: (state) =>
      state.resources.coins >= 100 &&
      (state.choices.qualities.market_ties ?? 0) >= 10,
    progressIncrement: 10,
  },
  {
    id: 'demon_of_fear',
    label: '怯懦之魔',
    description: '伤多畏战，怯懦成障。避祸求安，道心渐消。',
    encounterText: '伤还没好，又想退了。不是怕死，是怕再疼。这个念头像藤一样缠上来。',
    condition: (state) =>
      state.resources.wounds >= 3 &&
      (state.choices.qualities.combat_edge ?? 0) < 3,
    progressIncrement: 15,
  },
  {
    id: 'demon_of_solitude',
    label: '孤绝之魔',
    description: '无人可依，形单影只。孤独亦为道，却易入歧途。',
    encounterText: '好久没人和你说话了。不是不想说，是找不到人。静到只剩自己的呼吸。',
    condition: (state) =>
      Object.keys(state.relationships).length === 0 &&
      (state.choices.qualities.quiet_cultivation ?? 0) >= 15,
    progressIncrement: 8,
  },
];

/** 心魔进度满时的后果 */
const DEMON_CONSEQUENCE_QI_LOSS = 8;
const DEMON_CONSEQUENCE_WOUNDS = 2;
const DEMON_CONSEQUENCE_LIFESPAN_LOSS = 120;

/**
 * 检查心魔触发条件
 * 如果当前没有活跃心魔，检查是否有新心魔应触发
 * 如果当前有活跃心魔，增加进度
 */
export function checkDemonTrigger(state: GameState): { state: GameState; triggered: boolean; demonId: string | null } {
  // 如果当前有活跃心魔，增加进度
  if (state.innerDemon.activeDemon !== null) {
    const def = DEMON_DEFS.find(d => d.id === state.innerDemon.activeDemon);
    if (def && def.condition(state)) {
      const newProgress = Math.min(100, state.innerDemon.demonProgress + def.progressIncrement);
      return {
        state: {
          ...state,
          innerDemon: {
            ...state.innerDemon,
            demonProgress: newProgress,
          },
        },
        triggered: newProgress >= 100,
        demonId: state.innerDemon.activeDemon,
      };
    }
    // 条件不再满足，心魔暂时消退
    // Add to suppressedDemons to prevent immediate re-trigger
    return {
      state: {
        ...state,
        innerDemon: {
          ...state.innerDemon,
          activeDemon: null,
          demonProgress: 0,
          suppressedDemons: [...state.innerDemon.suppressedDemons, state.innerDemon.activeDemon],
        },
      },
      triggered: false,
      demonId: null,
    };
  }

  // 没有活跃心魔，检查是否应触发新的
  for (const def of DEMON_DEFS) {
    if (def.condition(state) && !state.innerDemon.suppressedDemons.includes(def.id)) {
      return {
        state: {
          ...state,
          innerDemon: {
            ...state.innerDemon,
            activeDemon: def.id,
            demonProgress: def.progressIncrement,
          },
        },
        triggered: true,
        demonId: def.id,
      };
    }
  }

  return { state, triggered: false, demonId: null };
}

/**
 * 直面心魔 — 消耗真气和精元，清除心魔，获得神识
 */
export function confrontDemon(state: GameState): { state: GameState; log: string } {
  if (state.innerDemon.activeDemon === null) {
    return { state, log: '心魔未显，无需直面。' };
  }

  const demonId = state.innerDemon.activeDemon;
  const def = DEMON_DEFS.find(d => d.id === demonId);
  const label = def?.label ?? '心魔';

  const qiCost = 5;
  const essenceCost = 20;
  const insightGain = 3;

  const newState: GameState = {
    ...state,
    resources: {
      ...state.resources,
      qi: Math.max(0, state.resources.qi - qiCost),
      essence: Math.max(0, state.resources.essence - essenceCost),
      insight: state.resources.insight + insightGain,
    },
    innerDemon: {
      ...state.innerDemon,
      activeDemon: null,
      demonProgress: 0,
      suppressedDemons: [...state.innerDemon.suppressedDemons, demonId],
    },
  };

  return {
    state: adjustQuality(newState, 'quiet_cultivation', 1),
    log: `你直面${label}。气行周天三转，魔障退去。神识多了三分。`,
  };
}

/**
 * 压制心魔 — 消耗寿元，心魔暂时消退
 */
export function suppressDemon(state: GameState): { state: GameState; log: string } {
  if (state.innerDemon.activeDemon === null) {
    return { state, log: '心魔未显，无需压制。' };
  }

  const demonId = state.innerDemon.activeDemon;
  const def = DEMON_DEFS.find(d => d.id === demonId);
  const label = def?.label ?? '心魔';

  const lifespanCost = 80;

  const newState: GameState = {
    ...state,
    resources: {
      ...state.resources,
      lifespan: Math.max(0, state.resources.lifespan - lifespanCost),
    },
    innerDemon: {
      ...state.innerDemon,
      activeDemon: null,
      demonProgress: 0,
      // 压制不加入 suppressedDemons — 心魔可以再次出现
    },
  };

  return {
    state: newState,
    log: `你以寿元为代价压住${label}。魔障暂退，但未根除。寿元少了八十刻。`,
  };
}

/**
 * 无视心魔 — 进度继续积累，进度满时造成严重后果
 */
export function ignoreDemon(state: GameState): { state: GameState; log: string } {
  if (state.innerDemon.activeDemon === null) {
    return { state, log: '心魔未显。' };
  }

  const demonId = state.innerDemon.activeDemon;
  const def = DEMON_DEFS.find(d => d.id === demonId);
  const label = def?.label ?? '心魔';

  // 进度满 100 时造成严重后果
  if (state.innerDemon.demonProgress >= 100) {
    const newState: GameState = {
      ...state,
      resources: {
        ...state.resources,
        qi: Math.max(0, state.resources.qi - DEMON_CONSEQUENCE_QI_LOSS),
        wounds: state.resources.wounds + DEMON_CONSEQUENCE_WOUNDS,
        lifespan: Math.max(0, state.resources.lifespan - DEMON_CONSEQUENCE_LIFESPAN_LOSS),
      },
      innerDemon: {
        ...state.innerDemon,
        activeDemon: null,
        demonProgress: 0,
        // 心魔发作后不算被压制，可以再次出现
      },
    };

    return {
      state: newState,
      log: `${label}发作。真气散了${DEMON_CONSEQUENCE_QI_LOSS}缕，伤添${DEMON_CONSEQUENCE_WOUNDS}处，寿元折了${DEMON_CONSEQUENCE_LIFESPAN_LOSS}刻。`,
    };
  }

  return {
    state,
    log: `你不去理会${label}。它在暗处，仍在积聚。`,
  };
}

/**
 * 心魔发作时的后果应用（当进度达到100时自动触发）
 */
export function applyDemonConsequence(state: GameState): { state: GameState; log: string } {
  if (state.innerDemon.activeDemon === null || state.innerDemon.demonProgress < 100) {
    return { state, log: '' };
  }

  const demonId = state.innerDemon.activeDemon;
  const def = DEMON_DEFS.find(d => d.id === demonId);
  const label = def?.label ?? '心魔';

  const newState: GameState = {
    ...state,
    resources: {
      ...state.resources,
      qi: Math.max(0, state.resources.qi - DEMON_CONSEQUENCE_QI_LOSS),
      wounds: state.resources.wounds + DEMON_CONSEQUENCE_WOUNDS,
      lifespan: Math.max(0, state.resources.lifespan - DEMON_CONSEQUENCE_LIFESPAN_LOSS),
    },
    innerDemon: {
      ...state.innerDemon,
      activeDemon: null,
      demonProgress: 0,
    },
  };

  return {
    state: newState,
    log: `${label}骤然发作！真气散了${DEMON_CONSEQUENCE_QI_LOSS}缕，伤添${DEMON_CONSEQUENCE_WOUNDS}处，寿元折了${DEMON_CONSEQUENCE_LIFESPAN_LOSS}刻。修为倒退，教训惨重。`,
  };
}

/**
 * 获取心魔标签
 */
export function getDemonLabel(demonId: string): string {
  return DEMON_DEFS.find(d => d.id === demonId)?.label ?? '未知';
}

/**
 * 获取心魔遭遇文本
 */
export function getDemonEncounterText(demonId: string): string {
  return DEMON_DEFS.find(d => d.id === demonId)?.encounterText ?? '';
}

/**
 * 创建初始心魔状态
 */
export function createInitialInnerDemonState(): InnerDemonState {
  return {
    activeDemon: null,
    demonProgress: 0,
    suppressedDemons: [],
  };
}
