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
  NascentSoul = 'NascentSoul', // 元婴
  SpiritTransformation = 'SpiritTransformation', // 化神
  Integration = 'Integration',                      // 合体
  Mahayana = 'Mahayana',                            // 大乘
  Tribulation = 'Tribulation',                      // 渡劫
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
  qiPills: number;   // 小聚气丸
  stabilizingPowders: number; // 稳息散
  cleansingPills: number; // 清躁丸
  meridianCleansingPills: number; // 通脉丸
  foundationStrengtheningPills: number; // 固基丹
  spiritGatheringPills: number; // 聚灵丸
  warmFurnacePills: number; // 暖炉丹
  nightSittingPills: number; // 夜坐丸
  cloudGatheringPills: number; // 聚云丸
  ironBodyPills: number; // 铁身丹
  demonBanePills: number; // 驱魔丹
  foundationExplosionPills: number; // 破基丹
  spiritVeinPills: number; // 通灵丸
  shadowEscapePills: number; // 影遁丸
  longevityPills: number; // 延寿丹
  fireFurnacePills: number; // 火炉丹
  nineTurnFoundationPills: number; // 重炉筑基丹
  buddhaHeartPills: number; // 定神丸
  goldenCorePills: number;        // 凝丹丸
  nascentSoulPills: number;       // 培婴丹
  spiritTransformPills: number;   // 化神丹
  integrationPills: number;       // 合体丹
  mahayanaPills: number;          // 大乘丹
  tribulationPills: number;       // 渡劫丹
  heavenlyTribulationPills: number; // 天劫护体丹
  coins: number;     // 钱 (银两)
  insight: number; // 见闻
  dantoxin: number;  // 丹毒
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
 * 修行账本
 */
export interface CultivationState {
  rootKnown: boolean;
  latentRoot: SpiritualRoot;
  phaseAffinities: Record<Element, number>;
  dominantElement: Element;
  knownTechniqueIds: string[];
  activeTechniqueId: string;
}

/**
 * 炼丹账本
 */
export interface AlchemyState {
  knownRecipeIds: string[];
  brewedRecipeCounts: Record<string, number>;
  consumedPillCounts: Record<string, number>;
}

/**
 * 突破账本
 */
export interface BreakthroughState {
  preparation: Record<string, number>;
  attempts: Record<string, number>;
  failures: Record<string, number>;
  successes: Record<string, number>;
  lastTargetId: string | null;
}

/**
 * 道途账本 — 行为形成道途
 */
export interface DaoPathState {
  currentPath: string | null;  // null until threshold is met
  pathAffinity: Record<string, number>;  // accumulated affinity scores
  pathRevealedAtTick: number | null;  // when path was first revealed
}

/**
 * 因果账本
 */
export interface KarmaState {
  karmicWeight: number;  // total accumulated karmic burden
  karmicEvents: string[];  // ids of karma-triggering events that have fired
}

/**
 * 心魔账本
 */
export interface InnerDemonState {
  activeDemon: string | null;  // currently active inner demon
  demonProgress: number;  // 0-100, triggers at 100
  suppressedDemons: string[];  // demons that have been confronted
}

/**
 * 宗门账本 (F4)
 */
export interface SectState {
  rank: 'none' | 'outer' | 'inner' | 'core' | 'elder';
  contribution: number;
  discipline: number;
  tasksCompleted: number;
  currentTask: string | null;
  taskDeadline: number;
  seniorRelationship: Record<string, 'neutral' | 'favorable' | 'strained'>;
}

/**
 * 洞府账本 (F5)
 */
export interface DwellingState {
  level: number;            // 0=no dwelling, 1=简陋洞府, 2=灵气洞府, 3=阵法洞府
  formationLevel: number;   // 0=none, 1=聚灵阵, 2=护法阵, 3=洞天阵
  autoQiPerDay: number;
  formationBonus: number;   // breakthrough success bonus
  upgradeCost: Partial<Resources>;
}

/**
 * 弟子/杂役 (F7)
 */
export interface Follower {
  id: string;
  name: string;
  role: 'servant' | 'disciple' | 'guard';
  loyalty: number;
  skill: number;
  taskAssignment: string | null;
}

/**
 * 弟子/杂役账本 (F7)
 */
export interface FollowerState {
  followers: Record<string, Follower>;
  maxFollowers: number;
}

/**
 * 秘境探索账本 (F8)
 */
export interface SecretRealmState {
  discoveredRealms: string[];       // ids of discovered realms
  activeExploration: string | null;  // currently exploring realm
  explorationProgress: number;       // 0-100, completes at 100
  completedRealms: string[];         // fully explored
  lootCollected: Record<string, number>;  // loot tracking
}

/**
 * 飞升账本 (F9)
 */
export interface AscensionState {
  ascended: boolean;
  ascensionCount: number;                // how many times ascended
  ascensionBonuses: Record<string, number>;  // permanent bonuses per ascension
  ascensionChoice: string | null;        // 'ascend' | 'remain' | 'transcend' | 'dissipate' | 'pending'
  finalScore: number | null;
  finalSummary: Record<string, number | string>;  // stats at ascension
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
    forbiddenFlags?: string[];
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
  cultivation: CultivationState;
  alchemy: AlchemyState;
  breakthrough: BreakthroughState;
  daoPath: DaoPathState;
  karma: KarmaState;
  innerDemon: InnerDemonState;
  sect: SectState;
  dwelling: DwellingState;
  followers: FollowerState;
  secretRealm: SecretRealmState;
  ascension: AscensionState;
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
