import { GameState, Realm, Season } from '../game/types';
import { adjustQuality, removeTag, setFlag, setTag } from '../game/choices';
import { resolveCombatEvent } from '../game/combat';
import { addRelationship, updateRelationship } from '../game/relationships';
import { LOCATIONS } from './locations';
import { getDaoPathLabel, getDaoPathDescription } from '../game/daopath';
import { confrontDemon, suppressDemon, ignoreDemon, getDemonLabel, getDemonEncounterText, DEMON_DEFS } from '../game/innerDemon';
import { advanceSectRank, completeTask, leaveSect, setCurrentTask, registerOuterDisciple } from '../game/sect';
import { upgradeDwelling, installFormation, canUpgradeDwelling, canInstallFormation, getDwellingUpgradeCost, getFormationInstallCost } from '../game/dwelling';
import { recruitFollower, assignFollowerTask, collectFollowerIncome, canRecruitFollower } from '../game/follower';
import { discoverRealm } from '../game/secretRealm';
import { shouldShowAscensionThreshold, executeAscension } from '../game/ascension';

const WOUNDED_CULTIVATOR_ID = 'wounded_cultivator';
const MARKET_KEEPER_ID = 'market_keeper';
const OUTER_GATE_CLERK_ID = 'outer_gate_clerk';
const FOUNDATION_GUARDIAN_ID = 'foundation_guardian';
const MOUNTAIN_ELDER_ID = 'mountain_elder';
const PATROL_DISCIPLE_ID = 'patrol_disciple';
const WANDERING_LECTURER_ID = 'wandering_lecturer';
const DISILLUSIONED_FELLOW_ID = 'disillusioned_fellow';

function uniqueTags(existing: string[], added: string[]): string[] {
  return Array.from(new Set([...existing, ...added]));
}

const REALM_ORDER = [Realm.Mortal, Realm.QiCondensation, Realm.FoundationEstablishment, Realm.GoldenCore, Realm.NascentSoul, Realm.SpiritTransformation, Realm.Integration, Realm.Mahayana, Realm.Tribulation];

