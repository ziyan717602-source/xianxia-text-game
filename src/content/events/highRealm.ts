import { ActiveEvent, Season, Realm, GameState, LOCATIONS, setFlag, adjustQuality, removeTag, setTag, resolveCombatEvent, touchRelationship, recordWoundedCultivator, recordMarketKeeper, recordOuterGateClerk, recordFoundationGuardian, realmAtLeast, advanceSectRank, completeTask, leaveSect, setCurrentTask, registerOuterDisciple, upgradeDwelling, installFormation, canUpgradeDwelling, canInstallFormation, getDwellingUpgradeCost, getFormationInstallCost, recruitFollower, assignFollowerTask, collectFollowerIncome, canRecruitFollower, discoverRealm, shouldShowAscensionThreshold, executeAscension, getDaoPathLabel, getDaoPathDescription, confrontDemon, suppressDemon, ignoreDemon, getDemonLabel, getDemonEncounterText, DEMON_DEFS, WOUNDED_CULTIVATOR_ID, MARKET_KEEPER_ID, OUTER_GATE_CLERK_ID, FOUNDATION_GUARDIAN_ID, MOUNTAIN_ELDER_ID, PATROL_DISCIPLE_ID, WANDERING_LECTURER_ID, DISILLUSIONED_FELLOW_ID } from './_helpers';

