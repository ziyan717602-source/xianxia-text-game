import { GameState, Realm, Season } from '../game/types';
import { adjustQuality, removeTag, setFlag, setTag } from '../game/choices';
import { resolveCombatEvent } from '../game/combat';
import { addRelationship, updateRelationship } from '../game/relationships';
import { LOCATIONS } from './locations';

const WOUNDED_CULTIVATOR_ID = 'wounded_cultivator';
const MARKET_KEEPER_ID = 'market_keeper';
const OUTER_GATE_CLERK_ID = 'outer_gate_clerk';
const FOUNDATION_GUARDIAN_ID = 'foundation_guardian';
const SAME_GATE_PEER_ID = 'same_gate_peer';

function uniqueTags(existing: string[], added: string[]): string[] {
  return Array.from(new Set([...existing, ...added]));
}

function touchRelationship(
  state: GameState,
  entry: {
    id: string;
    identity: string;
  },
  changes: {
    tags?: string[];
    debtsDelta?: number;
    favorsDelta?: number;
    grudgesDelta?: number;
    state?: 'Alive' | 'Departed' | 'Deceased';
  }
): GameState {
  const baseState = addRelationship(state, {
    id: entry.id,
    identity: entry.identity,
    tags: [],
    lastInteractionTick: state.time.tick,
    debts: 0,
    favors: 0,
    grudges: 0,
    state: 'Alive',
  });
  const existing = baseState.relationships[entry.id];

  return updateRelationship(baseState, entry.id, {
    tags: uniqueTags(existing.tags, changes.tags ?? []),
    lastInteractionTick: state.time.tick,
    debts: Math.max(0, existing.debts + (changes.debtsDelta ?? 0)),
    favors: Math.max(0, existing.favors + (changes.favorsDelta ?? 0)),
    grudges: Math.max(0, existing.grudges + (changes.grudgesDelta ?? 0)),
    state: changes.state ?? existing.state,
  });
}

function recordWoundedCultivator(
  state: GameState,
  changes: {
    tags: string[];
    debts?: number;
    favors?: number;
    grudges?: number;
  }
): GameState {
  const baseState = addRelationship(state, {
    id: WOUNDED_CULTIVATOR_ID,
    identity: '受伤散修',
    tags: [],
    lastInteractionTick: state.time.tick,
    debts: 0,
    favors: 0,
    grudges: 0,
    state: 'Alive',
  });
  const existing = baseState.relationships[WOUNDED_CULTIVATOR_ID];

  return updateRelationship(baseState, WOUNDED_CULTIVATOR_ID, {
    tags: uniqueTags(existing.tags, changes.tags),
    lastInteractionTick: state.time.tick,
    debts: changes.debts ?? existing.debts,
    favors: changes.favors ?? existing.favors,
    grudges: changes.grudges ?? existing.grudges,
    state: 'Departed',
  });
}

function recordMarketKeeper(
  state: GameState,
  changes: {
    tags?: string[];
    debtsDelta?: number;
    favorsDelta?: number;
    grudgesDelta?: number;
  }
): GameState {
  return touchRelationship(
    state,
    {
      id: MARKET_KEEPER_ID,
      identity: '坊市掌柜',
    },
    {
      ...changes,
      state: 'Alive',
    }
  );
}

function recordOuterGateClerk(
  state: GameState,
  changes: {
    tags?: string[];
    debtsDelta?: number;
    favorsDelta?: number;
    grudgesDelta?: number;
  }
): GameState {
  return touchRelationship(
    state,
    {
      id: OUTER_GATE_CLERK_ID,
      identity: '外门书吏',
    },
    {
      ...changes,
      state: 'Alive',
    }
  );
}

function recordFoundationGuardian(
  state: GameState,
  changes: {
    tags?: string[];
    debtsDelta?: number;
    favorsDelta?: number;
    grudgesDelta?: number;
  }
): GameState {
  return touchRelationship(
    state,
    {
      id: FOUNDATION_GUARDIAN_ID,
      identity: '外门护法',
    },
    {
      ...changes,
      state: 'Alive',
    }
  );
}

function recordSameGatePeer(
  state: GameState,
  changes: {
    tags?: string[];
    debtsDelta?: number;
    favorsDelta?: number;
    grudgesDelta?: number;
    state?: 'Alive' | 'Departed' | 'Deceased';
  }
): GameState {
  return touchRelationship(
    state,
    {
      id: SAME_GATE_PEER_ID,
      identity: '失意同门',
    },
    {
      ...changes,
      state: changes.state ?? 'Alive',
    }
  );
}

/**
 * GameEvent 需要支持更动态的条件和效果，扩展 types.ts 里的静态定义。
 * 这里使用更强类型的函数定义以便在代码中执行。
 */
export interface ActiveEvent {
  id: string;
  text: string | ((state: GameState) => string);
  weight: (state: GameState) => number;
  condition: (state: GameState) => boolean;
  choices: EventChoice[];
}

export interface EventChoice {
  text: string;
  effect: (state: GameState) => { state: GameState; log: string };
}

