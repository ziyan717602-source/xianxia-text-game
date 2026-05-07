import { GameState, Realm, Season } from '../game/types';
import { adjustQuality, setFlag, setTag } from '../game/choices';
import { resolveCombatEvent } from '../game/combat';
import { addRelationship, updateRelationship } from '../game/relationships';
import { LOCATIONS } from './locations';

const WOUNDED_CULTIVATOR_ID = 'wounded_cultivator';
const MARKET_KEEPER_ID = 'market_keeper';

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
