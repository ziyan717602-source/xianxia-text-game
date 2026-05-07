import { ACTIONS } from '../content/actions';
import { LOCATIONS } from '../content/locations';
import { GameState, GameTime, WorldState } from './types';

export interface SolarTerm {
  id: string;
  name: string;
  note: string;
}

export const SOLAR_TERM_DAYS = 15;
export const SUMMARY_INTERVAL_TICKS = 100;
const WORLD_LOG_LIMIT = 12;

export const SOLAR_TERMS: SolarTerm[] = [
  { id: 'lichun', name: '立春', note: '山路解冻，药芽初生。' },
  { id: 'yushui', name: '雨水', note: '雨后泥深，草根含水。' },
  { id: 'jingzhe', name: '惊蛰', note: '虫兽动，山路多响。' },
  { id: 'chunfen', name: '春分', note: '昼夜相半，气息较稳。' },
  { id: 'qingming', name: '清明', note: '旧坟生草，废观少人。' },
  { id: 'guyu', name: '谷雨', note: '草药价低，山中药香重。' },
  { id: 'lixia', name: '立夏', note: '火气渐盛，炉边更燥。' },
  { id: 'xiaoman', name: '小满', note: '坊市货多，药圃有讯。' },
  { id: 'mangzhong', name: '芒种', note: '杂务渐密，日课如常。' },
  { id: 'xiazhi', name: '夏至', note: '日长火盛，躁气易起。' },
  { id: 'xiaoshu', name: '小暑', note: '暑气入屋，疗伤费力。' },
  { id: 'dashu', name: '大暑', note: '闭关不易，坊市清凉丹贵。' },
  { id: 'liqiu', name: '立秋', note: '金气初动，巡山者多。' },
  { id: 'chushu', name: '处暑', note: '暑退路干，远行消息多。' },
  { id: 'bailu', name: '白露', note: '夜露重，溪谷药材显形。' },
  { id: 'qiufen', name: '秋分', note: '坊市清账，旧债浮上来。' },
  { id: 'hanlu', name: '寒露', note: '山路客少，寒意入骨。' },
  { id: 'shuangjiang', name: '霜降', note: '草木挂霜，储药者多。' },
  { id: 'lidong', name: '立冬', note: '水气渐藏，闭门者众。' },
  { id: 'xiaoxue', name: '小雪', note: '山行渐少，居处日课稳定。' },
  { id: 'daxue', name: '大雪', note: '雪压山路，外出费力。' },
  { id: 'dongzhi', name: '冬至', note: '夜长至极，炉灰微白。' },
  { id: 'xiaohan', name: '小寒', note: '旧疾易醒，寿元之感稍近。' },
  { id: 'dahan', name: '大寒', note: '年终将近，坊市渐收。' },
];

export function getSolarTerm(time: GameTime): SolarTerm {
  const index = Math.min(SOLAR_TERMS.length - 1, Math.floor((time.day - 1) / SOLAR_TERM_DAYS));
  return SOLAR_TERMS[index];
}

export function getSolarTermKey(time: GameTime): string {
  return `${time.year}:${getSolarTerm(time).id}`;
}

function appendWorldLogs(world: WorldState, logsToAdd: string[]): WorldState {
  if (logsToAdd.length === 0) return world;

  return {
    ...world,
    logs: [...world.logs, ...logsToAdd].slice(-WORLD_LOG_LIMIT),
  };
}

export function createInitialWorldState(time: GameTime): WorldState {
  const term = getSolarTerm(time);

  return {
    recentActions: {},
    logs: [`${term.name}。${term.note}`],
    lastSummaryTick: time.tick,
    lastSolarTermKey: getSolarTermKey(time),
  };
}

export function recordActionInWorld(state: GameState, actionId: string): GameState {
  return {
    ...state,
    world: {
      ...state.world,
      recentActions: {
        ...state.world.recentActions,
        [actionId]: (state.world.recentActions[actionId] ?? 0) + 1,
      },
    },
  };
}

function formatActionSummary(recentActions: Record<string, number>): string {
  const entries = Object.entries(recentActions)
    .filter(([, count]) => count > 0)
    .map(([actionId, count]) => `${ACTIONS[actionId]?.name ?? actionId}${count}次`);

  if (entries.length === 0) {
    return '近十日：无大事。';
  }

  return `近十日：${entries.join('，')}。`;
}

export function getRecentSummary(state: GameState): string[] {
  const recentActions = state.world?.recentActions ?? {};
  const currentLocation = LOCATIONS[state.currentLocationId]?.name ?? '未知之地';
  const term = getSolarTerm(state.time).name;
  const woundedCultivator = state.relationships.wounded_cultivator;
  const relationshipLine = woundedCultivator
    ? `受伤散修：人情${woundedCultivator.favors}，仇怨${woundedCultivator.grudges}。`
    : '旧识：暂无。';

  return [
    `${term}，所在：${currentLocation}。`,
    formatActionSummary(recentActions),
    `真气${Math.floor(state.resources.qi)}，草药${Math.floor(state.resources.herbs)}，钱币${Math.floor(state.resources.coins)}。`,
    relationshipLine,
  ];
}

function createSummaryLog(state: GameState): string {
  const [termLine, actionLine, resourceLine, relationshipLine] = getRecentSummary(state);
  return `${termLine} ${actionLine} ${resourceLine} ${relationshipLine}`;
}

export function advanceWorld(next: GameState): GameState {
  let world = next.world ?? createInitialWorldState(next.time);
  const logsToAdd: string[] = [];
  const nextSolarTermKey = getSolarTermKey(next.time);

  if (world.lastSolarTermKey !== nextSolarTermKey) {
    const term = getSolarTerm(next.time);
    logsToAdd.push(`${term.name}。${term.note}`);
    world = {
      ...world,
      lastSolarTermKey: nextSolarTermKey,
    };
  }

  if (next.time.tick - world.lastSummaryTick >= SUMMARY_INTERVAL_TICKS) {
    logsToAdd.push(createSummaryLog(next));
    world = {
      ...world,
      recentActions: {},
      lastSummaryTick: next.time.tick,
    };
  }

  const nextWorld = appendWorldLogs(world, logsToAdd);

  if (nextWorld === next.world) return next;

  return {
    ...next,
    world: nextWorld,
  };
}