export const EVENTS: ActiveEvent[] = [
  {
    id: 'find_jade_slip',
    text: '破败的茅草屋角落里，你在枯坐中摸到了一块沾满灰尘的硬物。抹去灰尘，竟是一枚残破的玉简。玉简边缘锐利，不小心划破了你的手指。',
    condition: (state) => !state.choices.flags['found_jade_slip'] && state.resources.insight >= 2,
    weight: () => 100, // 只要满足条件就很容易触发
    choices: [
      {
        text: '探查玉简',
        effect: (state) => {
          const newState = { ...state };
          // 刺痛带来神识的开启和一丝灵气
          newState.resources = { ...state.resources, qi: state.resources.qi + 1 };
          newState.choices = { ...state.choices, flags: { ...state.choices.flags, 'found_jade_slip': true } };
          return { state: newState, log: '一丝微凉的气息顺着指尖游走全身，你仿佛看到了玉简中记录的吐纳之法。' };
        }
      }
    ]
  },
  {
    id: 'wounded_cultivator',
    text: '山路两旁药香异常，你闻到一丝血腥味，发现一名受伤的散修倒在草丛中。',
    condition: (state) => state.currentLocationId === 'mountain_path' && !state.choices.flags['met_wounded_cultivator'],
    weight: (state) => 20 + (LOCATIONS[state.currentLocationId]?.danger ?? 0) * 4,
    choices: [
      {
        text: '施以援手 (消耗 5 药)',
        effect: (state) => {
          if (state.resources.herbs < 5) {
            let newState = { ...state };
            newState.choices = { ...state.choices, flags: { ...state.choices.flags, 'met_wounded_cultivator': true } };
            newState = recordWoundedCultivator(newState, { tags: ['错过援手'], grudges: 1 });
            return { state: newState, log: '你身上没有足够的草药。散修看了你一眼，拖着残躯离开。' };
          }
          const newState = { ...state };
          newState.resources = { ...state.resources, herbs: state.resources.herbs - 5 };
          newState.choices = { ...state.choices, flags: { ...state.choices.flags, 'met_wounded_cultivator': true } };
          return {
            state: recordWoundedCultivator(newState, { tags: ['受你援手', '欠人情'], favors: 1 }),
            log: '你用草药为其止血。散修记下你的住处，随后离去。'
          };
        }
      },
      {
        text: '冷眼旁观',
        effect: (state) => {
          const newState = { ...state };
          newState.choices = { ...state.choices, flags: { ...state.choices.flags, 'met_wounded_cultivator': true } };
          return {
            state: recordWoundedCultivator(newState, { tags: ['旁观'], grudges: 1 }),
            log: '你站在路旁。散修最终自行离去，眼神平静。'
          };
        }
      },
      {
        text: '搜刮财物',
        effect: (state) => {
          const newState = { ...state };
          newState.resources = { ...state.resources, coins: state.resources.coins + 20 };
          newState.choices = { ...state.choices, flags: { ...state.choices.flags, 'met_wounded_cultivator': true, 'robbed_cultivator': true } };
          return {
            state: recordWoundedCultivator(newState, { tags: ['被你搜掠'], grudges: 2 }),
            log: '你取走了散修的钱袋。这笔因果记在山路上。'
          };
        }
      }
    ]
  },
  {
    id: 'market_rumor',
    text: '坊市中人声鼎沸，你听到几个商人在谈论附近的秘境。',
    condition: (state) => state.currentLocationId === 'market' && !state.choices.flags['heard_rumor_1'],
    weight: () => 30,
    choices: [
      {
        text: '驻足倾听',
        effect: (state) => {
          const newState = { ...state };
          newState.resources = { ...state.resources, insight: state.resources.insight + 2 };
          newState.choices = { ...state.choices, flags: { ...state.choices.flags, 'heard_rumor_1': true } };
          return { state: newState, log: '你听闻了些许修行界轶事，见闻有所增长。' };
        }
      }
    ]
  },
  {
    id: 'rain_after_sprouts',
    text: '雨后山路泥深。石缝旁冒出一簇新芽，叶尖带着淡淡凉意。',
    condition: (state) =>
      state.currentLocationId === 'mountain_path' &&
      state.time.season === Season.Spring &&
      state.resources.herbs > 0 &&
      !state.choices.flags['found_rain_after_sprouts'],
    weight: (state) => 14 + (state.choices.qualities['alchemy_affinity'] ?? 0) * 2,
    choices: [
      {
        text: '采下新芽',
        effect: (state) => {
          let newState = { ...state };
          newState.resources = { ...state.resources, herbs: state.resources.herbs + 3 };
          newState = setFlag(newState, 'found_rain_after_sprouts');
          newState = adjustQuality(newState, 'alchemy_affinity', 1);
          return { state: newState, log: '你采下新芽。草药添了三株，药性仍需细辨。' };
        },
      },
      {
        text: '留种标记',
        effect: (state) => {
          let newState = { ...state };
          newState.resources = { ...state.resources, herbs: state.resources.herbs + 1, insight: state.resources.insight + 1 };
          newState = setFlag(newState, 'found_rain_after_sprouts');
          newState = setFlag(newState, 'marked_herb_patch');
          newState = adjustQuality(newState, 'alchemy_affinity', 2);
          return { state: newState, log: '你只取一株，余下用石片记住。山路多了一处可回头的痕迹。' };
        },
      },
      {
        text: '只记药形',
        effect: (state) => {
          let newState = { ...state };
          newState.resources = { ...state.resources, insight: state.resources.insight + 2 };
          newState = setFlag(newState, 'found_rain_after_sprouts');
          newState = adjustQuality(newState, 'quiet_cultivation', 1);
          return { state: newState, log: '你蹲下看了许久，没有动手。药形记下，草仍在石缝里。' };
        },
      },
    ],
  },
  {
    id: 'wounded_cultivator_return',
    text: '山路转弯处，那名受伤散修再次出现。他伤势未全好，手里提着一只旧布袋。',
    condition: (state) => {
      const relationship = state.relationships[WOUNDED_CULTIVATOR_ID];
      return (
        state.currentLocationId === 'mountain_path' &&
        !!relationship &&
        relationship.favors > 0 &&
        !state.choices.flags['wounded_cultivator_returned']
      );
    },
    weight: (state) => 12 + (state.relationships[WOUNDED_CULTIVATOR_ID]?.favors ?? 0) * 12,
    choices: [
      {
        text: '收下谢礼',
        effect: (state) => {
          let newState = { ...state };
          newState.resources = { ...state.resources, coins: state.resources.coins + 15 };
          newState = setFlag(newState, 'wounded_cultivator_returned');
          newState = touchRelationship(
            newState,
            { id: WOUNDED_CULTIVATOR_ID, identity: '受伤散修' },
            { tags: ['还过人情'], favorsDelta: -1, state: 'Departed' }
          );
          return { state: newState, log: '旧布袋里是十五枚钱。散修把人情还了一半，转身入山。' };
        },
      },
      {
        text: '问山中去路',
        effect: (state) => {
          let newState = { ...state };
          newState.resources = { ...state.resources, insight: state.resources.insight + 2 };
          newState = setFlag(newState, 'wounded_cultivator_returned');
          newState = setFlag(newState, 'heard_herb_slope_hint');
          newState = touchRelationship(
            newState,
            { id: WOUNDED_CULTIVATOR_ID, identity: '受伤散修' },
            { tags: ['指过山路'], favorsDelta: -1, state: 'Departed' }
          );
          return { state: newState, log: '他指出一处药坡，说完便走。你记下了路。' };
        },
      },
      {
        text: '不取',
        effect: (state) => {
          let newState = setFlag(state, 'wounded_cultivator_returned');
          newState = adjustQuality(newState, 'quiet_cultivation', 1);
          newState = touchRelationship(
            newState,
            { id: WOUNDED_CULTIVATOR_ID, identity: '受伤散修' },
            { tags: ['谢礼未取'], state: 'Departed' }
          );
          return { state: newState, log: '你没有接布袋。散修站了一会，照旧离开。' };
        },
      },
    ],
  },
  {
    id: 'wounded_cultivator_grudge',
    text: '山路尽头有人拦路。你认出那名散修，他也认出了你。',
    condition: (state) => {
      const relationship = state.relationships[WOUNDED_CULTIVATOR_ID];
      return (
        state.currentLocationId === 'mountain_path' &&
        !!relationship &&
        relationship.grudges > 0 &&
        !state.choices.flags['wounded_cultivator_grudge_met']
      );
    },
    weight: (state) =>
      10 +
      (state.relationships[WOUNDED_CULTIVATOR_ID]?.grudges ?? 0) * 10 +
      (LOCATIONS[state.currentLocationId]?.danger ?? 0) * 2,
    choices: [
      {
        text: '绕路避开',
        effect: (state) => {
          let newState = { ...state };
          newState.resources = { ...state.resources, essence: Math.max(0, state.resources.essence - 10) };
          newState = setFlag(newState, 'wounded_cultivator_grudge_met');
          newState = adjustQuality(newState, 'quiet_cultivation', 1);
          return { state: newState, log: '你绕过山坳，白走一段路。事情没有了结。' };
        },
      },
      {
        text: '交涉',
        effect: (state) => {
          let newState = { ...state };
          if (newState.resources.coins >= 5) {
            newState.resources = { ...newState.resources, coins: newState.resources.coins - 5 };
            newState = touchRelationship(
              newState,
              { id: WOUNDED_CULTIVATOR_ID, identity: '受伤散修' },
              { tags: ['收过赔礼'], grudgesDelta: -1, state: 'Departed' }
            );
            newState = setFlag(newState, 'wounded_cultivator_grudge_met');
            return { state: newState, log: '你递出五枚钱。散修收下，仍未多说。' };
          }

          newState.resources = { ...newState.resources, wounds: newState.resources.wounds + 1 };
          newState = setFlag(newState, 'wounded_cultivator_grudge_met');
          return { state: newState, log: '言语不成，他抬手掷来碎石。你添了一处伤。' };
        },
      },
      {
        text: '斗法',
        effect: (state) => {
          const result = resolveCombatEvent(
            state,
            'fight',
            { id: WOUNDED_CULTIVATOR_ID, name: '受伤散修', realm: Realm.QiCondensation, power: 6 },
            () => 0.5
          );
          let newState = setFlag(result.state, 'wounded_cultivator_grudge_met');
          newState = touchRelationship(
            newState,
            { id: WOUNDED_CULTIVATOR_ID, identity: '受伤散修' },
            { tags: result.success ? ['斗法败于你'] : ['斗法胜你'], grudgesDelta: result.success ? -1 : 1, state: 'Departed' }
          );
          return { state: newState, log: result.log };
        },
      },
    ],
  },
  {
    id: 'market_price_rise',
    text: '坊市草药价忽然上浮。掌柜照常拨算盘，门口挂着新到货的木牌。',
    condition: (state) => state.currentLocationId === 'market' && !state.choices.flags['market_price_rise_seen'],
    weight: (state) => (state.time.season === Season.Autumn || state.time.season === Season.Winter ? 24 : 8),
    choices: [
      {
        text: '买入十钱草药',
        effect: (state) => {
          let newState = { ...state };
          newState = setFlag(newState, 'market_price_rise_seen');

          if (newState.resources.coins < 10) {
            newState = recordMarketKeeper(newState, { tags: ['看货未买'] });
            return { state: newState, log: '你钱不够。掌柜把木牌翻回去，算盘声不停。' };
          }

          newState.resources = {
            ...newState.resources,
            coins: newState.resources.coins - 10,
            herbs: newState.resources.herbs + 3,
          };
          newState = adjustQuality(newState, 'market_ties', 1);
          newState = recordMarketKeeper(newState, { tags: ['熟客'] });
          return { state: newState, log: '十枚钱换来三包草药。价贵，货真。' };
        },
      },
      {
        text: '观望行情',
        effect: (state) => {
          let newState = setFlag(state, 'market_price_rise_seen');
          newState.resources = { ...newState.resources, insight: newState.resources.insight + 1 };
          newState = adjustQuality(newState, 'market_ties', 1);
          newState = recordMarketKeeper(newState, { tags: ['观望行情'] });
          return { state: newState, log: '你看了一阵。涨价不只一家，山中药路大约出了事。' };
        },
      },
      {
        text: '赊账取药',
        effect: (state) => {
          let newState = setFlag(state, 'market_price_rise_seen');
          newState.resources = { ...newState.resources, herbs: newState.resources.herbs + 2 };
          newState = adjustQuality(newState, 'market_ties', 2);
          newState = recordMarketKeeper(newState, { tags: ['赊账'], debtsDelta: 1 });
          return { state: newState, log: '掌柜记下一笔账，给了两包草药。账本不会忘。' };
        },
      },
    ],
  },
  {
    id: 'outer_gate_rules',
    text: '坊市角落有人议论外门规矩。名册、贡献、巡山时辰，几句话说得很碎。',
    condition: (state) =>
      (state.currentLocationId === 'market' || state.currentLocationId === 'outer_gate') &&
      (state.choices.flags['heard_rumor_1'] || state.realm === Realm.QiCondensation) &&
      !state.choices.flags['heard_outer_gate_rules'],
    weight: (state) => 8 + (state.choices.qualities['market_ties'] ?? 0) * 2,
    choices: [
      {
        text: '记下规矩',
        effect: (state) => {
          let newState = setFlag(state, 'heard_outer_gate_rules');
          newState = setTag(newState, 'sect_trace', 'heard_rules');
          newState.resources = { ...newState.resources, insight: newState.resources.insight + 1 };
          newState = adjustQuality(newState, 'sect_trace', 1);
          return { state: newState, log: '你记下几条外门规矩。字句冷硬，却有用。' };
        },
      },
      {
        text: '花钱细问',
        effect: (state) => {
          let newState = setFlag(state, 'heard_outer_gate_rules');
          if (newState.resources.coins >= 5) {
            newState.resources = {
              ...newState.resources,
              coins: newState.resources.coins - 5,
              insight: newState.resources.insight + 2,
            };
            newState = adjustQuality(newState, 'market_ties', 1);
            newState = adjustQuality(newState, 'sect_trace', 2);
            newState = setTag(newState, 'sect_trace', 'asked_rules');
            return { state: newState, log: '五枚钱换来一份旧名册。外门离你近了一点。' };
          }

          newState.resources = { ...newState.resources, insight: newState.resources.insight + 1 };
          newState = setTag(newState, 'sect_trace', 'heard_rules');
          return { state: newState, log: '你没钱细问，只记住几句边角话。' };
        },
      },
      {
        text: '不听',
        effect: (state) => {
          let newState = setFlag(state, 'heard_outer_gate_rules');
          newState = setFlag(newState, 'dismissed_outer_gate_rules');
          newState = adjustQuality(newState, 'quiet_cultivation', 1);
          return { state: newState, log: '你离开人群。规矩仍在那里，不因你听不听而改。' };
        },
      },
    ],
  },
  {
    id: 'outer_gate_register',
    text: '外门石阶前坐着一名书吏。桌上一册薄簿，墨迹未干。',
    condition: (state) =>
      state.currentLocationId === 'outer_gate' &&
      state.realm === Realm.QiCondensation &&
      Boolean(state.choices.flags['heard_outer_gate_rules']) &&
      !state.choices.flags['outer_gate_clerk_seen'],
    weight: (state) => 18 + (state.choices.qualities['sect_trace'] ?? 0) * 4,
    choices: [
      {
        text: '照名登记（三钱）',
        effect: (state) => {
          let newState = setFlag(state, 'outer_gate_clerk_seen');

          if (newState.resources.coins < 3) {
            newState = recordOuterGateClerk(newState, { tags: ['钱不足未记'] });
            return { state: newState, log: '你钱不够。书吏合上薄簿，未多看你。' };
          }

          newState.resources = { ...newState.resources, coins: newState.resources.coins - 3 };
          newState = setFlag(newState, 'outer_gate_registered');
          newState = setTag(newState, 'sect_trace', 'registered');
          newState = adjustQuality(newState, 'sect_trace', 2);
          newState = recordOuterGateClerk(newState, { tags: ['记名'] });
          return { state: newState, log: '三枚钱落入木匣。书吏在薄簿上添了你的名字。' };
        },
      },
      {
        text: '问短差',
        effect: (state) => {
          let newState = setFlag(state, 'outer_gate_clerk_seen');
          newState = setFlag(newState, 'accepted_outer_gate_errand');
          newState = setTag(newState, 'sect_trace', 'errand');
          newState.resources = { ...newState.resources, insight: newState.resources.insight + 1 };
          newState = adjustQuality(newState, 'sect_trace', 2);
          newState = recordOuterGateClerk(newState, { tags: ['给过短差'] });
          return { state: newState, log: '书吏递来一张小条。差事不重，限期很明。' };
        },
      },
      {
        text: '退下不记',
        effect: (state) => {
          let newState = setFlag(state, 'outer_gate_clerk_seen');
          newState = adjustQuality(newState, 'quiet_cultivation', 1);
          return { state: newState, log: '你退到阶下。薄簿仍摊在那里。' };
        },
      },
    ],
  },
  {
    id: 'outer_gate_peer_failure',
    text: '外门阶侧有人收功失败。那人衣袖上还沾着炉灰，气息散得很慢。',
    condition: (state) =>
      state.currentLocationId === 'outer_gate' &&
      state.realm !== Realm.Mortal &&
      (
        Boolean(state.choices.flags['outer_gate_registered']) ||
        Boolean(state.choices.flags['completed_sect_errand']) ||
        (state.choices.qualities['sect_trace'] ?? 0) >= 2
      ) &&
      !state.choices.flags['outer_gate_peer_failure_seen'],
    weight: (state) =>
      16 +
      (state.choices.qualities['sect_trace'] ?? 0) * 3 +
      Math.min(12, state.resources.dantoxin),
    choices: [
      {
        text: '递稳息散',
        effect: (state) => {
          let newState = setFlag(state, 'outer_gate_peer_failure_seen');

          if (newState.resources.stabilizingPowders < 1) {
            newState.resources = { ...newState.resources, insight: newState.resources.insight + 1 };
            newState = setFlag(newState, 'same_gate_peer_needed_powder');
            newState = adjustQuality(newState, 'alchemy_affinity', 1);
            newState = recordSameGatePeer(newState, { tags: ['求稳息散未得'] });
            return { state: newState, log: '你没有稳息散，只记下他气乱的样子。' };
          }

          newState.resources = {
            ...newState.resources,
            stabilizingPowders: newState.resources.stabilizingPowders - 1,
          };
          newState = setFlag(newState, 'helped_same_gate_with_powder');
          newState = adjustQuality(newState, 'alchemy_affinity', 1);
          newState = adjustQuality(newState, 'sect_contribution', 1);
          newState = recordSameGatePeer(newState, { tags: ['受稳息散', '欠你药情'], favorsDelta: 1 });
          return { state: newState, log: '一包稳息散递过去。他压住乱气，向你记下一礼。' };
        },
      },
      {
        text: '借小聚气丸',
        effect: (state) => {
          let newState = setFlag(state, 'outer_gate_peer_failure_seen');

          if (newState.resources.qiPills < 1) {
            newState.resources = { ...newState.resources, insight: newState.resources.insight + 1 };
            newState = setFlag(newState, 'same_gate_peer_asked_qi_pill');
            newState = recordSameGatePeer(newState, { tags: ['借丹未成'] });
            return { state: newState, log: '你身上没有小聚气丸。那人点头，仍坐回阶侧。' };
          }

          newState.resources = {
            ...newState.resources,
            qiPills: newState.resources.qiPills - 1,
          };
          newState = setFlag(newState, 'same_gate_peer_qi_pill_debt_open');
          newState = adjustQuality(newState, 'sect_trace', 1);
          newState = adjustQuality(newState, 'karmic_weight', 1);
          newState = recordSameGatePeer(newState, { tags: ['借过小聚气丸'], debtsDelta: 1 });
          return { state: newState, log: '你借出一枚小聚气丸。药能续气，账也随之落下。' };
        },
      },
      {
        text: '只看一眼',
        effect: (state) => {
          let newState = setFlag(state, 'outer_gate_peer_failure_seen');
          newState.resources = { ...newState.resources, insight: newState.resources.insight + 1 };
          newState = setFlag(newState, 'left_same_gate_peer_failed');
          newState = adjustQuality(newState, 'quiet_cultivation', 1);
          newState = recordSameGatePeer(newState, { tags: ['被你旁观'], grudgesDelta: 1 });
          return { state: newState, log: '你看了一眼，没有停步。外门阶侧的炉灰仍在。' };
        },
      },
    ],
  },
  {
    id: 'same_gate_peer_return',
    text: '那名同门又在外门阶侧出现。气息比上回稳些，袖口仍有旧炉灰。',
    condition: (state) => {
      const relationship = state.relationships[SAME_GATE_PEER_ID];
      return (
        state.currentLocationId === 'outer_gate' &&
        !!relationship &&
        (relationship.favors > 0 || relationship.debts > 0 || relationship.grudges > 0) &&
        !state.choices.flags['same_gate_peer_return_seen']
      );
    },
    weight: (state) => {
      const relationship = state.relationships[SAME_GATE_PEER_ID];
      return 18 + (relationship?.favors ?? 0) * 8 + (relationship?.debts ?? 0) * 8 + (relationship?.grudges ?? 0) * 6;
    },
    choices: [
      {
        text: '收回药账',
        effect: (state) => {
          let newState = setFlag(state, 'same_gate_peer_return_seen');
          const relationship = newState.relationships[SAME_GATE_PEER_ID];

          if (!relationship || relationship.debts <= 0) {
            newState.resources = { ...newState.resources, insight: newState.resources.insight + 1 };
            newState = recordSameGatePeer(newState, { tags: ['无账可还'] });
            return { state: newState, log: '他没有可还的账，只说了两句外门近事。' };
          }

          newState.resources = { ...newState.resources, coins: newState.resources.coins + 6 };
          newState = setFlag(newState, 'same_gate_peer_debt_settled');
          newState = setFlag(newState, 'same_gate_peer_qi_pill_debt_open', false);
          newState = adjustQuality(newState, 'market_ties', 1);
          newState = recordSameGatePeer(newState, { tags: ['还过药账'], debtsDelta: -1 });
          return { state: newState, log: '他还来六枚钱。药账划去，人情未必也划去。' };
        },
      },
      {
        text: '问冲关得失',
        effect: (state) => {
          let newState = setFlag(state, 'same_gate_peer_return_seen');
          newState.resources = { ...newState.resources, insight: newState.resources.insight + 2 };
          newState = setFlag(newState, 'same_gate_peer_shared_breakthrough_lesson');
          newState = adjustQuality(newState, 'quiet_cultivation', 1);
          newState = adjustQuality(newState, 'sect_trace', 1);
          newState = recordSameGatePeer(newState, { tags: ['说过冲关得失'], favorsDelta: -1 });
          return { state: newState, log: '他把那日气乱处说了一遍。话不长，关口却清楚一点。' };
        },
      },
      {
        text: '不再牵连',
        effect: (state) => {
          let newState = setFlag(state, 'same_gate_peer_return_seen');
          newState = setFlag(newState, 'same_gate_peer_left_open');
          newState = adjustQuality(newState, 'quiet_cultivation', 1);
          newState = recordSameGatePeer(newState, { tags: ['旧事未结'], state: 'Departed' });
          return { state: newState, log: '你没有再问。那人站了一会，沿阶下去。' };
        },
      },
    ],
  },
  {
    id: 'same_gate_foundation_revisit',
    text: '筑基之后再过外门石阶，那名失意同门也在。旧炉灰洗去一些，眼神仍停在册页外。',
    condition: (state) => {
      const relationship = state.relationships[SAME_GATE_PEER_ID];
      return (
        state.currentLocationId === 'outer_gate' &&
        state.realm === Realm.FoundationEstablishment &&
        Boolean(state.choices.flags['reached_foundation']) &&
        !!relationship &&
        (
          Boolean(state.choices.flags['same_gate_peer_return_seen']) ||
          relationship.favors > 0 ||
          relationship.debts > 0 ||
          relationship.grudges > 0
        ) &&
        !state.choices.flags['same_gate_foundation_revisit_seen']
      );
    },
    weight: (state) => {
      const relationship = state.relationships[SAME_GATE_PEER_ID];
      return (
        18 +
        (relationship?.favors ?? 0) * 6 +
        (relationship?.debts ?? 0) * 5 +
        (relationship?.grudges ?? 0) * 4 +
        (state.choices.qualities['sect_trace'] ?? 0) * 2
      );
    },
    choices: [
      {
        text: '引他看筑基册',
        effect: (state) => {
          let newState = setFlag(state, 'same_gate_foundation_revisit_seen');
          const hasRegistryPath =
            Boolean(newState.choices.flags['foundation_registered_outer_gate']) ||
            Boolean(newState.choices.flags['foundation_registered_by_service']) ||
            newState.choices.tags['sect_status'] === 'foundation_registered' ||
            newState.choices.tags['sect_status'] === 'foundation_service';

          if (!hasRegistryPath) {
            newState.resources = { ...newState.resources, insight: newState.resources.insight + 1 };
            newState = setFlag(newState, 'same_gate_registry_path_unclear');
            newState = adjustQuality(newState, 'sect_trace', 1);
            newState = recordSameGatePeer(newState, { tags: ['问过筑基册'] });
            return { state: newState, log: '你也未入清楚的册。两人看了一阵，书吏没有多话。' };
          }

          newState.resources = {
            ...newState.resources,
            essence: Math.max(0, newState.resources.essence - 20),
          };
          newState = setFlag(newState, 'same_gate_guided_to_foundation_registry');
          newState = adjustQuality(newState, 'sect_contribution', 1);
          newState = adjustQuality(newState, 'sect_discipline', 1);
          newState = recordSameGatePeer(newState, { tags: ['得看筑基册'], debtsDelta: -1, favorsDelta: 1 });
          newState = recordOuterGateClerk(newState, { tags: ['给同门看册'], favorsDelta: 1 });
          return { state: newState, log: '你带他看了一眼筑基册。名字未必马上落墨，路却清楚了一点。' };
        },
      },
      {
        text: '借洞府静坐',
        effect: (state) => {
          let newState = setFlag(state, 'same_gate_foundation_revisit_seen');

          if (!newState.choices.flags['cave_dwelling']) {
            newState.resources = { ...newState.resources, insight: newState.resources.insight + 1 };
            newState = setFlag(newState, 'same_gate_noted_cave_need');
            newState = adjustQuality(newState, 'quiet_cultivation', 1);
            newState = recordSameGatePeer(newState, { tags: ['问过静坐处'] });
            return { state: newState, log: '你还没有可借的洞府。他只问了几句静坐法，便收声。' };
          }

          newState.resources = {
            ...newState.resources,
            qi: Math.max(0, newState.resources.qi - 4),
          };
          newState = setFlag(newState, 'same_gate_used_cave_dwelling');
          newState = setFlag(newState, 'cave_dwelling_upkeep_pending');
          newState = setFlag(newState, 'cave_dwelling_upkeep_seen', false);
          newState = setTag(newState, 'dwelling', 'cave_dwelling_shared');
          newState = adjustQuality(newState, 'quiet_cultivation', 1);
          newState = adjustQuality(newState, 'karmic_weight', -1);
          newState = recordSameGatePeer(newState, { tags: ['入洞府静坐'], favorsDelta: 1, grudgesDelta: -1 });
          return { state: newState, log: '你借出一段洞府清静。真气少了四缕，洞府维护也多了一笔。' };
        },
      },
      {
        text: '各行其路',
        effect: (state) => {
          const relationship = state.relationships[SAME_GATE_PEER_ID];
          let newState = setFlag(state, 'same_gate_foundation_revisit_seen');
          newState = setFlag(newState, 'same_gate_after_foundation_left_open');
          newState = adjustQuality(newState, 'quiet_cultivation', 1);

          if ((relationship?.grudges ?? 0) > 0) {
            newState = adjustQuality(newState, 'karmic_weight', 1);
          }

          newState = recordSameGatePeer(newState, { tags: ['筑基后各行其路'], state: 'Departed' });
          return { state: newState, log: '你没有停步。他也没有叫住你。石阶照旧向上。' };
        },
      },
    ],
  },
  {
    id: 'dantoxin_in_meridians',
    text: '夜里行气，药滞不散。气机过腕时有细刺，丹毒已经入脉。',
    condition: (state) =>
      state.currentLocationId === 'home' &&
      state.realm === Realm.QiCondensation &&
      state.resources.dantoxin >= 60 &&
      !state.choices.flags['dantoxin_in_meridians_seen'],
    weight: (state) => 36 + Math.min(24, Math.max(0, state.resources.dantoxin - 60)),
    choices: [
      {
        text: '静坐逼毒',
        effect: (state) => {
          let newState = setFlag(state, 'dantoxin_in_meridians_seen');

          if (newState.resources.essence < 40) {
            newState.resources = {
              ...newState.resources,
              dantoxin: newState.resources.dantoxin + 2,
              wounds: newState.resources.wounds + 1,
            };
            return { state: newState, log: '精元不足，药气反冲。丹毒更浊，伤添一处。' };
          }

          newState.resources = {
            ...newState.resources,
            essence: newState.resources.essence - 40,
            qi: Math.max(0, newState.resources.qi - 4),
            dantoxin: Math.max(0, newState.resources.dantoxin - 10),
            lifespan: Math.max(0, newState.resources.lifespan - 30),
          };
          newState = setFlag(newState, 'forced_out_dantoxin');
          newState = adjustQuality(newState, 'quiet_cultivation', 1);
          return { state: newState, log: '你闭门一夜，逼出些许药滞。真气折了四缕，寿元少了三十刻。' };
        },
      },
      {
        text: '翻检清躁方',
        effect: (state) => {
          let newState = setFlag(state, 'dantoxin_in_meridians_seen');
          newState = setFlag(newState, 'sought_cleansing_formula');
          newState.resources = {
            ...newState.resources,
            insight: newState.resources.insight + (newState.resources.herbs > 0 ? 2 : 1),
            herbs: Math.max(0, newState.resources.herbs - 1),
          };
          newState = adjustQuality(newState, 'alchemy_affinity', 1);
          return { state: newState, log: '你拆了几味旧药，翻出一条清躁的路数。方还不全，但可辨。' };
        },
      },
      {
        text: '强行压下',
        effect: (state) => {
          let newState = setFlag(state, 'dantoxin_in_meridians_seen');
          newState = setFlag(newState, 'suppressed_dantoxin_heat');
          newState.resources = {
            ...newState.resources,
            qi: newState.resources.qi + 2,
            dantoxin: newState.resources.dantoxin + 5,
            wounds: newState.resources.wounds + 1,
          };
          newState = adjustQuality(newState, 'reckless_breakthrough', 2);
          return { state: newState, log: '你把药气硬压入丹田。真气浮起两缕，脉里多了一处暗伤。' };
        },
      },
    ],
  },
  {
    id: 'chronic_dantoxin_residue',
    text: '药滞积久，行气时不再只是细刺。几处经络像有旧灰，平日不显，闭目便在。',
    condition: (state) =>
      state.currentLocationId === 'home' &&
      state.realm !== Realm.Mortal &&
      state.resources.dantoxin >= 45 &&
      Boolean(state.choices.flags['chronic_dantoxin_pending']) &&
      !state.choices.flags['chronic_dantoxin_seen'],
    weight: (state) =>
      26 +
      Math.min(24, Math.max(0, state.resources.dantoxin - 45)) +
      (state.choices.qualities['alchemy_affinity'] ?? 0) * 2,
    choices: [
      {
        text: '闭关清药',
        effect: (state) => {
          let newState = setFlag(state, 'chronic_dantoxin_seen');
          newState = setFlag(newState, 'chronic_dantoxin_pending', false);

          if (newState.resources.essence < 50) {
            newState.resources = {
              ...newState.resources,
              dantoxin: newState.resources.dantoxin + 2,
              wounds: newState.resources.wounds + 1,
            };
            newState = setFlag(newState, 'chronic_dantoxin_unresolved');
            return { state: newState, log: '精元不足，药灰没有清下去。经络反添一处滞涩。' };
          }

          newState.resources = {
            ...newState.resources,
            essence: newState.resources.essence - 50,
            qi: Math.max(0, newState.resources.qi - 6),
            dantoxin: Math.max(0, newState.resources.dantoxin - 18),
            lifespan: Math.max(0, newState.resources.lifespan - 80),
          };
          newState = setFlag(newState, 'chronic_dantoxin_tended');
          newState = setFlag(newState, 'dantoxin_rooted_in_channels', newState.resources.dantoxin >= 45);
          newState = adjustQuality(newState, 'quiet_cultivation', 2);
          newState = adjustQuality(newState, 'alchemy_affinity', 1);
          return { state: newState, log: '你闭关清药。真气折去六缕，丹毒退十八分，寿元也少了八十刻。' };
        },
      },
      {
        text: '连服清躁丸',
        effect: (state) => {
          let newState = setFlag(state, 'chronic_dantoxin_seen');
          newState = setFlag(newState, 'chronic_dantoxin_pending', false);

          if (newState.resources.cleansingPills < 1) {
            newState.resources = { ...newState.resources, insight: newState.resources.insight + 1 };
            newState = setFlag(newState, 'chronic_dantoxin_needs_cleansing_pill');
            newState = adjustQuality(newState, 'alchemy_affinity', 1);
            return { state: newState, log: '清躁丸不在手边。你只把药灰入脉的轻重记了下来。' };
          }

          newState.resources = {
            ...newState.resources,
            cleansingPills: newState.resources.cleansingPills - 1,
            essence: Math.max(0, newState.resources.essence - 12),
            dantoxin: Math.max(0, newState.resources.dantoxin - 24),
            wounds: Math.max(0, newState.resources.wounds - 1),
          };
          newState = setFlag(newState, 'chronic_dantoxin_cleansed_by_pill');
          newState = setFlag(newState, 'dantoxin_rooted_in_channels', newState.resources.dantoxin >= 45);
          newState = adjustQuality(newState, 'alchemy_affinity', 2);
          return { state: newState, log: '清躁丸寒苦下行。丹毒退二十四分，暗伤轻一处，精元也被压下。' };
        },
      },
      {
        text: '借药性压住',
        effect: (state) => {
          let newState = setFlag(state, 'chronic_dantoxin_seen');
          newState = setFlag(newState, 'chronic_dantoxin_pending', false);
          newState.resources = {
            ...newState.resources,
            qi: newState.resources.qi + 4,
            dantoxin: newState.resources.dantoxin + 8,
            wounds: newState.resources.wounds + 1,
            lifespan: Math.max(0, newState.resources.lifespan - 60),
          };
          newState = setFlag(newState, 'chronic_dantoxin_pressed_down');
          newState = setFlag(newState, 'dantoxin_rooted_in_channels');
          newState = adjustQuality(newState, 'reckless_breakthrough', 2);
          return { state: newState, log: '你借药性压住旧灰。真气浮起四缕，丹毒、暗伤和寿元各记一笔。' };
        },
      },
    ],
  },
  {
    id: 'foundation_scar_aches',
    text: '筑基未成后，骨缝里仍有冷意。旧伤并不催人，只在行气时露出一点边。',
    condition: (state) =>
      state.currentLocationId === 'home' &&
      state.realm === Realm.QiCondensation &&
      Boolean(state.choices.flags['foundation_scar']) &&
      !state.choices.flags['foundation_scar_aches_seen'],
    weight: (state) => 26 + state.resources.wounds * 8,
    choices: [
      {
        text: '闭门养骨',
        effect: (state) => {
          let newState = setFlag(state, 'foundation_scar_aches_seen');

          if (newState.resources.essence < 40) {
            newState.resources = {
              ...newState.resources,
              wounds: newState.resources.wounds + 1,
            };
            return { state: newState, log: '精元不足，强行行气只把旧伤翻起。伤添一处。' };
          }

          newState.resources = {
            ...newState.resources,
            essence: newState.resources.essence - 40,
            wounds: Math.max(0, newState.resources.wounds - 1),
            lifespan: Math.max(0, newState.resources.lifespan - 60),
          };
          newState = setFlag(newState, 'nursed_foundation_scar');
          newState = adjustQuality(newState, 'quiet_cultivation', 1);
          return { state: newState, log: '你闭门养骨。旧伤退了一分，寿元也照常少去。' };
        },
      },
      {
        text: '寻药缓伤',
        effect: (state) => {
          let newState = setFlag(state, 'foundation_scar_aches_seen');

          if (newState.resources.herbs < 3) {
            newState.resources = {
              ...newState.resources,
              insight: newState.resources.insight + 1,
            };
            return { state: newState, log: '药不够。你只记下几味能缓骨伤的药性。' };
          }

          newState.resources = {
            ...newState.resources,
            herbs: newState.resources.herbs - 3,
            dantoxin: newState.resources.dantoxin + 2,
            wounds: Math.max(0, newState.resources.wounds - 1),
          };
          newState = setFlag(newState, 'herbs_on_foundation_scar');
          newState = adjustQuality(newState, 'alchemy_affinity', 1);
          return { state: newState, log: '三味药压住骨伤，药滞也留下两分。' };
        },
      },
      {
        text: '照旧运功',
        effect: (state) => {
          let newState = setFlag(state, 'foundation_scar_aches_seen');
          newState.resources = {
            ...newState.resources,
            qi: newState.resources.qi + 2,
            wounds: newState.resources.wounds + 1,
          };
          newState = setFlag(newState, 'ignored_foundation_scar');
          newState = adjustQuality(newState, 'reckless_breakthrough', 1);
          return { state: newState, log: '你照旧运功。真气多了两缕，骨伤也深了一点。' };
        },
      },
    ],
  },
  {
    id: 'qi_array_maintenance',
    text: '阵中闭关之后，墙角几处阵脚有些松。灵气仍聚，只是不如初布时安稳。',
    condition: (state) =>
      state.currentLocationId === 'home' &&
      Boolean(state.choices.flags['home_qi_array']) &&
      Boolean(state.choices.flags['qi_array_maintenance_pending']) &&
      !state.choices.flags['qi_array_maintenance_seen'],
    weight: (state) => 24 + (state.choices.qualities['formation_craft'] ?? 0) * 4,
    choices: [
      {
        text: '补换阵脚（四钱二药）',
        effect: (state) => {
          let newState = setFlag(state, 'qi_array_maintenance_seen');

          if (newState.resources.coins < 4 || newState.resources.herbs < 2) {
            newState = setFlag(newState, 'qi_array_unstable');
            newState = setFlag(newState, 'qi_array_maintenance_pending', false);
            return { state: newState, log: '钱药不足，阵脚只勉强压住。下次闭关，气未必稳。' };
          }

          newState.resources = {
            ...newState.resources,
            coins: newState.resources.coins - 4,
            herbs: newState.resources.herbs - 2,
          };
          newState = setFlag(newState, 'qi_array_maintenance_pending', false);
          newState = setFlag(newState, 'maintained_qi_array');
          newState = setTag(newState, 'dwelling', 'qi_array_stable');
          newState = adjustQuality(newState, 'formation_craft', 1);
          return { state: newState, log: '你补换阵脚。草药压住浮气，阵纹重新贴住屋角。' };
        },
      },
      {
        text: '暂且不用',
        effect: (state) => {
          let newState = setFlag(state, 'qi_array_maintenance_seen');
          newState = setFlag(newState, 'qi_array_maintenance_pending', false);
          newState = setTag(newState, 'dwelling', 'qi_array_settled');
          newState = adjustQuality(newState, 'quiet_cultivation', 1);
          return { state: newState, log: '你没有再催阵。阵脚慢慢冷下去，屋中气息仍在。' };
        },
      },
      {
        text: '强催阵气',
        effect: (state) => {
          let newState = setFlag(state, 'qi_array_maintenance_seen');
          newState.resources = {
            ...newState.resources,
            qi: newState.resources.qi + 4,
            dantoxin: newState.resources.dantoxin + 3,
            wounds: newState.resources.wounds + 1,
          };
          newState = setFlag(newState, 'qi_array_maintenance_pending', false);
          newState = setFlag(newState, 'strained_qi_array');
          newState = setTag(newState, 'dwelling', 'qi_array_strained');
          newState = adjustQuality(newState, 'reckless_breakthrough', 1);
          return { state: newState, log: '你强催阵气。真气多了四缕，药滞和暗伤也各添一分。' };
        },
      },
    ],
  },
  {
    id: 'market_foundation_debt',
    text: '坊市掌柜把一只旧木盒推到柜前。盒上无丹，只有账。',
    condition: (state) =>
      state.currentLocationId === 'market' &&
      state.choices.tags['market_debt'] === 'foundation_pill' &&
      !state.choices.flags['market_foundation_debt_seen'],
    weight: (state) => 24 + (state.choices.qualities['market_ties'] ?? 0) * 3,
    choices: [
      {
        text: '付清丹账（十二钱）',
        effect: (state) => {
          let newState = setFlag(state, 'market_foundation_debt_seen');

          if (newState.resources.coins < 12) {
            newState = recordMarketKeeper(newState, { tags: ['筑基丹账未清'], debtsDelta: 1 });
            return { state: newState, log: '钱不够。掌柜合上木盒，账仍在。' };
          }

          newState.resources = { ...newState.resources, coins: newState.resources.coins - 12 };
          newState = removeTag(newState, 'market_debt');
          newState = setFlag(newState, 'foundation_debt_settled');
          newState = setFlag(newState, 'foundation_pill_debt_open', false);
          newState = adjustQuality(newState, 'market_ties', 1);
          newState = recordMarketKeeper(newState, { tags: ['筑基丹账清'] });
          return { state: newState, log: '十二枚钱入账。掌柜划去旧页，没有多说。' };
        },
      },
      {
        text: '再记一笔',
        effect: (state) => {
          let newState = setFlag(state, 'market_foundation_debt_seen');
          newState = setFlag(newState, 'foundation_debt_delayed');
          newState = adjustQuality(newState, 'market_ties', -1);
          newState = adjustQuality(newState, 'karmic_weight', 1);
          newState = recordMarketKeeper(newState, { tags: ['筑基丹账拖延'], debtsDelta: 2 });
          return { state: newState, log: '掌柜添了两笔小字。坊市的价目往后未必照旧。' };
        },
      },
      {
        text: '避开掌柜',
        effect: (state) => {
          let newState = setFlag(state, 'market_foundation_debt_seen');
          newState.resources = { ...newState.resources, essence: Math.max(0, newState.resources.essence - 10) };
          newState = setFlag(newState, 'avoided_foundation_debt');
          newState = adjustQuality(newState, 'market_ties', -2);
          newState = recordMarketKeeper(newState, { tags: ['避过筑基丹账'], debtsDelta: 1 });
          return { state: newState, log: '你绕过柜台。十步路没有代价，旧账有。' };
        },
      },
    ],
  },
  {
    id: 'outer_gate_guardian_account',
    text: '外门石阶下，那位护法的人把你拦住。没有责问，只报出一条规矩。',
    condition: (state) =>
      state.currentLocationId === 'outer_gate' &&
      state.realm !== Realm.FoundationEstablishment &&
      Boolean(state.choices.flags['sought_foundation_guardian']) &&
      !state.choices.flags['outer_gate_guardian_account_seen'],
    weight: (state) => 22 + (state.choices.qualities['sect_trace'] ?? 0) * 3,
    choices: [
      {
        text: '按规谢过（四钱）',
        effect: (state) => {
          let newState = setFlag(state, 'outer_gate_guardian_account_seen');

          if (newState.resources.coins < 4) {
            newState = setFlag(newState, 'foundation_guardian_account_open', false);
            newState = recordFoundationGuardian(newState, { tags: ['谢礼不足'], debtsDelta: 1 });
            return { state: newState, log: '钱不够。来人记下你的名字，转身上阶。' };
          }

          newState.resources = { ...newState.resources, coins: newState.resources.coins - 4 };
          newState = setFlag(newState, 'thanked_foundation_guardian');
          newState = setFlag(newState, 'foundation_guardian_account_open', false);
          newState = adjustQuality(newState, 'sect_trace', 1);
          newState = recordFoundationGuardian(newState, { tags: ['收过谢礼'], favorsDelta: 1 });
          return { state: newState, log: '四枚钱交上去。护法的人点头，外门名册多了一处熟字。' };
        },
      },
      {
        text: '补一件短差',
        effect: (state) => {
          let newState = setFlag(state, 'outer_gate_guardian_account_seen');
          newState.resources = {
            ...newState.resources,
            essence: Math.max(0, newState.resources.essence - 25),
            insight: newState.resources.insight + 1,
          };
          newState = setFlag(newState, 'repaid_guardian_with_errand');
          newState = setFlag(newState, 'foundation_guardian_account_open', false);
          newState = adjustQuality(newState, 'sect_trace', 2);
          newState = recordFoundationGuardian(newState, { tags: ['补过短差'], favorsDelta: 1 });
          return { state: newState, log: '你补了一件短差。事不重，规矩在你身上又落一层。' };
        },
      },
      {
        text: '置若罔闻',
        effect: (state) => {
          let newState = setFlag(state, 'outer_gate_guardian_account_seen');
          newState = setFlag(newState, 'brushed_off_guardian_account');
          newState = setFlag(newState, 'foundation_guardian_account_open', false);
          newState = adjustQuality(newState, 'sect_trace', -1);
          newState = recordFoundationGuardian(newState, { tags: ['未理会'], grudgesDelta: 1 });
          return { state: newState, log: '你没有应声。阶上无人追来，账却不在阶上。' };
        },
      },
    ],
  },
  {
    id: 'foundation_market_reckoning',
    text: '筑基之后再到坊市，掌柜把旧账翻到新页。药价、丹账和人情都在一张纸上。',
    condition: (state) => {
      const relationship = state.relationships[MARKET_KEEPER_ID];
      return (
        state.currentLocationId === 'market' &&
        state.realm === Realm.FoundationEstablishment &&
        Boolean(state.choices.flags['reached_foundation']) &&
        (
          state.choices.tags['market_debt'] === 'foundation_pill' ||
          Boolean(state.choices.flags['foundation_pill_debt_open']) ||
          Boolean(state.choices.flags['foundation_debt_delayed']) ||
          Boolean(state.choices.flags['avoided_foundation_debt']) ||
          (relationship?.debts ?? 0) > 0
        ) &&
        !state.choices.flags['foundation_market_reckoning_seen']
      );
    },
    weight: (state) =>
      26 +
      (state.choices.qualities['market_ties'] ?? 0) * 3 +
      (state.relationships[MARKET_KEEPER_ID]?.debts ?? 0) * 8,
    choices: [
      {
        text: '清旧账（十六钱）',
        effect: (state) => {
          let newState = setFlag(state, 'foundation_market_reckoning_seen');

          if (newState.resources.coins < 16) {
            newState = setFlag(newState, 'foundation_market_reckoning_debt_open');
            newState = adjustQuality(newState, 'market_ties', -1);
            newState = recordMarketKeeper(newState, { tags: ['筑基后旧账未清'], debtsDelta: 1 });
            return { state: newState, log: '钱不够。掌柜把旧账移到新页，价目也跟着换了一行。' };
          }

          newState.resources = { ...newState.resources, coins: newState.resources.coins - 16 };
          newState = removeTag(newState, 'market_debt');
          newState = setFlag(newState, 'foundation_market_reckoned');
          newState = setFlag(newState, 'foundation_pill_debt_open', false);
          newState = setFlag(newState, 'foundation_market_reckoning_debt_open', false);
          newState = setTag(newState, 'market_status', 'foundation_account_clear');
          newState = adjustQuality(newState, 'market_ties', 2);
          newState = adjustQuality(newState, 'karmic_weight', -1);
          newState = recordMarketKeeper(newState, { tags: ['筑基后清账'], debtsDelta: -3, favorsDelta: 1 });
          return { state: newState, log: '十六枚钱入柜。旧账划去，掌柜把新价目推到你眼前。' };
        },
      },
      {
        text: '以药抵账（四药二见闻）',
        effect: (state) => {
          let newState = setFlag(state, 'foundation_market_reckoning_seen');

          if (newState.resources.herbs < 4 || newState.resources.insight < 2) {
            newState.resources = { ...newState.resources, insight: newState.resources.insight + 1 };
            newState = setFlag(newState, 'foundation_market_medicine_owed');
            newState = adjustQuality(newState, 'alchemy_affinity', 1);
            newState = recordMarketKeeper(newState, { tags: ['药账未成'], debtsDelta: 1 });
            return { state: newState, log: '药和见闻都不够。掌柜听完药性，只把账又添了一行。' };
          }

          newState.resources = {
            ...newState.resources,
            herbs: newState.resources.herbs - 4,
            insight: newState.resources.insight - 2,
          };
          newState = removeTag(newState, 'market_debt');
          newState = setFlag(newState, 'foundation_market_paid_with_medicine');
          newState = setFlag(newState, 'foundation_pill_debt_open', false);
          newState = setTag(newState, 'market_status', 'medicine_account');
          newState = adjustQuality(newState, 'alchemy_affinity', 2);
          newState = adjustQuality(newState, 'market_ties', 1);
          newState = recordMarketKeeper(newState, { tags: ['药抵筑基账'], debtsDelta: -2 });
          return { state: newState, log: '四味药和两分药性见闻抵了旧账。掌柜收药，不再提木盒。' };
        },
      },
      {
        text: '借筑基名头压账',
        effect: (state) => {
          let newState = setFlag(state, 'foundation_market_reckoning_seen');
          newState = removeTag(newState, 'market_debt');
          newState = setFlag(newState, 'foundation_market_pressed_account');
          newState = setFlag(newState, 'foundation_pill_debt_open', false);
          newState = setTag(newState, 'market_status', 'pressed_account');
          newState = adjustQuality(newState, 'market_ties', -2);
          newState = adjustQuality(newState, 'karmic_weight', 2);
          newState = recordMarketKeeper(newState, { tags: ['筑基后压账'], debtsDelta: -1, grudgesDelta: 1 });
          return { state: newState, log: '你以筑基气势压下旧账。掌柜合账很快，眼神也很快冷下去。' };
        },
      },
    ],
  },
  {
    id: 'outer_gate_foundation_registry',
    text: '外门书吏换了一册薄簿。筑基之后，旧名册仍在，只是栏位不同。',
    condition: (state) =>
      state.currentLocationId === 'outer_gate' &&
      state.realm === Realm.FoundationEstablishment &&
      Boolean(state.choices.flags['reached_foundation']) &&
      (
        Boolean(state.choices.flags['outer_gate_registered']) ||
        Boolean(state.choices.flags['sought_foundation_guardian']) ||
        Boolean(state.choices.flags['foundation_guardian_account_open']) ||
        (state.choices.qualities['sect_trace'] ?? 0) >= 2
      ) &&
      !state.choices.flags['outer_gate_foundation_registry_seen'],
    weight: (state) =>
      24 +
      (state.choices.qualities['sect_trace'] ?? 0) * 4 +
      (state.choices.qualities['sect_contribution'] ?? 0) * 4,
    choices: [
      {
        text: '入筑基名册（六钱）',
        effect: (state) => {
          let newState = setFlag(state, 'outer_gate_foundation_registry_seen');
          newState = setFlag(newState, 'outer_gate_guardian_account_seen');

          if (newState.resources.coins < 6) {
            newState = setFlag(newState, 'foundation_registry_debt_open');
            newState = setTag(newState, 'sect_status', 'foundation_unpaid');
            newState = adjustQuality(newState, 'sect_discipline', -1);
            newState = recordOuterGateClerk(newState, { tags: ['筑基名册欠费'], debtsDelta: 1 });
            if (newState.choices.flags.sought_foundation_guardian) {
              newState = recordFoundationGuardian(newState, { tags: ['筑基后欠册费'], debtsDelta: 1 });
            }
            return { state: newState, log: '钱不够。书吏照样写名，只在旁边加了一点朱。' };
          }

          newState.resources = { ...newState.resources, coins: newState.resources.coins - 6 };
          newState = setFlag(newState, 'foundation_registered_outer_gate');
          newState = setFlag(newState, 'foundation_guardian_account_open', false);
          newState = setFlag(newState, 'foundation_registry_debt_open', false);
          newState = setTag(newState, 'sect_status', 'foundation_registered');
          newState = adjustQuality(newState, 'sect_trace', 2);
          newState = adjustQuality(newState, 'sect_discipline', 1);
          newState = recordOuterGateClerk(newState, { tags: ['记筑基名册'], favorsDelta: 1 });
          if (newState.choices.flags.sought_foundation_guardian) {
            newState = recordFoundationGuardian(newState, { tags: ['筑基后销账'], debtsDelta: -1, favorsDelta: 1 });
          }
          return { state: newState, log: '六枚钱入匣。书吏把你的名字移到筑基册上，旧护法账一并划去。' };
        },
      },
      {
        text: '补巡山供例',
        effect: (state) => {
          let newState = setFlag(state, 'outer_gate_foundation_registry_seen');
          newState = setFlag(newState, 'outer_gate_guardian_account_seen');
          newState.resources = {
            ...newState.resources,
            essence: Math.max(0, newState.resources.essence - 35),
            insight: newState.resources.insight + 1,
          };
          newState = setFlag(newState, 'foundation_registered_by_service');
          newState = setFlag(newState, 'foundation_guardian_account_open', false);
          newState = setTag(newState, 'sect_status', 'foundation_service');
          newState = adjustQuality(newState, 'sect_trace', 2);
          newState = adjustQuality(newState, 'sect_contribution', 2);
          newState = adjustQuality(newState, 'sect_discipline', 1);
          newState = recordOuterGateClerk(newState, { tags: ['筑基补供例'], favorsDelta: 1 });
          if (newState.choices.flags.sought_foundation_guardian) {
            newState = recordFoundationGuardian(newState, { tags: ['以供例抵护法账'], favorsDelta: 1 });
          }
          return { state: newState, log: '你补了一趟巡山供例。路不远，名册却因此换了栏。' };
        },
      },
      {
        text: '不入册',
        effect: (state) => {
          let newState = setFlag(state, 'outer_gate_foundation_registry_seen');
          newState = setFlag(newState, 'outer_gate_guardian_account_seen');
          newState = setFlag(newState, 'foundation_avoided_registry');
          newState = setFlag(newState, 'foundation_guardian_account_open', false);
          newState = setTag(newState, 'sect_status', 'unregistered_foundation');
          newState = adjustQuality(newState, 'sect_trace', -2);
          newState = adjustQuality(newState, 'sect_discipline', -2);
          newState = adjustQuality(newState, 'karmic_weight', 1);
          newState = recordOuterGateClerk(newState, { tags: ['筑基未入册'], grudgesDelta: 1 });
          if (newState.choices.flags.sought_foundation_guardian) {
            newState = recordFoundationGuardian(newState, { tags: ['筑基后避册'], grudgesDelta: 1 });
          }
          return { state: newState, log: '你没有入册。石阶无人阻拦，薄簿上留下一个空栏。' };
        },
      },
    ],
  },
  {
    id: 'outer_gate_missed_roll_call',
    text: '外门书吏翻到你的名字。薄簿边上空着一格，点卯没有落墨。',
    condition: (state) =>
      state.currentLocationId === 'outer_gate' &&
      state.realm === Realm.QiCondensation &&
      Boolean(state.choices.flags['outer_gate_registered']) &&
      !state.choices.flags['attended_outer_gate_roll_call'] &&
      ((state.choices.qualities['action_short_retreat_count'] ?? 0) > 0 ||
        (state.choices.qualities['action_withdraw_foundation_count'] ?? 0) > 0) &&
      !state.choices.flags['outer_gate_missed_roll_call_seen'],
    weight: (state) => 28 + (state.choices.qualities['sect_trace'] ?? 0) * 3,
    choices: [
      {
        text: '补交罚钱（三钱）',
        effect: (state) => {
          let newState = setFlag(state, 'outer_gate_missed_roll_call_seen');

          if (newState.resources.coins < 3) {
            newState = setFlag(newState, 'outer_gate_discipline_debt_open');
            newState = adjustQuality(newState, 'sect_discipline', -1);
            newState = recordOuterGateClerk(newState, { tags: ['点卯欠罚'], debtsDelta: 1 });
            return { state: newState, log: '钱不够。书吏在薄簿旁添了一点朱。' };
          }

          newState.resources = { ...newState.resources, coins: newState.resources.coins - 3 };
          newState = setFlag(newState, 'outer_gate_fine_paid');
          newState = setTag(newState, 'sect_status', 'fined');
          newState = adjustQuality(newState, 'sect_discipline', -1);
          newState = recordOuterGateClerk(newState, { tags: ['收过点卯罚钱'] });
          return { state: newState, log: '三枚钱落入木匣。空格补上，规矩没有消失。' };
        },
      },
      {
        text: '补做杂务',
        effect: (state) => {
          let newState = setFlag(state, 'outer_gate_missed_roll_call_seen');
          newState.resources = {
            ...newState.resources,
            essence: Math.max(0, newState.resources.essence - 25),
            insight: newState.resources.insight + 1,
          };
          newState = setFlag(newState, 'worked_off_missed_roll_call');
          newState = adjustQuality(newState, 'sect_discipline', 1);
          newState = adjustQuality(newState, 'sect_trace', 1);
          newState = recordOuterGateClerk(newState, { tags: ['补过点卯杂务'] });
          return { state: newState, log: '你补了一件杂务。书吏划掉空格，未抬头。' };
        },
      },
      {
        text: '置之不理',
        effect: (state) => {
          let newState = setFlag(state, 'outer_gate_missed_roll_call_seen');
          newState = setFlag(newState, 'ignored_outer_gate_roll_call');
          newState = adjustQuality(newState, 'sect_discipline', -2);
          newState = adjustQuality(newState, 'sect_trace', -1);
          newState = recordOuterGateClerk(newState, { tags: ['点卯未理'], grudgesDelta: 1 });
          return { state: newState, log: '你没有补格。薄簿合上，名字仍在。' };
        },
      },
    ],
  },
  {
    id: 'outer_gate_patrol_report',
    text: '巡值回山，书吏摊开另一册薄簿。山门外无大事，也要写成字。',
    condition: (state) =>
      state.currentLocationId === 'outer_gate' &&
      state.realm === Realm.QiCondensation &&
      Boolean(state.choices.flags['completed_sect_patrol']) &&
      !state.choices.flags['outer_gate_patrol_report_seen'],
    weight: (state) => 22 + (state.choices.qualities['sect_contribution'] ?? 0) * 6,
    choices: [
      {
        text: '照规交差',
        effect: (state) => {
          let newState = setFlag(state, 'outer_gate_patrol_report_seen');
          newState.resources = { ...newState.resources, coins: newState.resources.coins + 2 };
          newState = setFlag(newState, 'reported_outer_gate_patrol');
          newState = adjustQuality(newState, 'sect_contribution', 1);
          newState = adjustQuality(newState, 'sect_discipline', 1);
          newState = recordOuterGateClerk(newState, { tags: ['收过巡值回报'], favorsDelta: 1 });
          return { state: newState, log: '你照规回报。两枚钱入手，名册上多一笔贡献。' };
        },
      },
      {
        text: '夹带草药',
        effect: (state) => {
          let newState = setFlag(state, 'outer_gate_patrol_report_seen');
          newState.resources = { ...newState.resources, herbs: newState.resources.herbs + 2 };
          newState = setFlag(newState, 'kept_patrol_herbs');
          newState = adjustQuality(newState, 'alchemy_affinity', 1);
          newState = adjustQuality(newState, 'sect_discipline', -1);
          newState = adjustQuality(newState, 'karmic_weight', 1);
          return { state: newState, log: '你把两株草药留在袖中。山门无言，账本暂时无字。' };
        },
      },
      {
        text: '问边界路径',
        effect: (state) => {
          let newState = setFlag(state, 'outer_gate_patrol_report_seen');
          newState.resources = { ...newState.resources, insight: newState.resources.insight + 2 };
          newState = setFlag(newState, 'heard_outer_gate_border_route');
          newState = adjustQuality(newState, 'combat_edge', 1);
          newState = recordOuterGateClerk(newState, { tags: ['问过边界路'] });
          return { state: newState, log: '书吏指了两处边界路。你记下，山门外的线清楚了一点。' };
        },
      },
    ],
  },
  {
    id: 'cave_supply_account',
    text: '外门供给送到洞府数月后，书吏把一页小账夹进名册。米盐、药架、阵脚油墨，都写得很细。',
    condition: (state) =>
      state.currentLocationId === 'outer_gate' &&
      state.realm === Realm.FoundationEstablishment &&
      Boolean(state.choices.flags['cave_supply_arranged']) &&
      Boolean(state.choices.flags['cave_supply_account_pending']) &&
      !state.choices.flags['cave_supply_account_seen'],
    weight: (state) =>
      20 +
      (state.choices.qualities['sect_trace'] ?? 0) * 3 +
      (state.choices.qualities['sect_discipline'] ?? 0) * 2,
    choices: [
      {
        text: '按贡献销账',
        effect: (state) => {
          let newState = setFlag(state, 'cave_supply_account_seen');

          if ((newState.choices.qualities['sect_contribution'] ?? 0) < 1) {
            newState = setFlag(newState, 'cave_supply_account_pending', false);
            newState = setFlag(newState, 'cave_supply_contribution_short');
            newState = adjustQuality(newState, 'sect_discipline', -1);
            newState = recordOuterGateClerk(newState, { tags: ['洞府供给贡献不足'], debtsDelta: 1 });
            return { state: newState, log: '贡献不够。书吏没有停笔，只在供给账边添了一点朱。' };
          }

          newState = setFlag(newState, 'cave_supply_account_pending', false);
          newState = setFlag(newState, 'cave_supply_account_settled');
          newState = setTag(newState, 'sect_status', 'cave_supply_clear');
          newState = adjustQuality(newState, 'sect_contribution', -1);
          newState = adjustQuality(newState, 'sect_discipline', 1);
          newState = recordOuterGateClerk(newState, { tags: ['洞府供给销账'], favorsDelta: 1 });
          return { state: newState, log: '一格贡献划去。洞府供给照旧，名册也照旧。' };
        },
      },
      {
        text: '交钱补册（八钱）',
        effect: (state) => {
          let newState = setFlag(state, 'cave_supply_account_seen');

          if (newState.resources.coins < 8) {
            newState = setFlag(newState, 'cave_supply_account_pending', false);
            newState = setFlag(newState, 'cave_supply_coin_debt_open');
            newState = adjustQuality(newState, 'sect_trace', -1);
            newState = recordOuterGateClerk(newState, { tags: ['洞府供给钱账未清'], debtsDelta: 1 });
            return { state: newState, log: '钱不够。供给没有立刻停，只多了一行欠账。' };
          }

          newState.resources = { ...newState.resources, coins: newState.resources.coins - 8 };
          newState = setFlag(newState, 'cave_supply_account_pending', false);
          newState = setFlag(newState, 'cave_supply_paid_with_coins');
          newState = setTag(newState, 'sect_status', 'cave_supply_paid');
          newState = adjustQuality(newState, 'sect_trace', 1);
          newState = recordOuterGateClerk(newState, { tags: ['洞府供给钱账清'] });
          return { state: newState, log: '八枚钱入匣。书吏把小账夹回册中。' };
        },
      },
      {
        text: '押到下月',
        effect: (state) => {
          let newState = setFlag(state, 'cave_supply_account_seen');
          newState = setFlag(newState, 'cave_supply_account_pending', false);
          newState = setFlag(newState, 'cave_supply_account_deferred');
          newState = setTag(newState, 'sect_status', 'cave_supply_deferred');
          newState = adjustQuality(newState, 'sect_discipline', -1);
          newState = adjustQuality(newState, 'karmic_weight', 1);
          newState = recordOuterGateClerk(newState, { tags: ['洞府供给押账'], debtsDelta: 1 });
          return { state: newState, log: '账押到下月。供给仍来，薄簿上的朱点也仍在。' };
        },
      },
    ],
  },
  {
    id: 'cave_supply_strain',
    text: '洞府供给拖了几页账后，送来的药架少了一格，阵脚油墨也淡。供给还在，只是不再像先前那样齐。',
    condition: (state) =>
      (state.currentLocationId === 'home' || state.currentLocationId === 'outer_gate') &&
      state.realm === Realm.FoundationEstablishment &&
      Boolean(state.choices.flags['cave_supply_arranged']) &&
      Boolean(state.choices.flags['cave_supply_strain_pending']) &&
      !state.choices.flags['cave_supply_strain_seen'],
    weight: (state) =>
      22 +
      (state.relationships[OUTER_GATE_CLERK_ID]?.debts ?? 0) * 8 +
      Math.max(0, -(state.choices.qualities['sect_discipline'] ?? 0)) * 4,
    choices: [
      {
        text: '补齐供给账（十钱）',
        effect: (state) => {
          let newState = setFlag(state, 'cave_supply_strain_seen');
          newState = setFlag(newState, 'cave_supply_strain_pending', false);

          if (newState.resources.coins < 10) {
            newState = setFlag(newState, 'cave_supply_coin_debt_open');
            newState = adjustQuality(newState, 'sect_discipline', -1);
            newState = recordOuterGateClerk(newState, { tags: ['洞府供给补账未成'], debtsDelta: 1 });
            return { state: newState, log: '钱不够。书吏收回账页，供给仍旧减着。' };
          }

          newState.resources = { ...newState.resources, coins: newState.resources.coins - 10 };
          newState = setFlag(newState, 'cave_supply_account_deferred', false);
          newState = setFlag(newState, 'cave_supply_coin_debt_open', false);
          newState = setFlag(newState, 'cave_supply_contribution_short', false);
          newState = setFlag(newState, 'cave_supply_restabilized');
          newState = setTag(newState, 'dwelling', 'cave_dwelling_supplied');
          newState = setTag(newState, 'sect_status', 'cave_supply_clear');
          newState = adjustQuality(newState, 'sect_trace', 1);
          newState = recordOuterGateClerk(newState, { tags: ['洞府供给补账清'], debtsDelta: -2 });
          return { state: newState, log: '十枚钱补到账上。药架补回一格，阵脚油墨也照旧送来。' };
        },
      },
      {
        text: '减半供给',
        effect: (state) => {
          let newState = setFlag(state, 'cave_supply_strain_seen');
          newState = setFlag(newState, 'cave_supply_strain_pending', false);
          newState = setFlag(newState, 'cave_supply_arranged', false);
          newState = setFlag(newState, 'cave_dwelling_supported_by_sect', false);
          newState = setFlag(newState, 'cave_supply_reduced');
          newState = setFlag(newState, 'cave_dwelling_upkeep_pending');
          newState = setFlag(newState, 'cave_dwelling_upkeep_seen', false);
          newState = setTag(newState, 'dwelling', 'cave_dwelling_slow');
          newState = setTag(newState, 'sect_status', 'cave_supply_reduced');
          newState = adjustQuality(newState, 'sect_trace', -1);
          newState = recordOuterGateClerk(newState, { tags: ['洞府供给减半'], debtsDelta: -1 });
          return { state: newState, log: '你把供给减半。洞府要重新自理一部分，外门账也少了一行。' };
        },
      },
      {
        text: '照旧取用',
        effect: (state) => {
          let newState = setFlag(state, 'cave_supply_strain_seen');
          newState = setFlag(newState, 'cave_supply_strain_pending', false);
          newState = setFlag(newState, 'cave_supply_arranged', false);
          newState = setFlag(newState, 'cave_dwelling_supported_by_sect', false);
          newState = setFlag(newState, 'cave_supply_suspended');
          newState = setFlag(newState, 'cave_dwelling_neglected');
          newState.resources = {
            ...newState.resources,
            qi: newState.resources.qi + 6,
            herbs: newState.resources.herbs + 2,
          };
          newState = setTag(newState, 'dwelling', 'cave_dwelling_strained');
          newState = setTag(newState, 'sect_status', 'cave_supply_suspended');
          newState = adjustQuality(newState, 'sect_discipline', -2);
          newState = adjustQuality(newState, 'karmic_weight', 2);
          newState = recordOuterGateClerk(newState, { tags: ['洞府供给强取'], debtsDelta: 1, grudgesDelta: 1 });
          return { state: newState, log: '你照旧取用。最后一批供给入洞府，名册上的供给栏也被划去。' };
        },
      },
    ],
  },
  {
    id: 'foundation_practice_settling',
    text: '筑基后的第一段日课收住时，旧日周天没有完全散去。气沉入骨，丹毒、旧伤和阵脚都显得更清楚。',
    condition: (state) =>
      state.currentLocationId === 'home' &&
      state.realm === Realm.FoundationEstablishment &&
      Boolean(state.choices.flags['foundation_practice_settling_pending']) &&
      !state.choices.flags['foundation_practice_settling_seen'],
    weight: (state) =>
      30 +
      (state.choices.qualities['quiet_cultivation'] ?? 0) * 2 +
      (state.choices.qualities['formation_craft'] ?? 0) * 2,
    choices: [
      {
        text: '按日收束',
        effect: (state) => {
          let newState = setFlag(state, 'foundation_practice_settling_seen');
          newState = setFlag(newState, 'foundation_practice_settling_pending', false);
          newState.resources = {
            ...newState.resources,
            qi: newState.resources.qi + 5,
            lifespan: Math.max(0, newState.resources.lifespan - 80),
          };
          newState = setFlag(newState, 'foundation_settled_by_daily_practice');
          newState = setTag(newState, 'foundation_state', 'settled_quiet');
          newState = adjustQuality(newState, 'quiet_cultivation', 2);
          return { state: newState, log: '你按日收束。真气多了五缕，寿元少去八十刻。' };
        },
      },
      {
        text: '查旧伤药滞',
        effect: (state) => {
          let newState = setFlag(state, 'foundation_practice_settling_seen');
          newState = setFlag(newState, 'foundation_practice_settling_pending', false);
          newState.resources = {
            ...newState.resources,
            insight: newState.resources.insight + 1,
            dantoxin: Math.max(0, newState.resources.dantoxin - 6),
            wounds: Math.max(0, newState.resources.wounds - 1),
          };
          newState = setFlag(newState, 'foundation_checked_old_burdens');
          newState = setTag(newState, 'foundation_state', 'checked_burdens');
          newState = adjustQuality(newState, 'alchemy_affinity', 1);
          newState = adjustQuality(newState, 'quiet_cultivation', 1);
          return { state: newState, log: '你照见旧伤和药滞。丹毒退六分，旧伤轻一处，见闻也添一分。' };
        },
      },
      {
        text: '重排居处阵脚',
        effect: (state) => {
          let newState = setFlag(state, 'foundation_practice_settling_seen');
          newState = setFlag(newState, 'foundation_practice_settling_pending', false);

          if (!newState.choices.flags.home_qi_array) {
            newState.resources = { ...newState.resources, insight: newState.resources.insight + 1 };
            newState = setFlag(newState, 'foundation_noted_array_need');
            newState = adjustQuality(newState, 'formation_craft', 1);
            return { state: newState, log: '居处未成阵脚。你只记下筑基后该如何重排气路。' };
          }

          if (newState.resources.coins < 4 || newState.resources.herbs < 2) {
            newState = setFlag(newState, 'qi_array_unstable');
            newState = adjustQuality(newState, 'formation_craft', 1);
            return { state: newState, log: '钱药不足，旧阵只重排了一半。阵脚能用，也更挑时日。' };
          }

          newState.resources = {
            ...newState.resources,
            coins: newState.resources.coins - 4,
            herbs: newState.resources.herbs - 2,
            qi: newState.resources.qi + 2,
          };
          newState = setFlag(newState, 'foundation_reworked_qi_array');
          newState = setFlag(newState, 'qi_array_maintenance_pending', false);
          newState = setFlag(newState, 'qi_array_unstable', false);
          newState = setFlag(newState, 'strained_qi_array', false);
          newState = setTag(newState, 'dwelling', 'foundation_array');
          newState = setTag(newState, 'foundation_state', 'array_reworked');
          newState = adjustQuality(newState, 'formation_craft', 2);
          return { state: newState, log: '你以四钱二药重排阵脚。旧阵贴住筑基后的气路，真气多了两缕。' };
        },
      },
    ],
  },
  {
    id: 'cave_dwelling_upkeep',
    text: '洞府闭关后，药架空了几格，阵脚也浮出细灰。洞府能藏气，也要有人照看。',
    condition: (state) =>
      state.currentLocationId === 'home' &&
      state.realm === Realm.FoundationEstablishment &&
      Boolean(state.choices.flags['cave_dwelling']) &&
      Boolean(state.choices.flags['cave_dwelling_upkeep_pending']) &&
      !state.choices.flags['cave_dwelling_upkeep_seen'],
    weight: (state) =>
      28 +
      (state.choices.qualities['formation_craft'] ?? 0) * 4 +
      (state.choices.qualities['quiet_cultivation'] ?? 0) * 2,
    choices: [
      {
        text: '按期维护（六钱三药）',
        effect: (state) => {
          let newState = setFlag(state, 'cave_dwelling_upkeep_seen');

          if (newState.resources.coins < 6 || newState.resources.herbs < 3) {
            newState = setFlag(newState, 'cave_dwelling_upkeep_pending', false);
            newState = setFlag(newState, 'cave_dwelling_neglected');
            newState = setTag(newState, 'dwelling', 'cave_dwelling_thin');
            newState = adjustQuality(newState, 'formation_craft', 1);
            return { state: newState, log: '钱药不足，洞府只粗略收拾。气还在，账也在。' };
          }

          newState.resources = {
            ...newState.resources,
            coins: newState.resources.coins - 6,
            herbs: newState.resources.herbs - 3,
          };
          newState = setFlag(newState, 'cave_dwelling_upkeep_pending', false);
          newState = setFlag(newState, 'maintained_cave_dwelling');
          newState = setFlag(newState, 'cave_dwelling_neglected', false);
          newState = setTag(newState, 'dwelling', 'cave_dwelling_stable');
          newState = adjustQuality(newState, 'formation_craft', 2);
          return { state: newState, log: '六钱三药补入洞府。阵脚沉下去，药架也重新有了余地。' };
        },
      },
      {
        text: '用外门供给补上',
        effect: (state) => {
          let newState = setFlag(state, 'cave_dwelling_upkeep_seen');
          const hasSupplyPath =
            Boolean(newState.choices.flags['completed_sect_supply']) ||
            Boolean(newState.choices.flags['foundation_registered_outer_gate']) ||
            (newState.choices.qualities['sect_contribution'] ?? 0) >= 2;

          if (!hasSupplyPath) {
            newState.resources = { ...newState.resources, insight: newState.resources.insight + 1 };
            newState = setFlag(newState, 'cave_dwelling_upkeep_pending', false);
            newState = setFlag(newState, 'cave_dwelling_supply_unavailable');
            newState = setTag(newState, 'dwelling', 'cave_dwelling_waiting');
            newState = adjustQuality(newState, 'sect_trace', 1);
            return { state: newState, log: '外门供给没有落到你名下。你只问清了以后该走哪一道手续。' };
          }

          newState = setFlag(newState, 'cave_dwelling_upkeep_pending', false);
          newState = setFlag(newState, 'cave_dwelling_supported_by_sect');
          newState = setTag(newState, 'dwelling', 'cave_dwelling_supplied');
          newState = setTag(newState, 'sect_status', 'cave_supply');
          newState = adjustQuality(newState, 'formation_craft', 1);
          newState = adjustQuality(newState, 'sect_trace', 1);
          newState = adjustQuality(newState, 'sect_discipline', 1);
          newState = adjustQuality(newState, 'sect_contribution', -1);
          return { state: newState, log: '外门供给补入洞府。东西不多，名册上的线又多一条。' };
        },
      },
      {
        text: '暂不维护',
        effect: (state) => {
          let newState = setFlag(state, 'cave_dwelling_upkeep_seen');
          newState.resources = {
            ...newState.resources,
            qi: newState.resources.qi + 6,
            dantoxin: newState.resources.dantoxin + 2,
            wounds: newState.resources.wounds + 1,
            lifespan: Math.max(0, newState.resources.lifespan - 60),
          };
          newState = setFlag(newState, 'cave_dwelling_upkeep_pending', false);
          newState = setFlag(newState, 'cave_dwelling_neglected');
          newState = setTag(newState, 'dwelling', 'cave_dwelling_strained');
          newState = adjustQuality(newState, 'reckless_breakthrough', 1);
          return { state: newState, log: '你暂不维护。洞府余气仍可榨出六缕，丹毒、暗伤和寿元各记一笔。' };
        },
      },
    ],
  },
  {
    id: 'cave_herb_plot_ripens',
    text: '洞府药畦里有几味草药到时候了。叶色不盛，却比山路上来得安稳。',
    condition: (state) =>
      state.currentLocationId === 'home' &&
      state.realm === Realm.FoundationEstablishment &&
      Boolean(state.choices.flags['cave_herb_plot']) &&
      Boolean(state.choices.flags['cave_herb_plot_ripening_pending']) &&
      !state.choices.flags['cave_herb_plot_ripens_seen'],
    weight: (state) =>
      26 +
      (state.time.season === Season.Spring ? 6 : 0) +
      (state.choices.qualities['alchemy_affinity'] ?? 0) * 4,
    choices: [
      {
        text: '按时采收',
        effect: (state) => {
          let newState = setFlag(state, 'cave_herb_plot_ripens_seen');
          newState.resources = {
            ...newState.resources,
            herbs: newState.resources.herbs + 4,
          };
          newState = setFlag(newState, 'cave_herb_plot_ripening_pending', false);
          newState = setFlag(newState, 'harvested_cave_herb_plot');
          newState = setTag(newState, 'cave_support', 'herb_plot_stable');
          newState = adjustQuality(newState, 'alchemy_affinity', 2);
          return { state: newState, log: '你按时采收。四味草药入匣，药畦的土气没有被伤。' };
        },
      },
      {
        text: '留作种株',
        effect: (state) => {
          let newState = setFlag(state, 'cave_herb_plot_ripens_seen');
          newState.resources = {
            ...newState.resources,
            herbs: newState.resources.herbs + 2,
            insight: newState.resources.insight + 1,
          };
          newState = setFlag(newState, 'cave_herb_plot_ripening_pending', false);
          newState = setFlag(newState, 'cave_herb_seed_stock');
          newState = setTag(newState, 'cave_support', 'herb_seed_stock');
          newState = adjustQuality(newState, 'alchemy_affinity', 2);
          newState = adjustQuality(newState, 'quiet_cultivation', 1);
          return { state: newState, log: '你只取两味，其余留作种株。药性见闻添了一分，药畦也安静下来。' };
        },
      },
      {
        text: '催熟入炉',
        effect: (state) => {
          let newState = setFlag(state, 'cave_herb_plot_ripens_seen');
          newState.resources = {
            ...newState.resources,
            herbs: newState.resources.herbs + 6,
            dantoxin: newState.resources.dantoxin + 2,
            lifespan: Math.max(0, newState.resources.lifespan - 40),
          };
          newState = setFlag(newState, 'cave_herb_plot_ripening_pending', false);
          newState = setFlag(newState, 'forced_cave_herb_plot');
          newState = setTag(newState, 'cave_support', 'forced_growth');
          newState = adjustQuality(newState, 'alchemy_affinity', 1);
          newState = adjustQuality(newState, 'reckless_breakthrough', 1);
          return { state: newState, log: '你催熟入炉。六味草药到手，药滞和寿元各留下细账。' };
        },
      },
    ],
  },
  {
    id: 'winter_stillness',
    text: '冬夜很长。屋外无声，炉灰白了一层。',
    condition: (state) =>
      state.currentLocationId === 'home' &&
      state.time.season === Season.Winter &&
      (state.choices.qualities['quiet_cultivation'] ?? 0) >= 5 &&
      !state.choices.flags['winter_stillness_seen'],
    weight: (state) => 10 + (state.choices.qualities['quiet_cultivation'] ?? 0),
    choices: [
      {
        text: '闭门静坐',
        effect: (state) => {
          let newState = setFlag(state, 'winter_stillness_seen');
          newState.resources = {
            ...newState.resources,
            qi: newState.resources.qi + 2,
            lifespan: Math.max(0, newState.resources.lifespan - 20),
          };
          newState = adjustQuality(newState, 'quiet_cultivation', 2);
          return { state: newState, log: '你闭门坐过长夜。真气多了两缕，寿元少了二十刻。' };
        },
      },
      {
        text: '出门走走',
        effect: (state) => {
          let newState = setFlag(state, 'winter_stillness_seen');
          newState.resources = { ...newState.resources, essence: Math.max(0, newState.resources.essence - 5) };
          return { state: newState, log: '你推门看雪。夜色无事，精元稍损。' };
        },
      },
    ],
  }
];
