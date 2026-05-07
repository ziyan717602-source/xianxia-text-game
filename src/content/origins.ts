import { Resources } from '../game/types';

export type OriginId =
  | 'mountain_dweller'
  | 'village_scholar'
  | 'market_helper'
  | 'outer_child'
  | 'wandering_roots'
  | 'legacy_path';

export interface OriginOption {
  id: OriginId;
  name: string;
  summary: string;
  description: string;
  startingLocationId: string;
  resources: Partial<Resources>;
  unlockedActions: string[];
  flags: Record<string, boolean>;
  tags: Record<string, string>;
  qualities: Record<string, number>;
  log: string;
  selectable: boolean;
}

export const LEGACY_ORIGIN_ID: OriginId = 'legacy_path';

export const ORIGINS: Record<OriginId, OriginOption> = {
  mountain_dweller: {
    id: 'mountain_dweller',
    name: '山居采药人',
    summary: '识得几味草药，常走山路。',
    description: '早接触草药和山路事件，丹道倾向略深。',
    startingLocationId: 'mountain_path',
    resources: { herbs: 2 },
    unlockedActions: ['kuzuo', 'caiyao'],
    flags: { origin_mountain_dweller: true },
    tags: { origin: 'mountain_dweller' },
    qualities: { alchemy_affinity: 2 },
    log: '某年春，你照旧在山路采药。石缝生芽，风声很轻。',
    selectable: true,
  },
  village_scholar: {
    id: 'village_scholar',
    name: '乡塾读书人',
    summary: '识字，见过残卷旧注。',
    description: '早期神识较稳，更容易理解玉简和规矩。',
    startingLocationId: 'home',
    resources: { insight: 1, coins: 2 },
    unlockedActions: ['kuzuo'],
    flags: { origin_village_scholar: true, origin_literate: true },
    tags: { origin: 'village_scholar' },
    qualities: { quiet_cultivation: 1 },
    log: '某年春，乡塾散学。你把一卷旧书带回檐下。',
    selectable: true,
  },
  market_helper: {
    id: 'market_helper',
    name: '坊市杂役',
    summary: '手里有些钱，耳边多传闻。',
    description: '可在坊市听闻和小买卖，较早牵连价格与人情。',
    startingLocationId: 'market',
    resources: { coins: 8 },
    unlockedActions: ['kuzuo', 'trade', 'gossip'],
    flags: { origin_market_helper: true },
    tags: { origin: 'market_helper' },
    qualities: { market_ties: 2 },
    log: '某年春，坊市照开。你替人搬完货，袖中有几枚钱。',
    selectable: true,
  },
  outer_child: {
    id: 'outer_child',
    name: '外门童子',
    summary: '名册边缘有你的名字。',
    description: '早接触外门杂务和规矩，但宗门也会记录你。',
    startingLocationId: 'outer_gate',
    resources: { insight: 1, coins: 2 },
    unlockedActions: ['kuzuo', 'sect_chore', 'listen_lesson'],
    flags: { origin_outer_child: true },
    tags: { origin: 'outer_child', sect_trace: 'outer_registered' },
    qualities: { sect_trace: 2 },
    log: '某年春，外门点名。你站在末尾，听人念完规矩。',
    selectable: true,
  },
  wandering_roots: {
    id: 'wandering_roots',
    name: '游方散人',
    summary: '无定居处，路上消息杂。',
    description: '早接触巡山风险和路途见闻，事件波动较大。',
    startingLocationId: 'mountain_path',
    resources: { insight: 1, coins: 3 },
    unlockedActions: ['kuzuo', 'xunshan'],
    flags: { origin_wandering_roots: true },
    tags: { origin: 'wandering_roots' },
    qualities: { combat_edge: 1, market_ties: 1 },
    log: '某年春，你行至山路。前后无人，远处有坊市钟声。',
    selectable: true,
  },
  legacy_path: {
    id: 'legacy_path',
    name: '旧途',
    summary: '旧存档延续，不重选出身。',
    description: '用于兼容早期存档，不在新游戏中显示。',
    startingLocationId: 'home',
    resources: {},
    unlockedActions: [],
    flags: { origin_legacy_path: true },
    tags: { origin: 'legacy_path' },
    qualities: {},
    log: '旧途未改。',
    selectable: false,
  },
};

export const SELECTABLE_ORIGINS = Object.values(ORIGINS).filter((origin) => origin.selectable);
