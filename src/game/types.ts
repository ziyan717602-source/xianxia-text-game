/**
 * 基础修仙设定枚举
 */

export enum Element {
  Metal = 'Metal',
  Wood = 'Wood',
  Water = 'Water',
  Fire = 'Fire',
  Earth = 'Earth'
}

export enum SpiritualRoot {
  Mortal = 'Mortal',
  FiveElements = 'FiveElements',
  FourElements = 'FourElements',
  ThreeElements = 'ThreeElements',
  TwoElements = 'TwoElements',
  Heavenly = 'Heavenly',
  Mutated = 'Mutated'
}

export enum Realm {
  Mortal = 'Mortal',         // 凡人
  QiCondensation = 'QiCondensation', // 炼气
  FoundationEstablishment = 'FoundationEstablishment', // 筑基
  GoldenCore = 'GoldenCore', // 金丹
  NascentSoul = 'NascentSoul' // 元婴
}

export enum Season {
  Spring = 'Spring',
  Summer = 'Summer',
  Autumn = 'Autumn',
  Winter = 'Winter'
}

/**
 * 资源定义
 */
export interface Resources {
  qi: number;        // 气 (修为/灵气)
  essence: number;   // 精元
  herbs: number;     // 药
  coins: number;     // 钱 (银两)
  insight: number; // 见闻
  lifespan: number;  // 寿元 (剩余可用时间/tick)
  wounds: number;    // 伤
}

/**
 * 时间模型
 */
export interface GameTime {
  tick: number; // 游戏总 tick 数
  year: number;
  season: Season;
  day: number;
}

/**
 * 地点模型
 */
export interface Location {
  id: string;
  name: string;
  availableActions: string[];
  eventWeights: Record<string, number>;
  qiDensity: number;
  danger: number;
  priceModifier: number;
  seasonalModifiers?: Record<Season, number>;
}

/**
 * 关系账本条目
 */
export type RelationshipState = 'Alive' | 'Departed' | 'Deceased';

export interface Relationship {
  id: string;
  identity: string;
  tags: string[];
  lastInteractionTick: number;
  debts: number;
  favors: number;
  grudges: number;
  state: RelationshipState;
}

/**
 * 玩家状态与选择记录
 */
export interface ChoiceState {
  flags: Record<string, boolean>; // 一次性事实，如 "seen_merchant"
  tags: Record<string, string>;   // 状态标签，如 "sect_status": "outer_disciple"
  qualities: Record<string, number>; // 倾向值，如 "alchemy_affinity": 5
}

/**
 * 世界账本
 */
export interface WorldState {
  recentActions: Record<string, number>;
  logs: string[];
  lastSummaryTick: number;
  lastSolarTermKey: string;
}

/**
 * 行动定义 (静态配置)
 */
export interface Action {
  id: string;
  name: string;
  cost: Partial<Resources>;
  output: Partial<Resources>;
  cooldown: number;
  riskProbability: number;
  conditions: {
    minResources?: Partial<Resources>;
    requiredFlags?: string[];
    requiredLocation?: string;
    requiredRealm?: Realm;
  };
}

/**
 * 事件定义 (静态配置)
 */
export interface GameEvent {
  id: string;
  text: string;
  weight: number;
  conditions: {
    minResources?: Partial<Resources>;
    requiredFlags?: string[];
    requiredLocation?: string;
    requiredRealm?: Realm;
    requiredSeason?: Season;
  };
  effects: {
    resources?: Partial<Resources>;
    setFlags?: Record<string, boolean>;
    relationshipChanges?: Record<string, Partial<Relationship>>;
  };
}

/**
 * 核心游戏状态 (用于存档和游玩)
 */
export interface GameState {
  resources: Resources;
  realm: Realm;
  realmLayer: number;
  spiritualRoot: SpiritualRoot;
  time: GameTime;
  currentLocationId: string;
  unlockedActions: string[];
  relationships: Record<string, Relationship>;
  choices: ChoiceState;
  world: WorldState;
  activeEventId: string | null;
  seed: number;
}

/**
 * 存档数据包装
 */
export interface SaveData {
  version: number;
  state: GameState;
  createdAt: number;
  updatedAt: number;
  seed: number;
}
