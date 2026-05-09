import { ActiveEvent, Season, Realm, GameState, LOCATIONS, setFlag, adjustQuality, removeTag, setTag, resolveCombatEvent, touchRelationship, recordWoundedCultivator, recordMarketKeeper, recordOuterGateClerk, recordFoundationGuardian, realmAtLeast, advanceSectRank, completeTask, leaveSect, setCurrentTask, registerOuterDisciple, upgradeDwelling, installFormation, canUpgradeDwelling, canInstallFormation, getDwellingUpgradeCost, getFormationInstallCost, recruitFollower, assignFollowerTask, collectFollowerIncome, canRecruitFollower, discoverRealm, shouldShowAscensionThreshold, executeAscension, getDaoPathLabel, getDaoPathDescription, confrontDemon, suppressDemon, ignoreDemon, getDemonLabel, getDemonEncounterText, DEMON_DEFS, WOUNDED_CULTIVATOR_ID, MARKET_KEEPER_ID, OUTER_GATE_CLERK_ID, FOUNDATION_GUARDIAN_ID, MOUNTAIN_ELDER_ID, PATROL_DISCIPLE_ID, WANDERING_LECTURER_ID, DISILLUSIONED_FELLOW_ID } from './_helpers';

export const CORE_EVENTS: ActiveEvent[] = [
{
    id: 'find_jade_slip',
    text: '破败的茅草屋角落里，你在枯坐中摸到了一块沾满灰尘的硬物。抹去灰尘，竟是一枚残破的玉简。玉简边缘锐利，不小心划破了你的手指。',
    condition: (state) => !state.choices.flags['found_jade_slip'] && state.resources.insight >= 2,
    weight: () => 100, // 只要满足条件就很容易触发
    choices: [
      {
        text: '探查玉简',
        effect: (state, random) => {
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
        effect: (state, random) => {
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
        effect: (state, random) => {
          let newState = setFlag(state, 'winter_stillness_seen');
          newState.resources = { ...newState.resources, essence: Math.max(0, newState.resources.essence - 5) };
          return { state: newState, log: '你推门看雪。夜色无事，精元稍损。' };
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
        effect: (state, random) => {
          let newState = discoverRealm(state, 'heavenly_wind_realm');
          newState = setFlag(newState, 'has_discovered_realm');
          newState.resources = { ...newState.resources, insight: newState.resources.insight + 3 };
          return { state: newState, log: '你以真气御风，穿入罡风裂隙。天风界在你眼前展开。' };
        },
      },
      {
        text: '驻足观望',
        effect: (state, random) => {
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
        effect: (state, random) => {
          let newState = setFlag(state, 'heavenly_wind_trial_seen');
          newState.resources = { ...newState.resources, qi: newState.resources.qi + 15, wounds: newState.resources.wounds + 1 };
          newState = adjustQuality(newState, 'combat_edge', 2);
          return { state: newState, log: '你硬抗风刃。真气暴涨十五缕，但风刃伤了一处。风之力入体。' };
        },
      },
      {
        text: '随风而行',
        effect: (state, random) => {
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
        effect: (state, random) => {
          let newState = discoverRealm(state, 'underground_palace');
          newState = setFlag(newState, 'has_discovered_realm');
          newState.resources = { ...newState.resources, insight: newState.resources.insight + 3, qi: Math.max(0, newState.resources.qi - 3) };
          return { state: newState, log: '你破开阵法，石门缓缓打开。地下仙府的灵气扑面而来。' };
        },
      },
      {
        text: '暂时退避',
        effect: (state, random) => {
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
        effect: (state, random) => {
          let newState = setFlag(state, 'underground_palace_chain_seen');
          newState.resources = { ...newState.resources, insight: newState.resources.insight + 6, qi: newState.resources.qi + 10, dantoxin: newState.resources.dantoxin + 3 };
          return { state: newState, log: '你凝视古镜。镜中影子传出一丝遗泽。见闻多了六分，真气多十缕，但丹毒也涨了三分。' };
        },
      },
      {
        text: '覆布遮镜',
        effect: (state, random) => {
          let newState = setFlag(state, 'underground_palace_chain_seen');
          newState.resources = { ...newState.resources, coins: newState.resources.coins + 20 };
          newState = adjustQuality(newState, 'quiet_cultivation', 1);
          return { state: newState, log: '你用布遮住古镜。仙府正殿的宝物你取了一些，二十钱到手。' };
        },
      },
      {
        text: '击碎古镜',
        effect: (state, random) => {
          let newState = setFlag(state, 'underground_palace_chain_seen');
          newState.resources = { ...newState.resources, qi: newState.resources.qi + 20, wounds: newState.resources.wounds + 2 };
          newState = adjustQuality(newState, 'reckless_breakthrough', 1);
          return { state: newState, log: '你一掌击碎古镜。灵气爆发灌入丹田。真气暴涨二十缕，但反震伤了两处。' };
        },
      },
    ],
  }
];
