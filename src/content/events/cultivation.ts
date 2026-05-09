import { ActiveEvent, Season, Realm, GameState, LOCATIONS, setFlag, adjustQuality, removeTag, setTag, resolveCombatEvent, touchRelationship, recordWoundedCultivator, recordMarketKeeper, recordOuterGateClerk, recordFoundationGuardian, realmAtLeast, advanceSectRank, completeTask, leaveSect, setCurrentTask, registerOuterDisciple, upgradeDwelling, installFormation, canUpgradeDwelling, canInstallFormation, getDwellingUpgradeCost, getFormationInstallCost, recruitFollower, assignFollowerTask, collectFollowerIncome, canRecruitFollower, discoverRealm, shouldShowAscensionThreshold, executeAscension, getDaoPathLabel, getDaoPathDescription, confrontDemon, suppressDemon, ignoreDemon, getDemonLabel, getDemonEncounterText, DEMON_DEFS, WOUNDED_CULTIVATOR_ID, MARKET_KEEPER_ID, OUTER_GATE_CLERK_ID, FOUNDATION_GUARDIAN_ID, MOUNTAIN_ELDER_ID, PATROL_DISCIPLE_ID, WANDERING_LECTURER_ID, DISILLUSIONED_FELLOW_ID } from './_helpers';

export const CULTIVATION_EVENTS: ActiveEvent[] = [
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
        effect: (state, random) => {
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
        effect: (state, random) => {
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
        effect: (state, random) => {
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
        effect: (state, random) => {
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
        effect: (state, random) => {
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
        effect: (state, random) => {
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
        effect: (state, random) => {
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
        effect: (state, random) => {
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
        effect: (state, random) => {
          let newState = setFlag(state, 'dao_path_recognized');
          newState = adjustQuality(newState, 'quiet_cultivation', 1);
          return { state: newState, log: '你顺着那丝暗线，气行比往日顺畅一分。' };
        },
      },
      {
        text: '不以为意',
        effect: (state, random) => {
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
        effect: (state, random) => {
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
        effect: (state, random) => {
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
        effect: (state, random) => {
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
        effect: (state, random) => {
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
        effect: (state, random) => {
          let newState = setFlag(state, 'qi_breakthrough_omen_seen');
          newState.resources = { ...newState.resources, qi: newState.resources.qi + 5, insight: newState.resources.insight + 2 };
          newState = adjustQuality(newState, 'quiet_cultivation', 1);
          return { state: newState, log: '你顺气而行。真气多了五缕，见闻涨了两分。突破尚远，但路近了。' };
        },
      },
      {
        text: '稳住不动',
        effect: (state, random) => {
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
        effect: (state, random) => {
          let newState = setFlag(state, 'foundation_dream_seen');
          newState.resources = { ...newState.resources, insight: newState.resources.insight + 4, qi: newState.resources.qi + 3 };
          newState = setFlag(newState, 'had_foundation_dream');
          return { state: newState, log: '你闭目回溯梦境。灵脉的走向似乎刻入了神识。见闻涨四分，真气多三缕。' };
        },
      },
      {
        text: '翻身再睡',
        effect: (state, random) => {
          let newState = setFlag(state, 'foundation_dream_seen');
          return { state: newState, log: '你没有多想。梦碎了，但石台仍在记忆深处。' };
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
        effect: (state, random) => {
          let newState = setFlag(state, 'technique_insight_seen');
          newState.resources = { ...newState.resources, qi: newState.resources.qi + 4, insight: newState.resources.insight + 2 };
          return { state: newState, log: '你按新路线行气。真气多了四缕，见闻涨了两分。功法精进了一丝。' };
        },
      },
      {
        text: '先记下',
        effect: (state, random) => {
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
        effect: (state, random) => {
          let newState = setFlag(state, 'dual_cultivation_offer_seen');
          newState.resources = { ...newState.resources, qi: newState.resources.qi + 8, insight: newState.resources.insight + 3 };
          newState = setFlag(newState, 'practiced_dual_cultivation');
          return { state: newState, log: '你们修了一夜。真气多了八缕，见闻涨了三分。功法确有互补之处。' };
        },
      },
      {
        text: '婉拒',
        effect: (state, random) => {
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
        effect: (state, random) => {
          let newState = setFlag(state, 'spiritual_root_mutation_seen');
          newState.resources = { ...newState.resources, qi: newState.resources.qi + 6, dantoxin: newState.resources.dantoxin + 5, insight: newState.resources.insight + 3 };
          newState = adjustQuality(newState, 'reckless_breakthrough', 1);
          return { state: newState, log: '你引灵根异变。真气多了六缕，丹毒涨了五分。灵根的方向变了——是好是坏？' };
        },
      },
      {
        text: '压制回原',
        effect: (state, random) => {
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
        effect: (state, random) => {
          let newState = setFlag(state, 'breakthrough_sky_sign_seen');
          newState.resources = { ...newState.resources, insight: newState.resources.insight + 3 };
          return { state: newState, log: '你盯着异光消散的方向。那里似有一丝道理残留，见闻涨了三分。' };
        },
      },
      {
        text: '不以为意',
        effect: (state, random) => {
          let newState = setFlag(state, 'breakthrough_sky_sign_seen');
          return { state: newState, log: '你低下头。天象是天象，修行是修行。' };
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
        effect: (state, random) => {
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
        effect: (state, random) => {
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
  }
];
