import { ActiveEvent, Season, Realm, GameState, LOCATIONS, setFlag, adjustQuality, removeTag, setTag, resolveCombatEvent, touchRelationship, recordWoundedCultivator, recordMarketKeeper, recordOuterGateClerk, recordFoundationGuardian, realmAtLeast, advanceSectRank, completeTask, leaveSect, setCurrentTask, registerOuterDisciple, upgradeDwelling, installFormation, canUpgradeDwelling, canInstallFormation, getDwellingUpgradeCost, getFormationInstallCost, recruitFollower, assignFollowerTask, collectFollowerIncome, canRecruitFollower, discoverRealm, shouldShowAscensionThreshold, executeAscension, getDaoPathLabel, getDaoPathDescription, confrontDemon, suppressDemon, ignoreDemon, getDemonLabel, getDemonEncounterText, DEMON_DEFS, WOUNDED_CULTIVATOR_ID, MARKET_KEEPER_ID, OUTER_GATE_CLERK_ID, FOUNDATION_GUARDIAN_ID, MOUNTAIN_ELDER_ID, PATROL_DISCIPLE_ID, WANDERING_LECTURER_ID, DISILLUSIONED_FELLOW_ID } from './_helpers';

export const EXPLORATION_EVENTS: ActiveEvent[] = [
{
    id: 'market_rumor',
    text: '坊市中人声鼎沸，你听到几个商人在谈论附近的秘境。',
    condition: (state) => state.currentLocationId === 'market' && !state.choices.flags['heard_rumor_1'],
    weight: () => 30,
    choices: [
      {
        text: '驻足倾听',
        effect: (state, random) => {
          const newState = { ...state };
          newState.resources = { ...state.resources, insight: state.resources.insight + 2 };
          newState.choices = { ...state.choices, flags: { ...state.choices.flags, 'heard_rumor_1': true } };
          return { state: newState, log: '你听闻了些许修行界轶事，见闻有所增长。' };
        }
      }
    ]
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
        effect: (state, random) => {
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
        effect: (state, random) => {
          let newState = setFlag(state, 'ruins_map_heard');
          newState.resources = { ...newState.resources, insight: newState.resources.insight + 1 };
          return { state: newState, log: '你记住大致方位，未买残图。' };
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
        effect: (state, random) => {
          let newState = discoverRealm(state, 'heavenly_peak');
          newState = setFlag(newState, 'has_discovered_realm');
          newState.resources = { ...newState.resources, insight: newState.resources.insight + 3 };
          return { state: newState, log: '天柱峰的位置在你心中显现。灵气之浓，前所未见。' };
        },
      },
      {
        text: '按住不动',
        effect: (state, random) => {
          let newState = setFlag(state, 'heavenly_vision_ignored');
          newState.resources = { ...newState.resources, insight: newState.resources.insight + 1 };
          return { state: newState, log: '你压住神识，没有追寻。那道清气散去。' };
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
        effect: (state, random) => {
          let newState = setFlag(state, 'ruins_guardian_seen');
          newState.resources = { ...newState.resources, qi: newState.resources.qi + 5, essence: Math.max(0, newState.resources.essence - 15) };
          newState = adjustQuality(newState, 'combat_edge', 1);
          return { state: newState, log: '你击退了阵灵。它散去的灵气回到你丹田。' };
        },
      },
      {
        text: '交涉',
        effect: (state, random) => {
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
        effect: (state, random) => {
          let newState = setFlag(state, 'ruins_guardian_seen');
          newState.resources = { ...newState.resources, essence: Math.max(0, newState.resources.essence - 10) };
          return { state: newState, log: '你屏息绕过阵灵。多耗了些精元，但未添伤。' };
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
        effect: (state, random) => {
          let newState = setFlag(state, 'heavenly_trial_seen');
          newState.resources = { ...newState.resources, qi: newState.resources.qi + 15, wounds: newState.resources.wounds + 2 };
          newState = adjustQuality(newState, 'combat_edge', 2);
          return { state: newState, log: '你硬抗雷劫。伤添两处，但真气暴涨十五缕。' };
        },
      },
      {
        text: '以功法化解',
        effect: (state, random) => {
          let newState = setFlag(state, 'heavenly_trial_seen');
          newState.resources = { ...newState.resources, qi: newState.resources.qi + 8, insight: newState.resources.insight + 5 };
          return { state: newState, log: '你运转功法化解雷气。真气增八缕，见闻涨五分。' };
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
        effect: (state, random) => {
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
        effect: (state, random) => {
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
        effect: (state, random) => {
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
        effect: (state, random) => {
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
        effect: (state, random) => {
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
        effect: (state, random) => {
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
        effect: (state, random) => {
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
        effect: (state, random) => {
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
        effect: (state, random) => {
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
        effect: (state, random) => {
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
        effect: (state, random) => {
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
        effect: (state, random) => {
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
        effect: (state, random) => {
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
        effect: (state, random) => {
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
        effect: (state, random) => {
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
        effect: (state, random) => {
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
        effect: (state, random) => {
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
        effect: (state, random) => {
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
        effect: (state, random) => {
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
        effect: (state, random) => {
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
        effect: (state, random) => {
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
        effect: (state, random) => {
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
        effect: (state, random) => {
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
        effect: (state, random) => {
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
    id: 'ferry_foreign_news',
    text: '渡口来了一队外乡商旅。他们带来的消息又远又碎，但有几条值得听。',
    condition: (state) =>
      state.currentLocationId === 'ferry_crossing' &&
      !state.choices.flags['heard_foreign_news'],
    weight: (state) => 16 + (state.choices.qualities['market_ties'] ?? 0) * 2,
    choices: [
      {
        text: '细听',
        effect: (state, random) => {
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
        effect: (state, random) => {
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
        effect: (state, random) => {
          let newState = setFlag(state, 'heard_foreign_news');
          return { state: newState, log: '你没有凑过去。商旅自去，消息散在渡口风中。' };
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
        effect: (state, random) => {
          let newState = setFlag(state, 'deep_temple_forbidden_scroll_seen');
          newState.resources = { ...newState.resources, insight: newState.resources.insight + 4, dantoxin: newState.resources.dantoxin + 4 };
          newState = setFlag(newState, 'read_forbidden_scroll');
          newState = adjustQuality(newState, 'reckless_breakthrough', 1);
          return { state: newState, log: '你读了残篇。见闻暴涨四分，但阴寒入脉，丹毒也涨了四分。' };
        },
      },
      {
        text: '烧毁',
        effect: (state, random) => {
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
        effect: (state, random) => {
          let newState = setFlag(state, 'mountain_cave_crystal_seen');
          newState.resources = { ...newState.resources, coins: newState.resources.coins + 15, essence: Math.max(0, newState.resources.essence - 15) };
          return { state: newState, log: '你敲下灵晶。值十五钱，精元折了十五，手也震麻了。' };
        },
      },
      {
        text: '记下位置回头再来',
        effect: (state, random) => {
          let newState = setFlag(state, 'mountain_cave_crystal_seen');
          newState.resources = { ...newState.resources, insight: newState.resources.insight + 2 };
          newState = setFlag(newState, 'noted_crystal_vein');
          return { state: newState, log: '你记下位置。灵晶仍在壁上，见闻涨了两分。' };
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
        effect: (state, random) => {
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
        effect: (state, random) => {
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
        effect: (state, random) => {
          let newState = setFlag(state, 'tea_house_gamble_seen');
          if (newState.resources.coins < 5) {
            return { state: newState, log: '你钱不够。庄家没让你上桌。' };
          }
          const win = (random ? random() : 0.5) > 0.5; // use seeded rng for deterministic gambling
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
        effect: (state, random) => {
          let newState = setFlag(state, 'tea_house_gamble_seen');
          newState.resources = { ...newState.resources, insight: newState.resources.insight + 1 };
          return { state: newState, log: '你看了一局。赌场的路数记下，见闻略长。' };
        },
      },
    ],
  },
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
        effect: (state, random) => {
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
        effect: (state, random) => {
          let newState = setFlag(state, 'mysterious_merchant_seen');
          newState.resources = { ...newState.resources, insight: newState.resources.insight + 1 };
          return { state: newState, log: '你看了一眼他的货。几个小瓶，标签你都不认得。见闻略长。' };
        },
      },
      {
        text: '回避',
        effect: (state, random) => {
          let newState = setFlag(state, 'mysterious_merchant_seen');
          return { state: newState, log: '你绕路而走。商人的背影很快消失在山雾里。' };
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
        effect: (state, random) => {
          let newState = setFlag(state, 'old_friend_letter_seen');
          newState.resources = { ...newState.resources, coins: Math.max(0, newState.resources.coins - 1), insight: newState.resources.insight + 2 };
          newState = setFlag(newState, 'replied_to_old_friend');
          return { state: newState, log: '你写了几句回信，一枚钱雇人送去。见闻涨了两分，旧事翻起一层。' };
        },
      },
      {
        text: '收起不看',
        effect: (state, random) => {
          let newState = setFlag(state, 'old_friend_letter_seen');
          newState = adjustQuality(newState, 'quiet_cultivation', 1);
          return { state: newState, log: '你把信收入袖中。旧事已远，不提也罢。' };
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
        effect: (state, random) => {
          let newState = setFlag(state, 'lost_inheritance_seen');
          newState.resources = { ...newState.resources, insight: newState.resources.insight + 5, qi: newState.resources.qi + 5, essence: Math.max(0, newState.resources.essence - 20) };
          newState = setFlag(newState, 'received_lost_inheritance');
          return { state: newState, log: '你以神识触及传承。真气多了五缕，见闻涨了五分，精元折了二十。古修的一丝遗泽落在你身上。' };
        },
      },
      {
        text: '记下阵法',
        effect: (state, random) => {
          let newState = setFlag(state, 'lost_inheritance_seen');
          newState.resources = { ...newState.resources, insight: newState.resources.insight + 3 };
          newState = setFlag(newState, 'copied_inheritance_formation');
          return { state: newState, log: '你记下阵法纹路。传承太深不敢承接，但纹路也许有用。见闻涨了三分。' };
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
        effect: (state, random) => {
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
        effect: (state, random) => {
          let newState = setFlag(state, 'forbidden_area_discovery_seen');
          newState = setFlag(newState, 'marked_forbidden_area');
          newState.resources = { ...newState.resources, insight: newState.resources.insight + 1 };
          return { state: newState, log: '你记下位置。禁制还在，日后或有办法。见闻略长。' };
        },
      },
    ],
  },
{
    id: 'spring_thunder_awakening',
    text: '春雷轰鸣，万物惊蛰。灵气随雷声震入丹田，周身气脉似乎都醒了过来。',
    condition: (state) =>
      state.time.season === Season.Spring &&
      realmAtLeast(state, Realm.QiCondensation) &&
      !state.choices.flags['spring_thunder_awakening_seen'],
    weight: () => 12,
    choices: [
      {
        text: '借雷行气',
        effect: (state, random) => {
          let newState = setFlag(state, 'spring_thunder_awakening_seen');
          newState.resources = { ...newState.resources, qi: newState.resources.qi + 5, insight: newState.resources.insight + 1 };
          return { state: newState, log: '你趁雷声行气。真气多了五缕，见闻涨了一分。春雷催万物。' };
        },
      },
      {
        text: '闭门不听',
        effect: (state, random) => {
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
        effect: (state, random) => {
          let newState = setFlag(state, 'summer_heat_wave_seen');
          newState.resources = { ...newState.resources, dantoxin: Math.max(0, newState.resources.dantoxin + 2), essence: Math.max(0, newState.resources.essence - 10) };
          return { state: newState, log: '你静心抗暑。精元折了十分，丹毒涨了两分。热浪难消。' };
        },
      },
      {
        text: '以药清火',
        effect: (state, random) => {
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
        effect: (state, random) => {
          let newState = setFlag(state, 'autumn_harvest_moon_seen');
          newState.resources = { ...newState.resources, insight: newState.resources.insight + 4, qi: newState.resources.qi + 2 };
          newState = adjustQuality(newState, 'quiet_cultivation', 1);
          return { state: newState, log: '你月下静坐。见闻涨了四分，真气多了两缕。秋月照心明。' };
        },
      },
      {
        text: '采月华入药',
        effect: (state, random) => {
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
        effect: (state, random) => {
          let newState = setFlag(state, 'winter_blizzard_seen');
          newState.resources = { ...newState.resources, essence: Math.max(0, newState.resources.essence - 25), wounds: newState.resources.wounds + 1 };
          return { state: newState, log: '你在暴雪中硬走。精元折了二十五，冻伤一处。但到了。' };
        },
      },
      {
        text: '避雪等晴',
        effect: (state, random) => {
          let newState = setFlag(state, 'winter_blizzard_seen');
          newState.resources = { ...newState.resources, lifespan: Math.max(0, newState.resources.lifespan - 30) };
          return { state: newState, log: '你找个石洞避了一日。暴雪停了，但寿元少了三十刻。' };
        },
      },
      {
        text: '以真气御寒',
        effect: (state, random) => {
          let newState = setFlag(state, 'winter_blizzard_seen');
          newState.resources = { ...newState.resources, qi: Math.max(0, newState.resources.qi - 3), insight: newState.resources.insight + 1 };
          return { state: newState, log: '你以真气温养全身。真气折了三缕，但无伤。暴雪中也有修行。' };
        },
      },
    ],
  },
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
        effect: (state, random) => {
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
        effect: (state, random) => {
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
        effect: (state, random) => {
          let newState = setFlag(state, 'stream_valley_herb_find_seen');
          newState.resources = { ...newState.resources, herbs: newState.resources.herbs + 4 };
          newState = adjustQuality(newState, 'alchemy_affinity', 1);
          return { state: newState, log: '你采下灵草。药草添了四株，溪水的灵气仍留在叶上。' };
        },
      },
      {
        text: '只取一叶',
        effect: (state, random) => {
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
        effect: (state, random) => {
          let newState = setFlag(state, 'stream_valley_encounter_seen');
          newState.resources = { ...newState.resources, insight: newState.resources.insight + 2, herbs: newState.resources.herbs + 1 };
          return { state: newState, log: '你与采药修士交换了溪谷草药的信息。见闻长了二分，草药添了一株。' };
        },
      },
      {
        text: '点头致意',
        effect: (state, random) => {
          let newState = setFlag(state, 'stream_valley_encounter_seen');
          newState.resources = { ...newState.resources, insight: newState.resources.insight + 1 };
          return { state: newState, log: '你点头致意，他回以一笑。溪谷中多了一段无声的默契。' };
        },
      },
    ],
  },
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
        effect: (state, random) => {
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
        effect: (state, random) => {
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
        effect: (state, random) => {
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
        effect: (state, random) => {
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
        effect: (state, random) => {
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
        effect: (state, random) => {
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
        effect: (state, random) => {
          let newState = setFlag(state, 'temple_candle_heart_seen');
          newState.resources = { ...newState.resources, qi: newState.resources.qi + 2 };
          return { state: newState, log: '你吹灭蜡烛。影子消失了，烛火熄灭的瞬间，真气多了两缕。' };
        },
      },
    ],
  },
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
        effect: (state, random) => {
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
        effect: (state, random) => {
          let newState = setFlag(state, 'deep_temple_whisper_seen');
          newState = adjustQuality(newState, 'quiet_cultivation', 2);
          return { state: newState, log: '你静坐不动，以心法抵御耳语。声音渐远，心境更加沉稳。' };
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
        effect: (state, random) => {
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
        effect: (state, random) => {
          let newState = setFlag(state, 'deep_temple_hidden_scroll_seen');
          newState.resources = { ...newState.resources, insight: newState.resources.insight + 3 };
          return { state: newState, log: '你记录古卷内容后放回原处。见闻长了三分，未与诅咒之力正面交锋。' };
        },
      },
    ],
  },
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
        effect: (state, random) => {
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
        effect: (state, random) => {
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
        effect: (state, random) => {
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
        effect: (state, random) => {
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
        effect: (state, random) => {
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
        effect: (state, random) => {
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
        effect: (state, random) => {
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
        effect: (state, random) => {
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
        effect: (state, random) => {
          let newState = setFlag(state, 'tea_house_gambler_quarrel_seen');
          newState.resources = { ...newState.resources, coins: Math.max(0, newState.resources.coins - 2), insight: newState.resources.insight + 2 };
          return { state: newState, log: '你出声劝解，花了两枚钱息事宁人。见闻长了二分。' };
        },
      },
      {
        text: '远离是非',
        effect: (state, random) => {
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
        effect: (state, random) => {
          let newState = setFlag(state, 'tea_house_merchant_tip_seen');
          newState.resources = { ...newState.resources, insight: newState.resources.insight + 2 };
          newState = setFlag(newState, 'heard_merchant_herb_tip');
          return { state: newState, log: '你记下了灵药到货的消息。见闻长了二分，坊市或有大机缘。' };
        },
      },
      {
        text: '不感兴趣',
        effect: (state, random) => {
          let newState = setFlag(state, 'tea_house_merchant_tip_seen');
          return { state: newState, log: '你对行商的消息不感兴趣。他耸耸肩，去找下一个听众。' };
        },
      },
    ],
  },
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
        effect: (state, random) => {
          let newState = discoverRealm(state, 'spirit_cave');
          newState = { ...newState, choices: { ...newState.choices, flags: { ...newState.choices.flags, discovered_spirit_cave: true } } };
          newState = { ...newState, resources: { ...newState.resources, insight: newState.resources.insight + 2 } };
          return { state: newState, log: '灵气扑面而来，你在洞壁上发现了古老刻痕。一方秘境已为你敞开。' };
        },
      },
      {
        text: '先记下位置',
        effect: (state, random) => {
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
        effect: (state, random) => {
          let newState = discoverRealm(state, 'ancient_tomb');
          newState = { ...newState, choices: { ...newState.choices, flags: { ...newState.choices.flags, discovered_ancient_tomb: true } } };
          newState = { ...newState, resources: { ...newState.resources, insight: newState.resources.insight + 3 } };
          return { state: newState, log: '古墓深处灵气弥漫，阵法残迹犹存。一方秘境已为你敞开。' };
        },
      },
      {
        text: '先记下位置',
        effect: (state, random) => {
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
        effect: (state, random) => {
          let newState = discoverRealm(state, 'void_passage');
          newState = { ...newState, choices: { ...newState.choices, flags: { ...newState.choices.flags, discovered_void_passage: true } } };
          newState = { ...newState, resources: { ...newState.resources, insight: newState.resources.insight + 5 } };
          return { state: newState, log: '裂隙之后是一片浑茫虚空，灵气如潮水般涌来。一方秘境已为你敞开。' };
        },
      },
      {
        text: '先记下位置',
        effect: (state, random) => {
          const newState = { ...state, choices: { ...state.choices, flags: { ...state.choices.flags, discovered_void_passage: true } }, resources: { ...state.resources, insight: state.resources.insight + 2 } };
          return { state: newState, log: '你记下了裂隙方位，待日后再来探寻。' };
        },
      },
    ],
  }
];