function realmAtLeast(state: GameState, requiredRealm: Realm): boolean {
  return REALM_ORDER.indexOf(state.realm) >= REALM_ORDER.indexOf(requiredRealm);
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
  },
  {
    id: 'foundation_scar_lingering',
    text: '旧伤未断根，骨缝里的冷意又起。行气时经脉细若游丝，丹田处隐隐滞涩。',
    condition: (state) =>
      state.currentLocationId === 'home' &&
      state.realm === Realm.QiCondensation &&
      (Boolean(state.choices.flags['nursed_foundation_scar']) || Boolean(state.choices.flags['ignored_foundation_scar'])) &&
      !state.choices.flags['foundation_scar_lingering_seen'],
    weight: (state) => 18 + state.resources.wounds * 6,
    choices: [
      {
        text: '调养经脉',
        effect: (state) => {
          let newState = setFlag(state, 'foundation_scar_lingering_seen');

          if (newState.resources.essence < 50) {
            newState.resources = {
              ...newState.resources,
              wounds: newState.resources.wounds + 1,
            };
            return { state: newState, log: '精元不足，强行调养反而伤了经脉。伤添一处。' };
          }

          newState.resources = {
            ...newState.resources,
            essence: newState.resources.essence - 50,
            wounds: Math.max(0, newState.resources.wounds - 1),
            dantoxin: Math.max(0, newState.resources.dantoxin - 2),
            lifespan: Math.max(0, newState.resources.lifespan - 40),
          };
          newState = setFlag(newState, 'meridians_nursed');
          newState = adjustQuality(newState, 'quiet_cultivation', 1);
          return { state: newState, log: '你静调经脉。旧伤退了一分，丹毒散了两分，寿元照常少去。' };
        },
      },
      {
        text: '药浴化瘀',
        effect: (state) => {
          let newState = setFlag(state, 'foundation_scar_lingering_seen');

          if (newState.resources.herbs < 5) {
            return { state: newState, log: '药不够。药浴无从下手，瘀血仍在经脉里。' };
          }

          newState.resources = {
            ...newState.resources,
            herbs: newState.resources.herbs - 5,
            dantoxin: newState.resources.dantoxin + 3,
            wounds: Math.max(0, newState.resources.wounds - 2),
          };
          newState = setFlag(newState, 'used_herb_bath');
          newState = adjustQuality(newState, 'alchemy_affinity', 1);
          return { state: newState, log: '五味药入浴，瘀血化开。伤退两分，丹毒添了三分。' };
        },
      },
      {
        text: '强撑运功',
        effect: (state) => {
          let newState = setFlag(state, 'foundation_scar_lingering_seen');
          newState.resources = {
            ...newState.resources,
            qi: newState.resources.qi + 3,
            wounds: newState.resources.wounds + 1,
            lifespan: Math.max(0, newState.resources.lifespan - 40),
          };
          newState = setFlag(newState, 'pushed_through_scar');
          newState = adjustQuality(newState, 'reckless_breakthrough', 1);
          return { state: newState, log: '你强撑运功。真气多了三缕，骨伤又深一分，寿元少了四十刻。' };
        },
      },
    ],
  },
  {
    id: 'guardian_favor_recalled',
    text: '外门石阶下，有人递来一张字条。护法处要人当差，上次谢礼的人优先。',
    condition: (state) =>
      state.currentLocationId === 'outer_gate' &&
      Boolean(state.choices.flags['thanked_foundation_guardian']) &&
      !state.choices.flags['guardian_favor_recalled_seen'],
    weight: (state) => 14 + (state.choices.qualities['sect_trace'] ?? 0) * 2,
    choices: [
      {
        text: '应下差事',
        effect: (state) => {
          let newState = setFlag(state, 'guardian_favor_recalled_seen');
          newState.resources = {
            ...newState.resources,
            essence: Math.max(0, newState.resources.essence - 30),
            coins: newState.resources.coins + 8,
          };
          newState = setFlag(newState, 'completed_guardian_favor');
          newState = adjustQuality(newState, 'sect_contribution', 2);
          newState = adjustQuality(newState, 'sect_trace', 1);
          return { state: newState, log: '你应下差事。精元折了三十，八枚钱入手，外门名册上又多一笔。' };
        },
      },
      {
        text: '婉拒',
        effect: (state) => {
          let newState = setFlag(state, 'guardian_favor_recalled_seen');
          newState = setFlag(newState, 'declined_guardian_favor');
          newState = adjustQuality(newState, 'quiet_cultivation', 1);
          newState = adjustQuality(newState, 'sect_trace', -1);
          return { state: newState, log: '你婉拒。字条收回，外门照旧运转。' };
        },
      },
    ],
  },
  {
    id: 'foundation_debt_collector',
    text: '坊市来了催账人。掌柜把旧账翻出来，利上加利，十六钱。',
    condition: (state) =>
      state.currentLocationId === 'market' &&
      Boolean(state.choices.flags['foundation_debt_delayed']) &&
      !state.choices.flags['foundation_debt_collector_seen'],
    weight: (state) => 20 + (state.choices.qualities['market_ties'] ?? 0) * (-2) + (state.choices.qualities['karmic_weight'] ?? 0) * 4,
    choices: [
      {
        text: '付清本息（十六钱）',
        effect: (state) => {
          let newState = setFlag(state, 'foundation_debt_collector_seen');

          if (newState.resources.coins < 16) {
            const paid = newState.resources.coins;
            newState.resources = {
              ...newState.resources,
              coins: 0,
            };
            newState = adjustQuality(newState, 'karmic_weight', 1);
            return { state: newState, log: `你把身上${paid}枚钱全交了。还不够。账仍在，人仍在等。` };
          }

          newState.resources = { ...newState.resources, coins: newState.resources.coins - 16 };
          newState = removeTag(newState, 'market_debt');
          newState = setFlag(newState, 'foundation_debt_fully_settled');
          newState = adjustQuality(newState, 'market_ties', 2);
          return { state: newState, log: '十六枚钱交清。催账人合上薄簿，坊市的门照开。' };
        },
      },
      {
        text: '再拖一期',
        effect: (state) => {
          let newState = setFlag(state, 'foundation_debt_collector_seen');
          newState = setFlag(newState, 'foundation_debt_delayed_again');
          newState = adjustQuality(newState, 'karmic_weight', 2);
          newState = adjustQuality(newState, 'market_ties', -2);
          return { state: newState, log: '你又拖了一期。催账人没有多话，但坊市的人情又薄了一层。' };
        },
      },
      {
        text: '抵药还账',
        effect: (state) => {
          let newState = setFlag(state, 'foundation_debt_collector_seen');

          if (newState.resources.herbs < 8) {
            return { state: newState, log: '药不够。催账人看了你一眼，没有接话。' };
          }

          newState.resources = { ...newState.resources, herbs: newState.resources.herbs - 8 };
          newState = removeTag(newState, 'market_debt');
          newState = setFlag(newState, 'paid_debt_in_herbs');
          newState = adjustQuality(newState, 'alchemy_affinity', 1);
          return { state: newState, log: '八味药抵了旧账。催账人收走草药，坊市不再追。' };
        },
      },
    ],
  },
  {
    id: 'foundation_establishment_morning',
    text: '晨光照进茅屋。筑基后的第一日，周身气脉与从前判然不同。',
    condition: (state) =>
      state.currentLocationId === 'home' &&
      state.realm === Realm.FoundationEstablishment &&
      !state.choices.flags['foundation_morning_seen'],
    weight: () => 100,
    choices: [
      {
        text: '巡视新身',
        effect: (state) => {
          let newState = setFlag(state, 'foundation_morning_seen');
          newState = setFlag(newState, 'surveyed_new_body');
          newState.resources = {
            ...newState.resources,
            insight: newState.resources.insight + 3,
          };
          return { state: newState, log: '你内视周天。经脉比从前宽了一倍，气行有常，见闻也有所增长。' };
        },
      },
      {
        text: '静坐体悟',
        effect: (state) => {
          let newState = setFlag(state, 'foundation_morning_seen');
          newState.resources = {
            ...newState.resources,
            qi: newState.resources.qi + 5,
            essence: Math.max(0, newState.resources.essence - 20),
          };
          newState = adjustQuality(newState, 'quiet_cultivation', 2);
          return { state: newState, log: '你静坐体悟。真气多了五缕，精元少去二十，悟性在静中又深了一层。' };
        },
      },
    ],
  },
  {
    id: 'dao_path_recognition',
    text: (state) => {
      const path = state.daoPath.currentPath;
      if (!path) return '';
      return `日课毕，气行周天时你感到一丝不同。往日散乱的行气，似乎有了一条暗线。${getDaoPathLabel(path)}——你的道途渐显。${getDaoPathDescription(path)}`;
    },
    condition: (state) =>
      state.daoPath.currentPath !== null &&
      !state.choices.flags['dao_path_recognized'],
    weight: () => 60,
    choices: [
      {
        text: '顺应道途',
        effect: (state) => {
          let newState = setFlag(state, 'dao_path_recognized');
          newState = adjustQuality(newState, 'quiet_cultivation', 1);
          return { state: newState, log: '你顺着那丝暗线，气行比往日顺畅一分。' };
        },
      },
      {
        text: '不以为意',
        effect: (state) => {
          let newState = setFlag(state, 'dao_path_recognized');
          return { state: newState, log: '你照旧行气。道途在那里，不因你在不在意而改。' };
        },
      },
    ],
  },
  {
    id: 'dao_path_conflict',
    text: (state) => {
      const path = state.daoPath.currentPath;
      if (!path) return '';
      return `行气时，气脉在岔路口犹豫。你惯走的方向变了——${getDaoPathLabel(path)}的气息更浓。旧的行气习惯与新道途之间有了裂痕。`;
    },
    condition: (state) =>
      state.daoPath.currentPath !== null &&
      state.choices.flags['dao_path_recognized'] &&
      !state.choices.flags['dao_path_conflict_seen'],
    weight: (state) => 20 + Math.min(30, Object.values(state.daoPath.pathAffinity).reduce((a, b) => a + b, 0)),
    choices: [
      {
        text: '随新道而行',
        effect: (state) => {
          let newState = setFlag(state, 'dao_path_conflict_seen');
          const path = state.daoPath.currentPath;
          if (path) {
            newState = adjustQuality(newState, path === 'alchemist' ? 'alchemy_affinity' : path === 'sword_way' ? 'combat_edge' : path === 'hermit' ? 'quiet_cultivation' : path === 'merchant' ? 'market_ties' : 'sect_trace', 1);
          }
          return { state: newState, log: '你放任气脉走上新路。旧习已淡，新途渐深。' };
        },
      },
      {
        text: '强行收束',
        effect: (state) => {
          let newState = setFlag(state, 'dao_path_conflict_seen');
          newState = {
            ...newState,
            resources: {
              ...newState.resources,
              essence: Math.max(0, newState.resources.essence - 10),
            },
          };
          return { state: newState, log: '你把气脉压回旧路。精元折了十分，岔路仍在。' };
        },
      },
    ],
  },
  {
    id: 'karmic_reckoning',
    text: '夜里打坐，忽然心神不宁。丹田处似有一丝寒意，不是药毒，也不是伤。你想起了一些旧事——那些你以为已经过去的账。',
    condition: (state) =>
      state.karma.karmicWeight >= 10 &&
      !state.karma.karmicEvents.includes('karmic_reckoning'),
    weight: (state) => 30 + state.karma.karmicWeight * 3,
    choices: [
      {
        text: '静坐反省',
        effect: (state) => {
          let newState = { ...state };
          newState = adjustQuality(newState, 'quiet_cultivation', 1);
          newState = {
            ...newState,
            karma: {
              ...newState.karma,
              karmicEvents: [...newState.karma.karmicEvents, 'karmic_reckoning'],
            },
          };
          return { state: newState, log: '你闭目自省。因果未了，但看清了几分。' };
        },
      },
      {
        text: '置之不顾',
        effect: (state) => {
          let newState = { ...state };
          newState = {
            ...newState,
            resources: {
              ...newState.resources,
              lifespan: Math.max(0, newState.resources.lifespan - 40),
            },
            karma: {
              ...newState.karma,
              karmicEvents: [...newState.karma.karmicEvents, 'karmic_reckoning'],
            },
          };
          return { state: newState, log: '你不去想。因果不等你想，寿元已少了四十刻。' };
        },
      },
    ],
  },
  {
    id: 'demon_of_rashness_encounter',
    text: (state) => getDemonEncounterText('demon_of_rashness'),
    condition: (state) =>
      state.innerDemon.activeDemon === 'demon_of_rashness' &&
      !state.choices.flags['demon_of_rashness_encountered'],
    weight: () => 50,
    choices: [
      {
        text: '直面心魔（消耗 5 真气 20 精元）',
        effect: (state) => {
          let newState = setFlag(state, 'demon_of_rashness_encountered');
          const result = confrontDemon(newState);
          return result;
        },
      },
      {
        text: '压制心魔（消耗 80 寿元）',
        effect: (state) => {
          let newState = setFlag(state, 'demon_of_rashness_encountered');
          const result = suppressDemon(newState);
          return result;
        },
      },
      {
        text: '无视',
        effect: (state) => {
          let newState = setFlag(state, 'demon_of_rashness_encountered');
          const result = ignoreDemon(newState);
          return result;
        },
      },
    ],
  },
  {
    id: 'demon_of_attachment_encounter',
    text: (state) => getDemonEncounterText('demon_of_attachment'),
    condition: (state) =>
      state.innerDemon.activeDemon === 'demon_of_attachment' &&
      !state.choices.flags['demon_of_attachment_encountered'],
    weight: () => 50,
    choices: [
      {
        text: '直面心魔（消耗 5 真气 20 精元）',
        effect: (state) => {
          let newState = setFlag(state, 'demon_of_attachment_encountered');
          const result = confrontDemon(newState);
          return result;
        },
      },
      {
        text: '压制心魔（消耗 80 寿元）',
        effect: (state) => {
          let newState = setFlag(state, 'demon_of_attachment_encountered');
          const result = suppressDemon(newState);
          return result;
        },
      },
      {
        text: '无视',
        effect: (state) => {
          let newState = setFlag(state, 'demon_of_attachment_encountered');
          const result = ignoreDemon(newState);
          return result;
        },
      },
    ],
  },
  {
    id: 'demon_of_pride_encounter',
    text: (state) => getDemonEncounterText('demon_of_pride'),
    condition: (state) =>
      state.innerDemon.activeDemon === 'demon_of_pride' &&
      !state.choices.flags['demon_of_pride_encountered'],
    weight: () => 50,
    choices: [
      {
        text: '直面心魔（消耗 5 真气 20 精元）',
        effect: (state) => {
          let newState = setFlag(state, 'demon_of_pride_encountered');
          const result = confrontDemon(newState);
          return result;
        },
      },
      {
        text: '压制心魔（消耗 80 寿元）',
        effect: (state) => {
          let newState = setFlag(state, 'demon_of_pride_encountered');
          const result = suppressDemon(newState);
          return result;
        },
      },
      {
        text: '无视',
        effect: (state) => {
          let newState = setFlag(state, 'demon_of_pride_encountered');
          const result = ignoreDemon(newState);
          return result;
        },
      },
    ],
  },
  {
    id: 'demon_of_toxicity_encounter',
    text: (state) => getDemonEncounterText('demon_of_toxicity'),
    condition: (state) =>
      state.innerDemon.activeDemon === 'demon_of_toxicity' &&
      !state.choices.flags['demon_of_toxicity_encountered'],
    weight: () => 50,
    choices: [
      {
        text: '直面心魔（消耗 5 真气 20 精元）',
        effect: (state) => {
          let newState = setFlag(state, 'demon_of_toxicity_encountered');
          const result = confrontDemon(newState);
          return result;
        },
      },
      {
        text: '压制心魔（消耗 80 寿元）',
        effect: (state) => {
          let newState = setFlag(state, 'demon_of_toxicity_encountered');
          const result = suppressDemon(newState);
          return result;
        },
      },
      {
        text: '无视',
        effect: (state) => {
          let newState = setFlag(state, 'demon_of_toxicity_encountered');
          const result = ignoreDemon(newState);
          return result;
        },
      },
    ],
  },
  // F4: Sect events
  {
    id: 'inner_gate_admission',
    text: '内门试炼。一名执事站在石阶上，手中薄簿翻到你的名字。筑基已成，外门已不足容你。',
    condition: (state) =>
      (state.currentLocationId === 'outer_gate' || state.currentLocationId === 'inner_gate') &&
      state.realm === Realm.FoundationEstablishment &&
      state.sect.rank === 'outer' &&
      !state.choices.flags['inner_gate_admission_seen'],
    weight: (state) => 30 + (state.sect.contribution ?? 0) * 2,
    choices: [
      {
        text: '应考核入内门',
        effect: (state) => {
          let newState = setFlag(state, 'inner_gate_admission_seen');
          newState = advanceSectRank(newState);
          if (newState.sect.rank === 'inner') {
            return { state: newState, log: '你通过考核，入内门。石阶上薄簿多了一行朱字。' };
          }
          return { state: newState, log: '考核未过。贡献与规矩尚差一截。' };
        },
      },
      {
        text: '暂不',
        effect: (state) => {
          let newState = setFlag(state, 'inner_gate_admission_seen');
          newState = adjustQuality(newState, 'quiet_cultivation', 1);
          return { state: newState, log: '你退回阶下。内门仍在那里，不急。' };
        },
      },
    ],
  },
  {
    id: 'sect_discipline_hearing',
    text: '宗门问询。几名执事坐在堂上，薄簿上记着你的名。规矩亏损太多，今日须有个说法。',
    condition: (state) =>
      (state.currentLocationId === 'outer_gate' || state.currentLocationId === 'inner_gate') &&
      state.sect.rank !== 'none' &&
      state.sect.discipline < -3 &&
      !state.choices.flags['sect_discipline_hearing_seen'],
    weight: (state) => 20 + Math.abs(state.sect.discipline) * 5,
    choices: [
      {
        text: '辩解',
        effect: (state) => {
          let newState = setFlag(state, 'sect_discipline_hearing_seen');
          if (state.choices.qualities.sect_trace ?? 0 >= 5) {
            newState = {
              ...newState,
              sect: { ...newState.sect, discipline: Math.min(0, newState.sect.discipline + 3) },
            };
            newState = adjustQuality(newState, 'sect_trace', 1);
            return { state: newState, log: '你一番话打动了执事。规矩薄上朱笔划去几分。' };
          }
          newState = adjustQuality(newState, 'sect_trace', -1);
          return { state: newState, log: '辩解无力。执事摇头，薄簿未动。' };
        },
      },
      {
        text: '领罚',
        effect: (state) => {
          let newState = setFlag(state, 'sect_discipline_hearing_seen');
          newState = {
            ...newState,
            resources: { ...newState.resources, lifespan: Math.max(0, newState.resources.lifespan - 50) },
            sect: { ...newState.sect, discipline: 0 },
          };
          newState = adjustQuality(newState, 'sect_trace', 1);
          return { state: newState, log: '你领了罚。寿元少了五十刻，规矩簿上归零。' };
        },
      },
      {
        text: '出逃',
        effect: (state) => {
          let newState = setFlag(state, 'sect_discipline_hearing_seen');
          newState = leaveSect(newState);
          return { state: newState, log: '你转身出了山门。宗门簿上划掉你的名字，因果重了几分。' };
        },
      },
    ],
  },
  {
    id: 'fellow_disciple_rivalry',
    text: '同门争端。一名同修拦住你，言语间火药味很重。',
    condition: (state) =>
      state.currentLocationId === 'outer_gate' &&
      state.sect.rank !== 'none' &&
      !state.choices.flags['fellow_disciple_rivalry_seen'],
    weight: () => 12,
    choices: [
      {
        text: '退让',
        effect: (state) => {
          let newState = setFlag(state, 'fellow_disciple_rivalry_seen');
          newState = adjustQuality(newState, 'quiet_cultivation', 1);
          return { state: newState, log: '你退一步。面子丢了，气也消了。' };
        },
      },
      {
        text: '据理力争',
        effect: (state) => {
          let newState = setFlag(state, 'fellow_disciple_rivalry_seen');
          newState = adjustQuality(newState, 'combat_edge', 1);
          return { state: newState, log: '你寸步不让。争执声大，但也立了威。' };
        },
      },
      {
        text: '从中调停',
        effect: (state) => {
          let newState = setFlag(state, 'fellow_disciple_rivalry_seen');
          newState = adjustQuality(newState, 'market_ties', 1);
          return { state: newState, log: '你把两边都劝住。人脉添了一分，两边都记你一笔。' };
        },
      },
    ],
  },
  // F3: Dantoxin extended events
  {
    id: 'dantoxin_meridian_decay',
    text: '药毒蚀脉。行气时经脉如有针扎，丹田处一片灰浊。气机每过一处都带着苦意。',
    condition: (state) =>
      state.currentLocationId === 'home' &&
      state.resources.dantoxin >= 100 &&
      !state.choices.flags['dantoxin_meridian_decay_seen'],
    weight: (state) => 40 + Math.max(0, state.resources.dantoxin - 100),
    choices: [
      {
        text: '静坐逼毒',
        effect: (state) => {
          let newState = setFlag(state, 'dantoxin_meridian_decay_seen');

          if (newState.resources.essence < 50) {
            newState.resources = {
              ...newState.resources,
              dantoxin: newState.resources.dantoxin + 3,
              wounds: newState.resources.wounds + 2,
            };
            return { state: newState, log: '精元不足，药毒反噬。经脉灼痛，伤添两处。' };
          }

          newState.resources = {
            ...newState.resources,
            essence: newState.resources.essence - 50,
            dantoxin: Math.max(0, newState.resources.dantoxin - 15),
            lifespan: Math.max(0, newState.resources.lifespan - 50),
          };
          newState = adjustQuality(newState, 'quiet_cultivation', 1);
          return { state: newState, log: '你逼出一缕灰浊之气。丹毒退了十五分，寿元折了五十刻。' };
        },
      },
      {
        text: '服通脉丸',
        effect: (state) => {
          let newState = setFlag(state, 'dantoxin_meridian_decay_seen');

          if (newState.resources.meridianCleansingPills <= 0) {
            newState.resources = {
              ...newState.resources,
              dantoxin: newState.resources.dantoxin + 3,
              wounds: newState.resources.wounds + 1,
            };
            return { state: newState, log: '没有通脉丸。药毒仍在脉中游走，伤添一处。' };
          }

          newState.resources = {
            ...newState.resources,
            meridianCleansingPills: newState.resources.meridianCleansingPills - 1,
            dantoxin: Math.max(0, newState.resources.dantoxin - 30),
            essence: newState.resources.essence - 20,
          };
          newState = setFlag(newState, 'used_meridian_cleansing_pill_on_decay');
          newState = adjustQuality(newState, 'quiet_cultivation', 1);
          newState = adjustQuality(newState, 'reckless_breakthrough', -1);
          return { state: newState, log: '通脉丸入喉，苦意下行。丹毒退了三十分，脉中刺痛渐消。' };
        },
      },
      {
        text: '强行压下',
        effect: (state) => {
          let newState = setFlag(state, 'dantoxin_meridian_decay_seen');
          newState.resources = {
            ...newState.resources,
            dantoxin: newState.resources.dantoxin + 5,
            wounds: newState.resources.wounds + 1,
          };
          newState = adjustQuality(newState, 'reckless_breakthrough', 2);
          return { state: newState, log: '你强行将药毒压回丹田。脉中多了一处暗伤。' };
        },
      },
    ],
  },
  {
    id: 'alchemist_insight',
    text: '静中翻检旧方，忽然觉得从前未悟的药理有了几分明朗。几味药的走向在脑中排开，像拼图落位。',
    condition: (state) =>
      state.currentLocationId === 'home' &&
      state.realm === Realm.FoundationEstablishment &&
      (state.choices.qualities['alchemy_affinity'] ?? 0) >= 8 &&
      !state.choices.flags['alchemist_insight_seen'],
    weight: (state) => 8 + (state.choices.qualities['alchemy_affinity'] ?? 0),
    choices: [
      {
        text: '研习新方',
        effect: (state) => {
          let newState = setFlag(state, 'alchemist_insight_seen');
          newState = setFlag(newState, 'sought_meridian_cleansing_formula');
          newState.resources = {
            ...newState.resources,
            insight: newState.resources.insight + 3,
          };
          newState = adjustQuality(newState, 'alchemy_affinity', 1);
          return { state: newState, log: '你循着感悟，翻出一条通脉的路数。见闻涨了三分。' };
        },
      },
      {
        text: '整理旧方',
        effect: (state) => {
          let newState = setFlag(state, 'alchemist_insight_seen');
          newState.resources = {
            ...newState.resources,
            insight: newState.resources.insight + 2,
            dantoxin: Math.max(0, newState.resources.dantoxin - 5),
          };
          newState = adjustQuality(newState, 'alchemy_affinity', 1);
          return { state: newState, log: '你将旧方中的偏差逐一修正。丹毒退了五分，见闻涨了两分。' };
        },
      },
    ],
  },
  // F8: Secret Realm discovery events
  {
    id: 'herb_valley_rumor',
    text: '山路上有人提起一处终年不散的药谷，雾气里隐约可见奇草。',
    condition: (state) =>
      (state.currentLocationId === 'market' || state.currentLocationId === 'mountain_path') &&
      state.choices.flags['heard_herb_slope_hint'] &&
      !state.secretRealm.discoveredRealms.includes('misty_herb_valley'),
    weight: () => 18,
    choices: [
      {
        text: '记下路径',
        effect: (state) => {
          let newState = discoverRealm(state, 'misty_herb_valley');
          newState = setFlag(newState, 'has_discovered_realm');
          newState.resources = { ...newState.resources, insight: newState.resources.insight + 1 };
          return { state: newState, log: '你记下通往雾中药谷的路径。日后可往探索。' };
        },
      },
      {
        text: '听听便罢',
        effect: (state) => {
          let newState = setFlag(state, 'herb_valley_rumor_heard');
          newState.resources = { ...newState.resources, insight: newState.resources.insight + 1 };
          return { state: newState, log: '你听了几句，没往心里去。' };
        },
      },
    ],
  },
  {
    id: 'ruins_map_fragment',
    text: '内门有人出售一张残缺地图，标注着山腹中一处古修洞府。',
    condition: (state) =>
      (state.currentLocationId === 'outer_gate' || state.currentLocationId === 'inner_gate') &&
      state.realm === Realm.FoundationEstablishment &&
      state.choices.flags['sect_rank_inner'] &&
      !state.secretRealm.discoveredRealms.includes('ancient_ruins'),
    weight: () => 14,
    choices: [
      {
        text: '买下地图（五钱）',
        effect: (state) => {
          if (state.resources.coins < 5) {
            return { state, log: '钱不够。残图被人买走。' };
          }
          let newState = discoverRealm(state, 'ancient_ruins');
          newState = setFlag(newState, 'has_discovered_realm');
          newState.resources = { ...newState.resources, coins: newState.resources.coins - 5 };
          return { state: newState, log: '你买下残图。古修遗迹的位置已在心中。' };
        },
      },
      {
        text: '只记大致方位',
        effect: (state) => {
          let newState = setFlag(state, 'ruins_map_heard');
          newState.resources = { ...newState.resources, insight: newState.resources.insight + 1 };
          return { state: newState, log: '你记住大致方位，未买残图。' };
        },
      },
    ],
  },
  {
    id: 'demonic_aura_sighting',
    text: '山径深处有人闻到浑浊魔气，似乎来自某处地底裂隙。',
    condition: (state) =>
      state.currentLocationId === 'mountain_path' &&
      state.realm === Realm.FoundationEstablishment &&
      (state.choices.qualities['combat_edge'] ?? 0) >= 5 &&
      !state.secretRealm.discoveredRealms.includes('demonic_cave'),
    weight: () => 12,
    choices: [
      {
        text: '探查魔气来源',
        effect: (state) => {
          let newState = discoverRealm(state, 'demonic_cave');
          newState = setFlag(newState, 'has_discovered_realm');
          return { state: newState, log: '你找到了魔气洞窟的入口。危险，但也可能有机缘。' };
        },
      },
      {
        text: '避开',
        effect: (state) => {
          let newState = setFlag(state, 'demonic_aura_avoided');
          return { state: newState, log: '你绕开那处裂隙。魔气不散，洞口仍在。' };
        },
      },
    ],
  },
  {
    id: 'heavenly_vision',
    text: '静坐中，你的神识忽然被一道清气牵引，仿佛看到了山巅之上的另一番天地。',
    condition: (state) =>
      (state.currentLocationId === 'home' || state.currentLocationId === 'cave_dwelling') &&
      state.realm === Realm.GoldenCore &&
      !state.secretRealm.discoveredRealms.includes('heavenly_peak'),
    weight: () => 10,
    choices: [
      {
        text: '循气而行',
        effect: (state) => {
          let newState = discoverRealm(state, 'heavenly_peak');
          newState = setFlag(newState, 'has_discovered_realm');
          newState.resources = { ...newState.resources, insight: newState.resources.insight + 3 };
          return { state: newState, log: '天柱峰的位置在你心中显现。灵气之浓，前所未见。' };
        },
      },
      {
        text: '按住不动',
        effect: (state) => {
          let newState = setFlag(state, 'heavenly_vision_ignored');
          newState.resources = { ...newState.resources, insight: newState.resources.insight + 1 };
          return { state: newState, log: '你压住神识，没有追寻。那道清气散去。' };
        },
      },
    ],
  },
  // F8: Secret Realm event chains
  {
    id: 'herb_valley_discovery',
    text: '雾中出现了岔路。左边药香更浓，右边有隐约的水声。',
    condition: (state) =>
      state.secretRealm.activeExploration === 'misty_herb_valley' &&
      state.secretRealm.explorationProgress >= 40 &&
      !state.choices.flags['herb_valley_discovery_seen'],
    weight: () => 80,
    choices: [
      {
        text: '循药香深入',
        effect: (state) => {
          let newState = setFlag(state, 'herb_valley_discovery_seen');
          newState.resources = { ...newState.resources, herbs: newState.resources.herbs + 3 };
          newState = adjustQuality(newState, 'alchemy_affinity', 1);
          return { state: newState, log: '药香尽头是一片古药圃。你采了几株不常见的草药。' };
        },
      },
      {
        text: '循水声而行',
        effect: (state) => {
          let newState = setFlag(state, 'herb_valley_discovery_seen');
          newState.resources = { ...newState.resources, insight: newState.resources.insight + 2 };
          return { state: newState, log: '水声引你到一处灵泉。饮了一口，神识清明了些。' };
        },
      },
    ],
  },
  {
    id: 'ruins_guardian',
    text: '遗迹深处，一具石像忽然动了。守卫阵灵仍在运作。',
    condition: (state) =>
      state.secretRealm.activeExploration === 'ancient_ruins' &&
      state.secretRealm.explorationProgress >= 40 &&
      !state.choices.flags['ruins_guardian_seen'],
    weight: () => 80,
    choices: [
      {
        text: '斗法',
        effect: (state) => {
          let newState = setFlag(state, 'ruins_guardian_seen');
          newState.resources = { ...newState.resources, qi: newState.resources.qi + 5, essence: Math.max(0, newState.resources.essence - 15) };
          newState = adjustQuality(newState, 'combat_edge', 1);
          return { state: newState, log: '你击退了阵灵。它散去的灵气回到你丹田。' };
        },
      },
      {
        text: '交涉',
        effect: (state) => {
          let newState = setFlag(state, 'ruins_guardian_seen');
          if (newState.resources.insight >= 20) {
            newState.resources = { ...newState.resources, insight: newState.resources.insight + 3 };
            return { state: newState, log: '你以神识沟通阵灵。它认可了你的见闻，退入阵中。' };
          }
          newState.resources = { ...newState.resources, wounds: newState.resources.wounds + 1 };
          return { state: newState, log: '见闻不够，阵灵不认。一击打来，你添了伤。' };
        },
      },
      {
        text: '潜行绕过',
        effect: (state) => {
          let newState = setFlag(state, 'ruins_guardian_seen');
          newState.resources = { ...newState.resources, essence: Math.max(0, newState.resources.essence - 10) };
          return { state: newState, log: '你屏息绕过阵灵。多耗了些精元，但未添伤。' };
        },
      },
    ],
  },
  {
    id: 'demonic_whispers',
    text: '魔气灌入经脉，你听到了低语。不是外界的声音，是自己心底的。',
    condition: (state) =>
      state.secretRealm.activeExploration === 'demonic_cave' &&
      state.secretRealm.explorationProgress >= 40 &&
      !state.choices.flags['demonic_whispers_seen'],
    weight: () => 80,
    choices: [
      {
        text: '静心抵御',
        effect: (state) => {
          let newState = setFlag(state, 'demonic_whispers_seen');
          newState.resources = { ...newState.resources, qi: newState.resources.qi + 5 };
          newState = adjustQuality(newState, 'quiet_cultivation', 2);
          return { state: newState, log: '你守住神识。魔气退去时，反而留下了一丝真气。' };
        },
      },
      {
        text: '借助魔气修炼',
        effect: (state) => {
          let newState = setFlag(state, 'demonic_whispers_seen');
          newState.resources = { ...newState.resources, qi: newState.resources.qi + 10, dantoxin: newState.resources.dantoxin + 5 };
          newState = adjustQuality(newState, 'reckless_breakthrough', 1);
          return { state: newState, log: '你以魔气行功。真气多了十缕，但丹毒也涨了五分。' };
        },
      },
    ],
  },
  {
    id: 'heavenly_trial',
    text: '天柱峰顶，一道雷劫劈下。这不是天罚，是试炼。',
    condition: (state) =>
      state.secretRealm.activeExploration === 'heavenly_peak' &&
      state.secretRealm.explorationProgress >= 60 &&
      !state.choices.flags['heavenly_trial_seen'],
    weight: () => 80,
    choices: [
      {
        text: '硬扛',
        effect: (state) => {
          let newState = setFlag(state, 'heavenly_trial_seen');
          newState.resources = { ...newState.resources, qi: newState.resources.qi + 15, wounds: newState.resources.wounds + 2 };
          newState = adjustQuality(newState, 'combat_edge', 2);
          return { state: newState, log: '你硬抗雷劫。伤添两处，但真气暴涨十五缕。' };
        },
      },
      {
        text: '以功法化解',
        effect: (state) => {
          let newState = setFlag(state, 'heavenly_trial_seen');
          newState.resources = { ...newState.resources, qi: newState.resources.qi + 8, insight: newState.resources.insight + 5 };
          return { state: newState, log: '你运转功法化解雷气。真气增八缕，见闻涨五分。' };
        },
      },
    ],
  },
  // F9: Ascension events
  {
    id: 'ascension_threshold',
    text: '天地灵气忽然涌来，你感受到一股前所未有的牵引。天门，似乎就在上方。',
    condition: (state) => shouldShowAscensionThreshold(state),
    weight: () => 100,
    choices: [
      {
        text: '感应天意',
        effect: (state) => {
          let newState = setFlag(state, 'ascension_threshold_seen');
          newState.resources = { ...newState.resources, insight: newState.resources.insight + 5 };
          return { state: newState, log: '你感应天意。飞升之路若隐若现，你还需积蓄力量。' };
        },
      },
    ],
  },
  {
    id: 'ascension_choice_event',
    text: '天门大开。你已至修行之巅，面前有四条路。',
    condition: (state) => state.ascension.ascensionChoice === 'pending',
    weight: () => 200,
    choices: [
      {
        text: '飞升（踏入更高层次）',
        effect: (state) => {
          const result = executeAscension(state, 'ascend');
          return { state: result.state, log: result.log };
        },
      },
      {
        text: '留界（留下为尊）',
        effect: (state) => {
          const result = executeAscension(state, 'remain');
          return { state: result.state, log: result.log };
        },
      },
      {
        text: '超脱（重入轮回，保留部分造化）',
        effect: (state) => {
          const result = executeAscension(state, 'transcend');
          return { state: result.state, log: result.log };
        },
      },
      {
        text: '坐化（安然消散）',
        effect: (state) => {
          const result = executeAscension(state, 'dissipate');
          return { state: result.state, log: result.log };
        },
      },
    ],
  },
  {
    id: 'stream_valley_meditation',
    text: '溪水从石上淌过，声如细语。你坐在溪边，气机随水声缓缓沉入丹田。',
    condition: (state) =>
      state.currentLocationId === 'stream_valley' &&
      realmAtLeast(state, Realm.QiCondensation) &&
      !state.choices.flags['stream_meditation_seen'],
    weight: (state) => 14 + (state.choices.qualities['quiet_cultivation'] ?? 0) * 2,
    choices: [
      {
        text: '顺水入静',
        effect: (state) => {
          let newState = setFlag(state, 'stream_meditation_seen');
          newState.resources = {
            ...newState.resources,
            qi: newState.resources.qi + 3,
            lifespan: Math.max(0, newState.resources.lifespan - 30),
          };
          newState = adjustQuality(newState, 'quiet_cultivation', 2);
          return { state: newState, log: '你随水声入定。真气浮起三缕，寿元减了三十刻。溪水不知。' };
        },
      },
      {
        text: '起身取水',
        effect: (state) => {
          let newState = setFlag(state, 'stream_meditation_seen');
          newState.resources = {
            ...newState.resources,
            herbs: newState.resources.herbs + 2,
          };
          return { state: newState, log: '你取了溪水。两株水草也一并带了回来。' };
        },
      },
      {
        text: '细听水声',
        effect: (state) => {
          let newState = setFlag(state, 'stream_meditation_seen');
          newState.resources = {
            ...newState.resources,
            insight: newState.resources.insight + 2,
          };
          newState = adjustQuality(newState, 'quiet_cultivation', 1);
          return { state: newState, log: '你闭目细听。水声里有条线，你摸到了一点，见闻长了。' };
        },
      },
    ],
  },
  {
    id: 'stream_valley_herb_find',
    text: '溪石下长着一丛水草，叶尖挂露。你蹲下细辨，是夜砂芝的幼株。',
    condition: (state) =>
      state.currentLocationId === 'stream_valley' &&
      state.time.season === Season.Winter &&
      !state.choices.flags['found_night_sand_fungus'],
    weight: (state) => 12 + (state.choices.qualities['alchemy_affinity'] ?? 0) * 3,
    choices: [
      {
        text: '小心采下',
        effect: (state) => {
          let newState = setFlag(state, 'found_night_sand_fungus');
          newState.resources = {
            ...newState.resources,
            herbs: newState.resources.herbs + 3,
          };
          newState = adjustQuality(newState, 'alchemy_affinity', 1);
          return { state: newState, log: '你小心采下夜砂芝。草药添了三株，药性尚温。' };
        },
      },
      {
        text: '记下位置',
        effect: (state) => {
          let newState = setFlag(state, 'found_night_sand_fungus');
          newState = setFlag(newState, 'marked_night_sand_fungus');
          newState.resources = {
            ...newState.resources,
            insight: newState.resources.insight + 1,
          };
          return { state: newState, log: '你在石上刻了个记号。夜砂芝还小，位置记下了。' };
        },
      },
      {
        text: '放过不采',
        effect: (state) => {
          let newState = setFlag(state, 'found_night_sand_fungus');
          newState = adjustQuality(newState, 'quiet_cultivation', 1);
          return { state: newState, log: '你没有动手。幼株尚嫩，留它在石下多长一季。' };
        },
      },
    ],
  },
  {
    id: 'stream_valley_encounter',
    text: '溪谷深处石壁潮湿，一层暗色苔衣附在铁色岩面上。指尖触之微凉。',
    condition: (state) =>
      state.currentLocationId === 'stream_valley' &&
      (state.time.season === Season.Autumn || state.time.season === Season.Winter) &&
      !state.choices.flags['found_iron_wire_moss'],
    weight: (state) => 10 + (state.choices.qualities['alchemy_affinity'] ?? 0) * 2,
    choices: [
      {
        text: '揭取苔衣',
        effect: (state) => {
          let newState = setFlag(state, 'found_iron_wire_moss');
          newState.resources = {
            ...newState.resources,
            herbs: newState.resources.herbs + 2,
            dantoxin: newState.resources.dantoxin + 1,
          };
          newState = adjustQuality(newState, 'alchemy_affinity', 1);
          return { state: newState, log: '你揭下苔衣。草药添了两株，铁线苔性寒，丹毒起了一分。' };
        },
      },
      {
        text: '只取一点',
        effect: (state) => {
          let newState = setFlag(state, 'found_iron_wire_moss');
          newState.resources = {
            ...newState.resources,
            herbs: newState.resources.herbs + 1,
          };
          return { state: newState, log: '你只取了边缘一小片。药性不强，但够用。' };
        },
      },
      {
        text: '辨其药性',
        effect: (state) => {
          let newState = setFlag(state, 'found_iron_wire_moss');
          newState.resources = {
            ...newState.resources,
            insight: newState.resources.insight + 2,
          };
          newState = adjustQuality(newState, 'alchemy_affinity', 1);
          return { state: newState, log: '你辨认药性。铁线苔入肝经，见闻长了。苔衣仍在石上。' };
        },
      },
    ],
  },
  {
    id: 'mountain_elder_visit',
    text: '山居老人拄杖到访。他不是修士，但活得比许多修士久。炉上烧水，老人坐下，不多说话。',
    condition: (state) =>
      state.currentLocationId === 'stream_valley' &&
      !state.choices.flags['met_mountain_elder'],
    weight: () => 10,
    choices: [
      {
        text: '倒茶听他讲',
        effect: (state) => {
          let newState = setFlag(state, 'met_mountain_elder');
          newState.resources = {
            ...newState.resources,
            insight: newState.resources.insight + 3,
          };
          newState = adjustQuality(newState, 'quiet_cultivation', 1);
          newState = touchRelationship(
            newState,
            { id: MOUNTAIN_ELDER_ID, identity: '山居老人' },
            { tags: ['听过旧事'], favorsDelta: 1 }
          );
          return { state: newState, log: '老人讲了几件旧事。话不多，句句落在实处。见闻长了三分。' };
        },
      },
      {
        text: '问山下世事',
        effect: (state) => {
          let newState = setFlag(state, 'met_mountain_elder');
          newState.resources = {
            ...newState.resources,
            insight: newState.resources.insight + 2,
            coins: newState.resources.coins + 3,
          };
          newState = touchRelationship(
            newState,
            { id: MOUNTAIN_ELDER_ID, identity: '山居老人' },
            { tags: ['问过世事'] }
          );
          return { state: newState, log: '老人说了几条山下消息。临走时留下三枚钱，说是多余的。' };
        },
      },
      {
        text: '送些草药',
        effect: (state) => {
          let newState = setFlag(state, 'met_mountain_elder');
          newState.resources = {
            ...newState.resources,
            herbs: Math.max(0, newState.resources.herbs - 2),
          };
          newState = adjustQuality(newState, 'karmic_weight', -1);
          newState = touchRelationship(
            newState,
            { id: MOUNTAIN_ELDER_ID, identity: '山居老人' },
            { tags: ['受你草药'], favorsDelta: 2 }
          );
          return { state: newState, log: '老人收下草药，点了点头。因果轻了一分，人情重了两分。' };
        },
      },
    ],
  },
  {
    id: 'temple_old_talisman',
    text: '废观殿角落灰深处，半张黄纸露出一角。纸上墨线犹在，散发淡淡灵意。',
    condition: (state) =>
      state.currentLocationId === 'abandoned_temple' &&
      realmAtLeast(state, Realm.QiCondensation) &&
      !state.choices.flags['found_old_talisman'],
    weight: (state) => 12 + (state.resources.insight >= 5 ? 8 : 0),
    choices: [
      {
        text: '细看符文',
        effect: (state) => {
          let newState = setFlag(state, 'found_old_talisman');
          newState.resources = {
            ...newState.resources,
            insight: newState.resources.insight + 3,
          };
          newState = adjustQuality(newState, 'quiet_cultivation', 1);
          return { state: newState, log: '你细看符文。墨线虽残，仍可辨出几笔灵纹。见闻长了。' };
        },
      },
      {
        text: '收入袖中',
        effect: (state) => {
          let newState = setFlag(state, 'found_old_talisman');
          newState = setFlag(newState, 'kept_old_talisman');
          newState.resources = {
            ...newState.resources,
            insight: newState.resources.insight + 1,
          };
          return { state: newState, log: '你把黄纸收入袖中。符文气息微弱，但仍在。' };
        },
      },
      {
        text: '不看',
        effect: (state) => {
          let newState = setFlag(state, 'found_old_talisman');
          newState = adjustQuality(newState, 'quiet_cultivation', 1);
          return { state: newState, log: '你没有碰那张纸。灵意散去，灰落回原处。' };
        },
      },
    ],
  },
  {
    id: 'temple_forbidden_knowledge',
    text: '石碑背面刻着一行小字，字迹歪斜，像是有人用指甲勉强划出。内容……不宜久看。',
    condition: (state) =>
      state.currentLocationId === 'abandoned_temple' &&
      Boolean(state.choices.flags['found_jade_slip']) &&
      !state.choices.flags['read_forbidden_text'],
    weight: (state) => 8 + (state.choices.qualities['combat_edge'] ?? 0) * 2,
    choices: [
      {
        text: '强记下来',
        effect: (state) => {
          let newState = setFlag(state, 'read_forbidden_text');
          newState.resources = {
            ...newState.resources,
            insight: newState.resources.insight + 4,
            dantoxin: newState.resources.dantoxin + 3,
          };
          newState = adjustQuality(newState, 'reckless_breakthrough', 2);
          return { state: newState, log: '你强记下那段文字。见闻大长，但头中刺痛不止，丹毒也深了三分。' };
        },
      },
      {
        text: '只看一眼',
        effect: (state) => {
          let newState = setFlag(state, 'read_forbidden_text');
          newState.resources = {
            ...newState.resources,
            insight: newState.resources.insight + 2,
          };
          return { state: newState, log: '你只瞥了一眼。字意模糊，但见闻长了一些。' };
        },
      },
      {
        text: '抹去',
        effect: (state) => {
          let newState = setFlag(state, 'read_forbidden_text');
          newState = adjustQuality(newState, 'quiet_cultivation', 2);
          newState = adjustQuality(newState, 'karmic_weight', -1);
          return { state: newState, log: '你用手抹去那些字。石面干净了，因果也轻了一分。' };
        },
      },
    ],
  },
  {
    id: 'temple_wandering_lecturer',
    text: '废观外有人立而不入，衣衫半旧，目光清明。他在看石阶上的裂纹，自言自语。',
    condition: (state) =>
      state.currentLocationId === 'abandoned_temple' &&
      realmAtLeast(state, Realm.QiCondensation) &&
      !state.choices.flags['met_wandering_lecturer'],
    weight: (state) => 14 + (state.resources.insight >= 8 ? 6 : 0),
    choices: [
      {
        text: '上前请教',
        effect: (state) => {
          let newState = setFlag(state, 'met_wandering_lecturer');
          newState.resources = {
            ...newState.resources,
            insight: newState.resources.insight + 4,
          };
          newState = touchRelationship(
            newState,
            { id: WANDERING_LECTURER_ID, identity: '游方讲士' },
            { tags: ['请教过'], favorsDelta: 1 }
          );
          return { state: newState, log: '他讲了一段旧论。你听了，见闻长了四分。他没问你名字。' };
        },
      },
      {
        text: '旁听片刻',
        effect: (state) => {
          let newState = setFlag(state, 'met_wandering_lecturer');
          newState.resources = {
            ...newState.resources,
            insight: newState.resources.insight + 2,
          };
          return { state: newState, log: '你站了一会儿。他自言自语中有一两句可听，见闻长了。' };
        },
      },
      {
        text: '回避',
        effect: (state) => {
          let newState = setFlag(state, 'met_wandering_lecturer');
          newState = adjustQuality(newState, 'quiet_cultivation', 1);
          return { state: newState, log: '你转身离开。他仍在看石阶，没有抬头。' };
        },
      },
    ],
  },
  {
    id: 'temple_candle_heart',
    text: '废观后殿残炉旁，一株细须从灰烬中长出，通体微红，须尖有光。',
    condition: (state) =>
      state.currentLocationId === 'abandoned_temple' &&
      state.time.season === Season.Summer &&
      !state.choices.flags['found_candle_heart_tendril'],
    weight: (state) => 8 + (state.choices.qualities['alchemy_affinity'] ?? 0) * 3,
    choices: [
      {
        text: '连根取下',
        effect: (state) => {
          let newState = setFlag(state, 'found_candle_heart_tendril');
          newState.resources = {
            ...newState.resources,
            herbs: newState.resources.herbs + 2,
            dantoxin: newState.resources.dantoxin + 3,
          };
          newState = adjustQuality(newState, 'alchemy_affinity', 2);
          newState = adjustQuality(newState, 'reckless_breakthrough', 1);
          return { state: newState, log: '你连根取下烛心须。药性猛，丹毒也深了三分。炼药的路又近了一步。' };
        },
      },
      {
        text: '只取须尖',
        effect: (state) => {
          let newState = setFlag(state, 'found_candle_heart_tendril');
          newState.resources = {
            ...newState.resources,
            herbs: newState.resources.herbs + 1,
          };
          newState = adjustQuality(newState, 'alchemy_affinity', 1);
          return { state: newState, log: '你只取须尖。药性温和了些，炼药的手法也精细了一分。' };
        },
      },
      {
        text: '不碰',
        effect: (state) => {
          let newState = setFlag(state, 'found_candle_heart_tendril');
          newState.resources = {
            ...newState.resources,
            insight: newState.resources.insight + 1,
          };
          return { state: newState, log: '你看了看，没有动手。烛心须仍在灰烬中，见闻长了一点。' };
        },
      },
    ],
  },
  {
    id: 'herb_slope_seasonal_bloom',
    text: (state) => {
      if (state.time.season === Season.Spring) return '药坡上春花初放，嫩叶含露。几味常用药草正到采摘窗口。';
      if (state.time.season === Season.Summer) return '药坡夏草茂盛，虫鸣不绝。几株灰茎花开得正旺。';
      if (state.time.season === Season.Autumn) return '秋深了，药坡上只剩几株老根。叶落药沉，正是收根的好时候。';
      return '冬寒覆药坡，只有白石衣在石壁上微微反光。';
    },
    condition: (state) =>
      state.currentLocationId === 'herb_slope' &&
      !state.choices.flags[`herb_bloom_${state.time.season}_seen`],
    weight: (state) => 16 + (state.choices.qualities['alchemy_affinity'] ?? 0) * 2,
    choices: [
      {
        text: '按时采药',
        effect: (state) => {
          let newState = setFlag(state, `herb_bloom_${state.time.season}_seen`);
          newState.resources = {
            ...newState.resources,
            herbs: newState.resources.herbs + 3,
            dantoxin: newState.resources.dantoxin + 1,
          };
          newState = adjustQuality(newState, 'alchemy_affinity', 1);
          return { state: newState, log: '你按季采药。草药添了三株，药滞也多了一分。' };
        },
      },
      {
        text: '只采一味',
        effect: (state) => {
          let newState = setFlag(state, `herb_bloom_${state.time.season}_seen`);
          newState.resources = {
            ...newState.resources,
            herbs: newState.resources.herbs + 1,
            insight: newState.resources.insight + 1,
          };
          return { state: newState, log: '你只采一味。药性纯粹，见闻也长了一些。' };
        },
      },
      {
        text: '留药不采',
        effect: (state) => {
          let newState = setFlag(state, `herb_bloom_${state.time.season}_seen`);
          newState = adjustQuality(newState, 'quiet_cultivation', 1);
          return { state: newState, log: '你没有动手。药草自生自落，你的心静了一些。' };
        },
      },
    ],
  },
  {
    id: 'herb_slope_pest',
    text: '药坡上几株草药叶面有虫蛀痕迹。不处理，虫害可能蔓延。',
    condition: (state) =>
      state.currentLocationId === 'herb_slope' &&
      state.resources.herbs > 3 &&
      !state.choices.flags['herb_pest_seen'],
    weight: () => 10,
    choices: [
      {
        text: '花药除虫',
        effect: (state) => {
          let newState = setFlag(state, 'herb_pest_seen');
          newState.resources = {
            ...newState.resources,
            herbs: Math.max(0, newState.resources.herbs - 2),
          };
          newState = adjustQuality(newState, 'alchemy_affinity', 1);
          return { state: newState, log: '你用了两株草药制了驱虫粉。虫害止住，炼药的手法也精了一些。' };
        },
      },
      {
        text: '手动摘虫',
        effect: (state) => {
          let newState = setFlag(state, 'herb_pest_seen');
          newState.resources = {
            ...newState.resources,
            essence: Math.max(0, newState.resources.essence - 10),
            herbs: newState.resources.herbs + 1,
          };
          return { state: newState, log: '你蹲下逐只摘虫。精元耗了些，但护住了一株好药。' };
        },
      },
      {
        text: '不管',
        effect: (state) => {
          let newState = setFlag(state, 'herb_pest_seen');
          newState.resources = {
            ...newState.resources,
            herbs: Math.max(0, newState.resources.herbs - 3),
          };
          return { state: newState, log: '你没有管。几日后虫害蔓延，损了三株草药。' };
        },
      },
    ],
  },
  {
    id: 'herb_slope_rival_gatherer',
    text: '药坡另一头有人也在采药。那人手法很快，几处好药已被他先取。',
    condition: (state) =>
      state.currentLocationId === 'herb_slope' &&
      !state.choices.flags['met_rival_gatherer'],
    weight: (state) => 12 + (state.choices.qualities['market_ties'] ?? 0) * 2,
    choices: [
      {
        text: '各采各的',
        effect: (state) => {
          let newState = setFlag(state, 'met_rival_gatherer');
          newState.resources = {
            ...newState.resources,
            herbs: newState.resources.herbs + 1,
          };
          return { state: newState, log: '你各采各的。好药不多，但你还是找到了一株。' };
        },
      },
      {
        text: '交涉分药',
        effect: (state) => {
          let newState = setFlag(state, 'met_rival_gatherer');
          if (newState.resources.coins >= 3) {
            newState.resources = {
              ...newState.resources,
              coins: newState.resources.coins - 3,
              herbs: newState.resources.herbs + 4,
            };
            newState = adjustQuality(newState, 'market_ties', 1);
            return { state: newState, log: '你花三枚钱分了他一半。草药添了四株，坊市路子也宽了。' };
          }
          newState.resources = {
            ...newState.resources,
            herbs: newState.resources.herbs + 1,
          };
          return { state: newState, log: '你钱不够，对方不理。你只找到一株。' };
        },
      },
      {
        text: '先到先得',
        effect: (state) => {
          let newState = setFlag(state, 'met_rival_gatherer');
          newState.resources = {
            ...newState.resources,
            herbs: newState.resources.herbs + 3,
            wounds: newState.resources.wounds + 1,
          };
          newState = adjustQuality(newState, 'combat_edge', 1);
          newState = adjustQuality(newState, 'karmic_weight', 1);
          return { state: newState, log: '你抢先采了三株。对方推了你一把，添了一处伤。因果重了一分。' };
        },
      },
    ],
  },
  {
    id: 'ferry_foreign_news',
    text: '渡口来了一队外乡商旅。他们带来的消息又远又碎，但有几条值得听。',
    condition: (state) =>
      state.currentLocationId === 'ferry_crossing' &&
      !state.choices.flags['heard_foreign_news'],
    weight: (state) => 16 + (state.choices.qualities['market_ties'] ?? 0) * 2,
    choices: [
      {
        text: '细听',
        effect: (state) => {
          let newState = setFlag(state, 'heard_foreign_news');
          newState.resources = {
            ...newState.resources,
            insight: newState.resources.insight + 3,
          };
          newState = adjustQuality(newState, 'market_ties', 1);
          return { state: newState, log: '你听了许久。消息零碎，但见闻长了。坊市路子也宽了一点。' };
        },
      },
      {
        text: '花两钱打听',
        effect: (state) => {
          let newState = setFlag(state, 'heard_foreign_news');
          newState.resources = {
            ...newState.resources,
            coins: Math.max(0, newState.resources.coins - 2),
            insight: newState.resources.insight + 5,
          };
          newState = adjustQuality(newState, 'market_ties', 2);
          return { state: newState, log: '两枚钱换来几条实在消息。见闻大长，坊市路子更宽了。' };
        },
      },
      {
        text: '不关心',
        effect: (state) => {
          let newState = setFlag(state, 'heard_foreign_news');
          return { state: newState, log: '你没有凑过去。商旅自去，消息散在渡口风中。' };
        },
      },
    ],
  },
  {
    id: 'ferry_missing_person',
    text: '渡口贴了一张寻人帖。墨迹不新，但赏钱数目不小。',
    condition: (state) =>
      state.currentLocationId === 'ferry_crossing' &&
      !state.choices.flags['saw_missing_person_post'],
    weight: () => 10,
    choices: [
      {
        text: '记下特征',
        effect: (state) => {
          let newState = setFlag(state, 'saw_missing_person_post');
          newState.resources = {
            ...newState.resources,
            insight: newState.resources.insight + 2,
          };
          return { state: newState, log: '你记下寻人帖上的特征。见闻长了。人尚未找到。' };
        },
      },
      {
        text: '揭帖找人',
        effect: (state) => {
          let newState = setFlag(state, 'saw_missing_person_post');
          newState.resources = {
            ...newState.resources,
            essence: Math.max(0, newState.resources.essence - 20),
            coins: newState.resources.coins + 8,
          };
          newState = adjustQuality(newState, 'karmic_weight', 1);
          return { state: newState, log: '你揭了帖，四处打听。精元耗了些，赏钱到手八枚。因果重了一分。' };
        },
      },
      {
        text: '不碰',
        effect: (state) => {
          let newState = setFlag(state, 'saw_missing_person_post');
          return { state: newState, log: '你没有碰那张帖子。寻人帖仍在墙上，墨迹渐淡。' };
        },
      },
    ],
  },
  {
    id: 'ferry_patrol_encounter',
    text: '渡口石阶上站着一名巡山弟子，面熟。他看过你一眼，没有多问。',
    condition: (state) =>
      state.currentLocationId === 'ferry_crossing' &&
      Boolean(state.choices.flags['outer_gate_registered']) &&
      !state.choices.flags['met_patrol_at_ferry'],
    weight: (state) => 12 + (state.choices.qualities['sect_trace'] ?? 0) * 2,
    choices: [
      {
        text: '点头招呼',
        effect: (state) => {
          let newState = setFlag(state, 'met_patrol_at_ferry');
          newState.resources = {
            ...newState.resources,
            insight: newState.resources.insight + 1,
          };
          newState = touchRelationship(
            newState,
            { id: PATROL_DISCIPLE_ID, identity: '巡山弟子' },
            { tags: ['点头招呼过'] }
          );
          return { state: newState, log: '你点了点头。他也点了点头，没有多话。见闻长了一点。' };
        },
      },
      {
        text: '问路',
        effect: (state) => {
          let newState = setFlag(state, 'met_patrol_at_ferry');
          newState = setFlag(newState, 'heard_ferry_route');
          newState.resources = {
            ...newState.resources,
            insight: newState.resources.insight + 2,
          };
          newState = touchRelationship(
            newState,
            { id: PATROL_DISCIPLE_ID, identity: '巡山弟子' },
            { tags: ['问过路'] }
          );
          return { state: newState, log: '他指了路。你记下，见闻长了两分。' };
        },
      },
      {
        text: '绕行',
        effect: (state) => {
          let newState = setFlag(state, 'met_patrol_at_ferry');
          newState.resources = {
            ...newState.resources,
            essence: Math.max(0, newState.resources.essence - 5),
          };
          return { state: newState, log: '你绕了一段路。精元耗了些，但没有交集。' };
        },
      },
    ],
  },
  {
    id: 'fellow_disciple_failure',
    text: '坊市角落坐着一名面色灰败的同门。他刚冲关失败，气息不稳。',
    condition: (state) =>
      (state.currentLocationId === 'market' || state.currentLocationId === 'outer_gate') &&
      realmAtLeast(state, Realm.QiCondensation) &&
      !state.choices.flags['met_disillusioned_fellow'],
    weight: (state) => 8 + (state.choices.qualities['sect_trace'] ?? 0) * 2,
    choices: [
      {
        text: '送药宽慰',
        effect: (state) => {
          let newState = setFlag(state, 'met_disillusioned_fellow');
          newState.resources = {
            ...newState.resources,
            herbs: Math.max(0, newState.resources.herbs - 3),
          };
          newState = adjustQuality(newState, 'karmic_weight', -1);
          newState = touchRelationship(
            newState,
            { id: DISILLUSIONED_FELLOW_ID, identity: '灰败同门' },
            { tags: ['受你宽慰'], favorsDelta: 1 }
          );
          return { state: newState, log: '你送了三株草药。他收下，没有说话。因果轻了一分。' };
        },
      },
      {
        text: '问失败经过',
        effect: (state) => {
          let newState = setFlag(state, 'met_disillusioned_fellow');
          newState.resources = {
            ...newState.resources,
            insight: newState.resources.insight + 3,
          };
          newState = touchRelationship(
            newState,
            { id: DISILLUSIONED_FELLOW_ID, identity: '灰败同门' },
            { tags: ['讲过失败'] }
          );
          return { state: newState, log: '他讲了冲关失败的过程。你听了，见闻长了三分。失败也是路。' };
        },
      },
      {
        text: '旁观',
        effect: (state) => {
          let newState = setFlag(state, 'met_disillusioned_fellow');
          return { state: newState, log: '你站在一旁。他坐了一会，起身走了。' };
        },
      },
    ],
  },
  // ============================================================
  // NEW EVENTS — 40+ additions covering 5 categories
  // ============================================================

  // --- Category 1: New Location Events (15) ---

  {
    id: 'spirit_field_sprout',
    text: '灵田中冒出一丛新芽，叶片上有淡金纹路，药香比寻常浓郁数倍。',
    condition: (state) =>
      state.currentLocationId === 'spirit_field' &&
      state.time.season === Season.Spring &&
      !state.choices.flags['spirit_field_sprout_seen'],
    weight: (state) => 12 + (state.choices.qualities['alchemy_affinity'] ?? 0) * 2,
    choices: [
      {
        text: '悉心采摘',
        effect: (state) => {
          let newState = setFlag(state, 'spirit_field_sprout_seen');
          newState.resources = { ...newState.resources, herbs: newState.resources.herbs + 5 };
          newState = adjustQuality(newState, 'alchemy_affinity', 1);
          return { state: newState, log: '你将新芽连根采下。草药多了五株，药力较常品浓厚。' };
        },
      },
      {
        text: '留根培土',
        effect: (state) => {
          let newState = setFlag(state, 'spirit_field_sprout_seen');
          newState.resources = { ...newState.resources, herbs: newState.resources.herbs + 2, insight: newState.resources.insight + 2 };
          newState = setFlag(newState, 'tended_spirit_sprout');
          newState = adjustQuality(newState, 'alchemy_affinity', 2);
          return { state: newState, log: '你只取两株，余下培土护根。日后或可再采。' };
        },
      },
      {
        text: '以灵气温养',
        effect: (state) => {
          let newState = setFlag(state, 'spirit_field_sprout_seen');
          newState.resources = { ...newState.resources, qi: Math.max(0, newState.resources.qi - 3), insight: newState.resources.insight + 3 };
          newState = adjustQuality(newState, 'quiet_cultivation', 1);
          return { state: newState, log: '你渡出三缕真气温养新芽。草药未取，见闻却长了三分。' };
        },
      },
    ],
  },
  {
    id: 'spirit_field_pest',
    text: '灵田叶面出现虫蛀痕迹，几只黑背甲虫正在啃食灵草根茎。若不驱除，恐蔓延整片田。',
    condition: (state) =>
      state.currentLocationId === 'spirit_field' &&
      state.time.season === Season.Summer &&
      !state.choices.flags['spirit_field_pest_seen'],
    weight: (state) => 10 + (state.choices.qualities['alchemy_affinity'] ?? 0),
    choices: [
      {
        text: '以药驱虫',
        effect: (state) => {
          let newState = setFlag(state, 'spirit_field_pest_seen');
          if (newState.resources.herbs < 2) {
            newState.resources = { ...newState.resources, herbs: Math.max(0, newState.resources.herbs - 1) };
            return { state: newState, log: '药不够，虫只退了一半。灵田损失了一株。' };
          }
          newState.resources = { ...newState.resources, herbs: newState.resources.herbs - 2 };
          newState = setFlag(newState, 'pest_driven_off');
          newState = adjustQuality(newState, 'alchemy_affinity', 1);
          return { state: newState, log: '两味药熏走甲虫。灵田保住了，药也花了。' };
        },
      },
      {
        text: '亲手捉虫',
        effect: (state) => {
          let newState = setFlag(state, 'spirit_field_pest_seen');
          newState.resources = { ...newState.resources, essence: Math.max(0, newState.resources.essence - 10) };
          newState = setFlag(newState, 'pest_hand_picked');
          return { state: newState, log: '你蹲在田边捉了半日虫。精元折了十分，灵田无恙。' };
        },
      },
      {
        text: '不管',
        effect: (state) => {
          let newState = setFlag(state, 'spirit_field_pest_seen');
          newState.resources = { ...newState.resources, herbs: Math.max(0, newState.resources.herbs - 3) };
          return { state: newState, log: '你没有理会。虫啃了三株灵草，田里少了几分药香。' };
        },
      },
    ],
  },
  {
    id: 'pill_hall_furnace_accident',
    text: '丹房炉火骤然暴涨，炉身发出嗡鸣。一股焦糊味弥漫开来，走炉了。',
    condition: (state) =>
      state.currentLocationId === 'pill_hall' &&
      !state.choices.flags['pill_hall_furnace_accident_seen'],
    weight: (state) => 8 + (state.choices.qualities['alchemy_affinity'] ?? 0) * 2,
    choices: [
      {
        text: '强行封炉',
        effect: (state) => {
          let newState = setFlag(state, 'pill_hall_furnace_accident_seen');
          newState.resources = { ...newState.resources, essence: Math.max(0, newState.resources.essence - 15), herbs: Math.max(0, newState.resources.herbs - 2) };
          newState = adjustQuality(newState, 'alchemy_affinity', 1);
          return { state: newState, log: '你以真气强压炉火。药材烧了二份，精元也折了十五，但炉未炸。' };
        },
      },
      {
        text: '放炉自灭',
        effect: (state) => {
          let newState = setFlag(state, 'pill_hall_furnace_accident_seen');
          newState.resources = { ...newState.resources, herbs: Math.max(0, newState.resources.herbs - 4) };
          return { state: newState, log: '你退开一步。炉火自行燃尽，四份药材报废。人无碍。' };
        },
      },
      {
        text: '趁势收丹',
        effect: (state) => {
          let newState = setFlag(state, 'pill_hall_furnace_accident_seen');
          if ((state.choices.qualities['alchemy_affinity'] ?? 0) >= 6) {
            newState.resources = { ...newState.resources, qi: newState.resources.qi + 3, dantoxin: newState.resources.dantoxin + 3 };
            newState = adjustQuality(newState, 'alchemy_affinity', 1);
            return { state: newState, log: '你趁火势转收残丹。真气多了三缕，但丹毒也涨了三分——药性偏了。' };
          }
          newState.resources = { ...newState.resources, wounds: newState.resources.wounds + 1, herbs: Math.max(0, newState.resources.herbs - 3) };
          return { state: newState, log: '药理不够，收丹失手。炸炉灼伤，药材全废。' };
        },
      },
    ],
  },
  {
    id: 'pill_hall_master_teaching',
    text: '丹房深处，一位师尊正在论丹。几位弟子围坐，炉火照得众人面色忽明忽暗。',
    condition: (state) =>
      state.currentLocationId === 'pill_hall' &&
      realmAtLeast(state, Realm.FoundationEstablishment) &&
      !state.choices.flags['pill_hall_master_teaching_seen'],
    weight: (state) => 6 + (state.choices.qualities['alchemy_affinity'] ?? 0),
    choices: [
      {
        text: '旁听论丹',
        effect: (state) => {
          let newState = setFlag(state, 'pill_hall_master_teaching_seen');
          newState.resources = { ...newState.resources, insight: newState.resources.insight + 4 };
          newState = adjustQuality(newState, 'alchemy_affinity', 2);
          return { state: newState, log: '你听了一个时辰。药理上的几处关节忽然通了，见闻涨了四分。' };
        },
      },
      {
        text: '请教师尊',
        effect: (state) => {
          let newState = setFlag(state, 'pill_hall_master_teaching_seen');
          newState.resources = { ...newState.resources, insight: newState.resources.insight + 2, dantoxin: Math.max(0, newState.resources.dantoxin - 3) };
          newState = setFlag(newState, 'received_pill_hall_guidance');
          newState = adjustQuality(newState, 'alchemy_affinity', 1);
          return { state: newState, log: '师尊指出你炼丹中的几处偏差。丹毒退了三分，见闻涨了两分。' };
        },
      },
    ],
  },
  {
    id: 'sword_pavilion_challenge',
    text: '剑阁练功场上，一名师兄横剑而立，目光如电。"来者可接我三剑？"',
    condition: (state) =>
      state.currentLocationId === 'sword_pavilion' &&
      realmAtLeast(state, Realm.QiCondensation) &&
      !state.choices.flags['sword_pavilion_challenge_seen'],
    weight: (state) => 10 + (state.choices.qualities['combat_edge'] ?? 0) * 2,
    choices: [
      {
        text: '接剑',
        effect: (state) => {
          let newState = setFlag(state, 'sword_pavilion_challenge_seen');
          const result = resolveCombatEvent(
            newState,
            'fight',
            { id: 'sword_brother', name: '剑阁师兄', realm: Realm.QiCondensation, power: 8 },
            () => 0.5
          );
          newState = result.state;
          if (result.success) {
            newState = adjustQuality(newState, 'combat_edge', 2);
            return { state: newState, log: '你接下三剑并反攻一招。师兄点头收剑，你的剑意又锐了一分。' };
          }
          return { state: newState, log: result.log };
        },
      },
      {
        text: '认输回避',
        effect: (state) => {
          let newState = setFlag(state, 'sword_pavilion_challenge_seen');
          newState = adjustQuality(newState, 'quiet_cultivation', 1);
          return { state: newState, log: '你抱拳认输。师兄收剑，剑阁照旧安静。' };
        },
      },
    ],
  },
  {
    id: 'sword_pavilion_intent_insight',
    text: '剑阁墙壁上挂着一把无鞘古剑。你凝视良久，剑身似有一丝意念流过。',
    condition: (state) =>
      state.currentLocationId === 'sword_pavilion' &&
      realmAtLeast(state, Realm.FoundationEstablishment) &&
      (state.choices.qualities['combat_edge'] ?? 0) >= 5 &&
      !state.choices.flags['sword_pavilion_intent_insight_seen'],
    weight: (state) => 6 + (state.choices.qualities['combat_edge'] ?? 0),
    choices: [
      {
        text: '闭目感悟剑意',
        effect: (state) => {
          let newState = setFlag(state, 'sword_pavilion_intent_insight_seen');
          newState.resources = { ...newState.resources, insight: newState.resources.insight + 4, qi: newState.resources.qi + 3 };
          newState = adjustQuality(newState, 'combat_edge', 2);
          return { state: newState, log: '古剑意念灌入神识。真气多了三缕，见闻涨了四分，剑意又深一层。' };
        },
      },
      {
        text: '拔剑一试',
        effect: (state) => {
          let newState = setFlag(state, 'sword_pavilion_intent_insight_seen');
          newState.resources = { ...newState.resources, qi: newState.resources.qi + 5, wounds: newState.resources.wounds + 1 };
          newState = adjustQuality(newState, 'combat_edge', 1);
          newState = adjustQuality(newState, 'reckless_breakthrough', 1);
          return { state: newState, log: '你拔剑出鞘，剑意反噬。真气多了五缕，但反震添了一处伤。' };
        },
      },
    ],
  },
  {
    id: 'sect_hall_assignment',
    text: '宗门大殿内，一名执事递来令牌。"近日有巡查之务，你可有闲暇？"',
    condition: (state) =>
      state.currentLocationId === 'sect_hall' &&
      state.sect.rank !== 'none' &&
      !state.choices.flags['sect_hall_assignment_seen'],
    weight: (state) => 12 + (state.sect.contribution ?? 0),
    choices: [
      {
        text: '领命巡查',
        effect: (state) => {
          let newState = setFlag(state, 'sect_hall_assignment_seen');
          newState.resources = { ...newState.resources, essence: Math.max(0, newState.resources.essence - 20), coins: newState.resources.coins + 5 };
          newState = setFlag(newState, 'completed_sect_assignment');
          newState = adjustQuality(newState, 'sect_contribution', 2);
          newState = adjustQuality(newState, 'sect_trace', 1);
          return { state: newState, log: '你领命巡查一日。精元折了二十，五枚钱入手，宗门贡献添了两笔。' };
        },
      },
      {
        text: '婉拒',
        effect: (state) => {
          let newState = setFlag(state, 'sect_hall_assignment_seen');
          return { state: newState, log: '你婉拒令牌。执事收回，未有多言。' };
        },
      },
    ],
  },
  {
    id: 'sect_hall_ceremony',
    text: '大殿钟鸣三声，宗门大典。弟子齐聚，香案上灵光浮动。',
    condition: (state) =>
      state.currentLocationId === 'sect_hall' &&
      state.sect.rank !== 'none' &&
      !state.choices.flags['sect_hall_ceremony_seen'],
    weight: (state) => 16 + (state.sect.contribution ?? 0) * 2,
    choices: [
      {
        text: '随众参拜',
        effect: (state) => {
          let newState = setFlag(state, 'sect_hall_ceremony_seen');
          newState.resources = { ...newState.resources, qi: newState.resources.qi + 3, insight: newState.resources.insight + 2 };
          newState = adjustQuality(newState, 'sect_trace', 2);
          return { state: newState, log: '你随众参拜。灵气灌顶，真气多了三缕，见闻涨了两分。' };
        },
      },
      {
        text: '旁观',
        effect: (state) => {
          let newState = setFlag(state, 'sect_hall_ceremony_seen');
          newState.resources = { ...newState.resources, insight: newState.resources.insight + 1 };
          return { state: newState, log: '你站在殿角旁观。大典与你无涉，见闻略长。' };
        },
      },
    ],
  },
  {
    id: 'deep_temple_spirit_encounter',
    text: '荒庙深处，一缕白雾自地砖缝隙升起，渐渐凝成半透明人形。它看着你，目光里没有恶意。',
    condition: (state) =>
      state.currentLocationId === 'deep_temple' &&
      !state.choices.flags['deep_temple_spirit_encounter_seen'],
    weight: (state) => 10 + (LOCATIONS[state.currentLocationId]?.danger ?? 0) * 3,
    choices: [
      {
        text: '恭敬问路',
        effect: (state) => {
          let newState = setFlag(state, 'deep_temple_spirit_encounter_seen');
          newState.resources = { ...newState.resources, insight: newState.resources.insight + 3 };
          newState = setFlag(newState, 'spirit_pointed_path');
          return { state: newState, log: '灵体指了指墙后。你绕过去，发现了一处暗格。见闻涨了三分。' };
        },
      },
      {
        text: '以阵法禁制',
        effect: (state) => {
          let newState = setFlag(state, 'deep_temple_spirit_encounter_seen');
          newState.resources = { ...newState.resources, qi: newState.resources.qi + 2, dantoxin: newState.resources.dantoxin + 2 };
          newState = adjustQuality(newState, 'combat_edge', 1);
          return { state: newState, log: '你布阵收了灵体的残余灵气。真气多了两缕，但丹毒也涨了。' };
        },
      },
      {
        text: '退避',
        effect: (state) => {
          let newState = setFlag(state, 'deep_temple_spirit_encounter_seen');
          return { state: newState, log: '你退出荒庙。灵体消散，暗处归于寂静。' };
        },
      },
    ],
  },
  {
    id: 'deep_temple_forbidden_scroll',
    text: '墙角裂缝中露出半卷泛黄纸页，上面的文字似是禁术残篇。一股阴寒之气透纸而来。',
    condition: (state) =>
      state.currentLocationId === 'deep_temple' &&
      realmAtLeast(state, Realm.FoundationEstablishment) &&
      !state.choices.flags['deep_temple_forbidden_scroll_seen'],
    weight: (state) => 8 + (state.choices.qualities['combat_edge'] ?? 0),
    choices: [
      {
        text: '研读残篇',
        effect: (state) => {
          let newState = setFlag(state, 'deep_temple_forbidden_scroll_seen');
          newState.resources = { ...newState.resources, insight: newState.resources.insight + 4, dantoxin: newState.resources.dantoxin + 4 };
          newState = setFlag(newState, 'read_forbidden_scroll');
          newState = adjustQuality(newState, 'reckless_breakthrough', 1);
          return { state: newState, log: '你读了残篇。见闻暴涨四分，但阴寒入脉，丹毒也涨了四分。' };
        },
      },
      {
        text: '烧毁',
        effect: (state) => {
          let newState = setFlag(state, 'deep_temple_forbidden_scroll_seen');
          newState = adjustQuality(newState, 'quiet_cultivation', 1);
          newState = adjustQuality(newState, 'karmic_weight', -1);
          return { state: newState, log: '你一把火将残篇烧尽。阴寒散去，因果轻了一分。' };
        },
      },
    ],
  },
  {
    id: 'mountain_cave_crystal',
    text: '溶洞石壁上闪着幽蓝微光。灵晶！成色虽薄，胜在罕见。',
    condition: (state) =>
      state.currentLocationId === 'mountain_cave' &&
      !state.choices.flags['mountain_cave_crystal_seen'],
    weight: (state) => 10 + (LOCATIONS[state.currentLocationId]?.danger ?? 0) * 2,
    choices: [
      {
        text: '小心开采',
        effect: (state) => {
          let newState = setFlag(state, 'mountain_cave_crystal_seen');
          newState.resources = { ...newState.resources, coins: newState.resources.coins + 15, essence: Math.max(0, newState.resources.essence - 15) };
          return { state: newState, log: '你敲下灵晶。值十五钱，精元折了十五，手也震麻了。' };
        },
      },
      {
        text: '记下位置回头再来',
        effect: (state) => {
          let newState = setFlag(state, 'mountain_cave_crystal_seen');
          newState.resources = { ...newState.resources, insight: newState.resources.insight + 2 };
          newState = setFlag(newState, 'noted_crystal_vein');
          return { state: newState, log: '你记下位置。灵晶仍在壁上，见闻涨了两分。' };
        },
      },
    ],
  },
  {
    id: 'mountain_cave_beast',
    text: '溶洞深处传来低沉嘶吼。一头灰毛地兽从暗处窜出，眼泛红光。',
    condition: (state) =>
      state.currentLocationId === 'mountain_cave' &&
      !state.choices.flags['mountain_cave_beast_seen'],
    weight: (state) => 14 + (LOCATIONS[state.currentLocationId]?.danger ?? 0) * 3,
    choices: [
      {
        text: '斗法',
        effect: (state) => {
          let newState = setFlag(state, 'mountain_cave_beast_seen');
          const result = resolveCombatEvent(
            newState,
            'fight',
            { id: 'cave_beast', name: '灰毛地兽', realm: Realm.QiCondensation, power: 10 },
            () => 0.5
          );
          newState = result.state;
          if (result.success) {
            newState.resources = { ...newState.resources, herbs: newState.resources.herbs + 2 };
            return { state: newState, log: '你击退地兽。它丢下几味灵草逃了。' };
          }
          return { state: newState, log: result.log };
        },
      },
      {
        text: '逃出溶洞',
        effect: (state) => {
          let newState = setFlag(state, 'mountain_cave_beast_seen');
          newState.resources = { ...newState.resources, essence: Math.max(0, newState.resources.essence - 15) };
          return { state: newState, log: '你拔腿就跑。精元折了十五，但没添伤。' };
        },
      },
    ],
  },
  {
    id: 'tea_house_old_tales',
    text: '茶肆角落坐着一位白发老者，面前茶碗已凉。他抬头看了你一眼，似乎认出了什么。',
    condition: (state) =>
      state.currentLocationId === 'tea_house' &&
      !state.choices.flags['tea_house_old_tales_seen'],
    weight: (state) => 10 + (state.resources.insight ?? 0) * 0.5,
    choices: [
      {
        text: '请茶攀谈',
        effect: (state) => {
          let newState = setFlag(state, 'tea_house_old_tales_seen');
          if (newState.resources.coins < 2) {
            newState.resources = { ...newState.resources, insight: newState.resources.insight + 1 };
            return { state: newState, log: '你连茶都请不起。老者自顾自说了几句，见闻略长。' };
          }
          newState.resources = { ...newState.resources, coins: newState.resources.coins - 2, insight: newState.resources.insight + 3 };
          newState = setFlag(newState, 'heard_elder_tales');
          return { state: newState, log: '两枚钱换一壶茶。老者讲了几桩秘事，见闻涨了三分。' };
        },
      },
      {
        text: '旁听',
        effect: (state) => {
          let newState = setFlag(state, 'tea_house_old_tales_seen');
          newState.resources = { ...newState.resources, insight: newState.resources.insight + 1 };
          return { state: newState, log: '你听着老者自言自语。只听清几句，见闻略长。' };
        },
      },
    ],
  },
  {
    id: 'tea_house_gamble',
    text: '茶肆后堂有人摇骰子，吆五喝六。桌上堆着几串钱和两包草药。',
    condition: (state) =>
      state.currentLocationId === 'tea_house' &&
      !state.choices.flags['tea_house_gamble_seen'],
    weight: () => 10,
    choices: [
      {
        text: '押五钱',
        effect: (state) => {
          let newState = setFlag(state, 'tea_house_gamble_seen');
          if (newState.resources.coins < 5) {
            return { state: newState, log: '你钱不够。庄家没让你上桌。' };
          }
          const win = Math.random() > 0.5;
          if (win) {
            newState.resources = { ...newState.resources, coins: newState.resources.coins + 8 };
            return { state: newState, log: '你赢了！八枚钱到手，庄家脸色不好看。' };
          }
          newState.resources = { ...newState.resources, coins: newState.resources.coins - 5 };
          return { state: newState, log: '你输了。五枚钱落入庄家手，茶肆照旧喧闹。' };
        },
      },
      {
        text: '只看不赌',
        effect: (state) => {
          let newState = setFlag(state, 'tea_house_gamble_seen');
          newState.resources = { ...newState.resources, insight: newState.resources.insight + 1 };
          return { state: newState, log: '你看了一局。赌场的路数记下，见闻略长。' };
        },
      },
    ],
  },
  {
    id: 'demonic_forest_ambush',
    text: '妖兽林中，树冠忽然沙沙作响。一只赤目妖狐自枝头扑下，尾尖带火。',
    condition: (state) =>
      state.currentLocationId === 'demonic_forest' &&
      !state.choices.flags['demonic_forest_ambush_seen'],
    weight: (state) => 14 + (LOCATIONS[state.currentLocationId]?.danger ?? 0) * 4,
    choices: [
      {
        text: '迎战',
        effect: (state) => {
          let newState = setFlag(state, 'demonic_forest_ambush_seen');
          const result = resolveCombatEvent(
            newState,
            'fight',
            { id: 'red_fox', name: '赤目妖狐', realm: Realm.FoundationEstablishment, power: 12 },
            () => 0.5
          );
          newState = result.state;
          if (result.success) {
            newState.resources = { ...newState.resources, herbs: newState.resources.herbs + 3 };
            return { state: newState, log: '你击退妖狐。它逃窜时落下了三味灵药。' };
          }
          return { state: newState, log: result.log };
        },
      },
      {
        text: '闪避退走',
        effect: (state) => {
          let newState = setFlag(state, 'demonic_forest_ambush_seen');
          newState.resources = { ...newState.resources, essence: Math.max(0, newState.resources.essence - 20) };
          return { state: newState, log: '你侧身躲过一击，退入林深处。精元折了二十。' };
        },
      },
    ],
  },

  // --- Category 2: Cultivation & Realm Events (8) ---

  {
    id: 'qi_condensation_breakthrough_omen',
    text: '行气时丹田忽然震动，一丝真气不受控制地涌向经脉深处。炼气突破的征兆？',
    condition: (state) =>
      state.realm === Realm.QiCondensation &&
      state.resources.qi >= 30 &&
      !state.choices.flags['qi_breakthrough_omen_seen'],
    weight: (state) => 8 + Math.min(20, state.resources.qi - 30),
    choices: [
      {
        text: '顺势引导',
        effect: (state) => {
          let newState = setFlag(state, 'qi_breakthrough_omen_seen');
          newState.resources = { ...newState.resources, qi: newState.resources.qi + 5, insight: newState.resources.insight + 2 };
          newState = adjustQuality(newState, 'quiet_cultivation', 1);
          return { state: newState, log: '你顺气而行。真气多了五缕，见闻涨了两分。突破尚远，但路近了。' };
        },
      },
      {
        text: '稳住不动',
        effect: (state) => {
          let newState = setFlag(state, 'qi_breakthrough_omen_seen');
          newState.resources = { ...newState.resources, dantoxin: Math.max(0, newState.resources.dantoxin - 2) };
          return { state: newState, log: '你压住气机。稳，丹毒退了两分。' };
        },
      },
    ],
  },
  {
    id: 'foundation_dream',
    text: '夜半惊梦。梦中你站在一座石台上，四周是无尽虚空，脚下灵脉如河。醒来时汗透衣衫，但丹田处隐约不同了。',
    condition: (state) =>
      state.realm === Realm.QiCondensation &&
      state.resources.qi >= 60 &&
      !state.choices.flags['foundation_dream_seen'],
    weight: (state) => 6 + Math.min(15, Math.floor((state.resources.qi - 60) / 5)),
    choices: [
      {
        text: '静坐回味梦境',
        effect: (state) => {
          let newState = setFlag(state, 'foundation_dream_seen');
          newState.resources = { ...newState.resources, insight: newState.resources.insight + 4, qi: newState.resources.qi + 3 };
          newState = setFlag(newState, 'had_foundation_dream');
          return { state: newState, log: '你闭目回溯梦境。灵脉的走向似乎刻入了神识。见闻涨四分，真气多三缕。' };
        },
      },
      {
        text: '翻身再睡',
        effect: (state) => {
          let newState = setFlag(state, 'foundation_dream_seen');
          return { state: newState, log: '你没有多想。梦碎了，但石台仍在记忆深处。' };
        },
      },
    ],
  },
  {
    id: 'golden_core_thunder',
    text: '晴天一道闷雷从天际滚过，不是雷雨。你丹田一紧，冥冥中感到天地在注视你。金丹雷劫的前兆？',
    condition: (state) =>
      state.realm === Realm.FoundationEstablishment &&
      state.resources.qi >= 120 &&
      !state.choices.flags['golden_core_thunder_seen'],
    weight: (state) => 4 + Math.min(10, Math.floor((state.resources.qi - 120) / 10)),
    choices: [
      {
        text: '凝神感应',
        effect: (state) => {
          let newState = setFlag(state, 'golden_core_thunder_seen');
          newState.resources = { ...newState.resources, insight: newState.resources.insight + 5 };
          newState = setFlag(newState, 'sensed_thunder_omen');
          return { state: newState, log: '你感应天地之意。雷劫尚远，但天道的轮廓已隐约可辨。见闻涨五分。' };
        },
      },
      {
        text: '压下心绪',
        effect: (state) => {
          let newState = setFlag(state, 'golden_core_thunder_seen');
          newState.resources = { ...newState.resources, dantoxin: Math.max(0, newState.resources.dantoxin - 3) };
          return { state: newState, log: '你将心绪压回丹田。丹毒退了三分，天地复归寂静。' };
        },
      },
    ],
  },
  {
    id: 'nascent_soul_vision',
    text: '静坐中，神识忽然脱离肉身，你从高处俯瞰自己——一个模糊的轮廓。元婴的影子在意识深处一闪而逝。',
    condition: (state) =>
      state.realm === Realm.GoldenCore &&
      state.resources.qi >= 200 &&
      !state.choices.flags['nascent_soul_vision_seen'],
    weight: (state) => 3 + Math.min(8, Math.floor((state.resources.qi - 200) / 20)),
    choices: [
      {
        text: '追寻幻象',
        effect: (state) => {
          let newState = setFlag(state, 'nascent_soul_vision_seen');
          newState.resources = { ...newState.resources, insight: newState.resources.insight + 6, essence: Math.max(0, newState.resources.essence - 30) };
          newState = setFlag(newState, 'chased_nascent_soul_vision');
          return { state: newState, log: '你追入幻象深处。见闻暴涨六分，精元折了三十。元婴之路若有若无。' };
        },
      },
      {
        text: '收束神识',
        effect: (state) => {
          let newState = setFlag(state, 'nascent_soul_vision_seen');
          newState = adjustQuality(newState, 'quiet_cultivation', 2);
          return { state: newState, log: '你将神识收回。幻象散去，心却静了几分。' };
        },
      },
    ],
  },
  {
    id: 'technique_insight',
    text: '日课行气时，一条旧功法的运行路线忽然有了新的理解。仿佛从前走的是死路，而旁边还有一条暗径。',
    condition: (state) =>
      realmAtLeast(state, Realm.QiCondensation) &&
      !state.choices.flags['technique_insight_seen'] &&
      (state.cultivation.knownTechniqueIds?.length ?? 0) > 0,
    weight: () => 8,
    choices: [
      {
        text: '尝试新路线',
        effect: (state) => {
          let newState = setFlag(state, 'technique_insight_seen');
          newState.resources = { ...newState.resources, qi: newState.resources.qi + 4, insight: newState.resources.insight + 2 };
          return { state: newState, log: '你按新路线行气。真气多了四缕，见闻涨了两分。功法精进了一丝。' };
        },
      },
      {
        text: '先记下',
        effect: (state) => {
          let newState = setFlag(state, 'technique_insight_seen');
          newState.resources = { ...newState.resources, insight: newState.resources.insight + 3 };
          newState = setFlag(newState, 'noted_technique_insight');
          return { state: newState, log: '你将新路线刻入记忆。日后或可细研，见闻涨了三分。' };
        },
      },
    ],
  },
  {
    id: 'dual_cultivation_offer',
    text: '一位同门修士找到你，言辞恳切。"你我功法互补，若行双修之法，或可事半功倍。"',
    condition: (state) =>
      realmAtLeast(state, Realm.FoundationEstablishment) &&
      state.sect.rank !== 'none' &&
      !state.choices.flags['dual_cultivation_offer_seen'],
    weight: () => 4,
    choices: [
      {
        text: '应允',
        effect: (state) => {
          let newState = setFlag(state, 'dual_cultivation_offer_seen');
          newState.resources = { ...newState.resources, qi: newState.resources.qi + 8, insight: newState.resources.insight + 3 };
          newState = setFlag(newState, 'practiced_dual_cultivation');
          return { state: newState, log: '你们修了一夜。真气多了八缕，见闻涨了三分。功法确有互补之处。' };
        },
      },
      {
        text: '婉拒',
        effect: (state) => {
          let newState = setFlag(state, 'dual_cultivation_offer_seen');
          newState = adjustQuality(newState, 'quiet_cultivation', 1);
          return { state: newState, log: '你婉言谢绝。对方点头离去，修行路各人有各人的走法。' };
        },
      },
    ],
  },
  {
    id: 'spiritual_root_mutation',
    text: '行气时，丹田中某条灵根忽然颤动，发出异于平常的光。灵根似乎在异变。',
    condition: (state) =>
      realmAtLeast(state, Realm.FoundationEstablishment) &&
      !state.choices.flags['spiritual_root_mutation_seen'] &&
      state.cultivation.rootKnown,
    weight: () => 3,
    choices: [
      {
        text: '引导异变',
        effect: (state) => {
          let newState = setFlag(state, 'spiritual_root_mutation_seen');
          newState.resources = { ...newState.resources, qi: newState.resources.qi + 6, dantoxin: newState.resources.dantoxin + 5, insight: newState.resources.insight + 3 };
          newState = adjustQuality(newState, 'reckless_breakthrough', 1);
          return { state: newState, log: '你引灵根异变。真气多了六缕，丹毒涨了五分。灵根的方向变了——是好是坏？' };
        },
      },
      {
        text: '压制回原',
        effect: (state) => {
          let newState = setFlag(state, 'spiritual_root_mutation_seen');
          newState.resources = { ...newState.resources, essence: Math.max(0, newState.resources.essence - 30) };
          return { state: newState, log: '你将灵根压回原状。精元折了三十，灵根归于平静。变数未生。' };
        },
      },
    ],
  },
  {
    id: 'breakthrough_sky_sign',
    text: '天边忽然亮起一道异光，流星般划过半空，随后消散。附近修士纷纷抬头。',
    condition: (state) =>
      realmAtLeast(state, Realm.FoundationEstablishment) &&
      !state.choices.flags['breakthrough_sky_sign_seen'],
    weight: () => 5,
    choices: [
      {
        text: '观星感悟',
        effect: (state) => {
          let newState = setFlag(state, 'breakthrough_sky_sign_seen');
          newState.resources = { ...newState.resources, insight: newState.resources.insight + 3 };
          return { state: newState, log: '你盯着异光消散的方向。天地间似有一丝道理留在那里，见闻涨了三分。' };
        },
      },
      {
        text: '不以为意',
        effect: (state) => {
          let newState = setFlag(state, 'breakthrough_sky_sign_seen');
          return { state: newState, log: '你低下头。天象是天象，修行是修行。' };
        },
      },
    ],
  },

  // --- Category 3: NPC & Story Events (8) ---

  {
    id: 'mysterious_merchant',
    text: '山路上出现一名蒙面商人，背篓里隐约有丹药和灵草的气味。"道友，看看可有中意的？"',
    condition: (state) =>
      (state.currentLocationId === 'mountain_path' || state.currentLocationId === 'market') &&
      realmAtLeast(state, Realm.QiCondensation) &&
      !state.choices.flags['mysterious_merchant_seen'],
    weight: () => 5,
    choices: [
      {
        text: '买奇药（八钱）',
        effect: (state) => {
          let newState = setFlag(state, 'mysterious_merchant_seen');
          if (newState.resources.coins < 8) {
            return { state: newState, log: '钱不够。商人摇摇头，转身消失在雾中。' };
          }
          newState.resources = { ...newState.resources, coins: newState.resources.coins - 8, herbs: newState.resources.herbs + 5, insight: newState.resources.insight + 2 };
          newState = setFlag(newState, 'bought_from_mysterious_merchant');
          return { state: newState, log: '八枚钱换来五味奇药和几句话。商人的货不常见。' };
        },
      },
      {
        text: '只看不买',
        effect: (state) => {
          let newState = setFlag(state, 'mysterious_merchant_seen');
          newState.resources = { ...newState.resources, insight: newState.resources.insight + 1 };
          return { state: newState, log: '你看了一眼他的货。几个小瓶，标签你都不认得。见闻略长。' };
        },
      },
      {
        text: '回避',
        effect: (state) => {
          let newState = setFlag(state, 'mysterious_merchant_seen');
          return { state: newState, log: '你绕路而走。商人的背影很快消失在山雾里。' };
        },
      },
    ],
  },
  {
    id: 'rival_cultivator',
    text: '一名身着异门服饰的修士拦住去路，面色不善。"这段灵脉是我先发现的。"',
    condition: (state) =>
      (state.currentLocationId === 'mountain_path' || state.currentLocationId === 'demonic_forest') &&
      realmAtLeast(state, Realm.FoundationEstablishment) &&
      !state.choices.flags['rival_cultivator_seen'],
    weight: () => 6,
    choices: [
      {
        text: '据理力争',
        effect: (state) => {
          let newState = setFlag(state, 'rival_cultivator_seen');
          if ((state.choices.qualities['combat_edge'] ?? 0) >= 5) {
            newState = adjustQuality(newState, 'combat_edge', 1);
            return { state: newState, log: '你寸步不让。对方犹豫了一会，让开了路。' };
          }
          newState.resources = { ...newState.resources, herbs: Math.max(0, newState.resources.herbs - 2) };
          return { state: newState, log: '争论未果，对方强取了两味灵草后离去。' };
        },
      },
      {
        text: '让路',
        effect: (state) => {
          let newState = setFlag(state, 'rival_cultivator_seen');
          newState = adjustQuality(newState, 'quiet_cultivation', 1);
          return { state: newState, log: '你退了一步。灵脉是天地之物，争也无益。' };
        },
      },
      {
        text: '斗法',
        effect: (state) => {
          let newState = setFlag(state, 'rival_cultivator_seen');
          const result = resolveCombatEvent(
            newState,
            'fight',
            { id: 'rival_cultivator', name: '异门修士', realm: Realm.FoundationEstablishment, power: 14 },
            () => 0.5
          );
          newState = result.state;
          if (result.success) {
            newState.resources = { ...newState.resources, coins: newState.resources.coins + 10 };
            return { state: newState, log: '你击败对手。他丢下十枚钱，转身走了。' };
          }
          return { state: newState, log: result.log };
        },
      },
    ],
  },
  {
    id: 'old_friend_letter',
    text: '坊市角落有人递来一封信。拆开看，是你离开凡俗前的一位旧友。信中提了几句近况，末了问你修行可好。',
    condition: (state) =>
      (state.currentLocationId === 'market' || state.currentLocationId === 'tea_house') &&
      !state.choices.flags['old_friend_letter_seen'],
    weight: () => 6,
    choices: [
      {
        text: '回信',
        effect: (state) => {
          let newState = setFlag(state, 'old_friend_letter_seen');
          newState.resources = { ...newState.resources, coins: Math.max(0, newState.resources.coins - 1), insight: newState.resources.insight + 2 };
          newState = setFlag(newState, 'replied_to_old_friend');
          return { state: newState, log: '你写了几句回信，一枚钱雇人送去。见闻涨了两分，旧事翻起一层。' };
        },
      },
      {
        text: '收起不看',
        effect: (state) => {
          let newState = setFlag(state, 'old_friend_letter_seen');
          newState = adjustQuality(newState, 'quiet_cultivation', 1);
          return { state: newState, log: '你把信收入袖中。旧事已远，不提也罢。' };
        },
      },
    ],
  },
  {
    id: 'demon_cultivator_ambush',
    text: '山路上突然涌出一股血煞之气。一名黑袍修士从暗处闪出，手中法器泛着红光。',
    condition: (state) =>
      (state.currentLocationId === 'mountain_path' || state.currentLocationId === 'demonic_forest') &&
      realmAtLeast(state, Realm.FoundationEstablishment) &&
      !state.choices.flags['demon_cultivator_ambush_seen'],
    weight: (state) => 4 + (LOCATIONS[state.currentLocationId]?.danger ?? 0) * 2,
    choices: [
      {
        text: '迎战',
        effect: (state) => {
          let newState = setFlag(state, 'demon_cultivator_ambush_seen');
          const result = resolveCombatEvent(
            newState,
            'fight',
            { id: 'demon_cultivator', name: '黑袍魔修', realm: Realm.FoundationEstablishment, power: 16 },
            () => 0.5
          );
          newState = result.state;
          if (result.success) {
            newState.resources = { ...newState.resources, coins: newState.resources.coins + 15, insight: newState.resources.insight + 2 };
            return { state: newState, log: '你击退魔修。他丢下财物逃窜。十五钱入手，见闻涨了两分。' };
          }
          return { state: newState, log: result.log };
        },
      },
      {
        text: '逃跑',
        effect: (state) => {
          let newState = setFlag(state, 'demon_cultivator_ambush_seen');
          newState.resources = { ...newState.resources, essence: Math.max(0, newState.resources.essence - 25), coins: Math.max(0, newState.resources.coins - 5) };
          return { state: newState, log: '你拼命逃跑。精元折了二十五，丢了五枚钱，但保住了命。' };
        },
      },
    ],
  },
  {
    id: 'spirit_beast_taming',
    text: '林间一只通体雪白的小兽蹲在石上，瞳孔如琥珀。它看着你，没有逃跑的意思。',
    condition: (state) =>
      (state.currentLocationId === 'mountain_path' || state.currentLocationId === 'stream_valley') &&
      realmAtLeast(state, Realm.FoundationEstablishment) &&
      !state.choices.flags['spirit_beast_taming_seen'],
    weight: () => 4,
    choices: [
      {
        text: '以灵气引之',
        effect: (state) => {
          let newState = setFlag(state, 'spirit_beast_taming_seen');
          newState.resources = { ...newState.resources, qi: Math.max(0, newState.resources.qi - 5), insight: newState.resources.insight + 3 };
          newState = setFlag(newState, 'tamed_spirit_beast');
          return { state: newState, log: '你渡出五缕真气。小兽嗅了嗅你的手，蹭了一下。灵兽算是认了你，但尚幼。' };
        },
      },
      {
        text: '静静观赏',
        effect: (state) => {
          let newState = setFlag(state, 'spirit_beast_taming_seen');
          newState.resources = { ...newState.resources, insight: newState.resources.insight + 1 };
          return { state: newState, log: '你看了它许久。小兽跳下石头，消失在草丛中。见闻略长。' };
        },
      },
    ],
  },
  {
    id: 'lost_inheritance',
    text: '石壁上刻着几行古文，旁边是残破的阵法痕迹。这里曾有修士坐化，留下了一丝传承。',
    condition: (state) =>
      (state.currentLocationId === 'mountain_cave' || state.currentLocationId === 'abandoned_temple') &&
      realmAtLeast(state, Realm.FoundationEstablishment) &&
      !state.choices.flags['lost_inheritance_seen'],
    weight: () => 5,
    choices: [
      {
        text: '以神识承接',
        effect: (state) => {
          let newState = setFlag(state, 'lost_inheritance_seen');
          newState.resources = { ...newState.resources, insight: newState.resources.insight + 5, qi: newState.resources.qi + 5, essence: Math.max(0, newState.resources.essence - 20) };
          newState = setFlag(newState, 'received_lost_inheritance');
          return { state: newState, log: '你以神识触及传承。真气多了五缕，见闻涨了五分，精元折了二十。古修的一丝造化落在你身上。' };
        },
      },
      {
        text: '记下阵法',
        effect: (state) => {
          let newState = setFlag(state, 'lost_inheritance_seen');
          newState.resources = { ...newState.resources, insight: newState.resources.insight + 3 };
          newState = setFlag(newState, 'copied_inheritance_formation');
          return { state: newState, log: '你记下阵法纹路。传承太深不敢承接，但纹路也许有用。见闻涨了三分。' };
        },
      },
    ],
  },
  {
    id: 'sect_elder_guidance',
    text: '宗门一位长老路过，停下脚步看了你一眼。"你修行有偏差，须得调整。"',
    condition: (state) =>
      (state.currentLocationId === 'outer_gate' || state.currentLocationId === 'inner_gate' || state.currentLocationId === 'sect_hall') &&
      state.sect.rank !== 'none' &&
      !state.choices.flags['sect_elder_guidance_seen'],
    weight: () => 6,
    choices: [
      {
        text: '请教',
        effect: (state) => {
          let newState = setFlag(state, 'sect_elder_guidance_seen');
          newState.resources = { ...newState.resources, insight: newState.resources.insight + 4, dantoxin: Math.max(0, newState.resources.dantoxin - 5) };
          newState = setFlag(newState, 'received_elder_guidance');
          newState = adjustQuality(newState, 'sect_trace', 2);
          return { state: newState, log: '长老点拨了你的功法偏差。丹毒退了五分，见闻涨了四分。宗门长辈确有真传。' };
        },
      },
      {
        text: '道谢后自省',
        effect: (state) => {
          let newState = setFlag(state, 'sect_elder_guidance_seen');
          newState.resources = { ...newState.resources, insight: newState.resources.insight + 2 };
          newState = adjustQuality(newState, 'quiet_cultivation', 1);
          return { state: newState, log: '你谢过长老，回去自省。偏差找到了，见闻涨了两分。' };
        },
      },
    ],
  },
  {
    id: 'forbidden_area_discovery',
    text: '巡山时你偏离了常用路径，忽然发现一堵石墙上刻着禁制符文。符文深处似有灵气波动。',
    condition: (state) =>
      (state.currentLocationId === 'mountain_path' || state.currentLocationId === 'mountain_cave') &&
      realmAtLeast(state, Realm.FoundationEstablishment) &&
      !state.choices.flags['forbidden_area_discovery_seen'],
    weight: () => 5,
    choices: [
      {
        text: '尝试破解禁制',
        effect: (state) => {
          let newState = setFlag(state, 'forbidden_area_discovery_seen');
          if ((state.choices.qualities['combat_edge'] ?? 0) >= 6 || (state.resources.insight ?? 0) >= 25) {
            newState.resources = { ...newState.resources, insight: newState.resources.insight + 4, qi: newState.resources.qi + 5 };
            newState = setFlag(newState, 'breached_forbidden_area');
            return { state: newState, log: '禁制被你破开一角。里面灵气充沛，真气多了五缕，见闻涨了四分。' };
          }
          newState.resources = { ...newState.resources, wounds: newState.resources.wounds + 1, essence: Math.max(0, newState.resources.essence - 15) };
          return { state: newState, log: '禁制反噬。你被弹开，伤添一处，精元折了十五。' };
        },
      },
      {
        text: '标记位置',
        effect: (state) => {
          let newState = setFlag(state, 'forbidden_area_discovery_seen');
          newState = setFlag(newState, 'marked_forbidden_area');
          newState.resources = { ...newState.resources, insight: newState.resources.insight + 1 };
          return { state: newState, log: '你记下位置。禁制还在，日后或有办法。见闻略长。' };
        },
      },
    ],
  },

  // --- Category 4: Combat & Danger Events (5) ---

  {
    id: 'wild_beast_attack',
    text: '灌木丛中猛然窜出一头黑毛野猪，獠牙上带着泥土，直冲你而来。',
    condition: (state) =>
      (state.currentLocationId === 'mountain_path' || state.currentLocationId === 'demonic_forest') &&
      realmAtLeast(state, Realm.QiCondensation) &&
      (LOCATIONS[state.currentLocationId]?.danger ?? 0) >= 2 &&
      !state.choices.flags['wild_beast_attack_seen'],
    weight: (state) => 10 + (LOCATIONS[state.currentLocationId]?.danger ?? 0) * 3,
    choices: [
      {
        text: '击退',
        effect: (state) => {
          let newState = setFlag(state, 'wild_beast_attack_seen');
          const result = resolveCombatEvent(
            newState,
            'fight',
            { id: 'wild_boar', name: '黑毛野猪', realm: Realm.Mortal, power: 5 },
            () => 0.5
          );
          return { state: result.state, log: result.success ? '你击退野猪。它嗷嗷叫着逃入林中。' : result.log };
        },
      },
      {
        text: '闪避',
        effect: (state) => {
          let newState = setFlag(state, 'wild_beast_attack_seen');
          newState.resources = { ...newState.resources, essence: Math.max(0, newState.resources.essence - 10) };
          return { state: newState, log: '你侧身躲过。精元折了十分，野猪冲入了林深处。' };
        },
      },
    ],
  },
  {
    id: 'bandit_ambush',
    text: '山径拐弯处跳出三个人，手持短刀。"留下钱袋，饶你一命。"',
    condition: (state) =>
      state.currentLocationId === 'mountain_path' &&
      state.resources.coins >= 10 &&
      !state.choices.flags['bandit_ambush_seen'],
    weight: (state) => 8 + Math.min(10, Math.floor(state.resources.coins / 10)),
    choices: [
      {
        text: '交钱保命',
        effect: (state) => {
          let newState = setFlag(state, 'bandit_ambush_seen');
          newState.resources = { ...newState.resources, coins: Math.max(0, newState.resources.coins - 10) };
          return { state: newState, log: '你交出十枚钱。山匪收了钱，让你过去。' };
        },
      },
      {
        text: '斗法',
        effect: (state) => {
          let newState = setFlag(state, 'bandit_ambush_seen');
          const result = resolveCombatEvent(
            newState,
            'fight',
            { id: 'bandit_leader', name: '山匪头目', realm: Realm.Mortal, power: 7 },
            () => 0.5
          );
          if (result.success) {
            result.state.resources = { ...result.state.resources, coins: result.state.resources.coins + 8 };
            return { state: result.state, log: '你击退山匪。他们丢下八枚钱四散而逃。' };
          }
          return { state: result.state, log: result.log };
        },
      },
    ],
  },
  {
    id: 'poisonous_mist',
    text: '林间忽然弥漫起一团淡绿色雾气，气味辛辣。毒雾！',
    condition: (state) =>
      (state.currentLocationId === 'demonic_forest' || state.currentLocationId === 'mountain_cave') &&
      !state.choices.flags['poisonous_mist_seen'],
    weight: (state) => 8 + (LOCATIONS[state.currentLocationId]?.danger ?? 0) * 2,
    choices: [
      {
        text: '屏息冲过',
        effect: (state) => {
          let newState = setFlag(state, 'poisonous_mist_seen');
          newState.resources = { ...newState.resources, dantoxin: newState.resources.dantoxin + 3, essence: Math.max(0, newState.resources.essence - 10) };
          return { state: newState, log: '你屏息冲过毒雾。丹毒涨了三分，精元折了十分。' };
        },
      },
      {
        text: '绕路',
        effect: (state) => {
          let newState = setFlag(state, 'poisonous_mist_seen');
          newState.resources = { ...newState.resources, essence: Math.max(0, newState.resources.essence - 15) };
          return { state: newState, log: '你绕了大半圈避开毒雾。精元折了十五，但没中毒。' };
        },
      },
      {
        text: '以药驱散',
        effect: (state) => {
          let newState = setFlag(state, 'poisonous_mist_seen');
          if (newState.resources.herbs < 3) {
            newState.resources = { ...newState.resources, dantoxin: newState.resources.dantoxin + 2 };
            return { state: newState, log: '药不够。你硬扛了毒雾，丹毒涨了两分。' };
          }
          newState.resources = { ...newState.resources, herbs: newState.resources.herbs - 3 };
          return { state: newState, log: '三味药熏散毒雾。路通了，药花了。' };
        },
      },
    ],
  },
  {
    id: 'formation_trap',
    text: '脚下忽然一软，四周景色扭曲。你踏入了一座古阵——阵法陷阱！',
    condition: (state) =>
      (state.currentLocationId === 'mountain_cave' || state.currentLocationId === 'deep_temple') &&
      realmAtLeast(state, Realm.FoundationEstablishment) &&
      !state.choices.flags['formation_trap_seen'],
    weight: () => 6,
    choices: [
      {
        text: '以见闻破阵',
        effect: (state) => {
          let newState = setFlag(state, 'formation_trap_seen');
          if (newState.resources.insight >= 20) {
            newState.resources = { ...newState.resources, insight: newState.resources.insight + 2 };
            return { state: newState, log: '你辨认出阵眼。三步踏出，阵法自解。见闻又涨了两分。' };
          }
          newState.resources = { ...newState.resources, essence: Math.max(0, newState.resources.essence - 20), wounds: newState.resources.wounds + 1 };
          return { state: newState, log: '见闻不够，你在阵中转了许久。精元折了二十，伤添一处。' };
        },
      },
      {
        text: '强行破阵',
        effect: (state) => {
          let newState = setFlag(state, 'formation_trap_seen');
          newState.resources = { ...newState.resources, qi: Math.max(0, newState.resources.qi - 5), wounds: newState.resources.wounds + 1 };
          return { state: newState, log: '你以真气硬冲阵壁。真气折了五缕，伤添一处，但人出来了。' };
        },
      },
    ],
  },
  {
    id: 'qi_deviation',
    text: '行气时忽然气机逆行，丹田处灼痛难当。走火入魔的边缘！',
    condition: (state) =>
      state.resources.dantoxin >= 80 &&
      !state.choices.flags['qi_deviation_seen'],
    weight: (state) => 20 + Math.min(30, state.resources.dantoxin - 80),
    choices: [
      {
        text: '咬牙逼回正轨',
        effect: (state) => {
          let newState = setFlag(state, 'qi_deviation_seen');
          if (newState.resources.essence < 50) {
            newState.resources = { ...newState.resources, wounds: newState.resources.wounds + 2, dantoxin: newState.resources.dantoxin + 5 };
            return { state: newState, log: '精元不足，强行逼气回轨失败。伤添两处，丹毒暴涨五分。' };
          }
          newState.resources = { ...newState.resources, essence: newState.resources.essence - 50, dantoxin: Math.max(0, newState.resources.dantoxin - 10), lifespan: Math.max(0, newState.resources.lifespan - 60) };
          return { state: newState, log: '你耗尽心力逼气回轨。丹毒退了十分，但精元折了五十，寿元少了六十刻。' };
        },
      },
      {
        text: '以药稳住',
        effect: (state) => {
          let newState = setFlag(state, 'qi_deviation_seen');
          if (newState.resources.herbs < 5) {
            newState.resources = { ...newState.resources, wounds: newState.resources.wounds + 1, dantoxin: newState.resources.dantoxin + 3 };
            return { state: newState, log: '药不够。气机继续逆行，伤添一处，丹毒又涨三分。' };
          }
          newState.resources = { ...newState.resources, herbs: newState.resources.herbs - 5, dantoxin: Math.max(0, newState.resources.dantoxin - 5) };
          return { state: newState, log: '五味药稳住气机。丹毒退了五分，药也花了。' };
        },
      },
    ],
  },

  // --- Category 5: Seasonal & Weather Events (4) ---

  {
    id: 'spring_thunder_awakening',
    text: '春雷轰鸣，万物惊蛰。天地灵气随雷声震入丹田，周身气脉似乎都醒了过来。',
    condition: (state) =>
      state.time.season === Season.Spring &&
      realmAtLeast(state, Realm.QiCondensation) &&
      !state.choices.flags['spring_thunder_awakening_seen'],
    weight: () => 12,
    choices: [
      {
        text: '借雷行气',
        effect: (state) => {
          let newState = setFlag(state, 'spring_thunder_awakening_seen');
          newState.resources = { ...newState.resources, qi: newState.resources.qi + 5, insight: newState.resources.insight + 1 };
          return { state: newState, log: '你趁雷声行气。真气多了五缕，见闻涨了一分。春雷催万物。' };
        },
      },
      {
        text: '闭门不听',
        effect: (state) => {
          let newState = setFlag(state, 'spring_thunder_awakening_seen');
          return { state: newState, log: '你关上门窗。雷声仍在，但你选择不借天时。' };
        },
      },
    ],
  },
  {
    id: 'summer_heat_wave',
    text: '盛夏酷暑，灵气稀薄。行气时热浪灌入经脉，丹田处燥意难消。',
    condition: (state) =>
      state.time.season === Season.Summer &&
      realmAtLeast(state, Realm.QiCondensation) &&
      !state.choices.flags['summer_heat_wave_seen'],
    weight: () => 10,
    choices: [
      {
        text: '静心降温',
        effect: (state) => {
          let newState = setFlag(state, 'summer_heat_wave_seen');
          newState.resources = { ...newState.resources, dantoxin: Math.max(0, newState.resources.dantoxin + 2), essence: Math.max(0, newState.resources.essence - 10) };
          return { state: newState, log: '你静心抗暑。精元折了十分，丹毒涨了两分。热浪难消。' };
        },
      },
      {
        text: '以药清火',
        effect: (state) => {
          let newState = setFlag(state, 'summer_heat_wave_seen');
          if (newState.resources.herbs < 2) {
            newState.resources = { ...newState.resources, dantoxin: newState.resources.dantoxin + 3 };
            return { state: newState, log: '药不够。酷暑难当，丹毒涨了三分。' };
          }
          newState.resources = { ...newState.resources, herbs: newState.resources.herbs - 2 };
          return { state: newState, log: '两味清火药入喉。暑意稍减，药花了。' };
        },
      },
    ],
  },
  {
    id: 'autumn_harvest_moon',
    text: '秋月圆满，银光如水。月华之下，灵气格外澄明，行气时心神空灵。',
    condition: (state) =>
      state.time.season === Season.Autumn &&
      realmAtLeast(state, Realm.QiCondensation) &&
      !state.choices.flags['autumn_harvest_moon_seen'],
    weight: () => 12,
    choices: [
      {
        text: '月下悟道',
        effect: (state) => {
          let newState = setFlag(state, 'autumn_harvest_moon_seen');
          newState.resources = { ...newState.resources, insight: newState.resources.insight + 4, qi: newState.resources.qi + 2 };
          newState = adjustQuality(newState, 'quiet_cultivation', 1);
          return { state: newState, log: '你月下静坐。见闻涨了四分，真气多了两缕。秋月照心明。' };
        },
      },
      {
        text: '采月华入药',
        effect: (state) => {
          let newState = setFlag(state, 'autumn_harvest_moon_seen');
          newState.resources = { ...newState.resources, herbs: newState.resources.herbs + 2, insight: newState.resources.insight + 2 };
          newState = adjustQuality(newState, 'alchemy_affinity', 1);
          return { state: newState, log: '你以月华温养草药。灵药多了两株，见闻涨了两分。' };
        },
      },
    ],
  },
  {
    id: 'winter_blizzard',
    text: '暴雪遮天，山路难行。寒风如刀，灵气在寒意中凝成冰晶。',
    condition: (state) =>
      state.time.season === Season.Winter &&
      realmAtLeast(state, Realm.QiCondensation) &&
      (state.currentLocationId === 'mountain_path' || state.currentLocationId === 'celestial_cliff') &&
      !state.choices.flags['winter_blizzard_seen'],
    weight: () => 14,
    choices: [
      {
        text: '冒雪前行',
        effect: (state) => {
          let newState = setFlag(state, 'winter_blizzard_seen');
          newState.resources = { ...newState.resources, essence: Math.max(0, newState.resources.essence - 25), wounds: newState.resources.wounds + 1 };
          return { state: newState, log: '你在暴雪中硬走。精元折了二十五，冻伤一处。但到了。' };
        },
      },
      {
        text: '避雪等晴',
        effect: (state) => {
          let newState = setFlag(state, 'winter_blizzard_seen');
          newState.resources = { ...newState.resources, lifespan: Math.max(0, newState.resources.lifespan - 30) };
          return { state: newState, log: '你找个石洞避了一日。暴雪停了，但寿元少了三十刻。' };
        },
      },
      {
        text: '以真气御寒',
        effect: (state) => {
          let newState = setFlag(state, 'winter_blizzard_seen');
          newState.resources = { ...newState.resources, qi: Math.max(0, newState.resources.qi - 3), insight: newState.resources.insight + 1 };
          return { state: newState, log: '你以真气温养全身。真气折了三缕，但无伤。暴雪中也有修行。' };
        },
      },
    ],
  },

  // --- New Secret Realm discovery & chain events (8) ---

  {
    id: 'spirit_field_maze_discovery',
    text: '灵田深处，泥土下隐约传来嗡嗡震鸣。你循声挖开表土，发现一面上古阵盘，纹路复杂如迷宫。',
    condition: (state) =>
      (state.currentLocationId === 'spirit_field' || state.currentLocationId === 'herb_slope') &&
      realmAtLeast(state, Realm.QiCondensation) &&
      !state.secretRealm.discoveredRealms.includes('spirit_field_maze') &&
      (state.choices.qualities['alchemy_affinity'] ?? 0) >= 3,
    weight: () => 10,
    choices: [
      {
        text: '深入探查',
        effect: (state) => {
          let newState = discoverRealm(state, 'spirit_field_maze');
          newState = setFlag(newState, 'has_discovered_realm');
          newState.resources = { ...newState.resources, insight: newState.resources.insight + 2 };
          return { state: newState, log: '你沿着阵盘纹路前行，发现了灵田迷阵的入口。草药与阵法并存。' };
        },
      },
      {
        text: '记下位置',
        effect: (state) => {
          let newState = setFlag(state, 'spirit_field_maze_hint');
          newState.resources = { ...newState.resources, insight: newState.resources.insight + 1 };
          return { state: newState, log: '你记下阵盘位置。灵田迷阵仍在暗处。' };
        },
      },
    ],
  },
  {
    id: 'spirit_field_maze_chain',
    text: '迷阵中，石板路忽然分作三条。左边药香最浓，中间有阵光闪烁，右边漆黑无声。',
    condition: (state) =>
      state.secretRealm.activeExploration === 'spirit_field_maze' &&
      state.secretRealm.explorationProgress >= 30 &&
      !state.choices.flags['spirit_field_maze_chain_seen'],
    weight: () => 80,
    choices: [
      {
        text: '循药香',
        effect: (state) => {
          let newState = setFlag(state, 'spirit_field_maze_chain_seen');
          newState.resources = { ...newState.resources, herbs: newState.resources.herbs + 5 };
          newState = adjustQuality(newState, 'alchemy_affinity', 1);
          return { state: newState, log: '药香尽头是一片上古药圃。你采了五味灵草。' };
        },
      },
      {
        text: '循阵光',
        effect: (state) => {
          let newState = setFlag(state, 'spirit_field_maze_chain_seen');
          newState.resources = { ...newState.resources, insight: newState.resources.insight + 3, qi: newState.resources.qi + 3 };
          return { state: newState, log: '阵光处是一座古阵核心。你参悟了一丝阵理，真气和见闻都有增长。' };
        },
      },
      {
        text: '入暗路',
        effect: (state) => {
          let newState = setFlag(state, 'spirit_field_maze_chain_seen');
          newState.resources = { ...newState.resources, coins: newState.resources.coins + 10, wounds: newState.resources.wounds + 1 };
          return { state: newState, log: '暗路尽头有一具骸骨和十枚钱。你拿了钱，但触发了机关，伤添一处。' };
        },
      },
    ],
  },
  {
    id: 'demonic_forest_depths_discovery',
    text: '妖兽林深处瘴气骤浓，古树根须下露出一个幽暗洞口，妖气与药香交替涌出。',
    condition: (state) =>
      state.currentLocationId === 'demonic_forest' &&
      realmAtLeast(state, Realm.FoundationEstablishment) &&
      !state.secretRealm.discoveredRealms.includes('demonic_forest_depths'),
    weight: () => 8,
    choices: [
      {
        text: '进入深处',
        effect: (state) => {
          let newState = discoverRealm(state, 'demonic_forest_depths');
          newState = setFlag(newState, 'has_discovered_realm');
          return { state: newState, log: '你踏入妖林深处。瘴气弥漫，但奇药遍地。' };
        },
      },
      {
        text: '退回',
        effect: (state) => {
          let newState = setFlag(state, 'demonic_forest_depths_avoided');
          return { state: newState, log: '你退了回来。妖林深处的瘴气不是你现在能扛的。' };
        },
      },
    ],
  },
  {
    id: 'demonic_forest_exploration',
    text: '妖林深处，一棵古树忽然睁开了眼睛。树干上浮现一张苍老面孔。"来者何人？"',
    condition: (state) =>
      state.secretRealm.activeExploration === 'demonic_forest_depths' &&
      state.secretRealm.explorationProgress >= 40 &&
      !state.choices.flags['demonic_forest_exploration_seen'],
    weight: () => 80,
    choices: [
      {
        text: '以礼相待',
        effect: (state) => {
          let newState = setFlag(state, 'demonic_forest_exploration_seen');
          newState.resources = { ...newState.resources, herbs: newState.resources.herbs + 8, insight: newState.resources.insight + 2 };
          newState = adjustQuality(newState, 'alchemy_affinity', 1);
          return { state: newState, log: '古树精满意你的态度，指出了一片灵药丛。灵草多了八株，见闻涨了两分。' };
        },
      },
      {
        text: '斗法',
        effect: (state) => {
          let newState = setFlag(state, 'demonic_forest_exploration_seen');
          const result = resolveCombatEvent(
            newState,
            'fight',
            { id: 'ancient_tree_spirit', name: '古树精', realm: Realm.FoundationEstablishment, power: 18 },
            () => 0.5
          );
          newState = result.state;
          if (result.success) {
            newState.resources = { ...newState.resources, qi: newState.resources.qi + 8 };
            return { state: newState, log: '你击退古树精。它散出的灵气回到你丹田。真气多了八缕。' };
          }
          return { state: newState, log: result.log };
        },
      },
    ],
  },
  {
    id: 'heavenly_wind_realm_discovery',
    text: '天柱崖顶，一道罡风撕裂虚空。罡风深处，隐约可见另一个世界的轮廓。',
    condition: (state) =>
      state.currentLocationId === 'celestial_cliff' &&
      realmAtLeast(state, Realm.FoundationEstablishment) &&
      Boolean(state.choices.flags['visited_celestial_cliff']) &&
      !state.secretRealm.discoveredRealms.includes('heavenly_wind_realm'),
    weight: () => 8,
    choices: [
      {
        text: '乘风而入',
        effect: (state) => {
          let newState = discoverRealm(state, 'heavenly_wind_realm');
          newState = setFlag(newState, 'has_discovered_realm');
          newState.resources = { ...newState.resources, insight: newState.resources.insight + 3 };
          return { state: newState, log: '你以真气御风，穿入罡风裂隙。天风界在你眼前展开。' };
        },
      },
      {
        text: '驻足观望',
        effect: (state) => {
          let newState = setFlag(state, 'heavenly_wind_realm_avoided');
          newState.resources = { ...newState.resources, insight: newState.resources.insight + 1 };
          return { state: newState, log: '你看着罡风裂隙。风太利，你暂时没有进去。' };
        },
      },
    ],
  },
  {
    id: 'heavenly_wind_trial',
    text: '天风界中，风刀霜剑齐至。每一缕风都像刀片，割在你的护体真气上。',
    condition: (state) =>
      state.secretRealm.activeExploration === 'heavenly_wind_realm' &&
      state.secretRealm.explorationProgress >= 40 &&
      !state.choices.flags['heavenly_wind_trial_seen'],
    weight: () => 80,
    choices: [
      {
        text: '硬扛风刃',
        effect: (state) => {
          let newState = setFlag(state, 'heavenly_wind_trial_seen');
          newState.resources = { ...newState.resources, qi: newState.resources.qi + 15, wounds: newState.resources.wounds + 1 };
          newState = adjustQuality(newState, 'combat_edge', 2);
          return { state: newState, log: '你硬抗风刃。真气暴涨十五缕，但风刃伤了一处。风之力入体。' };
        },
      },
      {
        text: '随风而行',
        effect: (state) => {
          let newState = setFlag(state, 'heavenly_wind_trial_seen');
          newState.resources = { ...newState.resources, qi: newState.resources.qi + 8, insight: newState.resources.insight + 5 };
          newState = adjustQuality(newState, 'quiet_cultivation', 1);
          return { state: newState, log: '你顺势随风。真气增八缕，见闻涨五分。风之道，柔中有刚。' };
        },
      },
    ],
  },
  {
    id: 'underground_palace_discovery',
    text: '溶洞尽头，石壁上忽然出现一道门。门上有阵纹，阵纹后有灵气波动。古修仙府？',
    condition: (state) =>
      state.currentLocationId === 'mountain_cave' &&
      realmAtLeast(state, Realm.GoldenCore) &&
      !state.secretRealm.discoveredRealms.includes('underground_palace'),
    weight: () => 6,
    choices: [
      {
        text: '破阵入门',
        effect: (state) => {
          let newState = discoverRealm(state, 'underground_palace');
          newState = setFlag(newState, 'has_discovered_realm');
          newState.resources = { ...newState.resources, insight: newState.resources.insight + 3, qi: Math.max(0, newState.resources.qi - 3) };
          return { state: newState, log: '你破开阵法，石门缓缓打开。地下仙府的灵气扑面而来。' };
        },
      },
      {
        text: '暂时退避',
        effect: (state) => {
          let newState = setFlag(state, 'underground_palace_avoided');
          return { state: newState, log: '你退了一步。石门仍在，等你准备好了再来。' };
        },
      },
    ],
  },
  {
    id: 'underground_palace_chain',
    text: '仙府正殿，一面古镜悬于墙上。镜面映出你的影子——但影子在微笑，而你并没有。',
    condition: (state) =>
      state.secretRealm.activeExploration === 'underground_palace' &&
      state.secretRealm.explorationProgress >= 50 &&
      !state.choices.flags['underground_palace_chain_seen'],
    weight: () => 80,
    choices: [
      {
        text: '凝视古镜',
        effect: (state) => {
          let newState = setFlag(state, 'underground_palace_chain_seen');
          newState.resources = { ...newState.resources, insight: newState.resources.insight + 6, qi: newState.resources.qi + 10, dantoxin: newState.resources.dantoxin + 3 };
          return { state: newState, log: '你凝视古镜。镜中影子传出一丝造化。见闻暴涨六分，真气多十缕，但丹毒也涨了三分。' };
        },
      },
      {
        text: '覆布遮镜',
        effect: (state) => {
          let newState = setFlag(state, 'underground_palace_chain_seen');
          newState.resources = { ...newState.resources, coins: newState.resources.coins + 20 };
          newState = adjustQuality(newState, 'quiet_cultivation', 1);
          return { state: newState, log: '你用布遮住古镜。仙府正殿的宝物你取了一些，二十钱到手。' };
        },
      },
      {
        text: '击碎古镜',
        effect: (state) => {
          let newState = setFlag(state, 'underground_palace_chain_seen');
          newState.resources = { ...newState.resources, qi: newState.resources.qi + 20, wounds: newState.resources.wounds + 2 };
          newState = adjustQuality(newState, 'reckless_breakthrough', 1);
          return { state: newState, log: '你一掌击碎古镜。灵气爆发灌入丹田。真气暴涨二十缕，但反震伤了两处。' };
        },
      },
    ],
  },
  // === GoldenCore events ===
  {
    id: 'golden_core_thunder',
    text: '丹成之际，天地感应。乌云翻涌，一道金色雷光劈下——金丹雷劫来了。',
    condition: (state) => state.realm === Realm.GoldenCore && !state.choices.flags['golden_core_thunder_seen'],
    weight: () => 20,
    choices: [
      {
        text: '迎雷而上',
        effect: (state) => {
          let newState = setFlag(state, 'golden_core_thunder_seen');
          newState.resources = {
            ...newState.resources,
            essence: newState.resources.essence - 40,
            qi: newState.resources.qi + 30,
            wounds: newState.resources.wounds + 1,
          };
          newState = adjustQuality(newState, 'combat_edge', 2);
          return { state: newState, log: '你迎雷而上。金雷劈身，伤痛一处，但真气暴涨三十缕。' };
        },
      },
      {
        text: '闭关抵抗',
        effect: (state) => {
          let newState = setFlag(state, 'golden_core_thunder_seen');
          newState.resources = {
            ...newState.resources,
            essence: newState.resources.essence - 20,
            qi: newState.resources.qi + 10,
            lifespan: Math.max(0, newState.resources.lifespan - 200),
          };
          newState = adjustQuality(newState, 'quiet_cultivation', 1);
          return { state: newState, log: '你闭关硬抗金丹雷劫。真气多了十缕，寿元折了两百刻。' };
        },
      },
      {
        text: '借丹护体',
        effect: (state) => {
          if ((state.resources.goldenCorePills ?? 0) < 1) {
            let newState = setFlag(state, 'golden_core_thunder_seen');
            newState.resources = { ...newState.resources, wounds: newState.resources.wounds + 2 };
            return { state: newState, log: '你没有凝丹丸可用。雷劫直劈，伤了两处。' };
          }
          let newState = setFlag(state, 'golden_core_thunder_seen');
          newState.resources = {
            ...newState.resources,
            goldenCorePills: newState.resources.goldenCorePills - 1,
            qi: newState.resources.qi + 20,
            dantoxin: Math.max(0, newState.resources.dantoxin - 5),
          };
          return { state: newState, log: '你吞下一枚凝丹丸。丹药护体，真气多了二十缕，丹毒也清了五分。' };
        },
      },
    ],
  },
  {
    id: 'golden_core_breakthrough_sign',
    text: '丹田中金丹轻颤，一丝元婴的气息在丹中酝酿。你的修为已触及冲元婴的门槛。',
    condition: (state) => state.realm === Realm.GoldenCore && state.resources.qi >= 80 && !state.choices.flags['golden_core_breakthrough_sign_seen'],
    weight: () => 15,
    choices: [
      {
        text: '稳固金丹',
        effect: (state) => {
          let newState = setFlag(state, 'golden_core_breakthrough_sign_seen');
          newState.resources = { ...newState.resources, qi: newState.resources.qi + 5, insight: newState.resources.insight + 2 };
          newState = adjustQuality(newState, 'quiet_cultivation', 1);
          return { state: newState, log: '你稳固金丹，不敢冒进。真气多五缕，见闻也长了两分。' };
        },
      },
      {
        text: '试探冲击',
        effect: (state) => {
          let newState = setFlag(state, 'golden_core_breakthrough_sign_seen');
          newState.resources = {
            ...newState.resources,
            qi: Math.max(0, newState.resources.qi - 10),
            essence: newState.resources.essence - 20,
            insight: newState.resources.insight + 3,
          };
          newState = adjustQuality(newState, 'reckless_breakthrough', 1);
          return { state: newState, log: '你试探冲击元婴。未成，但感悟了三分见闻。' };
        },
      },
      {
        text: '寻求辅助',
        effect: (state) => {
          let newState = setFlag(state, 'golden_core_breakthrough_sign_seen');
          newState = setFlag(newState, 'sought_nascent_soul_help');
          newState.resources = { ...newState.resources, insight: newState.resources.insight + 3 };
          return { state: newState, log: '你决定寻求辅助来冲击元婴。见闻长了三分。' };
        },
      },
    ],
  },
  {
    id: 'core_gate_senior_guidance',
    text: '核心峰石台上，一位白发长老正在打坐。你上前行礼，长老缓缓睁眼，目光如电。',
    condition: (state) => state.currentLocationId === 'core_gate' && state.realm === Realm.GoldenCore && !state.choices.flags['core_gate_guidance_received'],
    weight: () => 18,
    choices: [
      {
        text: '请教突破之道',
        effect: (state) => {
          let newState = setFlag(state, 'core_gate_guidance_received');
          newState.resources = { ...newState.resources, insight: newState.resources.insight + 5, qi: newState.resources.qi + 5 };
          newState = adjustQuality(newState, 'sect_trace', 1);
          return { state: newState, log: '长老指点突破之道。见闻长了五分，真气也多了五缕。' };
        },
      },
      {
        text: '请教功法之疑',
        effect: (state) => {
          let newState = setFlag(state, 'core_gate_guidance_received');
          newState.resources = { ...newState.resources, insight: newState.resources.insight + 8 };
          newState = adjustQuality(newState, 'alchemy_affinity', 1);
          return { state: newState, log: '长老解答功法疑难。见闻暴涨八分。' };
        },
      },
      {
        text: '默立一旁',
        effect: (state) => {
          let newState = setFlag(state, 'core_gate_guidance_received');
          newState.resources = { ...newState.resources, insight: newState.resources.insight + 2 };
          newState = adjustQuality(newState, 'quiet_cultivation', 1);
          return { state: newState, log: '你默默站在一旁。长老未多言，但你从中感悟了二分见闻。' };
        },
      },
    ],
  },
  {
    id: 'demon_seal_weakening',
    text: '镇魔地的封印石上出现细微裂纹，暗红色的光芒从缝隙中渗出。空气中弥漫着一股躁动不安的气息。',
    condition: (state) => state.currentLocationId === 'demon_seal_ground' && state.realm === Realm.GoldenCore && !state.choices.flags['demon_seal_weakening_seen'],
    weight: () => 16,
    choices: [
      {
        text: '加固封印',
        effect: (state) => {
          let newState = setFlag(state, 'demon_seal_weakening_seen');
          newState.resources = { ...newState.resources, essence: newState.resources.essence - 30, coins: newState.resources.coins + 10, insight: newState.resources.insight + 3 };
          newState = adjustQuality(newState, 'sect_contribution', 2);
          return { state: newState, log: '你耗费精元加固封印。宗门贡献增加，十钱到手，见闻也长了三分。' };
        },
      },
      {
        text: '观察研究',
        effect: (state) => {
          let newState = setFlag(state, 'demon_seal_weakening_seen');
          newState = setFlag(newState, 'studied_demon_seal');
          newState.resources = { ...newState.resources, insight: newState.resources.insight + 5 };
          return { state: newState, log: '你仔细观察封印裂纹。见闻长了五分，记下了魔气的特性。' };
        },
      },
      {
        text: '避开不惹',
        effect: (state) => {
          let newState = setFlag(state, 'demon_seal_weakening_seen');
          return { state: newState, log: '你转身离开。封印的裂纹仍在，但那不是你现在该管的事。' };
        },
      },
    ],
  },
  // === NascentSoul events ===
  {
    id: 'nascent_soul_vision',
    text: '深夜打坐，神识忽然脱离肉身。你看到自己盘坐的身影，元婴在丹田中缓缓睁开双眼——出窍了。',
    condition: (state) => state.realm === Realm.NascentSoul && !state.choices.flags['nascent_soul_vision_seen'],
    weight: () => 15,
    choices: [
      {
        text: '探查周围',
        effect: (state) => {
          let newState = setFlag(state, 'nascent_soul_vision_seen');
          newState.resources = { ...newState.resources, insight: newState.resources.insight + 8, qi: newState.resources.qi + 10 };
          newState = adjustQuality(newState, 'combat_edge', 1);
          return { state: newState, log: '你操纵元婴探查四周。见闻长了八分，真气多十缕。' };
        },
      },
      {
        text: '收神归位',
        effect: (state) => {
          let newState = setFlag(state, 'nascent_soul_vision_seen');
          newState.resources = { ...newState.resources, qi: newState.resources.qi + 15 };
          newState = adjustQuality(newState, 'quiet_cultivation', 2);
          return { state: newState, log: '你将元婴收回丹田。神识稳固，真气多了十五缕。' };
        },
      },
      {
        text: '借机修炼',
        effect: (state) => {
          let newState = setFlag(state, 'nascent_soul_vision_seen');
          newState = setFlag(newState, 'nascent_soul_out_of_body_practice');
          newState.resources = {
            ...newState.resources,
            qi: newState.resources.qi + 25,
            essence: newState.resources.essence - 30,
            lifespan: Math.max(0, newState.resources.lifespan - 100),
          };
          return { state: newState, log: '你借元婴出窍之机修炼。真气暴涨二十五缕，但精元折三十，寿元少百刻。' };
        },
      },
    ],
  },
  {
    id: 'celestial_pavilion_revelation',
    text: '天阁最高层的玉壁上，一行古篆自行浮现。字迹如行云流水，蕴含大道至理。',
    condition: (state) => state.currentLocationId === 'celestial_pavilion' && state.realm === Realm.NascentSoul && !state.choices.flags['celestial_revelation_seen'],
    weight: () => 16,
    choices: [
      {
        text: '细心参悟',
        effect: (state) => {
          let newState = setFlag(state, 'celestial_revelation_seen');
          newState.resources = { ...newState.resources, insight: newState.resources.insight + 10, qi: newState.resources.qi + 5 };
          return { state: newState, log: '你静心参悟古篆。见闻暴涨十分，真气也多了五缕。' };
        },
      },
      {
        text: '抄录带走',
        effect: (state) => {
          let newState = setFlag(state, 'celestial_revelation_seen');
          newState = setFlag(newState, 'has_celestial_script_copy');
          newState.resources = { ...newState.resources, insight: newState.resources.insight + 6, coins: Math.max(0, newState.resources.coins - 10) };
          return { state: newState, log: '你抄录古篆。见闻长了六分，花了十钱笔墨。' };
        },
      },
      {
        text: '叩拜致谢',
        effect: (state) => {
          let newState = setFlag(state, 'celestial_revelation_seen');
          newState.resources = { ...newState.resources, insight: newState.resources.insight + 3 };
          newState = adjustQuality(newState, 'quiet_cultivation', 1);
          return { state: newState, log: '你向玉壁叩拜。见闻长了三分，心境更趋平和。' };
        },
      },
    ],
  },
  {
    id: 'spirit_lake_reflection',
    text: '灵湖水面如镜，映出的不是你的面容，而是一团模糊的光影——那是你的灵根本相。',
    condition: (state) => state.currentLocationId === 'spirit_lake' && state.realm === Realm.FoundationEstablishment && !state.choices.flags['spirit_lake_reflection_seen'],
    weight: () => 18,
    choices: [
      {
        text: '沉心观照',
        effect: (state) => {
          let newState = setFlag(state, 'spirit_lake_reflection_seen');
          newState.resources = { ...newState.resources, insight: newState.resources.insight + 4, qi: newState.resources.qi + 3 };
          newState = adjustQuality(newState, 'quiet_cultivation', 1);
          return { state: newState, log: '你沉心观照灵根本相。见闻长了四分，真气多了三缕。' };
        },
      },
      {
        text: '以手搅水',
        effect: (state) => {
          let newState = setFlag(state, 'spirit_lake_reflection_seen');
          newState.resources = { ...newState.resources, qi: newState.resources.qi + 2 };
          return { state: newState, log: '你以手搅水，灵根本相散去。真气多了两缕，但灵根之相未能看清。' };
        },
      },
      {
        text: '记下灵根之相',
        effect: (state) => {
          let newState = setFlag(state, 'spirit_lake_reflection_seen');
          newState = setFlag(newState, 'understood_spiritual_root');
          newState.resources = { ...newState.resources, insight: newState.resources.insight + 6 };
          return { state: newState, log: '你记下灵根之相。见闻长了六分，日后修行或许因此不同。' };
        },
      },
    ],
  },
  {
    id: 'immortal_garden_rare_herb',
    text: '仙园角落一株灵草自发荧光，叶脉间有细密的灵纹流动。这不是寻常药草。',
    condition: (state) => state.currentLocationId === 'immortal_garden' && !state.choices.flags['immortal_garden_herb_found'],
    weight: () => 14,
    choices: [
      {
        text: '采下灵草',
        effect: (state) => {
          let newState = setFlag(state, 'immortal_garden_herb_found');
          newState.resources = { ...newState.resources, herbs: newState.resources.herbs + 6, insight: newState.resources.insight + 2 };
          newState = adjustQuality(newState, 'alchemy_affinity', 1);
          return { state: newState, log: '你采下灵草。药草多了六株，见闻也长了二分。' };
        },
      },
      {
        text: '护持生长',
        effect: (state) => {
          let newState = setFlag(state, 'immortal_garden_herb_found');
          newState.resources = { ...newState.resources, herbs: newState.resources.herbs + 3, insight: newState.resources.insight + 3 };
          newState = adjustQuality(newState, 'quiet_cultivation', 1);
          return { state: newState, log: '你护持灵草生长。药草只取了三株，但见闻长了三分。' };
        },
      },
      {
        text: '记录药性',
        effect: (state) => {
          let newState = setFlag(state, 'immortal_garden_herb_found');
          newState = setFlag(newState, 'studied_immortal_herb');
          newState.resources = { ...newState.resources, insight: newState.resources.insight + 5 };
          return { state: newState, log: '你记录下灵草药性。见闻长了五分，灵草仍在仙园中。' };
        },
      },
    ],
  },
  // === SpiritTransformation events ===
  {
    id: 'spirit_transform_sign',
    text: '天地灵气在你周围自行凝聚，形成一圈淡淡的光晕。化神之兆已现——你的神识开始与天地相融。',
    condition: (state) => state.realm === Realm.SpiritTransformation && !state.choices.flags['spirit_transform_sign_seen'],
    weight: () => 12,
    choices: [
      {
        text: '引天地灵气入体',
        effect: (state) => {
          let newState = setFlag(state, 'spirit_transform_sign_seen');
          newState.resources = {
            ...newState.resources,
            qi: newState.resources.qi + 40,
            essence: newState.resources.essence - 50,
            insight: newState.resources.insight + 10,
          };
          return { state: newState, log: '你引天地灵气入体。真气暴涨四十缕，见闻长十分，精元折五十。' };
        },
      },
      {
        text: '稳守本心',
        effect: (state) => {
          let newState = setFlag(state, 'spirit_transform_sign_seen');
          newState.resources = { ...newState.resources, qi: newState.resources.qi + 20, insight: newState.resources.insight + 5 };
          newState = adjustQuality(newState, 'quiet_cultivation', 2);
          return { state: newState, log: '你稳守本心。化神之兆渐渐收束，真气多了二十缕，见闻长五分。' };
        },
      },
      {
        text: '借机参悟',
        effect: (state) => {
          let newState = setFlag(state, 'spirit_transform_sign_seen');
          newState.resources = {
            ...newState.resources,
            qi: newState.resources.qi + 30,
            insight: newState.resources.insight + 15,
            essence: newState.resources.essence - 40,
            dantoxin: newState.resources.dantoxin + 5,
          };
          return { state: newState, log: '你借化神之兆参悟。真气多三十缕，见闻暴涨十五分，但丹毒也涨了五分。' };
        },
      },
    ],
  },
  {
    id: 'ancient_battlefield_remnant',
    text: '古战场深处，一道残魂拦住了你的去路。它曾是上古修士，死于此役，残留执念至今不散。',
    condition: (state) => state.currentLocationId === 'ancient_battlefield' && state.realm === Realm.SpiritTransformation && !state.choices.flags['battlefield_remnant_seen'],
    weight: () => 14,
    choices: [
      {
        text: '与残灵交流',
        effect: (state) => {
          let newState = setFlag(state, 'battlefield_remnant_seen');
          newState = setFlag(newState, 'received_ancient_knowledge');
          newState.resources = { ...newState.resources, insight: newState.resources.insight + 12, qi: newState.resources.qi + 10 };
          return { state: newState, log: '你与残灵交流。上古修士的见闻灌入神识，见闻暴涨十二分，真气也多了十缕。' };
        },
      },
      {
        text: '助其消散',
        effect: (state) => {
          let newState = setFlag(state, 'battlefield_remnant_seen');
          newState.resources = { ...newState.resources, insight: newState.resources.insight + 8 };
          newState = adjustQuality(newState, 'karmic_weight', -1);
          return { state: newState, log: '你助残灵消散执念。见闻长了八分，因果轻了一分。' };
        },
      },
      {
        text: '绕道而行',
        effect: (state) => {
          let newState = setFlag(state, 'battlefield_remnant_seen');
          return { state: newState, log: '你绕道而行。残灵在身后沉默，你继续赶路。' };
        },
      },
    ],
  },
  // === Integration events ===
  {
    id: 'integration_void_call',
    text: '虚空之中传来一声悠远的呼唤，仿佛天地在召唤你与之合为一体。你的修为已到了与天地共鸣的关口。',
    condition: (state) => state.realm === Realm.Integration && !state.choices.flags['integration_void_call_seen'],
    weight: () => 10,
    choices: [
      {
        text: '顺应天地',
        effect: (state) => {
          let newState = setFlag(state, 'integration_void_call_seen');
          newState.resources = {
            ...newState.resources,
            qi: newState.resources.qi + 60,
            insight: newState.resources.insight + 20,
            essence: newState.resources.essence - 80,
          };
          return { state: newState, log: '你顺应天地呼唤。真气暴涨六十缕，见闻长二十分，但精元折了八十。' };
        },
      },
      {
        text: '保持独立',
        effect: (state) => {
          let newState = setFlag(state, 'integration_void_call_seen');
          newState.resources = { ...newState.resources, qi: newState.resources.qi + 30, insight: newState.resources.insight + 10 };
          newState = adjustQuality(newState, 'quiet_cultivation', 2);
          return { state: newState, log: '你保持独立意志。真气多了三十缕，见闻长十分。' };
        },
      },
      {
        text: '试探融合',
        effect: (state) => {
          let newState = setFlag(state, 'integration_void_call_seen');
          newState.resources = {
            ...newState.resources,
            qi: newState.resources.qi + 45,
            insight: newState.resources.insight + 15,
            dantoxin: newState.resources.dantoxin + 8,
          };
          return { state: newState, log: '你试探与虚空融合。真气多四十五缕，见闻长十五分，但丹毒也涨了八分。' };
        },
      },
    ],
  },
  {
    id: 'void_rift_anomaly',
    text: '虚空裂隙突然扩张，一股混沌之力从中涌出。空间扭曲，时间仿佛凝固——这是一次罕见的虚空异变。',
    condition: (state) => state.currentLocationId === 'void_rift' && state.realm === Realm.Integration && !state.choices.flags['void_rift_anomaly_seen'],
    weight: () => 12,
    choices: [
      {
        text: '吸收混沌之力',
        effect: (state) => {
          let newState = setFlag(state, 'void_rift_anomaly_seen');
          newState.resources = {
            ...newState.resources,
            qi: newState.resources.qi + 80,
            insight: newState.resources.insight + 25,
            dantoxin: newState.resources.dantoxin + 10,
            essence: newState.resources.essence - 60,
          };
          return { state: newState, log: '你吸收混沌之力。真气暴涨八十缕，见闻长二十五分，但丹毒涨十分，精元折六十。' };
        },
      },
      {
        text: '稳固空间',
        effect: (state) => {
          let newState = setFlag(state, 'void_rift_anomaly_seen');
          newState.resources = { ...newState.resources, qi: newState.resources.qi + 30, insight: newState.resources.insight + 10 };
          newState = adjustQuality(newState, 'karmic_weight', -1);
          return { state: newState, log: '你稳固虚空裂隙。真气多三十缕，见闻长十分，因果轻了一分。' };
        },
      },
      {
        text: '退出虚空',
        effect: (state) => {
          let newState = setFlag(state, 'void_rift_anomaly_seen');
          return { state: newState, log: '你退出虚空裂隙。异变在身后发生，但你已安全。' };
        },
      },
    ],
  },
  // === Mahayana events ===
  {
    id: 'mahayana_enlightenment',
    text: '万道归一。你的修行已至大乘，天地法则在你面前如行云流水般清晰。一次深刻的悟道机缘降临了。',
    condition: (state) => state.realm === Realm.Mahayana && !state.choices.flags['mahayana_enlightenment_seen'],
    weight: () => 8,
    choices: [
      {
        text: '全力悟道',
        effect: (state) => {
          let newState = setFlag(state, 'mahayana_enlightenment_seen');
          newState.resources = {
            ...newState.resources,
            qi: newState.resources.qi + 100,
            insight: newState.resources.insight + 40,
            essence: newState.resources.essence - 100,
            lifespan: Math.max(0, newState.resources.lifespan - 500),
          };
          return { state: newState, log: '你全力悟道。真气暴涨一百缕，见闻长四十分，但精元折百，寿元少五百刻。' };
        },
      },
      {
        text: '稳步精进',
        effect: (state) => {
          let newState = setFlag(state, 'mahayana_enlightenment_seen');
          newState.resources = { ...newState.resources, qi: newState.resources.qi + 50, insight: newState.resources.insight + 20 };
          return { state: newState, log: '你稳步精进。真气多五十缕，见闻长二十分。' };
        },
      },
      {
        text: '传道授业',
        effect: (state) => {
          let newState = setFlag(state, 'mahayana_enlightenment_seen');
          newState = setFlag(newState, 'taught_followers_dao');
          newState.resources = { ...newState.resources, insight: newState.resources.insight + 15 };
          newState = adjustQuality(newState, 'sect_contribution', 3);
          return { state: newState, log: '你传道授业。见闻长十五分，宗门贡献大增。' };
        },
      },
    ],
  },
  {
    id: 'spirit_mountain_enlightenment',
    text: '灵山之巅，云海翻涌。一束金光从天际直落你身——灵山赐道，顿悟降临。',
    condition: (state) => state.currentLocationId === 'spirit_mountain' && state.realm === Realm.Mahayana && !state.choices.flags['spirit_mountain_enlightenment_seen'],
    weight: () => 10,
    choices: [
      {
        text: '接受天道',
        effect: (state) => {
          let newState = setFlag(state, 'spirit_mountain_enlightenment_seen');
          newState.resources = { ...newState.resources, qi: newState.resources.qi + 80, insight: newState.resources.insight + 30 };
          return { state: newState, log: '你接受天道灌顶。真气暴涨八十缕，见闻长三十分。' };
        },
      },
      {
        text: '以己道抗天道',
        effect: (state) => {
          let newState = setFlag(state, 'spirit_mountain_enlightenment_seen');
          newState.resources = {
            ...newState.resources,
            qi: newState.resources.qi + 50,
            insight: newState.resources.insight + 50,
            wounds: newState.resources.wounds + 2,
          };
          newState = adjustQuality(newState, 'reckless_breakthrough', 2);
          return { state: newState, log: '你以己道抗天道。见闻暴涨五十分，真气多五十缕，但伤了两处。' };
        },
      },
      {
        text: '谦卑受教',
        effect: (state) => {
          let newState = setFlag(state, 'spirit_mountain_enlightenment_seen');
          newState.resources = { ...newState.resources, qi: newState.resources.qi + 40, insight: newState.resources.insight + 20 };
          newState = adjustQuality(newState, 'quiet_cultivation', 2);
          return { state: newState, log: '你谦卑受教。真气多四十缕，见闻长二十分，心境更趋圆满。' };
        },
      },
    ],
  },
  // === Tribulation events ===
  {
    id: 'tribulation_thunder',
    text: '天穹裂开一道巨大的缝隙，九天雷劫蓄势待发。你站在渡劫台上，感受到了前所未有的天地威压。',
    condition: (state) => state.realm === Realm.Tribulation && !state.choices.flags['tribulation_thunder_seen'],
    weight: () => 6,
    choices: [
      {
        text: '以肉身迎劫',
        effect: (state) => {
          let newState = setFlag(state, 'tribulation_thunder_seen');
          newState.resources = {
            ...newState.resources,
            qi: newState.resources.qi + 150,
            insight: newState.resources.insight + 50,
            wounds: newState.resources.wounds + 3,
            essence: newState.resources.essence - 150,
          };
          return { state: newState, log: '你以肉身硬抗天雷。真气暴涨一百五十缕，见闻长五十分，但伤了三处，精元折百五十。' };
        },
      },
      {
        text: '借丹药护体',
        effect: (state) => {
          if ((state.resources.heavenlyTribulationPills ?? 0) < 1) {
            let newState = setFlag(state, 'tribulation_thunder_seen');
            newState.resources = { ...newState.resources, wounds: newState.resources.wounds + 3 };
            return { state: newState, log: '你没有天劫护体丹可用。天雷直劈，伤了三处。' };
          }
          let newState = setFlag(state, 'tribulation_thunder_seen');
          newState.resources = {
            ...newState.resources,
            heavenlyTribulationPills: newState.resources.heavenlyTribulationPills - 1,
            qi: newState.resources.qi + 120,
            insight: newState.resources.insight + 40,
          };
          return { state: newState, log: '你吞下天劫护体丹。丹药护体渡过天雷。真气多一百二十缕，见闻长四十分。' };
        },
      },
      {
        text: '布阵抵御',
        effect: (state) => {
          let newState = setFlag(state, 'tribulation_thunder_seen');
          newState.resources = {
            ...newState.resources,
            qi: newState.resources.qi + 80,
            insight: newState.resources.insight + 30,
            coins: Math.max(0, newState.resources.coins - 50),
          };
          newState = adjustQuality(newState, 'quiet_cultivation', 1);
          return { state: newState, log: '你布阵抵御天雷。阵法消耗五十钱，但真气多八十缕，见闻长三十分。' };
        },
      },
    ],
  },
  {
    id: 'tribulation_platform_breakthrough',
    text: '渡劫台上的雷纹开始共鸣，天劫似乎即将降临。这是飞升前的最后一道坎。',
    condition: (state) => state.currentLocationId === 'tribulation_platform' && state.realm === Realm.Tribulation && state.resources.qi >= 300 && !state.choices.flags['tribulation_platform_breakthrough_seen'],
    weight: () => 5,
    choices: [
      {
        text: '迎接天劫',
        effect: (state) => {
          let newState = setFlag(state, 'tribulation_platform_breakthrough_seen');
          newState.resources = {
            ...newState.resources,
            qi: newState.resources.qi + 200,
            insight: newState.resources.insight + 60,
            wounds: newState.resources.wounds + 2,
          };
          newState = adjustQuality(newState, 'reckless_breakthrough', 2);
          return { state: newState, log: '你迎接天劫。真气暴涨二百缕，见闻长六十分，但伤了两处。' };
        },
      },
      {
        text: '再做筹备',
        effect: (state) => {
          let newState = setFlag(state, 'tribulation_platform_breakthrough_seen');
          newState.resources = { ...newState.resources, insight: newState.resources.insight + 10 };
          return { state: newState, log: '你决定再做筹备。见闻长了十分，时机未到。' };
        },
      },
      {
        text: '暂离渡劫台',
        effect: (state) => {
          let newState = setFlag(state, 'tribulation_platform_breakthrough_seen');
          return { state: newState, log: '你暂离渡劫台。天劫的气息在身后渐渐消散。' };
        },
      },
    ],
  },
  // === Misc higher-realm events ===
  {
    id: 'dragon_palace_hint',
    text: '有人在谈论海底龙宫的传说——据传那里藏有上古龙族的丹药和功法，只有金丹以上修士才能涉足。',
    condition: (state) => state.realm === Realm.GoldenCore && !state.choices.flags['heard_dragon_palace_hint'] && (state.currentLocationId === 'tea_house' || state.currentLocationId === 'market'),
    weight: () => 12,
    choices: [
      {
        text: '记下传闻',
        effect: (state) => {
          let newState = setFlag(state, 'heard_dragon_palace_hint');
          newState.resources = { ...newState.resources, insight: newState.resources.insight + 3 };
          return { state: newState, log: '你记下龙宫传闻。见闻长了三分，也许日后能去探一探。' };
        },
      },
      {
        text: '不以为意',
        effect: (state) => {
          let newState = setFlag(state, 'heard_dragon_palace_hint');
          return { state: newState, log: '你不以为意。传说终究是传说。' };
        },
      },
    ],
  },
  {
    id: 'demon_seal_breach',
    text: '镇魔地的封印终于崩裂！一股狂暴的魔气从中冲出，化为一个模糊的魔影。它似乎并未完全苏醒，但已经非常危险。',
    condition: (state) => state.currentLocationId === 'demon_seal_ground' && Boolean(state.choices.flags['demon_seal_weakening_seen']) && !state.choices.flags['demon_seal_breach_seen'],
    weight: () => 10,
    choices: [
      {
        text: '斗法镇压',
        effect: (state) => {
          const result = resolveCombatEvent(
            state,
            'fight',
            { id: 'demon_shadow', name: '魔影', realm: Realm.NascentSoul, power: 15 },
            () => 0.4
          );
          let newState = setFlag(result.state, 'demon_seal_breach_seen');
          newState.resources = {
            ...newState.resources,
            qi: newState.resources.qi - 20,
            essence: newState.resources.essence - 30,
            insight: newState.resources.insight + 8,
          };
          if (result.success) {
            return { state: newState, log: result.log + ' 魔影被你镇压，见闻长了八分，但精元折三十，真气减二十。' };
          }
          newState.resources = { ...newState.resources, wounds: newState.resources.wounds + 2 };
          return { state: newState, log: result.log + ' 魔影未被镇压，你伤了两处，精元折三十，真气减二十。' };
        },
      },
      {
        text: '紧急修补',
        effect: (state) => {
          let newState = setFlag(state, 'demon_seal_breach_seen');
          newState.resources = {
            ...newState.resources,
            essence: newState.resources.essence - 50,
            herbs: Math.max(0, newState.resources.herbs - 5),
            qi: newState.resources.qi + 10,
          };
          newState = adjustQuality(newState, 'sect_contribution', 3);
          return { state: newState, log: '你紧急修补封印。精元折五十，药草耗五株，但真气多十缕，宗门贡献大增。' };
        },
      },
      {
        text: '紧急撤离',
        effect: (state) => {
          let newState = setFlag(state, 'demon_seal_breach_seen');
          newState = adjustQuality(newState, 'quiet_cultivation', -1);
          return { state: newState, log: '你紧急撤离。魔影在身后肆虐，你的心境也受了一丝影响。' };
        },
      },
    ],
  },
  // ─── 金丹事件 ────────────────────────────────────────────
  {
    id: 'golden_core_thunder_sign',
    text: '金丹之中隐隐有雷鸣之声。你盘膝运功，丹田震动不止，仿佛天劫的气息正在逼近。',
    condition: (state) =>
      state.realm === Realm.GoldenCore &&
      state.resources.qi >= 60 &&
      !state.choices.flags['golden_core_thunder_sign_seen'],
    weight: () => 12,
    choices: [
      {
        text: '静心感应',
        effect: (state) => {
          let newState = setFlag(state, 'golden_core_thunder_sign_seen');
          newState.resources = {
            ...newState.resources,
            qi: Math.max(0, newState.resources.qi - 5),
            insight: newState.resources.insight + 3,
          };
          newState = adjustQuality(newState, 'quiet_cultivation', 1);
          return { state: newState, log: '你闭目感应天劫气息。真气折了五缕，但对天劫的认知深了三分。' };
        },
      },
      {
        text: '催动金丹抵御',
        effect: (state) => {
          let newState = setFlag(state, 'golden_core_thunder_sign_seen');
          newState.resources = {
            ...newState.resources,
            essence: Math.max(0, newState.resources.essence - 20),
            qi: newState.resources.qi + 5,
          };
          newState = setFlag(newState, 'golden_core_thunder_resisted');
          return { state: newState, log: '你催动金丹硬抗。真气多了五缕，精元折二十。雷鸣暂歇，但天劫未消。' };
        },
      },
      {
        text: '置之不理',
        effect: (state) => {
          let newState = setFlag(state, 'golden_core_thunder_sign_seen');
          newState.resources = { ...newState.resources, dantoxin: newState.resources.dantoxin + 3 };
          return { state: newState, log: '你没有理会。雷鸣渐弱，丹田中却多了一丝不安的药滞。' };
        },
      },
    ],
  },
  {
    id: 'golden_core_pill_insight',
    text: '炼丹之际，火候将成未成。你忽然对药理有了新的体悟，丹方中某处关窍似乎不再晦涩。',
    condition: (state) =>
      state.realm === Realm.GoldenCore &&
      (state.choices.qualities['alchemy_affinity'] ?? 0) >= 3 &&
      !state.choices.flags['golden_core_pill_insight_seen'],
    weight: (state) => 8 + (state.choices.qualities['alchemy_affinity'] ?? 0) * 2,
    choices: [
      {
        text: '趁势推演丹方',
        effect: (state) => {
          let newState = setFlag(state, 'golden_core_pill_insight_seen');
          newState.resources = {
            ...newState.resources,
            herbs: Math.max(0, newState.resources.herbs - 3),
            insight: newState.resources.insight + 4,
          };
          newState = adjustQuality(newState, 'alchemy_affinity', 2);
          newState = setFlag(newState, 'golden_core_advanced_alchemy');
          return { state: newState, log: '你趁势推演，三味药化为引子。丹理通明，见闻长了四分。' };
        },
      },
      {
        text: '记下体悟留待后用',
        effect: (state) => {
          let newState = setFlag(state, 'golden_core_pill_insight_seen');
          newState.resources = { ...newState.resources, insight: newState.resources.insight + 2 };
          newState = adjustQuality(newState, 'alchemy_affinity', 1);
          return { state: newState, log: '你把体悟记入玉简。此刻不求甚解，来日再验。' };
        },
      },
    ],
  },
  {
    id: 'golden_core_core_crack',
    text: '行功至半，丹田中传来细微碎裂声。金丹表面多了一道裂纹，真气隐隐外泄。',
    condition: (state) =>
      state.realm === Realm.GoldenCore &&
      state.resources.dantoxin >= 40 &&
      !state.choices.flags['golden_core_core_crack_seen'],
    weight: (state) => 10 + Math.min(20, state.resources.dantoxin),
    choices: [
      {
        text: '闭关修补金丹',
        effect: (state) => {
          let newState = setFlag(state, 'golden_core_core_crack_seen');
          if (newState.resources.essence < 60) {
            newState.resources = {
              ...newState.resources,
              wounds: newState.resources.wounds + 1,
              dantoxin: newState.resources.dantoxin + 5,
            };
            return { state: newState, log: '精元不足，修补失败。裂纹未合，药滞更甚，伤添一处。' };
          }
          newState.resources = {
            ...newState.resources,
            essence: newState.resources.essence - 60,
            dantoxin: Math.max(0, newState.resources.dantoxin - 8),
            lifespan: Math.max(0, newState.resources.lifespan - 50),
          };
          newState = setFlag(newState, 'golden_core_crack_mended');
          return { state: newState, log: '你闭关三日修补金丹。裂纹渐合，药滞退了八分，寿元折五十刻。' };
        },
      },
      {
        text: '以药固丹',
        effect: (state) => {
          let newState = setFlag(state, 'golden_core_core_crack_seen');
          if (newState.resources.herbs < 5) {
            newState.resources = { ...newState.resources, wounds: newState.resources.wounds + 1 };
            return { state: newState, log: '草药不够。裂纹仍在，真气继续外泄，伤添一处。' };
          }
          newState.resources = {
            ...newState.resources,
            herbs: newState.resources.herbs - 5,
            dantoxin: newState.resources.dantoxin + 3,
          };
          return { state: newState, log: '五味药化作固丹之力。裂纹暂稳，但药滞又增三分。' };
        },
      },
      {
        text: '强行冲脉',
        effect: (state) => {
          let newState = setFlag(state, 'golden_core_core_crack_seen');
          newState.resources = {
            ...newState.resources,
            qi: newState.resources.qi + 8,
            dantoxin: newState.resources.dantoxin + 8,
            wounds: newState.resources.wounds + 1,
          };
          newState = adjustQuality(newState, 'reckless_breakthrough', 2);
          return { state: newState, log: '你不管裂纹，强行冲脉。真气多了八缕，但药滞暴涨，伤添一处。' };
        },
      },
    ],
  },
  {
    id: 'golden_core_ancient_scroll',
    text: '洞府深处石壁上刻着密密麻麻的符文。你运功辨认，竟是上古修炼法门残篇。',
    condition: (state) =>
      state.realm === Realm.GoldenCore &&
      !state.choices.flags['golden_core_ancient_scroll_seen'],
    weight: () => 8,
    choices: [
      {
        text: '临摹参悟',
        effect: (state) => {
          let newState = setFlag(state, 'golden_core_ancient_scroll_seen');
          newState.resources = {
            ...newState.resources,
            essence: Math.max(0, newState.resources.essence - 30),
            insight: newState.resources.insight + 5,
          };
          newState = adjustQuality(newState, 'quiet_cultivation', 2);
          return { state: newState, log: '你临摹石壁符文，精元折三十，但上古法门残篇已记入心间。见闻长了五分。' };
        },
      },
      {
        text: '以灵力拓印',
        effect: (state) => {
          let newState = setFlag(state, 'golden_core_ancient_scroll_seen');
          newState.resources = {
            ...newState.resources,
            qi: Math.max(0, newState.resources.qi - 15),
            insight: newState.resources.insight + 3,
          };
          newState = setFlag(newState, 'golden_core_has_scroll_copy');
          return { state: newState, log: '你以灵力拓印符文。真气折十五缕，残篇拓本存于储物袋中。' };
        },
      },
      {
        text: '不去触碰',
        effect: (state) => {
          let newState = setFlag(state, 'golden_core_ancient_scroll_seen');
          newState = adjustQuality(newState, 'quiet_cultivation', 1);
          return { state: newState, log: '你未去触碰石壁。符文静默，你静默。' };
        },
      },
    ],
  },
  {
    id: 'golden_core_spirit_beast',
    text: '一只通体银白的灵兽出现在你洞府外。它低首俯身，似有认主之意。',
    condition: (state) =>
      state.realm === Realm.GoldenCore &&
      !state.choices.flags['golden_core_spirit_beast_seen'] &&
      (state.followers.followers === undefined || Object.keys(state.followers.followers).length < state.followers.maxFollowers),
    weight: () => 6,
    choices: [
      {
        text: '接纳灵兽',
        effect: (state) => {
          let newState = setFlag(state, 'golden_core_spirit_beast_seen');
          newState.resources = {
            ...newState.resources,
            essence: Math.max(0, newState.resources.essence - 20),
            herbs: newState.resources.herbs + 3,
          };
          newState = setFlag(newState, 'golden_core_spirit_beast_accepted');
          newState = adjustQuality(newState, 'quiet_cultivation', 1);
          return { state: newState, log: '灵兽俯首，你以精元结契。精元折二十，灵兽日后可代你采药。' };
        },
      },
      {
        text: '赐药遣走',
        effect: (state) => {
          let newState = setFlag(state, 'golden_core_spirit_beast_seen');
          if (newState.resources.herbs < 2) {
            return { state: newState, log: '你手中无药可赐。灵兽在洞口徘徊片刻，转身消失于山林。' };
          }
          newState.resources = { ...newState.resources, herbs: newState.resources.herbs - 2 };
          newState = adjustQuality(newState, 'karmic_weight', -1);
          return { state: newState, log: '你以两味药相赠。灵兽衔药而去，山林间似有善意留存。' };
        },
      },
      {
        text: '驱赶',
        effect: (state) => {
          let newState = setFlag(state, 'golden_core_spirit_beast_seen');
          newState = adjustQuality(newState, 'karmic_weight', 1);
          return { state: newState, log: '你挥手驱赶。灵兽低鸣一声，没入山林。因果已种。' };
        },
      },
    ],
  },
  // ─── 元婴事件 ────────────────────────────────────────────
  {
    id: 'nascent_soul_soul_departure',
    text: '元神忽然自眉心浮出。你第一次以元神之体俯瞰肉身，天地万物在神识中纤毫毕现。',
    condition: (state) =>
      state.realm === Realm.NascentSoul &&
      !state.choices.flags['nascent_soul_soul_departure_seen'],
    weight: () => 10,
    choices: [
      {
        text: '神识远游',
        effect: (state) => {
          let newState = setFlag(state, 'nascent_soul_soul_departure_seen');
          newState.resources = {
            ...newState.resources,
            essence: Math.max(0, newState.resources.essence - 40),
            insight: newState.resources.insight + 6,
          };
          newState = setFlag(newState, 'nascent_soul_traveled');
          return { state: newState, log: '元神远游千里。精元折四十，但你看到了山川地脉的走势，见闻长了六分。' };
        },
      },
      {
        text: '速归肉身',
        effect: (state) => {
          let newState = setFlag(state, 'nascent_soul_soul_departure_seen');
          newState.resources = {
            ...newState.resources,
            qi: newState.resources.qi + 5,
            insight: newState.resources.insight + 2,
          };
          newState = adjustQuality(newState, 'quiet_cultivation', 1);
          return { state: newState, log: '你迅速收回元神。真气多了五缕，对元神出窍也有了初步了解。' };
        },
      },
      {
        text: '滞留观察',
        effect: (state) => {
          let newState = setFlag(state, 'nascent_soul_soul_departure_seen');
          newState.resources = {
            ...newState.resources,
            lifespan: Math.max(0, newState.resources.lifespan - 40),
            insight: newState.resources.insight + 4,
            wounds: newState.resources.wounds + 1,
          };
          return { state: newState, log: '元神滞留过久。肉身失了照料，伤添一处，寿元折四十刻。但见闻确有增长。' };
        },
      },
    ],
  },
  {
    id: 'nascent_soul_heavenly_vision',
    text: '元神之中忽现异象。远处山峦、河流如画卷般铺展，你看到了数十里外的景象。',
    condition: (state) =>
      state.realm === Realm.NascentSoul &&
      !state.choices.flags['nascent_soul_heavenly_vision_seen'],
    weight: () => 8,
    choices: [
      {
        text: '追踪异象',
        effect: (state) => {
          let newState = setFlag(state, 'nascent_soul_heavenly_vision_seen');
          newState.resources = {
            ...newState.resources,
            essence: Math.max(0, newState.resources.essence - 30),
            insight: newState.resources.insight + 5,
          };
          newState = setFlag(newState, 'nascent_soul_vision_tracked');
          return { state: newState, log: '你追踪异象至其源头。精元折三十，但远方的秘密已在神识之中。' };
        },
      },
      {
        text: '记录景象',
        effect: (state) => {
          let newState = setFlag(state, 'nascent_soul_heavenly_vision_seen');
          newState.resources = { ...newState.resources, insight: newState.resources.insight + 3 };
          return { state: newState, log: '你将所见刻入玉简。远方景象化为见闻，三分为你所得。' };
        },
      },
    ],
  },
  {
    id: 'nascent_soul_dao_tribulation',
    text: '天际忽有雷云聚拢，但只在远处游走，未至头顶。这是小天劫的征兆——对元婴修士的考验。',
    condition: (state) =>
      state.realm === Realm.NascentSoul &&
      state.resources.qi >= 80 &&
      !state.choices.flags['nascent_soul_dao_tribulation_seen'],
    weight: () => 10,
    choices: [
      {
        text: '迎劫而立',
        effect: (state) => {
          let newState = setFlag(state, 'nascent_soul_dao_tribulation_seen');
          newState.resources = {
            ...newState.resources,
            qi: Math.max(0, newState.resources.qi - 30),
            essence: Math.max(0, newState.resources.essence - 40),
            wounds: newState.resources.wounds + 1,
            insight: newState.resources.insight + 6,
          };
          newState = setFlag(newState, 'nascent_soul_tribulation_survived');
          newState = adjustQuality(newState, 'quiet_cultivation', 2);
          return { state: newState, log: '小天劫降临。你硬抗一击，伤添一处，真气折三十，精元折四十。但道心更坚，见闻长了六分。' };
        },
      },
      {
        text: '以阵法化解',
        effect: (state) => {
          let newState = setFlag(state, 'nascent_soul_dao_tribulation_seen');
          newState.resources = {
            ...newState.resources,
            qi: Math.max(0, newState.resources.qi - 15),
            herbs: Math.max(0, newState.resources.herbs - 3),
            insight: newState.resources.insight + 3,
          };
          return { state: newState, log: '你布下化劫阵，以三味药为引。雷力被分散，真气折十五缕，见闻长了三分。' };
        },
      },
      {
        text: '退避不出',
        effect: (state) => {
          let newState = setFlag(state, 'nascent_soul_dao_tribulation_seen');
          newState.resources = { ...newState.resources, dantoxin: newState.resources.dantoxin + 5 };
          return { state: newState, log: '你退入洞府深处。小天劫在外徘徊，未能伤你，但丹田中多了一丝畏劫的药滞。' };
        },
      },
    ],
  },
  {
    id: 'nascent_soul_memory_seal',
    text: '元神深处浮现一段不属于今生的记忆。模糊的画面中，似有前世的残影。',
    condition: (state) =>
      state.realm === Realm.NascentSoul &&
      !state.choices.flags['nascent_soul_memory_seal_seen'],
    weight: () => 6,
    choices: [
      {
        text: '以神识探查',
        effect: (state) => {
          let newState = setFlag(state, 'nascent_soul_memory_seal_seen');
          newState.resources = {
            ...newState.resources,
            essence: Math.max(0, newState.resources.essence - 30),
            insight: newState.resources.insight + 4,
          };
          newState = setFlag(newState, 'nascent_soul_past_memory');
          return { state: newState, log: '你以神识探入前世残忆。精元折三十，隐约触碰到了因果的边缘，见闻长了四分。' };
        },
      },
      {
        text: '封存记忆',
        effect: (state) => {
          let newState = setFlag(state, 'nascent_soul_memory_seal_seen');
          newState = adjustQuality(newState, 'quiet_cultivation', 2);
          return { state: newState, log: '你将残忆重新封存。前尘不可追，今生尚需行。心绪宁静。' };
        },
      },
    ],
  },
  {
    id: 'nascent_soul_nascent_beast',
    text: '元婴忽生异动，在你丹田中翻转不止。一股莫名的力量试图从元婴深处挣脱。',
    condition: (state) =>
      state.realm === Realm.NascentSoul &&
      !state.choices.flags['nascent_soul_nascent_beast_seen'],
    weight: () => 8,
    choices: [
      {
        text: '引导异力归元',
        effect: (state) => {
          let newState = setFlag(state, 'nascent_soul_nascent_beast_seen');
          newState.resources = {
            ...newState.resources,
            qi: newState.resources.qi + 10,
            essence: Math.max(0, newState.resources.essence - 25),
          };
          newState = setFlag(newState, 'nascent_soul_beast_tamed');
          return { state: newState, log: '你引导异力回归丹田。元婴渐稳，真气多了十缕，精元折二十五。' };
        },
      },
      {
        text: '强行镇压',
        effect: (state) => {
          let newState = setFlag(state, 'nascent_soul_nascent_beast_seen');
          newState.resources = {
            ...newState.resources,
            qi: Math.max(0, newState.resources.qi - 10),
            wounds: newState.resources.wounds + 1,
          };
          return { state: newState, log: '你强行镇压元婴异动。真气折十缕，肉身受了一处反噬。元婴暂时平静。' };
        },
      },
      {
        text: '顺其自然',
        effect: (state) => {
          let newState = setFlag(state, 'nascent_soul_nascent_beast_seen');
          newState.resources = {
            ...newState.resources,
            insight: newState.resources.insight + 3,
            dantoxin: newState.resources.dantoxin + 3,
          };
          return { state: newState, log: '你不加干预，任异动自行消散。见闻长了三分，但丹田中残留了一丝不稳定的药滞。' };
        },
      },
    ],
  },
  // ─── 化神事件 ────────────────────────────────────────────
  {
    id: 'spirit_transform_divine_sense',
    text: '神识如潮水般向外扩展。方圆百里的生灵气息、地脉走向，一一映入脑海。',
    condition: (state) =>
      state.realm === Realm.SpiritTransformation &&
      !state.choices.flags['spirit_transform_divine_sense_seen'],
    weight: () => 10,
    choices: [
      {
        text: '全力展开神识',
        effect: (state) => {
          let newState = setFlag(state, 'spirit_transform_divine_sense_seen');
          newState.resources = {
            ...newState.resources,
            essence: Math.max(0, newState.resources.essence - 50),
            insight: newState.resources.insight + 8,
          };
          newState = setFlag(newState, 'spirit_transform_full_divine_sense');
          return { state: newState, log: '神识铺展至极限。精元折五十，但方圆百里的秘密尽收眼底，见闻长了八分。' };
        },
      },
      {
        text: '适度探测',
        effect: (state) => {
          let newState = setFlag(state, 'spirit_transform_divine_sense_seen');
          newState.resources = {
            ...newState.resources,
            essence: Math.max(0, newState.resources.essence - 20),
            insight: newState.resources.insight + 4,
          };
          return { state: newState, log: '你适度展开神识。精元折二十，方圆十里的局势已了然于胸。' };
        },
      },
      {
        text: '收敛神识',
        effect: (state) => {
          let newState = setFlag(state, 'spirit_transform_divine_sense_seen');
          newState = adjustQuality(newState, 'quiet_cultivation', 2);
          return { state: newState, log: '你将神识收回体内。不窥天地，只守己心。' };
        },
      },
    ],
  },
  {
    id: 'spirit_transform_spirit_merge',
    text: '天地灵气忽然主动朝你汇聚。无需运功，灵气自发涌入经脉，金丹震鸣不止。',
    condition: (state) =>
      state.realm === Realm.SpiritTransformation &&
      !state.choices.flags['spirit_transform_spirit_merge_seen'],
    weight: () => 8,
    choices: [
      {
        text: '引灵入体',
        effect: (state) => {
          let newState = setFlag(state, 'spirit_transform_spirit_merge_seen');
          newState.resources = {
            ...newState.resources,
            qi: newState.resources.qi + 20,
            essence: Math.max(0, newState.resources.essence - 30),
          };
          return { state: newState, log: '灵气涌入体内。真气多了二十缕，精元折三十。你与天地灵气有了更深的联系。' };
        },
      },
      {
        text: '引导灵气入阵',
        effect: (state) => {
          let newState = setFlag(state, 'spirit_transform_spirit_merge_seen');
          newState.resources = {
            ...newState.resources,
            qi: newState.resources.qi + 10,
            insight: newState.resources.insight + 3,
          };
          return { state: newState, log: '你将多余灵气引入洞府阵法。真气多了十缕，阵法灵气也充盈了，见闻长了三分。' };
        },
      },
    ],
  },
  {
    id: 'spirit_transform_ancient_voice',
    text: '静坐之中，耳畔传来苍老而悠远的声音。不是幻觉，是某位远古大能留下的传音。',
    condition: (state) =>
      state.realm === Realm.SpiritTransformation &&
      !state.choices.flags['spirit_transform_ancient_voice_seen'],
    weight: () => 6,
    choices: [
      {
        text: '凝神倾听',
        effect: (state) => {
          let newState = setFlag(state, 'spirit_transform_ancient_voice_seen');
          newState.resources = {
            ...newState.resources,
            essence: Math.max(0, newState.resources.essence - 40),
            insight: newState.resources.insight + 7,
          };
          newState = setFlag(newState, 'spirit_transform_heard_ancient_dao');
          return { state: newState, log: '你凝神倾听远古之音。精元折四十，但大能残音中的道法碎片令你见闻暴涨七分。' };
        },
      },
      {
        text: '只记不思',
        effect: (state) => {
          let newState = setFlag(state, 'spirit_transform_ancient_voice_seen');
          newState.resources = { ...newState.resources, insight: newState.resources.insight + 4 };
          return { state: newState, log: '你记下残音，不去强解。见闻长了四分，余下待日后参悟。' };
        },
      },
    ],
  },
  // ─── 合体事件 ────────────────────────────────────────────
  {
    id: 'integration_body_spirit_merge',
    text: '肉身与元神同时震动，一道金光自丹田升起，贯穿百骸。身神合一的契机出现在眼前。',
    condition: (state) =>
      state.realm === Realm.Integration &&
      !state.choices.flags['integration_body_spirit_merge_seen'],
    weight: () => 10,
    choices: [
      {
        text: '全力合体',
        effect: (state) => {
          let newState = setFlag(state, 'integration_body_spirit_merge_seen');
          newState.resources = {
            ...newState.resources,
            qi: newState.resources.qi + 15,
            essence: Math.max(0, newState.resources.essence - 60),
            wounds: Math.max(0, newState.resources.wounds - 1),
          };
          newState = setFlag(newState, 'integration_body_spirit_merged');
          newState = adjustQuality(newState, 'quiet_cultivation', 3);
          return { state: newState, log: '肉身与元神完全融合。真气多了十五缕，旧伤退了一分，精元折六十。你已是身神合一。' };
        },
      },
      {
        text: '部分融合',
        effect: (state) => {
          let newState = setFlag(state, 'integration_body_spirit_merge_seen');
          newState.resources = {
            ...newState.resources,
            qi: newState.resources.qi + 8,
            essence: Math.max(0, newState.resources.essence - 30),
          };
          return { state: newState, log: '你只融合了部分。真气多了八缕，精元折三十。完全合体尚需时日。' };
        },
      },
    ],
  },
  {
    id: 'integration_world_resonance',
    text: '天地之间忽然一颤。你的呼吸与山川同步，心跳与地脉共振，仿佛你便是这方天地的一部分。',
    condition: (state) =>
      state.realm === Realm.Integration &&
      !state.choices.flags['integration_world_resonance_seen'],
    weight: () => 8,
    choices: [
      {
        text: '顺天共振',
        effect: (state) => {
          let newState = setFlag(state, 'integration_world_resonance_seen');
          newState.resources = {
            ...newState.resources,
            qi: newState.resources.qi + 15,
            insight: newState.resources.insight + 6,
            lifespan: Math.max(0, newState.resources.lifespan - 30),
          };
          newState = setFlag(newState, 'integration_resonance_achieved');
          return { state: newState, log: '你顺应天地共振。真气多了十五缕，见闻长了六分。天人合一虽短，已窥大道之门。寿元折三十刻。' };
        },
      },
      {
        text: '保持距离',
        effect: (state) => {
          let newState = setFlag(state, 'integration_world_resonance_seen');
          newState.resources = { ...newState.resources, insight: newState.resources.insight + 3 };
          return { state: newState, log: '你保持距离观察共振。见闻长了三分，但错过了更深的天人感应。' };
        },
      },
    ],
  },
  {
    id: 'integration_dao_heart_test',
    text: '心境中忽然浮现种种诱惑与恐惧。名利、生死、情仇……道心正在被无形之力试探。',
    condition: (state) =>
      state.realm === Realm.Integration &&
      !state.choices.flags['integration_dao_heart_test_seen'],
    weight: () => 8,
    choices: [
      {
        text: '坚守道心',
        effect: (state) => {
          let newState = setFlag(state, 'integration_dao_heart_test_seen');
          newState.resources = {
            ...newState.resources,
            essence: Math.max(0, newState.resources.essence - 40),
            insight: newState.resources.insight + 5,
          };
          newState = setFlag(newState, 'integration_dao_heart_firm');
          newState = adjustQuality(newState, 'quiet_cultivation', 3);
          return { state: newState, log: '你坚守道心，不为所动。精元折四十，见闻长了五分。道心愈坚。' };
        },
      },
      {
        text: '直面心魔',
        effect: (state) => {
          let newState = setFlag(state, 'integration_dao_heart_test_seen');
          newState.resources = {
            ...newState.resources,
            qi: Math.max(0, newState.resources.qi - 20),
            wounds: newState.resources.wounds + 1,
            insight: newState.resources.insight + 4,
          };
          newState = adjustQuality(newState, 'combat_edge', 2);
          return { state: newState, log: '你直面心魔。交锋之后，真气折二十缕，伤添一处，但对自身的认知更进一层。' };
        },
      },
      {
        text: '回避试探',
        effect: (state) => {
          let newState = setFlag(state, 'integration_dao_heart_test_seen');
          newState.resources = { ...newState.resources, dantoxin: newState.resources.dantoxin + 5 };
          return { state: newState, log: '你回避了道心试探。考验暂去，但丹田中多了一丝怯意的药滞。' };
        },
      },
    ],
  },
  // ─── 大乘事件 ────────────────────────────────────────────
  {
    id: 'mahayana_heavenly_call',
    text: '天道意志忽然降临。不是雷霆，不是审判，而是一种深沉的召唤，仿佛天地在问你一个古老的问题。',
    condition: (state) =>
      state.realm === Realm.Mahayana &&
      !state.choices.flags['mahayana_heavenly_call_seen'],
    weight: () => 8,
    choices: [
      {
        text: '回应天道',
        effect: (state) => {
          let newState = setFlag(state, 'mahayana_heavenly_call_seen');
          newState.resources = {
            ...newState.resources,
            essence: Math.max(0, newState.resources.essence - 60),
            insight: newState.resources.insight + 8,
          };
          newState = setFlag(newState, 'mahayana_answered_heaven');
          return { state: newState, log: '你回应了天道意志。精元折六十，但你与天道有了短暂的共鸣，见闻暴涨八分。' };
        },
      },
      {
        text: '沉默倾听',
        effect: (state) => {
          let newState = setFlag(state, 'mahayana_heavenly_call_seen');
          newState.resources = { ...newState.resources, insight: newState.resources.insight + 5 };
          return { state: newState, log: '你沉默倾听天道的低语。见闻长了五分，天道的深意仍需参悟。' };
        },
      },
    ],
  },
  {
    id: 'mahayana_tribulation_foreboding',
    text: '天际阴云不散。你感应到大天劫的气息正在酝酿，比以往任何天劫都更为可怖。',
    condition: (state) =>
      state.realm === Realm.Mahayana &&
      !state.choices.flags['mahayana_tribulation_foreboding_seen'],
    weight: () => 10,
    choices: [
      {
        text: '预做准备',
        effect: (state) => {
          let newState = setFlag(state, 'mahayana_tribulation_foreboding_seen');
          newState.resources = {
            ...newState.resources,
            herbs: Math.max(0, newState.resources.herbs - 5),
            insight: newState.resources.insight + 5,
          };
          newState = setFlag(newState, 'mahayana_preparing_tribulation');
          return { state: newState, log: '你开始为大天劫做准备。五味药化为护身之资，见闻长了五分。天劫将至，你已不惧。' };
        },
      },
      {
        text: '感悟劫道',
        effect: (state) => {
          let newState = setFlag(state, 'mahayana_tribulation_foreboding_seen');
          newState.resources = {
            ...newState.resources,
            essence: Math.max(0, newState.resources.essence - 40),
            insight: newState.resources.insight + 6,
          };
          return { state: newState, log: '你感悟劫道之理。精元折四十，但天劫的规则在你眼中渐渐清晰，见闻长了六分。' };
        },
      },
      {
        text: '顺其自然',
        effect: (state) => {
          let newState = setFlag(state, 'mahayana_tribulation_foreboding_seen');
          newState = adjustQuality(newState, 'quiet_cultivation', 2);
          return { state: newState, log: '你不做特殊准备。天劫来时便来，道心不可因恐惧而失守。' };
        },
      },
    ],
  },
  // ─── 渡劫事件 ────────────────────────────────────────────
  {
    id: 'tribulation_final_tribulation',
    text: '九天之上，雷云翻涌如墨。最后一道天劫正蓄势待发，这是你修行路上最终的考验。',
    condition: (state) =>
      state.realm === Realm.Tribulation &&
      state.resources.qi >= 200 &&
      !state.choices.flags['tribulation_final_tribulation_seen'],
    weight: () => 12,
    choices: [
      {
        text: '以身迎劫',
        effect: (state) => {
          let newState = setFlag(state, 'tribulation_final_tribulation_seen');
          newState.resources = {
            ...newState.resources,
            qi: Math.max(0, newState.resources.qi - 80),
            essence: Math.max(0, newState.resources.essence - 80),
            wounds: newState.resources.wounds + 2,
            insight: newState.resources.insight + 10,
          };
          newState = setFlag(newState, 'tribulation_final_survived');
          newState = adjustQuality(newState, 'quiet_cultivation', 3);
          return { state: newState, log: '你以身迎劫，天雷贯体。真气折八十，精元折八十，伤添两处。但你挺过了终极天劫，见闻暴涨十分。' };
        },
      },
      {
        text: '以法宝抵御',
        effect: (state) => {
          let newState = setFlag(state, 'tribulation_final_tribulation_seen');
          newState.resources = {
            ...newState.resources,
            coins: Math.max(0, newState.resources.coins - 50),
            herbs: Math.max(0, newState.resources.herbs - 8),
            qi: Math.max(0, newState.resources.qi - 40),
            wounds: newState.resources.wounds + 1,
            insight: newState.resources.insight + 6,
          };
          return { state: newState, log: '你祭出法宝抵御天劫。财物和药材消耗巨大，真气折四十，伤添一处。天劫虽未全渡，见闻长了六分。' };
        },
      },
      {
        text: '以道心化解',
        effect: (state) => {
          let newState = setFlag(state, 'tribulation_final_tribulation_seen');
          newState.resources = {
            ...newState.resources,
            essence: Math.max(0, newState.resources.essence - 50),
            insight: newState.resources.insight + 8,
          };
          newState = adjustQuality(newState, 'quiet_cultivation', 4);
          return { state: newState, log: '你以道心化解天劫。精元折五十，但你与天道有了更深层的默契，见闻长了八分。' };
        },
      },
    ],
  },
  // ─── 地点事件：溪谷 ──────────────────────────────────────
  {
    id: 'stream_valley_meditation',
    text: '溪水声入耳，如天然禅音。你盘坐溪畔，气息渐渐与水声相合。',
    condition: (state) =>
      state.currentLocationId === 'stream_valley' &&
      !state.choices.flags['stream_valley_meditation_seen'],
    weight: () => 10,
    choices: [
      {
        text: '随水入定',
        effect: (state) => {
          let newState = setFlag(state, 'stream_valley_meditation_seen');
          newState.resources = {
            ...newState.resources,
            qi: newState.resources.qi + 3,
            lifespan: Math.max(0, newState.resources.lifespan - 10),
          };
          newState = adjustQuality(newState, 'quiet_cultivation', 2);
          return { state: newState, log: '你随水声入定。真气多了三缕，寿元少了十刻。溪水带走了一些执念。' };
        },
      },
      {
        text: '观水悟道',
        effect: (state) => {
          let newState = setFlag(state, 'stream_valley_meditation_seen');
          newState.resources = { ...newState.resources, insight: newState.resources.insight + 3 };
          newState = adjustQuality(newState, 'quiet_cultivation', 1);
          return { state: newState, log: '你观水悟道。水无常形，道亦如此。见闻长了三分。' };
        },
      },
    ],
  },
  {
    id: 'stream_valley_herb_find',
    text: '溪边碎石间，一株带露的灵草在水雾中若隐若现。',
    condition: (state) =>
      state.currentLocationId === 'stream_valley' &&
      !state.choices.flags['stream_valley_herb_find_seen'],
    weight: () => 10,
    choices: [
      {
        text: '采下灵草',
        effect: (state) => {
          let newState = setFlag(state, 'stream_valley_herb_find_seen');
          newState.resources = { ...newState.resources, herbs: newState.resources.herbs + 4 };
          newState = adjustQuality(newState, 'alchemy_affinity', 1);
          return { state: newState, log: '你采下灵草。药草添了四株，溪水的灵气仍留在叶上。' };
        },
      },
      {
        text: '只取一叶',
        effect: (state) => {
          let newState = setFlag(state, 'stream_valley_herb_find_seen');
          newState.resources = {
            ...newState.resources,
            herbs: newState.resources.herbs + 1,
            insight: newState.resources.insight + 1,
          };
          newState = adjustQuality(newState, 'alchemy_affinity', 2);
          return { state: newState, log: '你只取一叶，余下灵草留待再生。草药添了一株，见闻长了一分。' };
        },
      },
    ],
  },
  {
    id: 'stream_valley_encounter',
    text: '溪谷深处传来脚步声。一名采药的修士从林间走出，看了你一眼。',
    condition: (state) =>
      state.currentLocationId === 'stream_valley' &&
      !state.choices.flags['stream_valley_encounter_seen'],
    weight: () => 8,
    choices: [
      {
        text: '交换草药情报',
        effect: (state) => {
          let newState = setFlag(state, 'stream_valley_encounter_seen');
          newState.resources = { ...newState.resources, insight: newState.resources.insight + 2, herbs: newState.resources.herbs + 1 };
          return { state: newState, log: '你与采药修士交换了溪谷草药的信息。见闻长了二分，草药添了一株。' };
        },
      },
      {
        text: '点头致意',
        effect: (state) => {
          let newState = setFlag(state, 'stream_valley_encounter_seen');
          newState.resources = { ...newState.resources, insight: newState.resources.insight + 1 };
          return { state: newState, log: '你点头致意，他回以一笑。溪谷中多了一段无声的默契。' };
        },
      },
    ],
  },
  // ─── 地点事件：废观 ──────────────────────────────────────
  {
    id: 'temple_old_talisman',
    text: '废观墙角贴着一张褪色的符箓。符纸虽旧，其上的灵纹仍在微微发光。',
    condition: (state) =>
      state.currentLocationId === 'abandoned_temple' &&
      !state.choices.flags['temple_old_talisman_seen'],
    weight: () => 10,
    choices: [
      {
        text: '揭下符箓',
        effect: (state) => {
          let newState = setFlag(state, 'temple_old_talisman_seen');
          newState.resources = {
            ...newState.resources,
            insight: newState.resources.insight + 3,
            dantoxin: newState.resources.dantoxin + 2,
          };
          return { state: newState, log: '你揭下符箓。灵纹入眼，见闻长了三分，但符上残留的灵力令丹田微微波动，药滞增了两分。' };
        },
      },
      {
        text: '临摹灵纹',
        effect: (state) => {
          let newState = setFlag(state, 'temple_old_talisman_seen');
          newState.resources = {
            ...newState.resources,
            essence: Math.max(0, newState.resources.essence - 15),
            insight: newState.resources.insight + 4,
          };
          return { state: newState, log: '你仔细临摹灵纹。精元折十五，但灵纹的原理已记入心间，见闻长了四分。' };
        },
      },
      {
        text: '不去触碰',
        effect: (state) => {
          let newState = setFlag(state, 'temple_old_talisman_seen');
          return { state: newState, log: '你未触碰符箓。灵纹在墙上继续发光，与你无关。' };
        },
      },
    ],
  },
  {
    id: 'temple_forbidden_knowledge',
    text: '废观地砖下，你发现一块刻满禁术的石板。石板上的文字散发着阴冷的气息。',
    condition: (state) =>
      state.currentLocationId === 'abandoned_temple' &&
      !state.choices.flags['temple_forbidden_knowledge_seen'],
    weight: () => 8,
    choices: [
      {
        text: '研读禁术',
        effect: (state) => {
          let newState = setFlag(state, 'temple_forbidden_knowledge_seen');
          newState.resources = {
            ...newState.resources,
            insight: newState.resources.insight + 5,
            dantoxin: newState.resources.dantoxin + 5,
          };
          newState = adjustQuality(newState, 'karmic_weight', 2);
          return { state: newState, log: '你研读禁术。见闻暴涨五分，但阴冷之气侵入经脉，药滞增了五分，因果也重了。' };
        },
      },
      {
        text: '封存石板',
        effect: (state) => {
          let newState = setFlag(state, 'temple_forbidden_knowledge_seen');
          newState = adjustQuality(newState, 'karmic_weight', -1);
          newState = adjustQuality(newState, 'quiet_cultivation', 1);
          return { state: newState, log: '你将石板重新封存。禁术不入眼，因果轻了一分。' };
        },
      },
    ],
  },
  {
    id: 'temple_candle_heart',
    text: '废观供桌上，一支无火自燃的蜡烛静静燃烧。烛光映出的影子，不是你的。',
    condition: (state) =>
      state.currentLocationId === 'abandoned_temple' &&
      !state.choices.flags['temple_candle_heart_seen'],
    weight: () => 6,
    choices: [
      {
        text: '凝视烛火',
        effect: (state) => {
          let newState = setFlag(state, 'temple_candle_heart_seen');
          newState.resources = {
            ...newState.resources,
            insight: newState.resources.insight + 3,
            lifespan: Math.max(0, newState.resources.lifespan - 15),
          };
          return { state: newState, log: '你凝视烛火。影子动了动，仿佛在对你示意。见闻长了三分，寿元折了十五刻。' };
        },
      },
      {
        text: '吹灭蜡烛',
        effect: (state) => {
          let newState = setFlag(state, 'temple_candle_heart_seen');
          newState.resources = { ...newState.resources, qi: newState.resources.qi + 2 };
          return { state: newState, log: '你吹灭蜡烛。影子消失了，烛火熄灭的瞬间，真气多了两缕。' };
        },
      },
    ],
  },
  // ─── 地点事件：灵田 ──────────────────────────────────────
  {
    id: 'spirit_field_blight',
    text: '灵田一角忽然枯萎。灵草叶片发黑，根部渗出暗色的液体。灵气枯竭之兆。',
    condition: (state) =>
      state.currentLocationId === 'spirit_field' &&
      !state.choices.flags['spirit_field_blight_seen'],
    weight: () => 10,
    choices: [
      {
        text: '切除枯萎部分',
        effect: (state) => {
          let newState = setFlag(state, 'spirit_field_blight_seen');
          newState.resources = {
            ...newState.resources,
            herbs: Math.max(0, newState.resources.herbs - 3),
            insight: newState.resources.insight + 2,
          };
          return { state: newState, log: '你切除枯萎灵草。药草少了三株，但枯萎不再蔓延。见闻长了二分。' };
        },
      },
      {
        text: '以灵力净化',
        effect: (state) => {
          let newState = setFlag(state, 'spirit_field_blight_seen');
          newState.resources = {
            ...newState.resources,
            qi: Math.max(0, newState.resources.qi - 10),
            herbs: Math.max(0, newState.resources.herbs - 1),
          };
          return { state: newState, log: '你以灵力净化灵田。真气折十缕，药草只少了一株，枯败之气已散。' };
        },
      },
      {
        text: '听之任之',
        effect: (state) => {
          let newState = setFlag(state, 'spirit_field_blight_seen');
          newState.resources = { ...newState.resources, herbs: Math.max(0, newState.resources.herbs - 5) };
          return { state: newState, log: '你没有理会。枯萎蔓延，药草少了五株。灵田需要照料。' };
        },
      },
    ],
  },
  {
    id: 'spirit_field_spirit_rain',
    text: '天降灵雨。雨滴落在灵田中，每一滴都带着浓郁的灵气，灵草如饥似渴地吸收。',
    condition: (state) =>
      state.currentLocationId === 'spirit_field' &&
      !state.choices.flags['spirit_field_spirit_rain_seen'],
    weight: () => 12,
    choices: [
      {
        text: '接灵雨入田',
        effect: (state) => {
          let newState = setFlag(state, 'spirit_field_spirit_rain_seen');
          newState.resources = {
            ...newState.resources,
            herbs: newState.resources.herbs + 5,
            qi: newState.resources.qi + 3,
          };
          return { state: newState, log: '灵雨润田。药草多了五株，真气多了三缕。天赐之福。' };
        },
      },
      {
        text: '自身沐浴灵雨',
        effect: (state) => {
          let newState = setFlag(state, 'spirit_field_spirit_rain_seen');
          newState.resources = {
            ...newState.resources,
            qi: newState.resources.qi + 5,
            herbs: newState.resources.herbs + 2,
          };
          return { state: newState, log: '你在灵雨中沐浴。真气多了五缕，药草多了两株。身心俱润。' };
        },
      },
    ],
  },
  {
    id: 'spirit_field_pest_infestation',
    text: '灵田中出现了虫害。灵虫啃食灵草根茎，叶片残缺不全。',
    condition: (state) =>
      state.currentLocationId === 'spirit_field' &&
      !state.choices.flags['spirit_field_pest_infestation_seen'],
    weight: () => 8,
    choices: [
      {
        text: '以灵力驱虫',
        effect: (state) => {
          let newState = setFlag(state, 'spirit_field_pest_infestation_seen');
          newState.resources = {
            ...newState.resources,
            qi: Math.max(0, newState.resources.qi - 5),
            herbs: Math.max(0, newState.resources.herbs - 1),
          };
          return { state: newState, log: '你以灵力驱除灵虫。真气折五缕，药草只损了一株。虫害暂止。' };
        },
      },
      {
        text: '采摘残余灵草',
        effect: (state) => {
          let newState = setFlag(state, 'spirit_field_pest_infestation_seen');
          newState.resources = { ...newState.resources, herbs: Math.max(0, newState.resources.herbs - 3) };
          return { state: newState, log: '你抢收残余灵草。药草还是少了三株，但至少没全毁。' };
        },
      },
    ],
  },
  // ─── 地点事件：丹房 ──────────────────────────────────────
  {
    id: 'pill_hall_furnace_accident',
    text: '丹炉忽然震动，炉口喷出一股灼热的药气。炼丹似乎出了差错。',
    condition: (state) =>
      state.currentLocationId === 'pill_hall' &&
      !state.choices.flags['pill_hall_furnace_accident_seen'],
    weight: () => 10,
    choices: [
      {
        text: '紧急封炉',
        effect: (state) => {
          let newState = setFlag(state, 'pill_hall_furnace_accident_seen');
          newState.resources = {
            ...newState.resources,
            herbs: Math.max(0, newState.resources.herbs - 2),
            dantoxin: newState.resources.dantoxin + 2,
          };
          return { state: newState, log: '你紧急封炉。药草损了两株，药气反噬令丹毒增了两分。炉子保住了。' };
        },
      },
      {
        text: '趁机取丹',
        effect: (state) => {
          let newState = setFlag(state, 'pill_hall_furnace_accident_seen');
          newState.resources = {
            ...newState.resources,
            herbs: Math.max(0, newState.resources.herbs - 3),
            dantoxin: newState.resources.dantoxin + 4,
            wounds: newState.resources.wounds + 1,
          };
          newState = adjustQuality(newState, 'alchemy_affinity', 2);
          return { state: newState, log: '你趁药气未散强行取丹。药草损三株，伤添一处，丹毒增四分。但你从中领悟了火候的微妙。' };
        },
      },
      {
        text: '撤离丹房',
        effect: (state) => {
          let newState = setFlag(state, 'pill_hall_furnace_accident_seen');
          newState.resources = { ...newState.resources, herbs: Math.max(0, newState.resources.herbs - 4) };
          return { state: newState, log: '你撤离丹房。炉中丹药全毁，药草损了四株。安全第一。' };
        },
      },
    ],
  },
  {
    id: 'pill_hall_senior_guidance',
    text: '丹房中一位资深炼丹师正在调炉。他看了你的操作，微微摇头。',
    condition: (state) =>
      state.currentLocationId === 'pill_hall' &&
      !state.choices.flags['pill_hall_senior_guidance_seen'],
    weight: () => 10,
    choices: [
      {
        text: '虚心请教',
        effect: (state) => {
          let newState = setFlag(state, 'pill_hall_senior_guidance_seen');
          newState.resources = { ...newState.resources, insight: newState.resources.insight + 4 };
          newState = adjustQuality(newState, 'alchemy_affinity', 2);
          return { state: newState, log: '你虚心请教。前辈指点了几处关键火候，见闻长了四分，丹道理解深了。' };
        },
      },
      {
        text: '在一旁观察',
        effect: (state) => {
          let newState = setFlag(state, 'pill_hall_senior_guidance_seen');
          newState.resources = { ...newState.resources, insight: newState.resources.insight + 2 };
          newState = adjustQuality(newState, 'alchemy_affinity', 1);
          return { state: newState, log: '你默默观察前辈的手法。见闻长了二分，有些门道还需自悟。' };
        },
      },
    ],
  },
  {
    id: 'pill_hall_waste_residue',
    text: '丹房角落堆着一些炼丹废渣。其中似有残余药性，尚未完全散尽。',
    condition: (state) =>
      state.currentLocationId === 'pill_hall' &&
      !state.choices.flags['pill_hall_waste_residue_seen'],
    weight: () => 6,
    choices: [
      {
        text: '提取残余药性',
        effect: (state) => {
          let newState = setFlag(state, 'pill_hall_waste_residue_seen');
          newState.resources = {
            ...newState.resources,
            herbs: newState.resources.herbs + 2,
            dantoxin: newState.resources.dantoxin + 2,
          };
          newState = adjustQuality(newState, 'alchemy_affinity', 1);
          return { state: newState, log: '你从废渣中提取出残余药性。草药添了两株，丹毒增了两分。废物利用。' };
        },
      },
      {
        text: '清理废渣',
        effect: (state) => {
          let newState = setFlag(state, 'pill_hall_waste_residue_seen');
          newState.resources = { ...newState.resources, insight: newState.resources.insight + 1 };
          return { state: newState, log: '你清理了废渣。丹房整洁了，见闻也长了一分。' };
        },
      },
    ],
  },
  // ─── 地点事件：剑阁 ──────────────────────────────────────
  {
    id: 'sword_pavilion_sword_cry',
    text: '剑阁中忽然响起一声剑鸣。无风无震，壁上某柄古剑自行颤抖，似在呼应什么。',
    condition: (state) =>
      state.currentLocationId === 'sword_pavilion' &&
      !state.choices.flags['sword_pavilion_sword_cry_seen'],
    weight: () => 10,
    choices: [
      {
        text: '拔剑感应',
        effect: (state) => {
          let newState = setFlag(state, 'sword_pavilion_sword_cry_seen');
          newState.resources = {
            ...newState.resources,
            qi: newState.resources.qi + 5,
            essence: Math.max(0, newState.resources.essence - 15),
            insight: newState.resources.insight + 3,
          };
          newState = adjustQuality(newState, 'combat_edge', 2);
          return { state: newState, log: '你拔剑感应。剑意涌入经脉，真气多了五缕，精元折十五，见闻长了三分。剑心初动。' };
        },
      },
      {
        text: '以剑意回应',
        effect: (state) => {
          let newState = setFlag(state, 'sword_pavilion_sword_cry_seen');
          newState.resources = {
            ...newState.resources,
            qi: Math.max(0, newState.resources.qi - 5),
            insight: newState.resources.insight + 4,
          };
          newState = adjustQuality(newState, 'combat_edge', 1);
          return { state: newState, log: '你以剑意回应剑鸣。真气折五缕，但与古剑有了共鸣，见闻长了四分。' };
        },
      },
      {
        text: '静观其变',
        effect: (state) => {
          let newState = setFlag(state, 'sword_pavilion_sword_cry_seen');
          newState.resources = { ...newState.resources, insight: newState.resources.insight + 1 };
          return { state: newState, log: '你静观其变。剑鸣渐歇，只留下几分感触，见闻长了一分。' };
        },
      },
    ],
  },
  {
    id: 'sword_pavilion_senior_duel',
    text: '剑阁中一名师兄正在练剑。他看了你一眼，剑意微动，似有切磋之意。',
    condition: (state) =>
      state.currentLocationId === 'sword_pavilion' &&
      !state.choices.flags['sword_pavilion_senior_duel_seen'],
    weight: () => 8,
    choices: [
      {
        text: '应战切磋',
        effect: (state) => {
          let newState = setFlag(state, 'sword_pavilion_senior_duel_seen');
          const result = resolveCombatEvent(
            state,
            'fight',
            { id: 'sword_senior', name: '剑阁师兄', realm: state.realm, power: 10 },
            () => 0.5
          );
          newState = setFlag(result.state, 'sword_pavilion_senior_duel_seen');
          newState.resources = { ...newState.resources, insight: newState.resources.insight + 3 };
          newState = adjustQuality(newState, 'combat_edge', 2);
          return { state: newState, log: result.log + ' 切磋之后，剑术精进，见闻长了三分。' };
        },
      },
      {
        text: '婉拒',
        effect: (state) => {
          let newState = setFlag(state, 'sword_pavilion_senior_duel_seen');
          newState.resources = { ...newState.resources, insight: newState.resources.insight + 1 };
          return { state: newState, log: '你婉拒了切磋。师兄点头，继续练剑。见闻长了一分。' };
        },
      },
    ],
  },
  {
    id: 'sword_pavilion_lost_technique',
    text: '剑阁深处一本蒙尘的剑谱滑落书架。翻开残页，其上记载着失传已久的剑诀。',
    condition: (state) =>
      state.currentLocationId === 'sword_pavilion' &&
      !state.choices.flags['sword_pavilion_lost_technique_seen'],
    weight: () => 8,
    choices: [
      {
        text: '研习残谱',
        effect: (state) => {
          let newState = setFlag(state, 'sword_pavilion_lost_technique_seen');
          newState.resources = {
            ...newState.resources,
            essence: Math.max(0, newState.resources.essence - 25),
            insight: newState.resources.insight + 5,
          };
          newState = adjustQuality(newState, 'combat_edge', 3);
          return { state: newState, log: '你研习残谱。精元折二十五，但失传剑诀的片段已铭刻于心，见闻长了五分。' };
        },
      },
      {
        text: '归还书架',
        effect: (state) => {
          let newState = setFlag(state, 'sword_pavilion_lost_technique_seen');
          newState.resources = { ...newState.resources, insight: newState.resources.insight + 2 };
          return { state: newState, log: '你将残谱放回原处。剑诀虽好，此刻还不是修习的时机。见闻长了二分。' };
        },
      },
    ],
  },
  // ─── 地点事件：荒庙深处 ──────────────────────────────────
  {
    id: 'deep_temple_whisper',
    text: '荒庙深处传来低沉的耳语。不是风声，是某种不属于人间的声音。',
    condition: (state) =>
      state.currentLocationId === 'deep_temple' &&
      !state.choices.flags['deep_temple_whisper_seen'],
    weight: () => 10,
    choices: [
      {
        text: '循声而去',
        effect: (state) => {
          let newState = setFlag(state, 'deep_temple_whisper_seen');
          newState.resources = {
            ...newState.resources,
            insight: newState.resources.insight + 4,
            dantoxin: newState.resources.dantoxin + 3,
          };
          return { state: newState, log: '你循声而去。耳语在耳边回荡，见闻长了四分，但阴冷之气侵入经脉，药滞增了三分。' };
        },
      },
      {
        text: '静坐抵抗',
        effect: (state) => {
          let newState = setFlag(state, 'deep_temple_whisper_seen');
          newState = adjustQuality(newState, 'quiet_cultivation', 2);
          return { state: newState, log: '你静坐不动，以心法抵御耳语。声音渐远，心境更加沉稳。' };
        },
      },
    ],
  },
  {
    id: 'deep_temple_shadow_encounter',
    text: '荒庙阴影中，一道暗影闪过。不是人，也不是兽，更像是某种灵体的投影。',
    condition: (state) =>
      state.currentLocationId === 'deep_temple' &&
      !state.choices.flags['deep_temple_shadow_encounter_seen'],
    weight: () => 8,
    choices: [
      {
        text: '神识追踪',
        effect: (state) => {
          let newState = setFlag(state, 'deep_temple_shadow_encounter_seen');
          newState.resources = {
            ...newState.resources,
            essence: Math.max(0, newState.resources.essence - 20),
            insight: newState.resources.insight + 4,
          };
          return { state: newState, log: '你以神识追踪暗影。精元折二十，见闻长了四分。暗影消失在更深处。' };
        },
      },
      {
        text: '退避',
        effect: (state) => {
          let newState = setFlag(state, 'deep_temple_shadow_encounter_seen');
          newState.resources = { ...newState.resources, essence: Math.max(0, newState.resources.essence - 5) };
          return { state: newState, log: '你退后几步。暗影没有追来，精元微微折损。' };
        },
      },
    ],
  },
  {
    id: 'deep_temple_hidden_scroll',
    text: '荒庙祭坛下方的暗格中，藏着一卷泛黄的古卷。卷上的文字似是上古祭祀之法。',
    condition: (state) =>
      state.currentLocationId === 'deep_temple' &&
      !state.choices.flags['deep_temple_hidden_scroll_seen'],
    weight: () => 10,
    choices: [
      {
        text: '研读古卷',
        effect: (state) => {
          let newState = setFlag(state, 'deep_temple_hidden_scroll_seen');
          newState.resources = {
            ...newState.resources,
            insight: newState.resources.insight + 5,
            dantoxin: newState.resources.dantoxin + 3,
          };
          newState = adjustQuality(newState, 'karmic_weight', 1);
          return { state: newState, log: '你研读古卷。上古祭祀之法入脑，见闻长了五分。但卷上的诅咒之力令药滞增了三分，因果也重了。' };
        },
      },
      {
        text: '仅做记录',
        effect: (state) => {
          let newState = setFlag(state, 'deep_temple_hidden_scroll_seen');
          newState.resources = { ...newState.resources, insight: newState.resources.insight + 3 };
          return { state: newState, log: '你记录古卷内容后放回原处。见闻长了三分，未与诅咒之力正面交锋。' };
        },
      },
    ],
  },
  // ─── 地点事件：山腹溶洞 ──────────────────────────────────
  {
    id: 'mountain_cave_collapse',
    text: '溶洞深处传来闷响。碎石从洞顶落下，似有坍塌之兆。',
    condition: (state) =>
      state.currentLocationId === 'mountain_cave' &&
      !state.choices.flags['mountain_cave_collapse_seen'],
    weight: () => 10,
    choices: [
      {
        text: '紧急加固',
        effect: (state) => {
          let newState = setFlag(state, 'mountain_cave_collapse_seen');
          newState.resources = {
            ...newState.resources,
            qi: Math.max(0, newState.resources.qi - 10),
            essence: Math.max(0, newState.resources.essence - 15),
          };
          return { state: newState, log: '你以灵力加固洞壁。真气折十缕，精元折十五。溶洞暂时稳定。' };
        },
      },
      {
        text: '迅速撤离',
        effect: (state) => {
          let newState = setFlag(state, 'mountain_cave_collapse_seen');
          newState.resources = { ...newState.resources, essence: Math.max(0, newState.resources.essence - 10) };
          return { state: newState, log: '你迅速撤离。精元折十，碎石在身后落下。至少人无碍。' };
        },
      },
    ],
  },
  {
    id: 'mountain_cave_crystal_vein',
    text: '溶洞壁上闪着幽蓝的光芒。一处灵晶矿脉就在眼前，灵气充沛。',
    condition: (state) =>
      state.currentLocationId === 'mountain_cave' &&
      !state.choices.flags['mountain_cave_crystal_vein_seen'],
    weight: () => 10,
    choices: [
      {
        text: '采集灵晶',
        effect: (state) => {
          let newState = setFlag(state, 'mountain_cave_crystal_vein_seen');
          newState.resources = {
            ...newState.resources,
            qi: newState.resources.qi + 10,
            essence: Math.max(0, newState.resources.essence - 20),
          };
          return { state: newState, log: '你采集灵晶。灵气入体，真气多了十缕，精元折二十。矿脉不可尽取。' };
        },
      },
      {
        text: '吸纳灵气',
        effect: (state) => {
          let newState = setFlag(state, 'mountain_cave_crystal_vein_seen');
          newState.resources = {
            ...newState.resources,
            qi: newState.resources.qi + 5,
            insight: newState.resources.insight + 2,
          };
          return { state: newState, log: '你吸纳矿脉灵气。真气多了五缕，见闻长了二分。灵晶仍在，来日可再取。' };
        },
      },
    ],
  },
  {
    id: 'mountain_cave_underground_river',
    text: '溶洞深处有暗河奔流。河水清冽，带着淡淡的灵气。',
    condition: (state) =>
      state.currentLocationId === 'mountain_cave' &&
      !state.choices.flags['mountain_cave_underground_river_seen'],
    weight: () => 8,
    choices: [
      {
        text: '沿河探索',
        effect: (state) => {
          let newState = setFlag(state, 'mountain_cave_underground_river_seen');
          newState.resources = {
            ...newState.resources,
            insight: newState.resources.insight + 3,
            essence: Math.max(0, newState.resources.essence - 10),
          };
          return { state: newState, log: '你沿暗河前行。见闻长了三分，精元折十。暗河尽头似有更深的洞穴。' };
        },
      },
      {
        text: '取水炼药',
        effect: (state) => {
          let newState = setFlag(state, 'mountain_cave_underground_river_seen');
          newState.resources = {
            ...newState.resources,
            herbs: newState.resources.herbs + 3,
            dantoxin: newState.resources.dantoxin + 1,
          };
          return { state: newState, log: '你取暗河水炼药。草药多了三株，丹毒微增一分。灵水入药，药性不同。' };
        },
      },
    ],
  },
  // ─── 地点事件：镇外茶肆 ──────────────────────────────────
  {
    id: 'tea_house_stranger',
    text: '茶肆角落坐着一个面容陌生的修士。他独自饮酒，目光偶尔扫向你。',
    condition: (state) =>
      state.currentLocationId === 'tea_house' &&
      !state.choices.flags['tea_house_stranger_seen'],
    weight: () => 10,
    choices: [
      {
        text: '搭话攀谈',
        effect: (state) => {
          let newState = setFlag(state, 'tea_house_stranger_seen');
          newState.resources = {
            ...newState.resources,
            coins: Math.max(0, newState.resources.coins - 3),
            insight: newState.resources.insight + 3,
          };
          return { state: newState, log: '你买了壶酒请他。三枚钱换来不少江湖见闻，见闻长了三分。' };
        },
      },
      {
        text: '保持警惕',
        effect: (state) => {
          let newState = setFlag(state, 'tea_house_stranger_seen');
          newState.resources = { ...newState.resources, insight: newState.resources.insight + 1 };
          return { state: newState, log: '你保持距离观察。陌生修士喝完酒便走，见闻长了一分。' };
        },
      },
    ],
  },
  {
    id: 'tea_house_gambler_quarrel',
    text: '茶肆中几个赌徒起了争执。推搡之间，一张赌桌被掀翻。',
    condition: (state) =>
      state.currentLocationId === 'tea_house' &&
      !state.choices.flags['tea_house_gambler_quarrel_seen'],
    weight: () => 8,
    choices: [
      {
        text: '劝解纠纷',
        effect: (state) => {
          let newState = setFlag(state, 'tea_house_gambler_quarrel_seen');
          newState.resources = { ...newState.resources, coins: Math.max(0, newState.resources.coins - 2), insight: newState.resources.insight + 2 };
          return { state: newState, log: '你出声劝解，花了两枚钱息事宁人。见闻长了二分。' };
        },
      },
      {
        text: '远离是非',
        effect: (state) => {
          let newState = setFlag(state, 'tea_house_gambler_quarrel_seen');
          return { state: newState, log: '你远离赌桌。争执与你无关。' };
        },
      },
    ],
  },
  {
    id: 'tea_house_merchant_tip',
    text: '一个行商凑过来低声说：坊市有一批灵药即将到货，价格比平常低三成。',
    condition: (state) =>
      state.currentLocationId === 'tea_house' &&
      !state.choices.flags['tea_house_merchant_tip_seen'],
    weight: () => 8,
    choices: [
      {
        text: '记下消息',
        effect: (state) => {
          let newState = setFlag(state, 'tea_house_merchant_tip_seen');
          newState.resources = { ...newState.resources, insight: newState.resources.insight + 2 };
          newState = setFlag(newState, 'heard_merchant_herb_tip');
          return { state: newState, log: '你记下了灵药到货的消息。见闻长了二分，坊市或有大机缘。' };
        },
      },
      {
        text: '不感兴趣',
        effect: (state) => {
          let newState = setFlag(state, 'tea_house_merchant_tip_seen');
          return { state: newState, log: '你对行商的消息不感兴趣。他耸耸肩，去找下一个听众。' };
        },
      },
    ],
  },
  // ─── 地点事件：妖兽林 ────────────────────────────────────
  {
    id: 'demonic_forest_beast_ambush',
    text: '林中忽然杀气涌动。一只妖兽从暗处扑来，獠牙闪着寒光。',
    condition: (state) =>
      state.currentLocationId === 'demonic_forest' &&
      !state.choices.flags['demonic_forest_beast_ambush_seen'],
    weight: () => 12,
    choices: [
      {
        text: '迎战',
        effect: (state) => {
          const result = resolveCombatEvent(
            state,
            'fight',
            { id: 'forest_beast', name: '林中妖兽', realm: Realm.FoundationEstablishment, power: 8 },
            () => 0.5
          );
          let newState = setFlag(result.state, 'demonic_forest_beast_ambush_seen');
          if (result.success) {
            newState.resources = { ...newState.resources, herbs: newState.resources.herbs + 2, insight: newState.resources.insight + 2 };
          } else {
            newState.resources = { ...newState.resources, wounds: newState.resources.wounds + 1 };
          }
          return { state: newState, log: result.log + (result.success ? ' 妖兽身上掉落两株药草，见闻长了二分。' : ' 你没能击退妖兽，伤添一处。') };
        },
      },
      {
        text: '闪避退走',
        effect: (state) => {
          let newState = setFlag(state, 'demonic_forest_beast_ambush_seen');
          newState.resources = { ...newState.resources, essence: Math.max(0, newState.resources.essence - 15) };
          return { state: newState, log: '你闪身退走。精元折十五，好在没有被咬中。' };
        },
      },
    ],
  },
  {
    id: 'demonic_forest_rare_herb',
    text: '妖兽林深处，一株散发幽光的灵药在腐木上生长。这是林中难得的灵物。',
    condition: (state) =>
      state.currentLocationId === 'demonic_forest' &&
      !state.choices.flags['demonic_forest_rare_herb_seen'],
    weight: () => 8,
    choices: [
      {
        text: '冒险采摘',
        effect: (state) => {
          let newState = setFlag(state, 'demonic_forest_rare_herb_seen');
          newState.resources = {
            ...newState.resources,
            herbs: newState.resources.herbs + 5,
            dantoxin: newState.resources.dantoxin + 2,
          };
          newState = adjustQuality(newState, 'alchemy_affinity', 2);
          return { state: newState, log: '你冒险采摘灵药。药草多了五株，但林中毒气令药滞增了两分。丹道理解更深了。' };
        },
      },
      {
        text: '只取一半',
        effect: (state) => {
          let newState = setFlag(state, 'demonic_forest_rare_herb_seen');
          newState.resources = {
            ...newState.resources,
            herbs: newState.resources.herbs + 2,
            insight: newState.resources.insight + 1,
          };
          newState = adjustQuality(newState, 'alchemy_affinity', 1);
          return { state: newState, log: '你只取一半灵药。药草多了两株，见闻长了一分。留一半给林中灵兽。' };
        },
      },
    ],
  },
  {
    id: 'demonic_forest_terrifying_roar',
    text: '林中深处传来震耳的咆哮。大地微颤，鸟兽四散。那是林中霸主的威慑。',
    condition: (state) =>
      state.currentLocationId === 'demonic_forest' &&
      !state.choices.flags['demonic_forest_terrifying_roar_seen'],
    weight: () => 8,
    choices: [
      {
        text: '原地不动',
        effect: (state) => {
          let newState = setFlag(state, 'demonic_forest_terrifying_roar_seen');
          newState = adjustQuality(newState, 'quiet_cultivation', 2);
          return { state: newState, log: '你原地不动。咆哮渐远，你的心却更加坚定。不以物惧，不以兽惊。' };
        },
      },
      {
        text: '撤离林中',
        effect: (state) => {
          let newState = setFlag(state, 'demonic_forest_terrifying_roar_seen');
          newState.resources = { ...newState.resources, essence: Math.max(0, newState.resources.essence - 10) };
          return { state: newState, log: '你撤离林中。精元折十，安全第一。' };
        },
      },
    ],
  },
  // ─── 地点事件：天柱崖 ────────────────────────────────────
  {
    id: 'celestial_cliff_wind_test',
    text: '崖上劲风如刀。天风呼啸，似乎要将你推下万丈深渊。',
    condition: (state) =>
      state.currentLocationId === 'celestial_cliff' &&
      !state.choices.flags['celestial_cliff_wind_test_seen'],
    weight: () => 10,
    choices: [
      {
        text: '迎风而立',
        effect: (state) => {
          let newState = setFlag(state, 'celestial_cliff_wind_test_seen');
          newState.resources = {
            ...newState.resources,
            qi: newState.resources.qi + 5,
            essence: Math.max(0, newState.resources.essence - 20),
            insight: newState.resources.insight + 3,
          };
          newState = adjustQuality(newState, 'combat_edge', 2);
          return { state: newState, log: '你迎风而立。天风刮过身体，真气多了五缕，精元折二十，见闻长了三分。身如磐石。' };
        },
      },
      {
        text: '退避崖洞',
        effect: (state) => {
          let newState = setFlag(state, 'celestial_cliff_wind_test_seen');
          newState.resources = { ...newState.resources, insight: newState.resources.insight + 1 };
          return { state: newState, log: '你退入崖壁洞穴。天风在外面肆虐，见闻长了一分。' };
        },
      },
    ],
  },
  {
    id: 'celestial_cliff_breakthrough_sign',
    text: '崖顶灵气极为浓郁。你感到突破的契机就在眼前，只需一点机缘。',
    condition: (state) =>
      state.currentLocationId === 'celestial_cliff' &&
      state.resources.qi >= 50 &&
      !state.choices.flags['celestial_cliff_breakthrough_sign_seen'],
    weight: () => 10,
    choices: [
      {
        text: '借灵气冲关',
        effect: (state) => {
          let newState = setFlag(state, 'celestial_cliff_breakthrough_sign_seen');
          newState.resources = {
            ...newState.resources,
            qi: newState.resources.qi + 10,
            essence: Math.max(0, newState.resources.essence - 30),
            insight: newState.resources.insight + 4,
          };
          return { state: newState, log: '你借崖顶灵气冲关。真气多了十缕，精元折三十，见闻长了四分。突破虽未至，但已更近一步。' };
        },
      },
      {
        text: '静待机缘',
        effect: (state) => {
          let newState = setFlag(state, 'celestial_cliff_breakthrough_sign_seen');
          newState.resources = { ...newState.resources, insight: newState.resources.insight + 2 };
          newState = adjustQuality(newState, 'quiet_cultivation', 1);
          return { state: newState, log: '你静待机缘。崖顶灵气环绕，见闻长了二分。不急。' };
        },
      },
    ],
  },
  {
    id: 'celestial_cliff_falling_danger',
    text: '脚下的岩石忽然碎裂！你身形一晃，差点坠下悬崖。',
    condition: (state) =>
      state.currentLocationId === 'celestial_cliff' &&
      !state.choices.flags['celestial_cliff_falling_danger_seen'],
    weight: () => 8,
    choices: [
      {
        text: '灵力悬浮',
        effect: (state) => {
          let newState = setFlag(state, 'celestial_cliff_falling_danger_seen');
          newState.resources = {
            ...newState.resources,
            qi: Math.max(0, newState.resources.qi - 15),
            insight: newState.resources.insight + 2,
          };
          return { state: newState, log: '你催动灵力悬浮。真气折十五缕，但稳住了身形。崖边危险，见闻长了二分。' };
        },
      },
      {
        text: '攀壁脱险',
        effect: (state) => {
          let newState = setFlag(state, 'celestial_cliff_falling_danger_seen');
          newState.resources = {
            ...newState.resources,
            wounds: newState.resources.wounds + 1,
            essence: Math.max(0, newState.resources.essence - 10),
          };
          return { state: newState, log: '你攀壁脱险。碎石划伤了手臂，伤添一处，精元折十。但人还在崖上。' };
        },
      },
    ],
  },
  // ─── 地点事件：宗门大殿 ──────────────────────────────────
  {
    id: 'sect_hall_announcement',
    text: '宗门大殿传来钟声。长老宣布了一则重要通告，门下弟子纷纷聚来。',
    condition: (state) =>
      state.currentLocationId === 'sect_hall' &&
      !state.choices.flags['sect_hall_announcement_seen'],
    weight: () => 10,
    choices: [
      {
        text: '仔细倾听',
        effect: (state) => {
          let newState = setFlag(state, 'sect_hall_announcement_seen');
          newState.resources = { ...newState.resources, insight: newState.resources.insight + 3 };
          newState = adjustQuality(newState, 'sect_trace', 1);
          return { state: newState, log: '你仔细倾听通告。宗门近期有大事，见闻长了三分，宗门痕迹深了一分。' };
        },
      },
      {
        text: '随众应付',
        effect: (state) => {
          let newState = setFlag(state, 'sect_hall_announcement_seen');
          newState.resources = { ...newState.resources, insight: newState.resources.insight + 1 };
          return { state: newState, log: '你随众站立，只听了个大概。见闻长了一分。' };
        },
      },
    ],
  },
  {
    id: 'sect_hall_discipline_summon',
    text: '大殿侧门走出一名执事。他点名唤你，似有训诫之意。',
    condition: (state) =>
      state.currentLocationId === 'sect_hall' &&
      !state.choices.flags['sect_hall_discipline_summon_seen'],
    weight: () => 8,
    choices: [
      {
        text: '恭敬领训',
        effect: (state) => {
          let newState = setFlag(state, 'sect_hall_discipline_summon_seen');
          newState.resources = { ...newState.resources, coins: Math.max(0, newState.resources.coins - 5) };
          newState = adjustQuality(newState, 'sect_discipline', 2);
          return { state: newState, log: '你恭敬领训，被罚了五枚钱。宗门规矩在你身上又深一层。' };
        },
      },
      {
        text: '据理力争',
        effect: (state) => {
          let newState = setFlag(state, 'sect_hall_discipline_summon_seen');
          newState = adjustQuality(newState, 'sect_discipline', -2);
          newState = adjustQuality(newState, 'sect_trace', -1);
          return { state: newState, log: '你据理力争。执事面色不悦，宗门规矩未减，你的名头却差了。' };
        },
      },
    ],
  },
  {
    id: 'sect_hall_reward_ceremony',
    text: '大殿中举行赏功仪式。有贡献的弟子依次上前领赏。',
    condition: (state) =>
      state.currentLocationId === 'sect_hall' &&
      !state.choices.flags['sect_hall_reward_ceremony_seen'] &&
      (state.choices.qualities['sect_contribution'] ?? 0) >= 3,
    weight: () => 10,
    choices: [
      {
        text: '上前领赏',
        effect: (state) => {
          let newState = setFlag(state, 'sect_hall_reward_ceremony_seen');
          newState.resources = {
            ...newState.resources,
            coins: newState.resources.coins + 10,
            herbs: newState.resources.herbs + 2,
          };
          newState = adjustQuality(newState, 'sect_contribution', 1);
          return { state: newState, log: '你上前领赏。十枚钱、两株药草入袋，宗门贡献又添了一分。' };
        },
      },
      {
        text: '谦让不受',
        effect: (state) => {
          let newState = setFlag(state, 'sect_hall_reward_ceremony_seen');
          newState = adjustQuality(newState, 'quiet_cultivation', 2);
          newState = adjustQuality(newState, 'sect_contribution', 1);
          return { state: newState, log: '你谦让不受。赏赐未取，但心境清宁，宗门贡献仍增了一分。' };
        },
      },
    ],
  },
  // ─── 地点事件：核心峰 ────────────────────────────────────
  {
    id: 'core_gate_technique_scroll',
    text: '核心峰藏经阁中，一本上乘功法静静躺在书架上。你感觉到它散发的灵力波动。',
    condition: (state) =>
      state.currentLocationId === 'core_gate' &&
      !state.choices.flags['core_gate_technique_scroll_seen'],
    weight: () => 10,
    choices: [
      {
        text: '参悟功法',
        effect: (state) => {
          let newState = setFlag(state, 'core_gate_technique_scroll_seen');
          newState.resources = {
            ...newState.resources,
            essence: Math.max(0, newState.resources.essence - 30),
            insight: newState.resources.insight + 5,
          };
          return { state: newState, log: '你参悟上乘功法。精元折三十，但功法精要已了然于胸，见闻长了五分。' };
        },
      },
      {
        text: '记下目录',
        effect: (state) => {
          let newState = setFlag(state, 'core_gate_technique_scroll_seen');
          newState.resources = { ...newState.resources, insight: newState.resources.insight + 2 };
          return { state: newState, log: '你记下功法目录。见闻长了二分，来日再来细读。' };
        },
      },
    ],
  },
  // ─── 地点事件：灵湖 ──────────────────────────────────────
  {
    id: 'spirit_lake_treasure',
    text: '灵湖深处隐隐有光芒闪烁。湖底似有宝物，灵气涌动不息。',
    condition: (state) =>
      state.currentLocationId === 'spirit_lake' &&
      !state.choices.flags['spirit_lake_treasure_seen'],
    weight: () => 8,
    choices: [
      {
        text: '潜入湖底',
        effect: (state) => {
          let newState = setFlag(state, 'spirit_lake_treasure_seen');
          newState.resources = {
            ...newState.resources,
            qi: newState.resources.qi + 8,
            essence: Math.max(0, newState.resources.essence - 25),
            insight: newState.resources.insight + 3,
          };
          return { state: newState, log: '你潜入湖底。灵气宝物入怀，真气多了八缕，精元折二十五，见闻长了三分。' };
        },
      },
      {
        text: '以灵识探测',
        effect: (state) => {
          let newState = setFlag(state, 'spirit_lake_treasure_seen');
          newState.resources = { ...newState.resources, insight: newState.resources.insight + 2 };
          return { state: newState, log: '你以灵识探测湖底。宝物轮廓隐约可见，见闻长了二分。潜水取宝尚需准备。' };
        },
      },
    ],
  },
  // ─── 地点事件：雷峰 ──────────────────────────────────────
  {
    id: 'thunder_peak_strike',
    text: '雷峰上空忽然落下一道细小的天雷。不是天劫，只是雷峰特有的雷击。',
    condition: (state) =>
      state.currentLocationId === 'thunder_peak' &&
      !state.choices.flags['thunder_peak_strike_seen'],
    weight: () => 10,
    choices: [
      {
        text: '引雷淬体',
        effect: (state) => {
          let newState = setFlag(state, 'thunder_peak_strike_seen');
          newState.resources = {
            ...newState.resources,
            qi: newState.resources.qi + 5,
            wounds: newState.resources.wounds + 1,
            essence: Math.max(0, newState.resources.essence - 15),
          };
          newState = adjustQuality(newState, 'combat_edge', 2);
          return { state: newState, log: '你引雷淬体。真气多了五缕，伤添一处，精元折十五。雷力入体，战斗直觉更敏锐。' };
        },
      },
      {
        text: '闪避雷击',
        effect: (state) => {
          let newState = setFlag(state, 'thunder_peak_strike_seen');
          newState.resources = { ...newState.resources, insight: newState.resources.insight + 2 };
          return { state: newState, log: '你闪避了雷击。雷力在身旁炸开，见闻长了二分。' };
        },
      },
    ],
  },
  {
    id: 'thunder_peak_insight',
    text: '雷峰之上，雷云翻涌。你在雷声中忽有所悟，似对天道之雷有了更深的理解。',
    condition: (state) =>
      state.currentLocationId === 'thunder_peak' &&
      !state.choices.flags['thunder_peak_insight_seen'],
    weight: () => 8,
    choices: [
      {
        text: '静坐悟雷',
        effect: (state) => {
          let newState = setFlag(state, 'thunder_peak_insight_seen');
          newState.resources = {
            ...newState.resources,
            essence: Math.max(0, newState.resources.essence - 20),
            insight: newState.resources.insight + 5,
          };
          return { state: newState, log: '你在雷声中静坐。精元折二十，但对天道之雷的感悟暴涨，见闻长了五分。' };
        },
      },
      {
        text: '记录感悟',
        effect: (state) => {
          let newState = setFlag(state, 'thunder_peak_insight_seen');
          newState.resources = { ...newState.resources, insight: newState.resources.insight + 3 };
          return { state: newState, log: '你将感悟记下。见闻长了三分，来日再参。' };
        },
      },
    ],
  },
  // ─── 地点事件：古战场 ────────────────────────────────────
  {
    id: 'ancient_battlefield_treasure',
    text: '古战场废墟下，一件残破的法器在泥土中露出半截。灵光虽弱，仍在。',
    condition: (state) =>
      state.currentLocationId === 'ancient_battlefield' &&
      !state.choices.flags['ancient_battlefield_treasure_seen'],
    weight: () => 8,
    choices: [
      {
        text: '挖掘法器',
        effect: (state) => {
          let newState = setFlag(state, 'ancient_battlefield_treasure_seen');
          newState.resources = {
            ...newState.resources,
            coins: newState.resources.coins + 15,
            insight: newState.resources.insight + 3,
          };
          return { state: newState, log: '你挖出法器。虽已残破，仍值十五枚钱，见闻长了三分。' };
        },
      },
      {
        text: '以灵识解析',
        effect: (state) => {
          let newState = setFlag(state, 'ancient_battlefield_treasure_seen');
          newState.resources = {
            ...newState.resources,
            essence: Math.max(0, newState.resources.essence - 15),
            insight: newState.resources.insight + 4,
          };
          return { state: newState, log: '你以灵识解析法器。精元折十五，但法器的炼制手法令你受益匪浅，见闻长了四分。' };
        },
      },
    ],
  },
  // ─── 地点事件：虚空裂隙 ──────────────────────────────────
  {
    id: 'void_rift_spatial_treasure',
    text: '虚空裂隙中飘出一枚散发异光的宝珠。空间之力在其内部涌动。',
    condition: (state) =>
      state.currentLocationId === 'void_rift' &&
      !state.choices.flags['void_rift_spatial_treasure_seen'],
    weight: () => 8,
    choices: [
      {
        text: '伸手取宝',
        effect: (state) => {
          let newState = setFlag(state, 'void_rift_spatial_treasure_seen');
          newState.resources = {
            ...newState.resources,
            qi: newState.resources.qi + 10,
            essence: Math.max(0, newState.resources.essence - 30),
            insight: newState.resources.insight + 4,
          };
          return { state: newState, log: '你伸手取宝。空间之力入体，真气多了十缕，精元折三十，见闻长了四分。' };
        },
      },
      {
        text: '远观不动',
        effect: (state) => {
          let newState = setFlag(state, 'void_rift_spatial_treasure_seen');
          newState.resources = { ...newState.resources, insight: newState.resources.insight + 2 };
          return { state: newState, log: '你远观宝珠。空间之力的运作方式令你有所悟，见闻长了二分。' };
        },
      },
    ],
  },
  // ─── 地点事件：天阁 ──────────────────────────────────────
  {
    id: 'celestial_pavilion_guardian',
    text: '天阁门口站着一尊石像守护者。你靠近时，石像的眼中闪过一道灵光。',
    condition: (state) =>
      state.currentLocationId === 'celestial_pavilion' &&
      !state.choices.flags['celestial_pavilion_guardian_seen'],
    weight: () => 8,
    choices: [
      {
        text: '以礼相待',
        effect: (state) => {
          let newState = setFlag(state, 'celestial_pavilion_guardian_seen');
          newState.resources = {
            ...newState.resources,
            insight: newState.resources.insight + 3,
            coins: Math.max(0, newState.resources.coins - 5),
          };
          return { state: newState, log: '你以礼相待石像。五枚钱作为供奉，守护者放行，见闻长了三分。' };
        },
      },
      {
        text: '强行闯入',
        effect: (state) => {
          let newState = setFlag(state, 'celestial_pavilion_guardian_seen');
          newState.resources = {
            ...newState.resources,
            wounds: newState.resources.wounds + 1,
            qi: Math.max(0, newState.resources.qi - 10),
          };
          return { state: newState, log: '你强行闯入。石像出手阻拦，伤添一处，真气折十缕。勉强通过。' };
        },
      },
    ],
  },
  // ─── 地点事件：灵山 ──────────────────────────────────────
  {
    id: 'spirit_mountain_test',
    text: '灵山山道上出现一道幻阵。心志不坚者会被幻境迷惑，无法前行。',
    condition: (state) =>
      state.currentLocationId === 'spirit_mountain' &&
      !state.choices.flags['spirit_mountain_test_seen'],
    weight: () => 8,
    choices: [
      {
        text: '以道心破阵',
        effect: (state) => {
          let newState = setFlag(state, 'spirit_mountain_test_seen');
          newState.resources = {
            ...newState.resources,
            essence: Math.max(0, newState.resources.essence - 20),
            insight: newState.resources.insight + 4,
          };
          newState = adjustQuality(newState, 'quiet_cultivation', 2);
          return { state: newState, log: '你以道心破阵。精元折二十，幻阵碎裂，见闻长了四分。道心更坚。' };
        },
      },
      {
        text: '绕道而行',
        effect: (state) => {
          let newState = setFlag(state, 'spirit_mountain_test_seen');
          newState.resources = { ...newState.resources, essence: Math.max(0, newState.resources.essence - 10) };
          return { state: newState, log: '你绕道而行。精元折十，没有直面幻阵，但路也走成了。' };
        },
      },
    ],
  },
  // ─── 地点事件：渡劫台 ────────────────────────────────────
  {
    id: 'tribulation_platform_thunder',
    text: '渡劫台上雷云密布。即便不是渡劫之时，雷台上仍残留着天劫的余威。',
    condition: (state) =>
      state.currentLocationId === 'tribulation_platform' &&
      !state.choices.flags['tribulation_platform_thunder_seen'],
    weight: () => 10,
    choices: [
      {
        text: '承受余雷',
        effect: (state) => {
          let newState = setFlag(state, 'tribulation_platform_thunder_seen');
          newState.resources = {
            ...newState.resources,
            qi: newState.resources.qi + 8,
            wounds: newState.resources.wounds + 1,
            essence: Math.max(0, newState.resources.essence - 20),
          };
          return { state: newState, log: '你承受余雷。真气多了八缕，伤添一处，精元折二十。天劫余威锤炼了你的肉身。' };
        },
      },
      {
        text: '观摩雷纹',
        effect: (state) => {
          let newState = setFlag(state, 'tribulation_platform_thunder_seen');
          newState.resources = {
            ...newState.resources,
            insight: newState.resources.insight + 4,
          };
          return { state: newState, log: '你观摩渡劫台上的雷纹。天劫的规则隐于其中，见闻长了四分。' };
        },
      },
    ],
  },
  // ─── 地点事件：仙园 ──────────────────────────────────────
  {
    id: 'immortal_garden_spirit_beast',
    text: '仙园花丛中，一只通体发光的小兽正在采食灵花的花蜜。它看到你，并不畏惧。',
    condition: (state) =>
      state.currentLocationId === 'immortal_garden' &&
      !state.choices.flags['immortal_garden_spirit_beast_seen'],
    weight: () => 8,
    choices: [
      {
        text: '喂食灵花',
        effect: (state) => {
          let newState = setFlag(state, 'immortal_garden_spirit_beast_seen');
          newState.resources = {
            ...newState.resources,
            herbs: Math.max(0, newState.resources.herbs - 1),
            insight: newState.resources.insight + 3,
          };
          return { state: newState, log: '你摘了一朵灵花喂它。小兽吃完后蹭了蹭你的手，见闻长了三分。' };
        },
      },
      {
        text: '静静观察',
        effect: (state) => {
          let newState = setFlag(state, 'immortal_garden_spirit_beast_seen');
          newState.resources = { ...newState.resources, insight: newState.resources.insight + 2 };
          return { state: newState, log: '你静静观察小兽。它灵性的举动令你若有所悟，见闻长了二分。' };
        },
      },
    ],
  },
  // ─── 地点事件：渡口 ──────────────────────────────────────
  {
    id: 'ferry_tax',
    text: '渡口摆渡人伸手要钱。今日水路不太平，价钱涨了。',
    condition: (state) =>
      state.currentLocationId === 'ferry_crossing' &&
      !state.choices.flags['ferry_tax_seen'],
    weight: () => 10,
    choices: [
      {
        text: '交钱渡河（五钱）',
        effect: (state) => {
          let newState = setFlag(state, 'ferry_tax_seen');
          if (newState.resources.coins < 5) {
            return { state: newState, log: '钱不够。摆渡人摇头，你只好在岸边等候。' };
          }
          newState.resources = { ...newState.resources, coins: newState.resources.coins - 5, insight: newState.resources.insight + 1 };
          return { state: newState, log: '你交了五枚钱。船至对岸，见闻长了一分。水路辛苦。' };
        },
      },
      {
        text: '步行绕路',
        effect: (state) => {
          let newState = setFlag(state, 'ferry_tax_seen');
          newState.resources = { ...newState.resources, essence: Math.max(0, newState.resources.essence - 15) };
          return { state: newState, log: '你步行绕路。精元折十五，但省下了钱。路远不怕。' };
        },
      },
    ],
  },
  // Secret realm discovery events
  {
    id: 'discovered_spirit_cave',
    text: '你在山间感应到一处灵气涌动的洞口。灵气从裂缝中溢出，似乎通向一方秘境。',
    condition: (state) =>
      state.realm === Realm.FoundationEstablishment &&
      !state.choices.flags['discovered_spirit_cave'],
    weight: () => 3,
    choices: [
      {
        text: '进入查看',
        effect: (state) => {
          let newState = discoverRealm(state, 'spirit_cave');
          newState = { ...newState, choices: { ...newState.choices, flags: { ...newState.choices.flags, discovered_spirit_cave: true } } };
          newState = { ...newState, resources: { ...newState.resources, insight: newState.resources.insight + 2 } };
          return { state: newState, log: '灵气扑面而来，你在洞壁上发现了古老刻痕。一方秘境已为你敞开。' };
        },
      },
      {
        text: '先记下位置',
        effect: (state) => {
          const newState = { ...state, choices: { ...state.choices, flags: { ...state.choices.flags, discovered_spirit_cave: true } }, resources: { ...state.resources, insight: state.resources.insight + 1 } };
          return { state: newState, log: '你记下了洞口方位，待日后再来探寻。' };
        },
      },
    ],
  },
  {
    id: 'discovered_ancient_tomb',
    text: '古战场深处，你发现一座封印未消的古墓。墓道石壁上刻着远古文字。',
    condition: (state) =>
      state.realm === Realm.GoldenCore &&
      !state.choices.flags['discovered_ancient_tomb'],
    weight: () => 2,
    choices: [
      {
        text: '进入探墓',
        effect: (state) => {
          let newState = discoverRealm(state, 'ancient_tomb');
          newState = { ...newState, choices: { ...newState.choices, flags: { ...newState.choices.flags, discovered_ancient_tomb: true } } };
          newState = { ...newState, resources: { ...newState.resources, insight: newState.resources.insight + 3 } };
          return { state: newState, log: '古墓深处灵气弥漫，阵法残迹犹存。一方秘境已为你敞开。' };
        },
      },
      {
        text: '先记下位置',
        effect: (state) => {
          const newState = { ...state, choices: { ...state.choices, flags: { ...state.choices.flags, discovered_ancient_tomb: true } }, resources: { ...state.resources, insight: state.resources.insight + 1 } };
          return { state: newState, log: '你记下了古墓方位，待日后再来探寻。' };
        },
      },
    ],
  },
  {
    id: 'discovered_void_passage',
    text: '虚空微颤，一道裂隙在你面前缓缓展开。另一侧似有灵气涌动。',
    condition: (state) =>
      state.realm === Realm.NascentSoul &&
      !state.choices.flags['discovered_void_passage'],
    weight: () => 2,
    choices: [
      {
        text: '踏入裂隙',
        effect: (state) => {
          let newState = discoverRealm(state, 'void_passage');
          newState = { ...newState, choices: { ...newState.choices, flags: { ...newState.choices.flags, discovered_void_passage: true } } };
          newState = { ...newState, resources: { ...newState.resources, insight: newState.resources.insight + 5 } };
          return { state: newState, log: '裂隙之后是一片混沌虚空，灵气如潮水般涌来。一方秘境已为你敞开。' };
        },
      },
      {
        text: '先记下位置',
        effect: (state) => {
          const newState = { ...state, choices: { ...state.choices, flags: { ...state.choices.flags, discovered_void_passage: true } }, resources: { ...state.resources, insight: state.resources.insight + 2 } };
          return { state: newState, log: '你记下了裂隙方位，待日后再来探寻。' };
        },
      },
    ],
  },
];