export const HIGHREALM_EVENTS: ActiveEvent[] = [
{
    id: 'ascension_threshold',
    text: '灵气忽然涌来，你感到一股牵引。天门，似乎就在上方。',
    condition: (state) => shouldShowAscensionThreshold(state),
    weight: () => 100,
    choices: [
      {
        text: '感应天意',
        effect: (state, random) => {
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
        effect: (state, random) => {
          const result = executeAscension(state, 'ascend');
          return { state: result.state, log: result.log };
        },
      },
      {
        text: '留界（留下为尊）',
        effect: (state, random) => {
          const result = executeAscension(state, 'remain');
          return { state: result.state, log: result.log };
        },
      },
      {
        text: '超脱（重入轮回，保留部分所得）',
        effect: (state, random) => {
          const result = executeAscension(state, 'transcend');
          return { state: result.state, log: result.log };
        },
      },
      {
        text: '坐化（安然消散）',
        effect: (state, random) => {
          const result = executeAscension(state, 'dissipate');
          return { state: result.state, log: result.log };
        },
      },
    ],
  },
{
    id: 'golden_core_thunder',
    text: '晴天一道闷雷从天际滚过，不是雷雨。你丹田一紧，冥冥中有所感应。金丹雷劫的前兆？',
    condition: (state) =>
      state.realm === Realm.FoundationEstablishment &&
      state.resources.qi >= 120 &&
      !state.choices.flags['golden_core_thunder_seen'],
    weight: (state) => 4 + Math.min(10, Math.floor((state.resources.qi - 120) / 10)),
    choices: [
      {
        text: '凝神感应',
        effect: (state, random) => {
          let newState = setFlag(state, 'golden_core_thunder_seen');
          newState.resources = { ...newState.resources, insight: newState.resources.insight + 5 };
          newState = setFlag(newState, 'sensed_thunder_omen');
          return { state: newState, log: '你凝神感应。雷劫尚远，但法则的轮廓已隐约可辨。见闻涨五分。' };
        },
      },
      {
        text: '压下心绪',
        effect: (state, random) => {
          let newState = setFlag(state, 'golden_core_thunder_seen');
          newState.resources = { ...newState.resources, dantoxin: Math.max(0, newState.resources.dantoxin - 3) };
          return { state: newState, log: '你将心绪压回丹田。丹毒退了三分，四周复归寂静。' };
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
        effect: (state, random) => {
          let newState = setFlag(state, 'nascent_soul_vision_seen');
          newState.resources = { ...newState.resources, insight: newState.resources.insight + 6, essence: Math.max(0, newState.resources.essence - 30) };
          newState = setFlag(newState, 'chased_nascent_soul_vision');
          return { state: newState, log: '你追入幻象深处。见闻暴涨六分，精元折了三十。元婴之路若有若无。' };
        },
      },
      {
        text: '收束神识',
        effect: (state, random) => {
          let newState = setFlag(state, 'nascent_soul_vision_seen');
          newState = adjustQuality(newState, 'quiet_cultivation', 2);
          return { state: newState, log: '你将神识收回。幻象散去，心却静了几分。' };
        },
      },
    ],
  },
{
    id: 'golden_core_thunder',
    text: '丹成之际，隐隐有所感应。乌云翻涌，一道金色雷光劈下——金丹雷劫来了。',
    condition: (state) => state.realm === Realm.GoldenCore && !state.choices.flags['golden_core_thunder_seen'],
    weight: () => 20,
    choices: [
      {
        text: '迎雷而上',
        effect: (state, random) => {
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
        effect: (state, random) => {
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
        effect: (state, random) => {
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
        effect: (state, random) => {
          let newState = setFlag(state, 'golden_core_breakthrough_sign_seen');
          newState.resources = { ...newState.resources, qi: newState.resources.qi + 5, insight: newState.resources.insight + 2 };
          newState = adjustQuality(newState, 'quiet_cultivation', 1);
          return { state: newState, log: '你稳固金丹，不敢冒进。真气多五缕，见闻也长了两分。' };
        },
      },
      {
        text: '试探冲击',
        effect: (state, random) => {
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
        effect: (state, random) => {
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
        effect: (state, random) => {
          let newState = setFlag(state, 'core_gate_guidance_received');
          newState.resources = { ...newState.resources, insight: newState.resources.insight + 5, qi: newState.resources.qi + 5 };
          newState = adjustQuality(newState, 'sect_trace', 1);
          return { state: newState, log: '长老指点突破之道。见闻长了五分，真气也多了五缕。' };
        },
      },
      {
        text: '请教功法之疑',
        effect: (state, random) => {
          let newState = setFlag(state, 'core_gate_guidance_received');
          newState.resources = { ...newState.resources, insight: newState.resources.insight + 8 };
          newState = adjustQuality(newState, 'alchemy_affinity', 1);
          return { state: newState, log: '长老解答功法疑难。见闻暴涨八分。' };
        },
      },
      {
        text: '默立一旁',
        effect: (state, random) => {
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
        effect: (state, random) => {
          let newState = setFlag(state, 'demon_seal_weakening_seen');
          newState.resources = { ...newState.resources, essence: newState.resources.essence - 30, coins: newState.resources.coins + 10, insight: newState.resources.insight + 3 };
          newState = adjustQuality(newState, 'sect_contribution', 2);
          return { state: newState, log: '你耗费精元加固封印。宗门贡献增加，十钱到手，见闻也长了三分。' };
        },
      },
      {
        text: '观察研究',
        effect: (state, random) => {
          let newState = setFlag(state, 'demon_seal_weakening_seen');
          newState = setFlag(newState, 'studied_demon_seal');
          newState.resources = { ...newState.resources, insight: newState.resources.insight + 5 };
          return { state: newState, log: '你仔细观察封印裂纹。见闻长了五分，记下了魔气的特性。' };
        },
      },
      {
        text: '避开不惹',
        effect: (state, random) => {
          let newState = setFlag(state, 'demon_seal_weakening_seen');
          return { state: newState, log: '你转身离开。封印的裂纹仍在，但那不是你现在该管的事。' };
        },
      },
    ],
  },
{
    id: 'nascent_soul_vision',
    text: '深夜打坐，神识忽然脱离肉身。你看到自己盘坐的身影，元婴在丹田中缓缓睁开双眼——出窍了。',
    condition: (state) => state.realm === Realm.NascentSoul && !state.choices.flags['nascent_soul_vision_seen'],
    weight: () => 15,
    choices: [
      {
        text: '探查周围',
        effect: (state, random) => {
          let newState = setFlag(state, 'nascent_soul_vision_seen');
          newState.resources = { ...newState.resources, insight: newState.resources.insight + 8, qi: newState.resources.qi + 10 };
          newState = adjustQuality(newState, 'combat_edge', 1);
          return { state: newState, log: '你操纵元婴探查四周。见闻长了八分，真气多十缕。' };
        },
      },
      {
        text: '收神归位',
        effect: (state, random) => {
          let newState = setFlag(state, 'nascent_soul_vision_seen');
          newState.resources = { ...newState.resources, qi: newState.resources.qi + 15 };
          newState = adjustQuality(newState, 'quiet_cultivation', 2);
          return { state: newState, log: '你将元婴收回丹田。神识稳固，真气多了十五缕。' };
        },
      },
      {
        text: '借机修炼',
        effect: (state, random) => {
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
        effect: (state, random) => {
          let newState = setFlag(state, 'celestial_revelation_seen');
          newState.resources = { ...newState.resources, insight: newState.resources.insight + 10, qi: newState.resources.qi + 5 };
          return { state: newState, log: '你静心参悟古篆。见闻暴涨十分，真气也多了五缕。' };
        },
      },
      {
        text: '抄录带走',
        effect: (state, random) => {
          let newState = setFlag(state, 'celestial_revelation_seen');
          newState = setFlag(newState, 'has_celestial_script_copy');
          newState.resources = { ...newState.resources, insight: newState.resources.insight + 6, coins: Math.max(0, newState.resources.coins - 10) };
          return { state: newState, log: '你抄录古篆。见闻长了六分，花了十钱笔墨。' };
        },
      },
      {
        text: '叩拜致谢',
        effect: (state, random) => {
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
        effect: (state, random) => {
          let newState = setFlag(state, 'spirit_lake_reflection_seen');
          newState.resources = { ...newState.resources, insight: newState.resources.insight + 4, qi: newState.resources.qi + 3 };
          newState = adjustQuality(newState, 'quiet_cultivation', 1);
          return { state: newState, log: '你沉心观照灵根本相。见闻长了四分，真气多了三缕。' };
        },
      },
      {
        text: '以手搅水',
        effect: (state, random) => {
          let newState = setFlag(state, 'spirit_lake_reflection_seen');
          newState.resources = { ...newState.resources, qi: newState.resources.qi + 2 };
          return { state: newState, log: '你以手搅水，灵根本相散去。真气多了两缕，但灵根之相未能看清。' };
        },
      },
      {
        text: '记下灵根之相',
        effect: (state, random) => {
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
        effect: (state, random) => {
          let newState = setFlag(state, 'immortal_garden_herb_found');
          newState.resources = { ...newState.resources, herbs: newState.resources.herbs + 6, insight: newState.resources.insight + 2 };
          newState = adjustQuality(newState, 'alchemy_affinity', 1);
          return { state: newState, log: '你采下灵草。药草多了六株，见闻也长了二分。' };
        },
      },
      {
        text: '护持生长',
        effect: (state, random) => {
          let newState = setFlag(state, 'immortal_garden_herb_found');
          newState.resources = { ...newState.resources, herbs: newState.resources.herbs + 3, insight: newState.resources.insight + 3 };
          newState = adjustQuality(newState, 'quiet_cultivation', 1);
          return { state: newState, log: '你护持灵草生长。药草只取了三株，但见闻长了三分。' };
        },
      },
      {
        text: '记录药性',
        effect: (state, random) => {
          let newState = setFlag(state, 'immortal_garden_herb_found');
          newState = setFlag(newState, 'studied_immortal_herb');
          newState.resources = { ...newState.resources, insight: newState.resources.insight + 5 };
          return { state: newState, log: '你记录下灵草药性。见闻长了五分，灵草仍在仙园中。' };
        },
      },
    ],
  },
{
    id: 'spirit_transform_sign',
    text: '灵气在你周围自行凝聚，形成一圈淡淡的光晕。化神之兆已现——你的神识开始向外延伸。',
    condition: (state) => state.realm === Realm.SpiritTransformation && !state.choices.flags['spirit_transform_sign_seen'],
    weight: () => 12,
    choices: [
      {
        text: '引灵气入体',
        effect: (state, random) => {
          let newState = setFlag(state, 'spirit_transform_sign_seen');
          newState.resources = {
            ...newState.resources,
            qi: newState.resources.qi + 40,
            essence: newState.resources.essence - 50,
            insight: newState.resources.insight + 10,
          };
          return { state: newState, log: '你引灵气入体。真气多了四十缕，见闻长十分，精元折五十。' };
        },
      },
      {
        text: '稳守本心',
        effect: (state, random) => {
          let newState = setFlag(state, 'spirit_transform_sign_seen');
          newState.resources = { ...newState.resources, qi: newState.resources.qi + 20, insight: newState.resources.insight + 5 };
          newState = adjustQuality(newState, 'quiet_cultivation', 2);
          return { state: newState, log: '你稳守本心。化神之兆渐渐收束，真气多了二十缕，见闻长五分。' };
        },
      },
      {
        text: '借机参悟',
        effect: (state, random) => {
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
        effect: (state, random) => {
          let newState = setFlag(state, 'battlefield_remnant_seen');
          newState = setFlag(newState, 'received_ancient_knowledge');
          newState.resources = { ...newState.resources, insight: newState.resources.insight + 12, qi: newState.resources.qi + 10 };
          return { state: newState, log: '你与残灵交流。上古修士的见闻灌入神识，见闻暴涨十二分，真气也多了十缕。' };
        },
      },
      {
        text: '助其消散',
        effect: (state, random) => {
          let newState = setFlag(state, 'battlefield_remnant_seen');
          newState.resources = { ...newState.resources, insight: newState.resources.insight + 8 };
          newState = adjustQuality(newState, 'karmic_weight', -1);
          return { state: newState, log: '你助残灵消散执念。见闻长了八分，因果轻了一分。' };
        },
      },
      {
        text: '绕道而行',
        effect: (state, random) => {
          let newState = setFlag(state, 'battlefield_remnant_seen');
          return { state: newState, log: '你绕道而行。残灵在身后沉默，你继续赶路。' };
        },
      },
    ],
  },
{
    id: 'integration_void_call',
    text: '虚空之中传来一声悠远的呼唤，仿佛有什么在召唤你与之合为一体。修为已到了与外力共鸣的关口。',
    condition: (state) => state.realm === Realm.Integration && !state.choices.flags['integration_void_call_seen'],
    weight: () => 10,
    choices: [
      {
        text: '顺应呼唤',
        effect: (state, random) => {
          let newState = setFlag(state, 'integration_void_call_seen');
          newState.resources = {
            ...newState.resources,
            qi: newState.resources.qi + 60,
            insight: newState.resources.insight + 20,
            essence: newState.resources.essence - 80,
          };
          return { state: newState, log: '你顺应呼唤。真气多了六十缕，见闻长二十分，但精元折了八十。' };
        },
      },
      {
        text: '保持独立',
        effect: (state, random) => {
          let newState = setFlag(state, 'integration_void_call_seen');
          newState.resources = { ...newState.resources, qi: newState.resources.qi + 30, insight: newState.resources.insight + 10 };
          newState = adjustQuality(newState, 'quiet_cultivation', 2);
          return { state: newState, log: '你保持独立意志。真气多了三十缕，见闻长十分。' };
        },
      },
      {
        text: '试探融合',
        effect: (state, random) => {
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
    text: '虚空裂隙突然扩张，一股混茫之力从中涌出。空间扭曲，时间仿佛凝固——这是一次罕见的虚空异变。',
    condition: (state) => state.currentLocationId === 'void_rift' && state.realm === Realm.Integration && !state.choices.flags['void_rift_anomaly_seen'],
    weight: () => 12,
    choices: [
      {
        text: '吸收混茫之力',
        effect: (state, random) => {
          let newState = setFlag(state, 'void_rift_anomaly_seen');
          newState.resources = {
            ...newState.resources,
            qi: newState.resources.qi + 80,
            insight: newState.resources.insight + 25,
            dantoxin: newState.resources.dantoxin + 10,
            essence: newState.resources.essence - 60,
          };
          return { state: newState, log: '你吸收混茫之力。真气多了八十缕，见闻长二十五分，但丹毒涨十分，精元折六十。' };
        },
      },
      {
        text: '稳固空间',
        effect: (state, random) => {
          let newState = setFlag(state, 'void_rift_anomaly_seen');
          newState.resources = { ...newState.resources, qi: newState.resources.qi + 30, insight: newState.resources.insight + 10 };
          newState = adjustQuality(newState, 'karmic_weight', -1);
          return { state: newState, log: '你稳固虚空裂隙。真气多三十缕，见闻长十分，因果轻了一分。' };
        },
      },
      {
        text: '退出虚空',
        effect: (state, random) => {
          let newState = setFlag(state, 'void_rift_anomaly_seen');
          return { state: newState, log: '你退出虚空裂隙。异变在身后发生，但你已安全。' };
        },
      },
    ],
  },
{
    id: 'mahayana_enlightenment',
    text: '道途渐明。修行已至大乘，法则在你面前渐渐清晰。一次悟道机缘降临了。',
    condition: (state) => state.realm === Realm.Mahayana && !state.choices.flags['mahayana_enlightenment_seen'],
    weight: () => 8,
    choices: [
      {
        text: '全力悟道',
        effect: (state, random) => {
          let newState = setFlag(state, 'mahayana_enlightenment_seen');
          newState.resources = {
            ...newState.resources,
            qi: newState.resources.qi + 100,
            insight: newState.resources.insight + 40,
            essence: newState.resources.essence - 100,
            lifespan: Math.max(0, newState.resources.lifespan - 500),
          };
          return { state: newState, log: '你全力悟道。真气多了一百缕，见闻长四十分，但精元折百，寿元少五百刻。' };
        },
      },
      {
        text: '稳步精进',
        effect: (state, random) => {
          let newState = setFlag(state, 'mahayana_enlightenment_seen');
          newState.resources = { ...newState.resources, qi: newState.resources.qi + 50, insight: newState.resources.insight + 20 };
          return { state: newState, log: '你稳步精进。真气多五十缕，见闻长二十分。' };
        },
      },
      {
        text: '传道授业',
        effect: (state, random) => {
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
        text: '受其意',
        effect: (state, random) => {
          let newState = setFlag(state, 'spirit_mountain_enlightenment_seen');
          newState.resources = { ...newState.resources, qi: newState.resources.qi + 80, insight: newState.resources.insight + 30 };
          return { state: newState, log: '你受了灌顶之意。真气多了八十缕，见闻长三十分。' };
        },
      },
      {
        text: '以己意拒之',
        effect: (state, random) => {
          let newState = setFlag(state, 'spirit_mountain_enlightenment_seen');
          newState.resources = {
            ...newState.resources,
            qi: newState.resources.qi + 50,
            insight: newState.resources.insight + 50,
            wounds: newState.resources.wounds + 2,
          };
          newState = adjustQuality(newState, 'reckless_breakthrough', 2);
          return { state: newState, log: '你以己意拒之。见闻多了五十分，真气多五十缕，但伤了两处。' };
        },
      },
      {
        text: '谦卑受教',
        effect: (state, random) => {
          let newState = setFlag(state, 'spirit_mountain_enlightenment_seen');
          newState.resources = { ...newState.resources, qi: newState.resources.qi + 40, insight: newState.resources.insight + 20 };
          newState = adjustQuality(newState, 'quiet_cultivation', 2);
          return { state: newState, log: '你谦卑受教。真气多四十缕，见闻长二十分，心境更趋圆满。' };
        },
      },
    ],
  },
{
    id: 'tribulation_thunder',
    text: '云层裂开，雷劫蓄势待发。你站在渡劫台上，感受到了隐隐的威压。',
    condition: (state) => state.realm === Realm.Tribulation && !state.choices.flags['tribulation_thunder_seen'],
    weight: () => 6,
    choices: [
      {
        text: '以肉身迎劫',
        effect: (state, random) => {
          let newState = setFlag(state, 'tribulation_thunder_seen');
          newState.resources = {
            ...newState.resources,
            qi: newState.resources.qi + 150,
            insight: newState.resources.insight + 50,
            wounds: newState.resources.wounds + 3,
            essence: newState.resources.essence - 150,
          };
          return { state: newState, log: '你以肉身硬抗天雷。真气多了一百五十缕，见闻长五十分，但伤了三处，精元折百五十。' };
        },
      },
      {
        text: '借丹药护体',
        effect: (state, random) => {
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
        effect: (state, random) => {
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
        effect: (state, random) => {
          let newState = setFlag(state, 'tribulation_platform_breakthrough_seen');
          newState.resources = {
            ...newState.resources,
            qi: newState.resources.qi + 200,
            insight: newState.resources.insight + 60,
            wounds: newState.resources.wounds + 2,
          };
          newState = adjustQuality(newState, 'reckless_breakthrough', 2);
          return { state: newState, log: '你迎接天劫。真气多了二百缕，见闻长六十分，但伤了两处。' };
        },
      },
      {
        text: '再做筹备',
        effect: (state, random) => {
          let newState = setFlag(state, 'tribulation_platform_breakthrough_seen');
          newState.resources = { ...newState.resources, insight: newState.resources.insight + 10 };
          return { state: newState, log: '你决定再做筹备。见闻长了十分，时机未到。' };
        },
      },
      {
        text: '暂离渡劫台',
        effect: (state, random) => {
          let newState = setFlag(state, 'tribulation_platform_breakthrough_seen');
          return { state: newState, log: '你暂离渡劫台。天劫的气息在身后渐渐消散。' };
        },
      },
    ],
  },
{
    id: 'dragon_palace_hint',
    text: '有人在谈论灵湖深处伏潮旧宫的传说——据传那里藏有上古遗址的丹药和功法，只有金丹以上修士才能涉足。',
    condition: (state) => state.realm === Realm.GoldenCore && !state.choices.flags['heard_dragon_palace_hint'] && (state.currentLocationId === 'tea_house' || state.currentLocationId === 'market'),
    weight: () => 12,
    choices: [
      {
        text: '记下传闻',
        effect: (state, random) => {
          let newState = setFlag(state, 'heard_dragon_palace_hint');
          newState.resources = { ...newState.resources, insight: newState.resources.insight + 3 };
          return { state: newState, log: '你记下伏潮旧宫传闻。见闻长了三分，也许日后能去探一探。' };
        },
      },
      {
        text: '不以为意',
        effect: (state, random) => {
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
        effect: (state, random) => {
          const result = resolveCombatEvent(
            state,
            'fight',
            { id: 'demon_shadow', name: '魔影', realm: Realm.NascentSoul, power: 15 },
            random
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
        effect: (state, random) => {
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
        effect: (state, random) => {
          let newState = setFlag(state, 'demon_seal_breach_seen');
          newState = adjustQuality(newState, 'quiet_cultivation', -1);
          return { state: newState, log: '你紧急撤离。魔影在身后肆虐，你的心境也受了一丝影响。' };
        },
      },
    ],
  },
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
        effect: (state, random) => {
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
        effect: (state, random) => {
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
        effect: (state, random) => {
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
        effect: (state, random) => {
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
        effect: (state, random) => {
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
        effect: (state, random) => {
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
        effect: (state, random) => {
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
        effect: (state, random) => {
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
        effect: (state, random) => {
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
        effect: (state, random) => {
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
        effect: (state, random) => {
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
        effect: (state, random) => {
          let newState = setFlag(state, 'golden_core_spirit_beast_seen');
          newState.resources = {
            ...newState.resources,
            essence: Math.max(0, newState.resources.essence - 20),
            herbs: newState.resources.herbs + 3,
          };
          newState = setFlag(newState, 'golden_core_spirit_beast_accepted');
          newState = adjustQuality(newState, 'quiet_cultivation', 1);
          return { state: newState, log: '灵兽降伏，你以精元结契。精元折二十，灵兽日后可代你采药。' };
        },
      },
      {
        text: '赐药遣走',
        effect: (state, random) => {
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
        effect: (state, random) => {
          let newState = setFlag(state, 'golden_core_spirit_beast_seen');
          newState = adjustQuality(newState, 'karmic_weight', 1);
          return { state: newState, log: '你挥手驱赶。灵兽低鸣一声，没入山林。因果已种。' };
        },
      },
    ],
  },
{
    id: 'nascent_soul_soul_departure',
    text: '元神忽然自眉心浮出。你第一次以元神之体俯瞰肉身，周遭一切在神识中渐渐分明。',
    condition: (state) =>
      state.realm === Realm.NascentSoul &&
      !state.choices.flags['nascent_soul_soul_departure_seen'],
    weight: () => 10,
    choices: [
      {
        text: '神识远游',
        effect: (state, random) => {
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
        effect: (state, random) => {
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
        effect: (state, random) => {
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
        effect: (state, random) => {
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
        effect: (state, random) => {
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
        effect: (state, random) => {
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
        effect: (state, random) => {
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
        effect: (state, random) => {
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
        effect: (state, random) => {
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
        effect: (state, random) => {
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
        effect: (state, random) => {
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
        effect: (state, random) => {
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
        effect: (state, random) => {
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
        effect: (state, random) => {
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
        effect: (state, random) => {
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
        effect: (state, random) => {
          let newState = setFlag(state, 'spirit_transform_divine_sense_seen');
          newState = adjustQuality(newState, 'quiet_cultivation', 2);
          return { state: newState, log: '你将神识收回体内。不窥天地，只守己心。' };
        },
      },
    ],
  },
{
    id: 'spirit_transform_spirit_merge',
    text: '灵气忽然主动朝你汇聚。无需运功，灵气自发涌入经脉，金丹震鸣不止。',
    condition: (state) =>
      state.realm === Realm.SpiritTransformation &&
      !state.choices.flags['spirit_transform_spirit_merge_seen'],
    weight: () => 8,
    choices: [
      {
        text: '引灵入体',
        effect: (state, random) => {
          let newState = setFlag(state, 'spirit_transform_spirit_merge_seen');
          newState.resources = {
            ...newState.resources,
            qi: newState.resources.qi + 20,
            essence: Math.max(0, newState.resources.essence - 30),
          };
          return { state: newState, log: '灵气涌入体内。真气多了二十缕，精元折三十。你对灵气的感应更深了。' };
        },
      },
      {
        text: '引导灵气入阵',
        effect: (state, random) => {
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
        effect: (state, random) => {
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
        effect: (state, random) => {
          let newState = setFlag(state, 'spirit_transform_ancient_voice_seen');
          newState.resources = { ...newState.resources, insight: newState.resources.insight + 4 };
          return { state: newState, log: '你记下残音，不去强解。见闻长了四分，余下待日后参悟。' };
        },
      },
    ],
  },
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
        effect: (state, random) => {
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
        effect: (state, random) => {
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
    text: '四周忽然一颤。你的呼吸与山川同步，心跳与地脉共振，仿佛你便是此处的一部分。',
    condition: (state) =>
      state.realm === Realm.Integration &&
      !state.choices.flags['integration_world_resonance_seen'],
    weight: () => 8,
    choices: [
      {
        text: '顺其共振',
        effect: (state, random) => {
          let newState = setFlag(state, 'integration_world_resonance_seen');
          newState.resources = {
            ...newState.resources,
            qi: newState.resources.qi + 15,
            insight: newState.resources.insight + 6,
            lifespan: Math.max(0, newState.resources.lifespan - 30),
          };
          newState = setFlag(newState, 'integration_resonance_achieved');
          return { state: newState, log: '你顺其共振。真气多了十五缕，见闻长了六分。共振虽短，已有所悟。寿元折三十刻。' };
        },
      },
      {
        text: '保持距离',
        effect: (state, random) => {
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
        effect: (state, random) => {
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
        effect: (state, random) => {
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
        effect: (state, random) => {
          let newState = setFlag(state, 'integration_dao_heart_test_seen');
          newState.resources = { ...newState.resources, dantoxin: newState.resources.dantoxin + 5 };
          return { state: newState, log: '你回避了道心试探。考验暂去，但丹田中多了一丝怯意的药滞。' };
        },
      },
    ],
  },
{
    id: 'mahayana_heavenly_call',
    text: '一股深沉的意志忽然降临。不是雷霆，不是审判，而是一种无声的召唤，仿佛在问你一个古老的问题。',
    condition: (state) =>
      state.realm === Realm.Mahayana &&
      !state.choices.flags['mahayana_heavenly_call_seen'],
    weight: () => 8,
    choices: [
      {
        text: '回应意志',
        effect: (state, random) => {
          let newState = setFlag(state, 'mahayana_heavenly_call_seen');
          newState.resources = {
            ...newState.resources,
            essence: Math.max(0, newState.resources.essence - 60),
            insight: newState.resources.insight + 8,
          };
          newState = setFlag(newState, 'mahayana_answered_heaven');
          return { state: newState, log: '你回应了那股意志。精元折六十，但有了短暂的共鸣，见闻多了八分。' };
        },
      },
      {
        text: '沉默倾听',
        effect: (state, random) => {
          let newState = setFlag(state, 'mahayana_heavenly_call_seen');
          newState.resources = { ...newState.resources, insight: newState.resources.insight + 5 };
          return { state: newState, log: '你沉默倾听低语。见闻长了五分，深意仍需参悟。' };
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
        effect: (state, random) => {
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
        effect: (state, random) => {
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
        effect: (state, random) => {
          let newState = setFlag(state, 'mahayana_tribulation_foreboding_seen');
          newState = adjustQuality(newState, 'quiet_cultivation', 2);
          return { state: newState, log: '你不做特殊准备。天劫来时便来，道心不可因恐惧而失守。' };
        },
      },
    ],
  },
{
    id: 'tribulation_final_tribulation',
    text: '头顶雷云翻涌如墨。最后一道天劫正蓄势待发，这是修行路上最终的考验。',
    condition: (state) =>
      state.realm === Realm.Tribulation &&
      state.resources.qi >= 200 &&
      !state.choices.flags['tribulation_final_tribulation_seen'],
    weight: () => 12,
    choices: [
      {
        text: '以身迎劫',
        effect: (state, random) => {
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
          return { state: newState, log: '你以身迎劫，雷贯全身。真气折八十，精元折八十，伤添两处。但你挺过了最后一道天劫，见闻多了十分。' };
        },
      },
      {
        text: '以法宝抵御',
        effect: (state, random) => {
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
        effect: (state, random) => {
          let newState = setFlag(state, 'tribulation_final_tribulation_seen');
          newState.resources = {
            ...newState.resources,
            essence: Math.max(0, newState.resources.essence - 50),
            insight: newState.resources.insight + 8,
          };
          newState = adjustQuality(newState, 'quiet_cultivation', 4);
          return { state: newState, log: '你以道心化解天劫。精元折五十，但你与法则有了更深层的默契，见闻长了八分。' };
        },
      },
    ],
  },
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
        effect: (state, random) => {
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
        effect: (state, random) => {
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
        effect: (state, random) => {
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
        effect: (state, random) => {
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
        effect: (state, random) => {
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
        effect: (state, random) => {
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
        effect: (state, random) => {
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
        effect: (state, random) => {
          let newState = setFlag(state, 'core_gate_technique_scroll_seen');
          newState.resources = { ...newState.resources, insight: newState.resources.insight + 2 };
          return { state: newState, log: '你记下功法目录。见闻长了二分，来日再来细读。' };
        },
      },
    ],
  },
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
        effect: (state, random) => {
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
        effect: (state, random) => {
          let newState = setFlag(state, 'spirit_lake_treasure_seen');
          newState.resources = { ...newState.resources, insight: newState.resources.insight + 2 };
          return { state: newState, log: '你以灵识探测湖底。宝物轮廓隐约可见，见闻长了二分。潜水取宝尚需准备。' };
        },
      },
    ],
  },
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
        effect: (state, random) => {
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
        effect: (state, random) => {
          let newState = setFlag(state, 'thunder_peak_strike_seen');
          newState.resources = { ...newState.resources, insight: newState.resources.insight + 2 };
          return { state: newState, log: '你闪避了雷击。雷力在身旁炸开，见闻长了二分。' };
        },
      },
    ],
  },
{
    id: 'thunder_peak_insight',
    text: '雷峰之上，雷云翻涌。你在雷声中忽有所悟，似对雷劫有了更深的理解。',
    condition: (state) =>
      state.currentLocationId === 'thunder_peak' &&
      !state.choices.flags['thunder_peak_insight_seen'],
    weight: () => 8,
    choices: [
      {
        text: '静坐悟雷',
        effect: (state, random) => {
          let newState = setFlag(state, 'thunder_peak_insight_seen');
          newState.resources = {
            ...newState.resources,
            essence: Math.max(0, newState.resources.essence - 20),
            insight: newState.resources.insight + 5,
          };
          return { state: newState, log: '你在雷声中静坐。精元折二十，但对雷劫的感悟更深，见闻长了五分。' };
        },
      },
      {
        text: '记录感悟',
        effect: (state, random) => {
          let newState = setFlag(state, 'thunder_peak_insight_seen');
          newState.resources = { ...newState.resources, insight: newState.resources.insight + 3 };
          return { state: newState, log: '你将感悟记下。见闻长了三分，来日再参。' };
        },
      },
    ],
  },
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
        effect: (state, random) => {
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
        effect: (state, random) => {
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
        effect: (state, random) => {
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
        effect: (state, random) => {
          let newState = setFlag(state, 'void_rift_spatial_treasure_seen');
          newState.resources = { ...newState.resources, insight: newState.resources.insight + 2 };
          return { state: newState, log: '你远观宝珠。空间之力的运作方式令你有所悟，见闻长了二分。' };
        },
      },
    ],
  },
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
        effect: (state, random) => {
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
        effect: (state, random) => {
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
        effect: (state, random) => {
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
        effect: (state, random) => {
          let newState = setFlag(state, 'spirit_mountain_test_seen');
          newState.resources = { ...newState.resources, essence: Math.max(0, newState.resources.essence - 10) };
          return { state: newState, log: '你绕道而行。精元折十，没有直面幻阵，但路也走成了。' };
        },
      },
    ],
  },
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
        effect: (state, random) => {
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
        effect: (state, random) => {
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
        effect: (state, random) => {
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
        effect: (state, random) => {
          let newState = setFlag(state, 'immortal_garden_spirit_beast_seen');
          newState.resources = { ...newState.resources, insight: newState.resources.insight + 2 };
          return { state: newState, log: '你静静观察小兽。它灵性的举动令你若有所悟，见闻长了二分。' };
        },
      },
    ],
  }
];
