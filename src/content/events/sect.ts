import { ActiveEvent, Season, Realm, GameState, LOCATIONS, setFlag, adjustQuality, removeTag, setTag, resolveCombatEvent, touchRelationship, recordWoundedCultivator, recordMarketKeeper, recordOuterGateClerk, recordFoundationGuardian, realmAtLeast, advanceSectRank, completeTask, leaveSect, setCurrentTask, registerOuterDisciple, upgradeDwelling, installFormation, canUpgradeDwelling, canInstallFormation, getDwellingUpgradeCost, getFormationInstallCost, recruitFollower, assignFollowerTask, collectFollowerIncome, canRecruitFollower, discoverRealm, shouldShowAscensionThreshold, executeAscension, getDaoPathLabel, getDaoPathDescription, confrontDemon, suppressDemon, ignoreDemon, getDemonLabel, getDemonEncounterText, DEMON_DEFS, WOUNDED_CULTIVATOR_ID, MARKET_KEEPER_ID, OUTER_GATE_CLERK_ID, FOUNDATION_GUARDIAN_ID, MOUNTAIN_ELDER_ID, PATROL_DISCIPLE_ID, WANDERING_LECTURER_ID, DISILLUSIONED_FELLOW_ID } from './_helpers';

export const SECT_EVENTS: ActiveEvent[] = [
{
    id: 'outer_gate_rules',
    text: '坊市角落有人议论外门规矩。名册、贡献、巡山时辰，几句话说得很碎。',
    condition: (state) =>
      (state.currentLocationId === 'market' || state.currentLocationId === 'outer_gate') &&
      (state.choices.flags['heard_rumor_1'] || state.realm === Realm.QiCondensation) &&
      !state.choices.flags['heard_outer_gate_rules'],
    weight: (state) => 8 + (state.choices.qualities['market_ties'] ?? 0) * 2,
    choices: [
      {
        text: '记下规矩',
        effect: (state, random) => {
          let newState = setFlag(state, 'heard_outer_gate_rules');
          newState = setTag(newState, 'sect_trace', 'heard_rules');
          newState.resources = { ...newState.resources, insight: newState.resources.insight + 1 };
          newState = adjustQuality(newState, 'sect_trace', 1);
          return { state: newState, log: '你记下几条外门规矩。字句冷硬，却有用。' };
        },
      },
      {
        text: '花钱细问',
        effect: (state, random) => {
          let newState = setFlag(state, 'heard_outer_gate_rules');
          if (newState.resources.coins >= 5) {
            newState.resources = {
              ...newState.resources,
              coins: newState.resources.coins - 5,
              insight: newState.resources.insight + 2,
            };
            newState = adjustQuality(newState, 'market_ties', 1);
            newState = adjustQuality(newState, 'sect_trace', 2);
            newState = setTag(newState, 'sect_trace', 'asked_rules');
            return { state: newState, log: '五枚钱换来一份旧名册。外门离你近了一点。' };
          }

          newState.resources = { ...newState.resources, insight: newState.resources.insight + 1 };
          newState = setTag(newState, 'sect_trace', 'heard_rules');
          return { state: newState, log: '你没钱细问，只记住几句边角话。' };
        },
      },
      {
        text: '不听',
        effect: (state, random) => {
          let newState = setFlag(state, 'heard_outer_gate_rules');
          newState = setFlag(newState, 'dismissed_outer_gate_rules');
          newState = adjustQuality(newState, 'quiet_cultivation', 1);
          return { state: newState, log: '你离开人群。规矩仍在那里，不因你听不听而改。' };
        },
      },
    ],
  },
{
    id: 'outer_gate_register',
    text: '外门石阶前坐着一名书吏。桌上一册薄簿，墨迹未干。',
    condition: (state) =>
      state.currentLocationId === 'outer_gate' &&
      state.realm === Realm.QiCondensation &&
      Boolean(state.choices.flags['heard_outer_gate_rules']) &&
      !state.choices.flags['outer_gate_clerk_seen'],
    weight: (state) => 18 + (state.choices.qualities['sect_trace'] ?? 0) * 4,
    choices: [
      {
        text: '照名登记（三钱）',
        effect: (state, random) => {
          let newState = setFlag(state, 'outer_gate_clerk_seen');

          if (newState.resources.coins < 3) {
            newState = recordOuterGateClerk(newState, { tags: ['钱不足未记'] });
            return { state: newState, log: '你钱不够。书吏合上薄簿，未多看你。' };
          }

          newState.resources = { ...newState.resources, coins: newState.resources.coins - 3 };
          newState = setFlag(newState, 'outer_gate_registered');
          newState = setTag(newState, 'sect_trace', 'registered');
          newState = adjustQuality(newState, 'sect_trace', 2);
          newState = recordOuterGateClerk(newState, { tags: ['记名'] });
          return { state: newState, log: '三枚钱落入木匣。书吏在薄簿上添了你的名字。' };
        },
      },
      {
        text: '问短差',
        effect: (state, random) => {
          let newState = setFlag(state, 'outer_gate_clerk_seen');
          newState = setFlag(newState, 'accepted_outer_gate_errand');
          newState = setTag(newState, 'sect_trace', 'errand');
          newState.resources = { ...newState.resources, insight: newState.resources.insight + 1 };
          newState = adjustQuality(newState, 'sect_trace', 2);
          newState = recordOuterGateClerk(newState, { tags: ['给过短差'] });
          return { state: newState, log: '书吏递来一张小条。差事不重，限期很明。' };
        },
      },
      {
        text: '退下不记',
        effect: (state, random) => {
          let newState = setFlag(state, 'outer_gate_clerk_seen');
          newState = adjustQuality(newState, 'quiet_cultivation', 1);
          return { state: newState, log: '你退到阶下。薄簿仍摊在那里。' };
        },
      },
    ],
  },
{
    id: 'outer_gate_guardian_account',
    text: '外门石阶下，那位护法的人把你拦住。没有责问，只报出一条规矩。',
    condition: (state) =>
      state.currentLocationId === 'outer_gate' &&
      Boolean(state.choices.flags['sought_foundation_guardian']) &&
      !state.choices.flags['outer_gate_guardian_account_seen'],
    weight: (state) => 22 + (state.choices.qualities['sect_trace'] ?? 0) * 3,
    choices: [
      {
        text: '按规谢过（四钱）',
        effect: (state, random) => {
          let newState = setFlag(state, 'outer_gate_guardian_account_seen');

          if (newState.resources.coins < 4) {
            newState = setFlag(newState, 'foundation_guardian_account_open', false);
            newState = recordFoundationGuardian(newState, { tags: ['谢礼不足'], debtsDelta: 1 });
            return { state: newState, log: '钱不够。来人记下你的名字，转身上阶。' };
          }

          newState.resources = { ...newState.resources, coins: newState.resources.coins - 4 };
          newState = setFlag(newState, 'thanked_foundation_guardian');
          newState = setFlag(newState, 'foundation_guardian_account_open', false);
          newState = adjustQuality(newState, 'sect_trace', 1);
          newState = recordFoundationGuardian(newState, { tags: ['收过谢礼'], favorsDelta: 1 });
          return { state: newState, log: '四枚钱交上去。护法的人点头，外门名册多了一处熟字。' };
        },
      },
      {
        text: '补一件短差',
        effect: (state, random) => {
          let newState = setFlag(state, 'outer_gate_guardian_account_seen');
          newState.resources = {
            ...newState.resources,
            essence: Math.max(0, newState.resources.essence - 25),
            insight: newState.resources.insight + 1,
          };
          newState = setFlag(newState, 'repaid_guardian_with_errand');
          newState = setFlag(newState, 'foundation_guardian_account_open', false);
          newState = adjustQuality(newState, 'sect_trace', 2);
          newState = recordFoundationGuardian(newState, { tags: ['补过短差'], favorsDelta: 1 });
          return { state: newState, log: '你补了一件短差。事不重，规矩在你身上又落一层。' };
        },
      },
      {
        text: '置若罔闻',
        effect: (state, random) => {
          let newState = setFlag(state, 'outer_gate_guardian_account_seen');
          newState = setFlag(newState, 'brushed_off_guardian_account');
          newState = setFlag(newState, 'foundation_guardian_account_open', false);
          newState = adjustQuality(newState, 'sect_trace', -1);
          newState = recordFoundationGuardian(newState, { tags: ['未理会'], grudgesDelta: 1 });
          return { state: newState, log: '你没有应声。阶上无人追来，账却不在阶上。' };
        },
      },
    ],
  },
{
    id: 'outer_gate_missed_roll_call',
    text: '外门书吏翻到你的名字。薄簿边上空着一格，点卯没有落墨。',
    condition: (state) =>
      state.currentLocationId === 'outer_gate' &&
      state.realm === Realm.QiCondensation &&
      Boolean(state.choices.flags['outer_gate_registered']) &&
      !state.choices.flags['attended_outer_gate_roll_call'] &&
      ((state.choices.qualities['action_short_retreat_count'] ?? 0) > 0 ||
        (state.choices.qualities['action_withdraw_foundation_count'] ?? 0) > 0) &&
      !state.choices.flags['outer_gate_missed_roll_call_seen'],
    weight: (state) => 28 + (state.choices.qualities['sect_trace'] ?? 0) * 3,
    choices: [
      {
        text: '补交罚钱（三钱）',
        effect: (state, random) => {
          let newState = setFlag(state, 'outer_gate_missed_roll_call_seen');

          if (newState.resources.coins < 3) {
            newState = setFlag(newState, 'outer_gate_discipline_debt_open');
            newState = adjustQuality(newState, 'sect_discipline', -1);
            newState = recordOuterGateClerk(newState, { tags: ['点卯欠罚'], debtsDelta: 1 });
            return { state: newState, log: '钱不够。书吏在薄簿旁添了一点朱。' };
          }

          newState.resources = { ...newState.resources, coins: newState.resources.coins - 3 };
          newState = setFlag(newState, 'outer_gate_fine_paid');
          newState = setTag(newState, 'sect_status', 'fined');
          newState = adjustQuality(newState, 'sect_discipline', -1);
          newState = recordOuterGateClerk(newState, { tags: ['收过点卯罚钱'] });
          return { state: newState, log: '三枚钱落入木匣。空格补上，规矩没有消失。' };
        },
      },
      {
        text: '补做杂务',
        effect: (state, random) => {
          let newState = setFlag(state, 'outer_gate_missed_roll_call_seen');
          newState.resources = {
            ...newState.resources,
            essence: Math.max(0, newState.resources.essence - 25),
            insight: newState.resources.insight + 1,
          };
          newState = setFlag(newState, 'worked_off_missed_roll_call');
          newState = adjustQuality(newState, 'sect_discipline', 1);
          newState = adjustQuality(newState, 'sect_trace', 1);
          newState = recordOuterGateClerk(newState, { tags: ['补过点卯杂务'] });
          return { state: newState, log: '你补了一件杂务。书吏划掉空格，未抬头。' };
        },
      },
      {
        text: '置之不理',
        effect: (state, random) => {
          let newState = setFlag(state, 'outer_gate_missed_roll_call_seen');
          newState = setFlag(newState, 'ignored_outer_gate_roll_call');
          newState = adjustQuality(newState, 'sect_discipline', -2);
          newState = adjustQuality(newState, 'sect_trace', -1);
          newState = recordOuterGateClerk(newState, { tags: ['点卯未理'], grudgesDelta: 1 });
          return { state: newState, log: '你没有补格。薄簿合上，名字仍在。' };
        },
      },
    ],
  },
{
    id: 'outer_gate_patrol_report',
    text: '巡值回山，书吏摊开另一册薄簿。山门外无大事，也要写成字。',
    condition: (state) =>
      state.currentLocationId === 'outer_gate' &&
      state.realm === Realm.QiCondensation &&
      Boolean(state.choices.flags['completed_sect_patrol']) &&
      !state.choices.flags['outer_gate_patrol_report_seen'],
    weight: (state) => 22 + (state.choices.qualities['sect_contribution'] ?? 0) * 6,
    choices: [
      {
        text: '照规交差',
        effect: (state, random) => {
          let newState = setFlag(state, 'outer_gate_patrol_report_seen');
          newState.resources = { ...newState.resources, coins: newState.resources.coins + 2 };
          newState = setFlag(newState, 'reported_outer_gate_patrol');
          newState = adjustQuality(newState, 'sect_contribution', 1);
          newState = adjustQuality(newState, 'sect_discipline', 1);
          newState = recordOuterGateClerk(newState, { tags: ['收过巡值回报'], favorsDelta: 1 });
          return { state: newState, log: '你照规回报。两枚钱入手，名册上多一笔贡献。' };
        },
      },
      {
        text: '夹带草药',
        effect: (state, random) => {
          let newState = setFlag(state, 'outer_gate_patrol_report_seen');
          newState.resources = { ...newState.resources, herbs: newState.resources.herbs + 2 };
          newState = setFlag(newState, 'kept_patrol_herbs');
          newState = adjustQuality(newState, 'alchemy_affinity', 1);
          newState = adjustQuality(newState, 'sect_discipline', -1);
          newState = adjustQuality(newState, 'karmic_weight', 1);
          return { state: newState, log: '你把两株草药留在袖中。山门无言，账本暂时无字。' };
        },
      },
      {
        text: '问边界路径',
        effect: (state, random) => {
          let newState = setFlag(state, 'outer_gate_patrol_report_seen');
          newState.resources = { ...newState.resources, insight: newState.resources.insight + 2 };
          newState = setFlag(newState, 'heard_outer_gate_border_route');
          newState = adjustQuality(newState, 'combat_edge', 1);
          newState = recordOuterGateClerk(newState, { tags: ['问过边界路'] });
          return { state: newState, log: '书吏指了两处边界路。你记下，山门外的线清楚了一点。' };
        },
      },
    ],
  },
{
    id: 'guardian_favor_recalled',
    text: '外门石阶下，有人递来一张字条。护法处要人当差，上次谢礼的人优先。',
    condition: (state) =>
      state.currentLocationId === 'outer_gate' &&
      Boolean(state.choices.flags['thanked_foundation_guardian']) &&
      !state.choices.flags['guardian_favor_recalled_seen'],
    weight: (state) => 14 + (state.choices.qualities['sect_trace'] ?? 0) * 2,
    choices: [
      {
        text: '应下差事',
        effect: (state, random) => {
          let newState = setFlag(state, 'guardian_favor_recalled_seen');
          newState.resources = {
            ...newState.resources,
            essence: Math.max(0, newState.resources.essence - 30),
            coins: newState.resources.coins + 8,
          };
          newState = setFlag(newState, 'completed_guardian_favor');
          newState = adjustQuality(newState, 'sect_contribution', 2);
          newState = adjustQuality(newState, 'sect_trace', 1);
          return { state: newState, log: '你应下差事。精元折了三十，八枚钱入手，外门名册上又多一笔。' };
        },
      },
      {
        text: '婉拒',
        effect: (state, random) => {
          let newState = setFlag(state, 'guardian_favor_recalled_seen');
          newState = setFlag(newState, 'declined_guardian_favor');
          newState = adjustQuality(newState, 'quiet_cultivation', 1);
          newState = adjustQuality(newState, 'sect_trace', -1);
          return { state: newState, log: '你婉拒。字条收回，外门照旧运转。' };
        },
      },
    ],
  },
{
    id: 'inner_gate_admission',
    text: '内门试炼。一名执事站在石阶上，手中薄簿翻到你的名字。筑基已成，外门已不足容你。',
    condition: (state) =>
      (state.currentLocationId === 'outer_gate' || state.currentLocationId === 'inner_gate') &&
      state.realm === Realm.FoundationEstablishment &&
      state.sect.rank === 'outer' &&
      !state.choices.flags['inner_gate_admission_seen'],
    weight: (state) => 30 + (state.sect.contribution ?? 0) * 2,
    choices: [
      {
        text: '应考核入内门',
        effect: (state, random) => {
          let newState = setFlag(state, 'inner_gate_admission_seen');
          newState = advanceSectRank(newState);
          if (newState.sect.rank === 'inner') {
            return { state: newState, log: '你通过考核，入内门。石阶上薄簿多了一行朱字。' };
          }
          return { state: newState, log: '考核未过。贡献与规矩尚差一截。' };
        },
      },
      {
        text: '暂不',
        effect: (state, random) => {
          let newState = setFlag(state, 'inner_gate_admission_seen');
          newState = adjustQuality(newState, 'quiet_cultivation', 1);
          return { state: newState, log: '你退回阶下。内门仍在那里，不急。' };
        },
      },
    ],
  },
{
    id: 'sect_discipline_hearing',
    text: '宗门问询。几名执事坐在堂上，薄簿上记着你的名。规矩亏损太多，今日须有个说法。',
    condition: (state) =>
      (state.currentLocationId === 'outer_gate' || state.currentLocationId === 'inner_gate') &&
      state.sect.rank !== 'none' &&
      state.sect.discipline < -3 &&
      !state.choices.flags['sect_discipline_hearing_seen'],
    weight: (state) => 20 + Math.abs(state.sect.discipline) * 5,
    choices: [
      {
        text: '辩解',
        effect: (state, random) => {
          let newState = setFlag(state, 'sect_discipline_hearing_seen');
          if (state.choices.qualities.sect_trace ?? 0 >= 5) {
            newState = {
              ...newState,
              sect: { ...newState.sect, discipline: Math.min(0, newState.sect.discipline + 3) },
            };
            newState = adjustQuality(newState, 'sect_trace', 1);
            return { state: newState, log: '你一番话打动了执事。规矩薄上朱笔划去几分。' };
          }
          newState = adjustQuality(newState, 'sect_trace', -1);
          return { state: newState, log: '辩解无力。执事摇头，薄簿未动。' };
        },
      },
      {
        text: '领罚',
        effect: (state, random) => {
          let newState = setFlag(state, 'sect_discipline_hearing_seen');
          newState = {
            ...newState,
            resources: { ...newState.resources, lifespan: Math.max(0, newState.resources.lifespan - 50) },
            sect: { ...newState.sect, discipline: 0 },
          };
          newState = adjustQuality(newState, 'sect_trace', 1);
          return { state: newState, log: '你领了罚。寿元少了五十刻，规矩簿上归零。' };
        },
      },
      {
        text: '出逃',
        effect: (state, random) => {
          let newState = setFlag(state, 'sect_discipline_hearing_seen');
          newState = leaveSect(newState);
          return { state: newState, log: '你转身出了山门。宗门簿上划掉你的名字，因果重了几分。' };
        },
      },
    ],
  },
{
    id: 'fellow_disciple_rivalry',
    text: '同门争端。一名同修拦住你，言语间火药味很重。',
    condition: (state) =>
      state.currentLocationId === 'outer_gate' &&
      state.sect.rank !== 'none' &&
      !state.choices.flags['fellow_disciple_rivalry_seen'],
    weight: () => 12,
    choices: [
      {
        text: '退让',
        effect: (state, random) => {
          let newState = setFlag(state, 'fellow_disciple_rivalry_seen');
          newState = adjustQuality(newState, 'quiet_cultivation', 1);
          return { state: newState, log: '你退一步。面子丢了，气也消了。' };
        },
      },
      {
        text: '据理力争',
        effect: (state, random) => {
          let newState = setFlag(state, 'fellow_disciple_rivalry_seen');
          newState = adjustQuality(newState, 'combat_edge', 1);
          return { state: newState, log: '你寸步不让。争执声大，但也立了威。' };
        },
      },
      {
        text: '从中调停',
        effect: (state, random) => {
          let newState = setFlag(state, 'fellow_disciple_rivalry_seen');
          newState = adjustQuality(newState, 'market_ties', 1);
          return { state: newState, log: '你把两边都劝住。人脉添了一分，两边都记你一笔。' };
        },
      },
    ],
  },
{
    id: 'fellow_disciple_failure',
    text: '坊市角落坐着一名面色灰败的同门。他刚冲关失败，气息不稳。',
    condition: (state) =>
      (state.currentLocationId === 'market' || state.currentLocationId === 'outer_gate') &&
      realmAtLeast(state, Realm.QiCondensation) &&
      !state.choices.flags['met_disillusioned_fellow'],
    weight: (state) => 8 + (state.choices.qualities['sect_trace'] ?? 0) * 2,
    choices: [
      {
        text: '送药宽慰',
        effect: (state, random) => {
          let newState = setFlag(state, 'met_disillusioned_fellow');
          newState.resources = {
            ...newState.resources,
            herbs: Math.max(0, newState.resources.herbs - 3),
          };
          newState = adjustQuality(newState, 'karmic_weight', -1);
          newState = touchRelationship(
            newState,
            { id: DISILLUSIONED_FELLOW_ID, identity: '灰败同门' },
            { tags: ['受你宽慰'], favorsDelta: 1 }
          );
          return { state: newState, log: '你送了三株草药。他收下，没有说话。因果轻了一分。' };
        },
      },
      {
        text: '问失败经过',
        effect: (state, random) => {
          let newState = setFlag(state, 'met_disillusioned_fellow');
          newState.resources = {
            ...newState.resources,
            insight: newState.resources.insight + 3,
          };
          newState = touchRelationship(
            newState,
            { id: DISILLUSIONED_FELLOW_ID, identity: '灰败同门' },
            { tags: ['讲过失败'] }
          );
          return { state: newState, log: '他讲了冲关失败的过程。你听了，见闻长了三分。失败也是路。' };
        },
      },
      {
        text: '旁观',
        effect: (state, random) => {
          let newState = setFlag(state, 'met_disillusioned_fellow');
          return { state: newState, log: '你站在一旁。他坐了一会，起身走了。' };
        },
      },
    ],
  },
{
    id: 'sect_hall_assignment',
    text: '宗门大殿内，一名执事递来令牌。"近日有巡查之务，你可有闲暇？"',
    condition: (state) =>
      state.currentLocationId === 'sect_hall' &&
      state.sect.rank !== 'none' &&
      !state.choices.flags['sect_hall_assignment_seen'],
    weight: (state) => 12 + (state.sect.contribution ?? 0),
    choices: [
      {
        text: '领命巡查',
        effect: (state, random) => {
          let newState = setFlag(state, 'sect_hall_assignment_seen');
          newState.resources = { ...newState.resources, essence: Math.max(0, newState.resources.essence - 20), coins: newState.resources.coins + 5 };
          newState = setFlag(newState, 'completed_sect_assignment');
          newState = adjustQuality(newState, 'sect_contribution', 2);
          newState = adjustQuality(newState, 'sect_trace', 1);
          return { state: newState, log: '你领命巡查一日。精元折了二十，五枚钱入手，宗门贡献添了两笔。' };
        },
      },
      {
        text: '婉拒',
        effect: (state, random) => {
          let newState = setFlag(state, 'sect_hall_assignment_seen');
          return { state: newState, log: '你婉拒令牌。执事收回，未有多言。' };
        },
      },
    ],
  },
{
    id: 'sect_hall_ceremony',
    text: '大殿钟鸣三声，宗门大典。弟子齐聚，香案上灵光浮动。',
    condition: (state) =>
      state.currentLocationId === 'sect_hall' &&
      state.sect.rank !== 'none' &&
      !state.choices.flags['sect_hall_ceremony_seen'],
    weight: (state) => 16 + (state.sect.contribution ?? 0) * 2,
    choices: [
      {
        text: '随众参拜',
        effect: (state, random) => {
          let newState = setFlag(state, 'sect_hall_ceremony_seen');
          newState.resources = { ...newState.resources, qi: newState.resources.qi + 3, insight: newState.resources.insight + 2 };
          newState = adjustQuality(newState, 'sect_trace', 2);
          return { state: newState, log: '你随众参拜。灵气灌顶，真气多了三缕，见闻涨了两分。' };
        },
      },
      {
        text: '旁观',
        effect: (state, random) => {
          let newState = setFlag(state, 'sect_hall_ceremony_seen');
          newState.resources = { ...newState.resources, insight: newState.resources.insight + 1 };
          return { state: newState, log: '你站在殿角旁观。大典与你无涉，见闻略长。' };
        },
      },
    ],
  },
{
    id: 'sect_elder_guidance',
    text: '宗门一位长老路过，停下脚步看了你一眼。"你修行有偏差，须得调整。"',
    condition: (state) =>
      (state.currentLocationId === 'outer_gate' || state.currentLocationId === 'inner_gate' || state.currentLocationId === 'sect_hall') &&
      state.sect.rank !== 'none' &&
      !state.choices.flags['sect_elder_guidance_seen'],
    weight: () => 6,
    choices: [
      {
        text: '请教',
        effect: (state, random) => {
          let newState = setFlag(state, 'sect_elder_guidance_seen');
          newState.resources = { ...newState.resources, insight: newState.resources.insight + 4, dantoxin: Math.max(0, newState.resources.dantoxin - 5) };
          newState = setFlag(newState, 'received_elder_guidance');
          newState = adjustQuality(newState, 'sect_trace', 2);
          return { state: newState, log: '长老点拨了你的功法偏差。丹毒退了五分，见闻涨了四分。宗门长辈确有真传。' };
        },
      },
      {
        text: '道谢后自省',
        effect: (state, random) => {
          let newState = setFlag(state, 'sect_elder_guidance_seen');
          newState.resources = { ...newState.resources, insight: newState.resources.insight + 2 };
          newState = adjustQuality(newState, 'quiet_cultivation', 1);
          return { state: newState, log: '你谢过长老，回去自省。偏差找到了，见闻涨了两分。' };
        },
      },
    ],
  },
{
    id: 'sect_hall_announcement',
    text: '宗门大殿传来钟声。长老宣布了一则重要通告，门下弟子纷纷聚来。',
    condition: (state) =>
      state.currentLocationId === 'sect_hall' &&
      !state.choices.flags['sect_hall_announcement_seen'],
    weight: () => 10,
    choices: [
      {
        text: '仔细倾听',
        effect: (state, random) => {
          let newState = setFlag(state, 'sect_hall_announcement_seen');
          newState.resources = { ...newState.resources, insight: newState.resources.insight + 3 };
          newState = adjustQuality(newState, 'sect_trace', 1);
          return { state: newState, log: '你仔细倾听通告。宗门近期有大事，见闻长了三分，宗门痕迹深了一分。' };
        },
      },
      {
        text: '随众应付',
        effect: (state, random) => {
          let newState = setFlag(state, 'sect_hall_announcement_seen');
          newState.resources = { ...newState.resources, insight: newState.resources.insight + 1 };
          return { state: newState, log: '你随众站立，只听了个大概。见闻长了一分。' };
        },
      },
    ],
  },
{
    id: 'sect_hall_discipline_summon',
    text: '大殿侧门走出一名执事。他点名唤你，似有训诫之意。',
    condition: (state) =>
      state.currentLocationId === 'sect_hall' &&
      !state.choices.flags['sect_hall_discipline_summon_seen'],
    weight: () => 8,
    choices: [
      {
        text: '恭敬领训',
        effect: (state, random) => {
          let newState = setFlag(state, 'sect_hall_discipline_summon_seen');
          newState.resources = { ...newState.resources, coins: Math.max(0, newState.resources.coins - 5) };
          newState = adjustQuality(newState, 'sect_discipline', 2);
          return { state: newState, log: '你恭敬领训，被罚了五枚钱。宗门规矩在你身上又深一层。' };
        },
      },
      {
        text: '据理力争',
        effect: (state, random) => {
          let newState = setFlag(state, 'sect_hall_discipline_summon_seen');
          newState = adjustQuality(newState, 'sect_discipline', -2);
          newState = adjustQuality(newState, 'sect_trace', -1);
          return { state: newState, log: '你据理力争。执事面色不悦，宗门规矩未减，你的名头却差了。' };
        },
      },
    ],
  },
{
    id: 'sect_hall_reward_ceremony',
    text: '大殿中举行赏功仪式。有贡献的弟子依次上前领赏。',
    condition: (state) =>
      state.currentLocationId === 'sect_hall' &&
      !state.choices.flags['sect_hall_reward_ceremony_seen'] &&
      (state.choices.qualities['sect_contribution'] ?? 0) >= 3,
    weight: () => 10,
    choices: [
      {
        text: '上前领赏',
        effect: (state, random) => {
          let newState = setFlag(state, 'sect_hall_reward_ceremony_seen');
          newState.resources = {
            ...newState.resources,
            coins: newState.resources.coins + 10,
            herbs: newState.resources.herbs + 2,
          };
          newState = adjustQuality(newState, 'sect_contribution', 1);
          return { state: newState, log: '你上前领赏。十枚钱、两株药草入袋，宗门贡献又添了一分。' };
        },
      },
      {
        text: '谦让不受',
        effect: (state, random) => {
          let newState = setFlag(state, 'sect_hall_reward_ceremony_seen');
          newState = adjustQuality(newState, 'quiet_cultivation', 2);
          newState = adjustQuality(newState, 'sect_contribution', 1);
          return { state: newState, log: '你谦让不受。赏赐未取，但心境清宁，宗门贡献仍增了一分。' };
        },
      },
    ],
  }
];
