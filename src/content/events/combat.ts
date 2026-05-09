import { ActiveEvent, Season, Realm, GameState, LOCATIONS, setFlag, adjustQuality, removeTag, setTag, resolveCombatEvent, touchRelationship, recordWoundedCultivator, recordMarketKeeper, recordOuterGateClerk, recordFoundationGuardian, realmAtLeast, advanceSectRank, completeTask, leaveSect, setCurrentTask, registerOuterDisciple, upgradeDwelling, installFormation, canUpgradeDwelling, canInstallFormation, getDwellingUpgradeCost, getFormationInstallCost, recruitFollower, assignFollowerTask, collectFollowerIncome, canRecruitFollower, discoverRealm, shouldShowAscensionThreshold, executeAscension, getDaoPathLabel, getDaoPathDescription, confrontDemon, suppressDemon, ignoreDemon, getDemonLabel, getDemonEncounterText, DEMON_DEFS, WOUNDED_CULTIVATOR_ID, MARKET_KEEPER_ID, OUTER_GATE_CLERK_ID, FOUNDATION_GUARDIAN_ID, MOUNTAIN_ELDER_ID, PATROL_DISCIPLE_ID, WANDERING_LECTURER_ID, DISILLUSIONED_FELLOW_ID } from './_helpers';

export const COMBAT_EVENTS: ActiveEvent[] = [
{
    id: 'wounded_cultivator',
    text: '山路两旁药香异常，你闻到一丝血腥味，发现一名受伤的散修倒在草丛中。',
    condition: (state) => state.currentLocationId === 'mountain_path' && !state.choices.flags['met_wounded_cultivator'],
    weight: (state) => 20 + (LOCATIONS[state.currentLocationId]?.danger ?? 0) * 4,
    choices: [
      {
        text: '施以援手 (消耗 5 药)',
        effect: (state, random) => {
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
        effect: (state, random) => {
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
        effect: (state, random) => {
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
        effect: (state, random) => {
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
        effect: (state, random) => {
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
        effect: (state, random) => {
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
        effect: (state, random) => {
          let newState = { ...state };
          newState.resources = { ...state.resources, essence: Math.max(0, state.resources.essence - 10) };
          newState = setFlag(newState, 'wounded_cultivator_grudge_met');
          newState = adjustQuality(newState, 'quiet_cultivation', 1);
          return { state: newState, log: '你绕过山坳，白走一段路。事情没有了结。' };
        },
      },
      {
        text: '交涉',
        effect: (state, random) => {
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
        effect: (state, random) => {
          const result = resolveCombatEvent(
            state,
            'fight',
            { id: WOUNDED_CULTIVATOR_ID, name: '受伤散修', realm: Realm.QiCondensation, power: 6 },
            random
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
    id: 'demon_of_rashness_encounter',
    text: (state) => getDemonEncounterText('demon_of_rashness'),
    condition: (state) =>
      state.innerDemon.activeDemon === 'demon_of_rashness' &&
      !state.choices.flags['demon_of_rashness_encountered'],
    weight: () => 50,
    choices: [
      {
        text: '直面心魔（消耗 5 真气 20 精元）',
        effect: (state, random) => {
          let newState = setFlag(state, 'demon_of_rashness_encountered');
          const result = confrontDemon(newState);
          return result;
        },
      },
      {
        text: '压制心魔（消耗 80 寿元）',
        effect: (state, random) => {
          let newState = setFlag(state, 'demon_of_rashness_encountered');
          const result = suppressDemon(newState);
          return result;
        },
      },
      {
        text: '无视',
        effect: (state, random) => {
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
        effect: (state, random) => {
          let newState = setFlag(state, 'demon_of_attachment_encountered');
          const result = confrontDemon(newState);
          return result;
        },
      },
      {
        text: '压制心魔（消耗 80 寿元）',
        effect: (state, random) => {
          let newState = setFlag(state, 'demon_of_attachment_encountered');
          const result = suppressDemon(newState);
          return result;
        },
      },
      {
        text: '无视',
        effect: (state, random) => {
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
        effect: (state, random) => {
          let newState = setFlag(state, 'demon_of_pride_encountered');
          const result = confrontDemon(newState);
          return result;
        },
      },
      {
        text: '压制心魔（消耗 80 寿元）',
        effect: (state, random) => {
          let newState = setFlag(state, 'demon_of_pride_encountered');
          const result = suppressDemon(newState);
          return result;
        },
      },
      {
        text: '无视',
        effect: (state, random) => {
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
        effect: (state, random) => {
          let newState = setFlag(state, 'demon_of_toxicity_encountered');
          const result = confrontDemon(newState);
          return result;
        },
      },
      {
        text: '压制心魔（消耗 80 寿元）',
        effect: (state, random) => {
          let newState = setFlag(state, 'demon_of_toxicity_encountered');
          const result = suppressDemon(newState);
          return result;
        },
      },
      {
        text: '无视',
        effect: (state, random) => {
          let newState = setFlag(state, 'demon_of_toxicity_encountered');
          const result = ignoreDemon(newState);
          return result;
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
        effect: (state, random) => {
          let newState = discoverRealm(state, 'demonic_cave');
          newState = setFlag(newState, 'has_discovered_realm');
          return { state: newState, log: '你找到了魔气洞窟的入口。危险，但也可能有机缘。' };
        },
      },
      {
        text: '避开',
        effect: (state, random) => {
          let newState = setFlag(state, 'demonic_aura_avoided');
          return { state: newState, log: '你绕开那处裂隙。魔气不散，洞口仍在。' };
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
        effect: (state, random) => {
          let newState = setFlag(state, 'demonic_whispers_seen');
          newState.resources = { ...newState.resources, qi: newState.resources.qi + 5 };
          newState = adjustQuality(newState, 'quiet_cultivation', 2);
          return { state: newState, log: '你守住神识。魔气退去时，反而留下了一丝真气。' };
        },
      },
      {
        text: '借助魔气修炼',
        effect: (state, random) => {
          let newState = setFlag(state, 'demonic_whispers_seen');
          newState.resources = { ...newState.resources, qi: newState.resources.qi + 10, dantoxin: newState.resources.dantoxin + 5 };
          newState = adjustQuality(newState, 'reckless_breakthrough', 1);
          return { state: newState, log: '你以魔气行功。真气多了十缕，但丹毒也涨了五分。' };
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
        effect: (state, random) => {
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
        effect: (state, random) => {
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
        effect: (state, random) => {
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
        effect: (state, random) => {
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
        effect: (state, random) => {
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
        effect: (state, random) => {
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
        effect: (state, random) => {
          let newState = setFlag(state, 'sword_pavilion_challenge_seen');
          const result = resolveCombatEvent(
            newState,
            'fight',
            { id: 'sword_brother', name: '剑阁师兄', realm: Realm.QiCondensation, power: 8 },
            random
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
        effect: (state, random) => {
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
        effect: (state, random) => {
          let newState = setFlag(state, 'sword_pavilion_intent_insight_seen');
          newState.resources = { ...newState.resources, insight: newState.resources.insight + 4, qi: newState.resources.qi + 3 };
          newState = adjustQuality(newState, 'combat_edge', 2);
          return { state: newState, log: '古剑意念灌入神识。真气多了三缕，见闻涨了四分，剑意又深一层。' };
        },
      },
      {
        text: '拔剑一试',
        effect: (state, random) => {
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
    id: 'deep_temple_spirit_encounter',
    text: '荒庙深处，一缕白雾自地砖缝隙升起，渐渐凝成半透明人形。它看着你，目光里没有恶意。',
    condition: (state) =>
      state.currentLocationId === 'deep_temple' &&
      !state.choices.flags['deep_temple_spirit_encounter_seen'],
    weight: (state) => 10 + (LOCATIONS[state.currentLocationId]?.danger ?? 0) * 3,
    choices: [
      {
        text: '恭敬问路',
        effect: (state, random) => {
          let newState = setFlag(state, 'deep_temple_spirit_encounter_seen');
          newState.resources = { ...newState.resources, insight: newState.resources.insight + 3 };
          newState = setFlag(newState, 'spirit_pointed_path');
          return { state: newState, log: '灵体指了指墙后。你绕过去，发现了一处暗格。见闻涨了三分。' };
        },
      },
      {
        text: '以阵法禁制',
        effect: (state, random) => {
          let newState = setFlag(state, 'deep_temple_spirit_encounter_seen');
          newState.resources = { ...newState.resources, qi: newState.resources.qi + 2, dantoxin: newState.resources.dantoxin + 2 };
          newState = adjustQuality(newState, 'combat_edge', 1);
          return { state: newState, log: '你布阵收了灵体的残余灵气。真气多了两缕，但丹毒也涨了。' };
        },
      },
      {
        text: '退避',
        effect: (state, random) => {
          let newState = setFlag(state, 'deep_temple_spirit_encounter_seen');
          return { state: newState, log: '你退出荒庙。灵体消散，暗处归于寂静。' };
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
        effect: (state, random) => {
          let newState = setFlag(state, 'mountain_cave_beast_seen');
          const result = resolveCombatEvent(
            newState,
            'fight',
            { id: 'cave_beast', name: '灰毛地兽', realm: Realm.QiCondensation, power: 10 },
            random
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
        effect: (state, random) => {
          let newState = setFlag(state, 'mountain_cave_beast_seen');
          newState.resources = { ...newState.resources, essence: Math.max(0, newState.resources.essence - 15) };
          return { state: newState, log: '你拔腿就跑。精元折了十五，但没添伤。' };
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
        effect: (state, random) => {
          let newState = setFlag(state, 'demonic_forest_ambush_seen');
          const result = resolveCombatEvent(
            newState,
            'fight',
            { id: 'red_fox', name: '赤目妖狐', realm: Realm.FoundationEstablishment, power: 12 },
            random
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
        effect: (state, random) => {
          let newState = setFlag(state, 'demonic_forest_ambush_seen');
          newState.resources = { ...newState.resources, essence: Math.max(0, newState.resources.essence - 20) };
          return { state: newState, log: '你侧身躲过一击，退入林深处。精元折了二十。' };
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
        effect: (state, random) => {
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
        effect: (state, random) => {
          let newState = setFlag(state, 'rival_cultivator_seen');
          newState = adjustQuality(newState, 'quiet_cultivation', 1);
          return { state: newState, log: '你退了一步。灵脉非你之物，争也无益。' };
        },
      },
      {
        text: '斗法',
        effect: (state, random) => {
          let newState = setFlag(state, 'rival_cultivator_seen');
          const result = resolveCombatEvent(
            newState,
            'fight',
            { id: 'rival_cultivator', name: '异门修士', realm: Realm.FoundationEstablishment, power: 14 },
            random
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
        effect: (state, random) => {
          let newState = setFlag(state, 'demon_cultivator_ambush_seen');
          const result = resolveCombatEvent(
            newState,
            'fight',
            { id: 'demon_cultivator', name: '黑袍魔修', realm: Realm.FoundationEstablishment, power: 16 },
            random
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
        effect: (state, random) => {
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
        effect: (state, random) => {
          let newState = setFlag(state, 'spirit_beast_taming_seen');
          newState.resources = { ...newState.resources, qi: Math.max(0, newState.resources.qi - 5), insight: newState.resources.insight + 3 };
          newState = setFlag(newState, 'tamed_spirit_beast');
          return { state: newState, log: '你渡出五缕真气。小兽嗅了嗅你的手，蹭了一下。灵兽算是认了你，但尚幼。' };
        },
      },
      {
        text: '静静观赏',
        effect: (state, random) => {
          let newState = setFlag(state, 'spirit_beast_taming_seen');
          newState.resources = { ...newState.resources, insight: newState.resources.insight + 1 };
          return { state: newState, log: '你看了它许久。小兽跳下石头，消失在草丛中。见闻略长。' };
        },
      },
    ],
  },
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
        effect: (state, random) => {
          let newState = setFlag(state, 'wild_beast_attack_seen');
          const result = resolveCombatEvent(
            newState,
            'fight',
            { id: 'wild_boar', name: '黑毛野猪', realm: Realm.Mortal, power: 5 },
            random
          );
          return { state: result.state, log: result.success ? '你击退野猪。它嗷嗷叫着逃入林中。' : result.log };
        },
      },
      {
        text: '闪避',
        effect: (state, random) => {
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
        effect: (state, random) => {
          let newState = setFlag(state, 'bandit_ambush_seen');
          newState.resources = { ...newState.resources, coins: Math.max(0, newState.resources.coins - 10) };
          return { state: newState, log: '你交出十枚钱。山匪收了钱，让你过去。' };
        },
      },
      {
        text: '斗法',
        effect: (state, random) => {
          let newState = setFlag(state, 'bandit_ambush_seen');
          const result = resolveCombatEvent(
            newState,
            'fight',
            { id: 'bandit_leader', name: '山匪头目', realm: Realm.Mortal, power: 7 },
            random
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
        effect: (state, random) => {
          let newState = setFlag(state, 'poisonous_mist_seen');
          newState.resources = { ...newState.resources, dantoxin: newState.resources.dantoxin + 3, essence: Math.max(0, newState.resources.essence - 10) };
          return { state: newState, log: '你屏息冲过毒雾。丹毒涨了三分，精元折了十分。' };
        },
      },
      {
        text: '绕路',
        effect: (state, random) => {
          let newState = setFlag(state, 'poisonous_mist_seen');
          newState.resources = { ...newState.resources, essence: Math.max(0, newState.resources.essence - 15) };
          return { state: newState, log: '你绕了大半圈避开毒雾。精元折了十五，但没中毒。' };
        },
      },
      {
        text: '以药驱散',
        effect: (state, random) => {
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
        effect: (state, random) => {
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
        effect: (state, random) => {
          let newState = setFlag(state, 'formation_trap_seen');
          newState.resources = { ...newState.resources, qi: Math.max(0, newState.resources.qi - 5), wounds: newState.resources.wounds + 1 };
          return { state: newState, log: '你以真气硬冲阵壁。真气折了五缕，伤添一处，但人出来了。' };
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
        effect: (state, random) => {
          let newState = discoverRealm(state, 'demonic_forest_depths');
          newState = setFlag(newState, 'has_discovered_realm');
          return { state: newState, log: '你踏入妖林深处。瘴气弥漫，但奇药遍地。' };
        },
      },
      {
        text: '退回',
        effect: (state, random) => {
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
        effect: (state, random) => {
          let newState = setFlag(state, 'demonic_forest_exploration_seen');
          newState.resources = { ...newState.resources, herbs: newState.resources.herbs + 8, insight: newState.resources.insight + 2 };
          newState = adjustQuality(newState, 'alchemy_affinity', 1);
          return { state: newState, log: '古树精满意你的态度，指出了一片灵药丛。灵草多了八株，见闻涨了两分。' };
        },
      },
      {
        text: '斗法',
        effect: (state, random) => {
          let newState = setFlag(state, 'demonic_forest_exploration_seen');
          const result = resolveCombatEvent(
            newState,
            'fight',
            { id: 'ancient_tree_spirit', name: '古树精', realm: Realm.FoundationEstablishment, power: 18 },
            random
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
    id: 'sword_pavilion_sword_cry',
    text: '剑阁中忽然响起一声剑鸣。无风无震，壁上某柄古剑自行颤抖，似在呼应什么。',
    condition: (state) =>
      state.currentLocationId === 'sword_pavilion' &&
      !state.choices.flags['sword_pavilion_sword_cry_seen'],
    weight: () => 10,
    choices: [
      {
        text: '拔剑感应',
        effect: (state, random) => {
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
        effect: (state, random) => {
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
        effect: (state, random) => {
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
        effect: (state, random) => {
          let newState = setFlag(state, 'sword_pavilion_senior_duel_seen');
          const result = resolveCombatEvent(
            state,
            'fight',
            { id: 'sword_senior', name: '剑阁师兄', realm: state.realm, power: 10 },
            random
          );
          newState = setFlag(result.state, 'sword_pavilion_senior_duel_seen');
          newState.resources = { ...newState.resources, insight: newState.resources.insight + 3 };
          newState = adjustQuality(newState, 'combat_edge', 2);
          return { state: newState, log: result.log + ' 切磋之后，剑术精进，见闻长了三分。' };
        },
      },
      {
        text: '婉拒',
        effect: (state, random) => {
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
        effect: (state, random) => {
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
        effect: (state, random) => {
          let newState = setFlag(state, 'sword_pavilion_lost_technique_seen');
          newState.resources = { ...newState.resources, insight: newState.resources.insight + 2 };
          return { state: newState, log: '你将残谱放回原处。剑诀虽好，此刻还不是修习的时机。见闻长了二分。' };
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
        effect: (state, random) => {
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
        effect: (state, random) => {
          let newState = setFlag(state, 'deep_temple_shadow_encounter_seen');
          newState.resources = { ...newState.resources, essence: Math.max(0, newState.resources.essence - 5) };
          return { state: newState, log: '你退后几步。暗影没有追来，精元微微折损。' };
        },
      },
    ],
  },
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
        effect: (state, random) => {
          const result = resolveCombatEvent(
            state,
            'fight',
            { id: 'forest_beast', name: '林中妖兽', realm: Realm.FoundationEstablishment, power: 8 },
            random
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
        effect: (state, random) => {
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
        effect: (state, random) => {
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
        effect: (state, random) => {
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
        effect: (state, random) => {
          let newState = setFlag(state, 'demonic_forest_terrifying_roar_seen');
          newState = adjustQuality(newState, 'quiet_cultivation', 2);
          return { state: newState, log: '你原地不动。咆哮渐远，你的心却更加坚定。不以物惧，不以兽惊。' };
        },
      },
      {
        text: '撤离林中',
        effect: (state, random) => {
          let newState = setFlag(state, 'demonic_forest_terrifying_roar_seen');
          newState.resources = { ...newState.resources, essence: Math.max(0, newState.resources.essence - 10) };
          return { state: newState, log: '你撤离林中。精元折十，安全第一。' };
        },
      },
    ],
  },
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
        effect: (state, random) => {
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
        effect: (state, random) => {
          let newState = setFlag(state, 'ferry_tax_seen');
          newState.resources = { ...newState.resources, essence: Math.max(0, newState.resources.essence - 15) };
          return { state: newState, log: '你步行绕路。精元折十五，但省下了钱。路远不怕。' };
        },
      },
    ],
  }
];
