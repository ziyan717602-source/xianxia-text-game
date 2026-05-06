import { GameState, GameEvent } from '../game/types';

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
    id: 'canjuan_heat',
    text: '你偶然翻阅的残卷突然微微发热，字迹浮现。这似乎是一种基础的吐纳之法。',
    condition: (state) => !state.choices.flags['unlocked_tuna'] && state.resources.knowledge >= 2,
    weight: () => 100, // 只要满足条件就很容易触发
    choices: [
      {
        text: '仔细阅读',
        effect: (state) => {
          const newState = { ...state };
          newState.resources = { ...state.resources, qi: state.resources.qi + 10 };
          return { state: newState, log: '你感受到一丝灵气入体。' };
        }
      }
    ]
  },
  {
    id: 'wounded_cultivator',
    text: '山路两旁药香异常，你闻到一丝血腥味，发现一名受伤的散修倒在草丛中。',
    condition: (state) => state.currentLocationId === 'mountain_path' && !state.choices.flags['met_wounded_cultivator'],
    weight: () => 20,
    choices: [
      {
        text: '施以援手 (消耗 5 药)',
        effect: (state) => {
          if (state.resources.herbs < 5) {
            return { state, log: '你身上没有足够的草药，散修叹息一声，拖着残躯离开了。' };
          }
          const newState = { ...state };
          newState.resources = { ...state.resources, herbs: state.resources.herbs - 5 };
          newState.choices = { ...state.choices, flags: { ...state.choices.flags, 'met_wounded_cultivator': true } };
          // TODO: add relationship
          return { state: newState, log: '你用草药为其止血。散修深深看了你一眼，留下一句“日后必有厚报”，便匆匆离去。' };
        }
      },
      {
        text: '冷眼旁观',
        effect: (state) => {
          const newState = { ...state };
          newState.choices = { ...state.choices, flags: { ...state.choices.flags, 'met_wounded_cultivator': true } };
          return { state: newState, log: '你选择冷眼旁观。散修最终自行离去，眼神中带着警惕。' };
        }
      },
      {
        text: '搜刮财物',
        effect: (state) => {
          const newState = { ...state };
          newState.resources = { ...state.resources, coins: state.resources.coins + 20 };
          newState.choices = { ...state.choices, flags: { ...state.choices.flags, 'met_wounded_cultivator': true, 'robbed_cultivator': true } };
          return { state: newState, log: '你趁人之危，搜刮了散修的钱袋。这笔因果算是结下了。' };
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
          newState.resources = { ...state.resources, knowledge: state.resources.knowledge + 2 };
          newState.choices = { ...state.choices, flags: { ...state.choices.flags, 'heard_rumor_1': true } };
          return { state: newState, log: '你听闻了些许修行界轶事，见闻有所增长。' };
        }
      }
    ]
  }
];
