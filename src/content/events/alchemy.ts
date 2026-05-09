import { ActiveEvent, Season, Realm, GameState, LOCATIONS, setFlag, adjustQuality, removeTag, setTag, resolveCombatEvent, touchRelationship, recordWoundedCultivator, recordMarketKeeper, recordOuterGateClerk, recordFoundationGuardian, realmAtLeast, advanceSectRank, completeTask, leaveSect, setCurrentTask, registerOuterDisciple, upgradeDwelling, installFormation, canUpgradeDwelling, canInstallFormation, getDwellingUpgradeCost, getFormationInstallCost, recruitFollower, assignFollowerTask, collectFollowerIncome, canRecruitFollower, discoverRealm, shouldShowAscensionThreshold, executeAscension, getDaoPathLabel, getDaoPathDescription, confrontDemon, suppressDemon, ignoreDemon, getDemonLabel, getDemonEncounterText, DEMON_DEFS, WOUNDED_CULTIVATOR_ID, MARKET_KEEPER_ID, OUTER_GATE_CLERK_ID, FOUNDATION_GUARDIAN_ID, MOUNTAIN_ELDER_ID, PATROL_DISCIPLE_ID, WANDERING_LECTURER_ID, DISILLUSIONED_FELLOW_ID } from './_helpers';

export const ALCHEMY_EVENTS: ActiveEvent[] = [
{
    id: 'rain_after_sprouts',
    text: '雨后山路泥深。石缝旁冒出一簇新芽，叶尖带着淡淡凉意。',
    condition: (state) =>
      state.currentLocationId === 'mountain_path' &&
      state.time.season === Season.Spring &&
      state.resources.herbs > 0 &&
      !state.choices.flags['found_rain_after_sprouts'],
    weight: (state) => 14 + (state.choices.qualities['alchemy_affinity'] ?? 0) * 2,
    choices: [
      {
        text: '采下新芽',
        effect: (state, random) => {
          let newState = { ...state };
          newState.resources = { ...state.resources, herbs: state.resources.herbs + 3 };
          newState = setFlag(newState, 'found_rain_after_sprouts');
          newState = adjustQuality(newState, 'alchemy_affinity', 1);
          return { state: newState, log: '你采下新芽。草药添了三株，药性仍需细辨。' };
        },
      },
      {
        text: '留种标记',
        effect: (state, random) => {
          let newState = { ...state };
          newState.resources = { ...state.resources, herbs: state.resources.herbs + 1, insight: state.resources.insight + 1 };
          newState = setFlag(newState, 'found_rain_after_sprouts');
          newState = setFlag(newState, 'marked_herb_patch');
          newState = adjustQuality(newState, 'alchemy_affinity', 2);
          return { state: newState, log: '你只取一株，余下用石片记住。山路多了一处可回头的痕迹。' };
        },
      },
      {
        text: '只记药形',
        effect: (state, random) => {
          let newState = { ...state };
          newState.resources = { ...state.resources, insight: state.resources.insight + 2 };
          newState = setFlag(newState, 'found_rain_after_sprouts');
          newState = adjustQuality(newState, 'quiet_cultivation', 1);
          return { state: newState, log: '你蹲下看了许久，没有动手。药形记下，草仍在石缝里。' };
        },
      },
    ],
  },
{
    id: 'market_price_rise',
    text: '坊市草药价忽然上浮。掌柜照常拨算盘，门口挂着新到货的木牌。',
    condition: (state) => state.currentLocationId === 'market' && !state.choices.flags['market_price_rise_seen'],
    weight: (state) => (state.time.season === Season.Autumn || state.time.season === Season.Winter ? 24 : 8),
    choices: [
      {
        text: '买入十钱草药',
        effect: (state, random) => {
          let newState = { ...state };
          newState = setFlag(newState, 'market_price_rise_seen');

          if (newState.resources.coins < 10) {
            newState = recordMarketKeeper(newState, { tags: ['看货未买'] });
            return { state: newState, log: '你钱不够。掌柜把木牌翻回去，算盘声不停。' };
          }

          newState.resources = {
            ...newState.resources,
            coins: newState.resources.coins - 10,
            herbs: newState.resources.herbs + 3,
          };
          newState = adjustQuality(newState, 'market_ties', 1);
          newState = recordMarketKeeper(newState, { tags: ['熟客'] });
          return { state: newState, log: '十枚钱换来三包草药。价贵，货真。' };
        },
      },
      {
        text: '观望行情',
        effect: (state, random) => {
          let newState = setFlag(state, 'market_price_rise_seen');
          newState.resources = { ...newState.resources, insight: newState.resources.insight + 1 };
          newState = adjustQuality(newState, 'market_ties', 1);
          newState = recordMarketKeeper(newState, { tags: ['观望行情'] });
          return { state: newState, log: '你看了一阵。涨价不只一家，山中药路大约出了事。' };
        },
      },
      {
        text: '赊账取药',
        effect: (state, random) => {
          let newState = setFlag(state, 'market_price_rise_seen');
          newState.resources = { ...newState.resources, herbs: newState.resources.herbs + 2 };
          newState = adjustQuality(newState, 'market_ties', 2);
          newState = recordMarketKeeper(newState, { tags: ['赊账'], debtsDelta: 1 });
          return { state: newState, log: '掌柜记下一笔账，给了两包草药。账本不会忘。' };
        },
      },
    ],
  },
{
    id: 'dantoxin_in_meridians',
    text: '夜里行气，药滞不散。气机过腕时有细刺，丹毒已经入脉。',
    condition: (state) =>
      state.currentLocationId === 'home' &&
      state.realm === Realm.QiCondensation &&
      state.resources.dantoxin >= 60 &&
      !state.choices.flags['dantoxin_in_meridians_seen'],
    weight: (state) => 36 + Math.min(24, Math.max(0, state.resources.dantoxin - 60)),
    choices: [
      {
        text: '静坐逼毒',
        effect: (state, random) => {
          let newState = setFlag(state, 'dantoxin_in_meridians_seen');

          if (newState.resources.essence < 40) {
            newState.resources = {
              ...newState.resources,
              dantoxin: newState.resources.dantoxin + 2,
              wounds: newState.resources.wounds + 1,
            };
            return { state: newState, log: '精元不足，药气反冲。丹毒更浊，伤添一处。' };
          }

          newState.resources = {
            ...newState.resources,
            essence: newState.resources.essence - 40,
            qi: Math.max(0, newState.resources.qi - 4),
            dantoxin: Math.max(0, newState.resources.dantoxin - 10),
            lifespan: Math.max(0, newState.resources.lifespan - 30),
          };
          newState = setFlag(newState, 'forced_out_dantoxin');
          newState = adjustQuality(newState, 'quiet_cultivation', 1);
          return { state: newState, log: '你闭门一夜，逼出些许药滞。真气折了四缕，寿元少了三十刻。' };
        },
      },
      {
        text: '翻检清躁方',
        effect: (state, random) => {
          let newState = setFlag(state, 'dantoxin_in_meridians_seen');
          newState = setFlag(newState, 'sought_cleansing_formula');
          newState.resources = {
            ...newState.resources,
            insight: newState.resources.insight + (newState.resources.herbs > 0 ? 2 : 1),
            herbs: Math.max(0, newState.resources.herbs - 1),
          };
          newState = adjustQuality(newState, 'alchemy_affinity', 1);
          return { state: newState, log: '你拆了几味旧药，翻出一条清躁的路数。方还不全，但可辨。' };
        },
      },
      {
        text: '强行压下',
        effect: (state, random) => {
          let newState = setFlag(state, 'dantoxin_in_meridians_seen');
          newState = setFlag(newState, 'suppressed_dantoxin_heat');
          newState.resources = {
            ...newState.resources,
            qi: newState.resources.qi + 2,
            dantoxin: newState.resources.dantoxin + 5,
            wounds: newState.resources.wounds + 1,
          };
          newState = adjustQuality(newState, 'reckless_breakthrough', 2);
          return { state: newState, log: '你把药气硬压入丹田。真气浮起两缕，脉里多了一处暗伤。' };
        },
      },
    ],
  },
{
    id: 'market_foundation_debt',
    text: '坊市掌柜把一只旧木盒推到柜前。盒上无丹，只有账。',
    condition: (state) =>
      state.currentLocationId === 'market' &&
      state.choices.tags['market_debt'] === 'foundation_pill' &&
      !state.choices.flags['market_foundation_debt_seen'],
    weight: (state) => 24 + (state.choices.qualities['market_ties'] ?? 0) * 3,
    choices: [
      {
        text: '付清丹账（十二钱）',
        effect: (state, random) => {
          let newState = setFlag(state, 'market_foundation_debt_seen');

          if (newState.resources.coins < 12) {
            newState = recordMarketKeeper(newState, { tags: ['筑基丹账未清'], debtsDelta: 1 });
            return { state: newState, log: '钱不够。掌柜合上木盒，账仍在。' };
          }

          newState.resources = { ...newState.resources, coins: newState.resources.coins - 12 };
          newState = removeTag(newState, 'market_debt');
          newState = setFlag(newState, 'foundation_debt_settled');
          newState = setFlag(newState, 'foundation_pill_debt_open', false);
          newState = adjustQuality(newState, 'market_ties', 1);
          newState = recordMarketKeeper(newState, { tags: ['筑基丹账清'] });
          return { state: newState, log: '十二枚钱入账。掌柜划去旧页，没有多说。' };
        },
      },
      {
        text: '再记一笔',
        effect: (state, random) => {
          let newState = setFlag(state, 'market_foundation_debt_seen');
          newState = setFlag(newState, 'foundation_debt_delayed');
          newState = adjustQuality(newState, 'market_ties', -1);
          newState = adjustQuality(newState, 'karmic_weight', 1);
          newState = recordMarketKeeper(newState, { tags: ['筑基丹账拖延'], debtsDelta: 2 });
          return { state: newState, log: '掌柜添了两笔小字。坊市的价目往后未必照旧。' };
        },
      },
      {
        text: '避开掌柜',
        effect: (state, random) => {
          let newState = setFlag(state, 'market_foundation_debt_seen');
          newState.resources = { ...newState.resources, essence: Math.max(0, newState.resources.essence - 10) };
          newState = setFlag(newState, 'avoided_foundation_debt');
          newState = adjustQuality(newState, 'market_ties', -2);
          newState = recordMarketKeeper(newState, { tags: ['避过筑基丹账'], debtsDelta: 1 });
          return { state: newState, log: '你绕过柜台。十步路没有代价，旧账有。' };
        },
      },
    ],
  },
{
    id: 'foundation_debt_collector',
    text: '坊市来了催账人。掌柜把旧账翻出来，利上加利，十六钱。',
    condition: (state) =>
      state.currentLocationId === 'market' &&
      Boolean(state.choices.flags['foundation_debt_delayed']) &&
      !state.choices.flags['foundation_debt_collector_seen'],
    weight: (state) => 20 + (state.choices.qualities['market_ties'] ?? 0) * (-2) + (state.choices.qualities['karmic_weight'] ?? 0) * 4,
    choices: [
      {
        text: '付清本息（十六钱）',
        effect: (state, random) => {
          let newState = setFlag(state, 'foundation_debt_collector_seen');

          if (newState.resources.coins < 16) {
            const paid = newState.resources.coins;
            newState.resources = {
              ...newState.resources,
              coins: 0,
            };
            newState = adjustQuality(newState, 'karmic_weight', 1);
            return { state: newState, log: `你把身上${paid}枚钱全交了。还不够。账仍在，人仍在等。` };
          }

          newState.resources = { ...newState.resources, coins: newState.resources.coins - 16 };
          newState = removeTag(newState, 'market_debt');
          newState = setFlag(newState, 'foundation_debt_fully_settled');
          newState = adjustQuality(newState, 'market_ties', 2);
          return { state: newState, log: '十六枚钱交清。催账人合上薄簿，坊市的门照开。' };
        },
      },
      {
        text: '再拖一期',
        effect: (state, random) => {
          let newState = setFlag(state, 'foundation_debt_collector_seen');
          newState = setFlag(newState, 'foundation_debt_delayed_again');
          newState = adjustQuality(newState, 'karmic_weight', 2);
          newState = adjustQuality(newState, 'market_ties', -2);
          return { state: newState, log: '你又拖了一期。催账人没有多话，但坊市的人情又薄了一层。' };
        },
      },
      {
        text: '抵药还账',
        effect: (state, random) => {
          let newState = setFlag(state, 'foundation_debt_collector_seen');

          if (newState.resources.herbs < 8) {
            return { state: newState, log: '药不够。催账人看了你一眼，没有接话。' };
          }

          newState.resources = { ...newState.resources, herbs: newState.resources.herbs - 8 };
          newState = removeTag(newState, 'market_debt');
          newState = setFlag(newState, 'paid_debt_in_herbs');
          newState = adjustQuality(newState, 'alchemy_affinity', 1);
          return { state: newState, log: '八味药抵了旧账。催账人收走草药，坊市不再追。' };
        },
      },
    ],
  },
{
    id: 'dantoxin_meridian_decay',
    text: '药毒蚀脉。行气时经脉如有针扎，丹田处一片灰浊。气机每过一处都带着苦意。',
    condition: (state) =>
      state.currentLocationId === 'home' &&
      state.resources.dantoxin >= 100 &&
      !state.choices.flags['dantoxin_meridian_decay_seen'],
    weight: (state) => 40 + Math.max(0, state.resources.dantoxin - 100),
    choices: [
      {
        text: '静坐逼毒',
        effect: (state, random) => {
          let newState = setFlag(state, 'dantoxin_meridian_decay_seen');

          if (newState.resources.essence < 50) {
            newState.resources = {
              ...newState.resources,
              dantoxin: newState.resources.dantoxin + 3,
              wounds: newState.resources.wounds + 2,
            };
            return { state: newState, log: '精元不足，药毒反噬。经脉灼痛，伤添两处。' };
          }

          newState.resources = {
            ...newState.resources,
            essence: newState.resources.essence - 50,
            dantoxin: Math.max(0, newState.resources.dantoxin - 15),
            lifespan: Math.max(0, newState.resources.lifespan - 50),
          };
          newState = adjustQuality(newState, 'quiet_cultivation', 1);
          return { state: newState, log: '你逼出一缕灰浊之气。丹毒退了十五分，寿元折了五十刻。' };
        },
      },
      {
        text: '服通脉丸',
        effect: (state, random) => {
          let newState = setFlag(state, 'dantoxin_meridian_decay_seen');

          if (newState.resources.meridianCleansingPills <= 0) {
            newState.resources = {
              ...newState.resources,
              dantoxin: newState.resources.dantoxin + 3,
              wounds: newState.resources.wounds + 1,
            };
            return { state: newState, log: '没有通脉丸。药毒仍在脉中游走，伤添一处。' };
          }

          newState.resources = {
            ...newState.resources,
            meridianCleansingPills: newState.resources.meridianCleansingPills - 1,
            dantoxin: Math.max(0, newState.resources.dantoxin - 30),
            essence: newState.resources.essence - 20,
          };
          newState = setFlag(newState, 'used_meridian_cleansing_pill_on_decay');
          newState = adjustQuality(newState, 'quiet_cultivation', 1);
          newState = adjustQuality(newState, 'reckless_breakthrough', -1);
          return { state: newState, log: '通脉丸入喉，苦意下行。丹毒退了三十分，脉中刺痛渐消。' };
        },
      },
      {
        text: '强行压下',
        effect: (state, random) => {
          let newState = setFlag(state, 'dantoxin_meridian_decay_seen');
          newState.resources = {
            ...newState.resources,
            dantoxin: newState.resources.dantoxin + 5,
            wounds: newState.resources.wounds + 1,
          };
          newState = adjustQuality(newState, 'reckless_breakthrough', 2);
          return { state: newState, log: '你强行将药毒压回丹田。脉中多了一处暗伤。' };
        },
      },
    ],
  },
{
    id: 'alchemist_insight',
    text: '静中翻检旧方，忽然觉得从前未悟的药理有了几分明朗。几味药的走向在脑中排开，像拼图落位。',
    condition: (state) =>
      state.currentLocationId === 'home' &&
      state.realm === Realm.FoundationEstablishment &&
      (state.choices.qualities['alchemy_affinity'] ?? 0) >= 8 &&
      !state.choices.flags['alchemist_insight_seen'],
    weight: (state) => 8 + (state.choices.qualities['alchemy_affinity'] ?? 0),
    choices: [
      {
        text: '研习新方',
        effect: (state, random) => {
          let newState = setFlag(state, 'alchemist_insight_seen');
          newState = setFlag(newState, 'sought_meridian_cleansing_formula');
          newState.resources = {
            ...newState.resources,
            insight: newState.resources.insight + 3,
          };
          newState = adjustQuality(newState, 'alchemy_affinity', 1);
          return { state: newState, log: '你循着感悟，翻出一条通脉的路数。见闻涨了三分。' };
        },
      },
      {
        text: '整理旧方',
        effect: (state, random) => {
          let newState = setFlag(state, 'alchemist_insight_seen');
          newState.resources = {
            ...newState.resources,
            insight: newState.resources.insight + 2,
            dantoxin: Math.max(0, newState.resources.dantoxin - 5),
          };
          newState = adjustQuality(newState, 'alchemy_affinity', 1);
          return { state: newState, log: '你将旧方中的偏差逐一修正。丹毒退了五分，见闻涨了两分。' };
        },
      },
    ],
  },
{
    id: 'herb_valley_rumor',
    text: '山路上有人提起一处终年不散的药谷，雾气里隐约可见奇草。',
    condition: (state) =>
      (state.currentLocationId === 'market' || state.currentLocationId === 'mountain_path') &&
      state.choices.flags['heard_herb_slope_hint'] &&
      !state.secretRealm.discoveredRealms.includes('misty_herb_valley'),
    weight: () => 18,
    choices: [
      {
        text: '记下路径',
        effect: (state, random) => {
          let newState = discoverRealm(state, 'misty_herb_valley');
          newState = setFlag(newState, 'has_discovered_realm');
          newState.resources = { ...newState.resources, insight: newState.resources.insight + 1 };
          return { state: newState, log: '你记下通往雾中药谷的路径。日后可往探索。' };
        },
      },
      {
        text: '听听便罢',
        effect: (state, random) => {
          let newState = setFlag(state, 'herb_valley_rumor_heard');
          newState.resources = { ...newState.resources, insight: newState.resources.insight + 1 };
          return { state: newState, log: '你听了几句，没往心里去。' };
        },
      },
    ],
  },
{
    id: 'herb_valley_discovery',
    text: '雾中出现了岔路。左边药香更浓，右边有隐约的水声。',
    condition: (state) =>
      state.secretRealm.activeExploration === 'misty_herb_valley' &&
      state.secretRealm.explorationProgress >= 40 &&
      !state.choices.flags['herb_valley_discovery_seen'],
    weight: () => 80,
    choices: [
      {
        text: '循药香深入',
        effect: (state, random) => {
          let newState = setFlag(state, 'herb_valley_discovery_seen');
          newState.resources = { ...newState.resources, herbs: newState.resources.herbs + 3 };
          newState = adjustQuality(newState, 'alchemy_affinity', 1);
          return { state: newState, log: '药香尽头是一片古药圃。你采了几株不常见的草药。' };
        },
      },
      {
        text: '循水声而行',
        effect: (state, random) => {
          let newState = setFlag(state, 'herb_valley_discovery_seen');
          newState.resources = { ...newState.resources, insight: newState.resources.insight + 2 };
          return { state: newState, log: '水声引你到一处灵泉。饮了一口，神识清明了些。' };
        },
      },
    ],
  },
{
    id: 'herb_slope_seasonal_bloom',
    text: (state) => {
      if (state.time.season === Season.Spring) return '药坡上春花初放，嫩叶含露。几味常用药草正到采摘窗口。';
      if (state.time.season === Season.Summer) return '药坡夏草茂盛，虫鸣不绝。几株灰茎花开得正旺。';
      if (state.time.season === Season.Autumn) return '秋深了，药坡上只剩几株老根。叶落药沉，正是收根的好时候。';
      return '冬寒覆药坡，只有白石衣在石壁上微微反光。';
    },
    condition: (state) =>
      state.currentLocationId === 'herb_slope' &&
      !state.choices.flags[`herb_bloom_${state.time.season}_seen`],
    weight: (state) => 16 + (state.choices.qualities['alchemy_affinity'] ?? 0) * 2,
    choices: [
      {
        text: '按时采药',
        effect: (state, random) => {
          let newState = setFlag(state, `herb_bloom_${state.time.season}_seen`);
          newState.resources = {
            ...newState.resources,
            herbs: newState.resources.herbs + 3,
            dantoxin: newState.resources.dantoxin + 1,
          };
          newState = adjustQuality(newState, 'alchemy_affinity', 1);
          return { state: newState, log: '你按季采药。草药添了三株，药滞也多了一分。' };
        },
      },
      {
        text: '只采一味',
        effect: (state, random) => {
          let newState = setFlag(state, `herb_bloom_${state.time.season}_seen`);
          newState.resources = {
            ...newState.resources,
            herbs: newState.resources.herbs + 1,
            insight: newState.resources.insight + 1,
          };
          return { state: newState, log: '你只采一味。药性纯粹，见闻也长了一些。' };
        },
      },
      {
        text: '留药不采',
        effect: (state, random) => {
          let newState = setFlag(state, `herb_bloom_${state.time.season}_seen`);
          newState = adjustQuality(newState, 'quiet_cultivation', 1);
          return { state: newState, log: '你没有动手。药草自生自落，你的心静了一些。' };
        },
      },
    ],
  },
{
    id: 'herb_slope_pest',
    text: '药坡上几株草药叶面有虫蛀痕迹。不处理，虫害可能蔓延。',
    condition: (state) =>
      state.currentLocationId === 'herb_slope' &&
      state.resources.herbs > 3 &&
      !state.choices.flags['herb_pest_seen'],
    weight: () => 10,
    choices: [
      {
        text: '花药除虫',
        effect: (state, random) => {
          let newState = setFlag(state, 'herb_pest_seen');
          newState.resources = {
            ...newState.resources,
            herbs: Math.max(0, newState.resources.herbs - 2),
          };
          newState = adjustQuality(newState, 'alchemy_affinity', 1);
          return { state: newState, log: '你用了两株草药制了驱虫粉。虫害止住，炼药的手法也精了一些。' };
        },
      },
      {
        text: '手动摘虫',
        effect: (state, random) => {
          let newState = setFlag(state, 'herb_pest_seen');
          newState.resources = {
            ...newState.resources,
            essence: Math.max(0, newState.resources.essence - 10),
            herbs: newState.resources.herbs + 1,
          };
          return { state: newState, log: '你蹲下逐只摘虫。精元耗了些，但护住了一株好药。' };
        },
      },
      {
        text: '不管',
        effect: (state, random) => {
          let newState = setFlag(state, 'herb_pest_seen');
          newState.resources = {
            ...newState.resources,
            herbs: Math.max(0, newState.resources.herbs - 3),
          };
          return { state: newState, log: '你没有管。几日后虫害蔓延，损了三株草药。' };
        },
      },
    ],
  },
{
    id: 'herb_slope_rival_gatherer',
    text: '药坡另一头有人也在采药。那人手法很快，几处好药已被他先取。',
    condition: (state) =>
      state.currentLocationId === 'herb_slope' &&
      !state.choices.flags['met_rival_gatherer'],
    weight: (state) => 12 + (state.choices.qualities['market_ties'] ?? 0) * 2,
    choices: [
      {
        text: '各采各的',
        effect: (state, random) => {
          let newState = setFlag(state, 'met_rival_gatherer');
          newState.resources = {
            ...newState.resources,
            herbs: newState.resources.herbs + 1,
          };
          return { state: newState, log: '你各采各的。好药不多，但你还是找到了一株。' };
        },
      },
      {
        text: '交涉分药',
        effect: (state, random) => {
          let newState = setFlag(state, 'met_rival_gatherer');
          if (newState.resources.coins >= 3) {
            newState.resources = {
              ...newState.resources,
              coins: newState.resources.coins - 3,
              herbs: newState.resources.herbs + 4,
            };
            newState = adjustQuality(newState, 'market_ties', 1);
            return { state: newState, log: '你花三枚钱分了他一半。草药添了四株，坊市路子也宽了。' };
          }
          newState.resources = {
            ...newState.resources,
            herbs: newState.resources.herbs + 1,
          };
          return { state: newState, log: '你钱不够，对方不理。你只找到一株。' };
        },
      },
      {
        text: '先到先得',
        effect: (state, random) => {
          let newState = setFlag(state, 'met_rival_gatherer');
          newState.resources = {
            ...newState.resources,
            herbs: newState.resources.herbs + 3,
            wounds: newState.resources.wounds + 1,
          };
          newState = adjustQuality(newState, 'combat_edge', 1);
          newState = adjustQuality(newState, 'karmic_weight', 1);
          return { state: newState, log: '你抢先采了三株。对方推了你一把，添了一处伤。因果重了一分。' };
        },
      },
    ],
  },
{
    id: 'spirit_field_sprout',
    text: '灵田中冒出一丛新芽，叶片上有淡金纹路，药香比寻常浓郁数倍。',
    condition: (state) =>
      state.currentLocationId === 'spirit_field' &&
      state.time.season === Season.Spring &&
      !state.choices.flags['spirit_field_sprout_seen'],
    weight: (state) => 12 + (state.choices.qualities['alchemy_affinity'] ?? 0) * 2,
    choices: [
      {
        text: '悉心采摘',
        effect: (state, random) => {
          let newState = setFlag(state, 'spirit_field_sprout_seen');
          newState.resources = { ...newState.resources, herbs: newState.resources.herbs + 5 };
          newState = adjustQuality(newState, 'alchemy_affinity', 1);
          return { state: newState, log: '你将新芽连根采下。草药多了五株，药力较常品浓厚。' };
        },
      },
      {
        text: '留根培土',
        effect: (state, random) => {
          let newState = setFlag(state, 'spirit_field_sprout_seen');
          newState.resources = { ...newState.resources, herbs: newState.resources.herbs + 2, insight: newState.resources.insight + 2 };
          newState = setFlag(newState, 'tended_spirit_sprout');
          newState = adjustQuality(newState, 'alchemy_affinity', 2);
          return { state: newState, log: '你只取两株，余下培土护根。日后或可再采。' };
        },
      },
      {
        text: '以灵气温养',
        effect: (state, random) => {
          let newState = setFlag(state, 'spirit_field_sprout_seen');
          newState.resources = { ...newState.resources, qi: Math.max(0, newState.resources.qi - 3), insight: newState.resources.insight + 3 };
          newState = adjustQuality(newState, 'quiet_cultivation', 1);
          return { state: newState, log: '你渡出三缕真气温养新芽。草药未取，见闻却长了三分。' };
        },
      },
    ],
  },
{
    id: 'spirit_field_pest',
    text: '灵田叶面出现虫蛀痕迹，几只黑背甲虫正在啃食灵草根茎。若不驱除，恐蔓延整片田。',
    condition: (state) =>
      state.currentLocationId === 'spirit_field' &&
      state.time.season === Season.Summer &&
      !state.choices.flags['spirit_field_pest_seen'],
    weight: (state) => 10 + (state.choices.qualities['alchemy_affinity'] ?? 0),
    choices: [
      {
        text: '以药驱虫',
        effect: (state, random) => {
          let newState = setFlag(state, 'spirit_field_pest_seen');
          if (newState.resources.herbs < 2) {
            newState.resources = { ...newState.resources, herbs: Math.max(0, newState.resources.herbs - 1) };
            return { state: newState, log: '药不够，虫只退了一半。灵田损失了一株。' };
          }
          newState.resources = { ...newState.resources, herbs: newState.resources.herbs - 2 };
          newState = setFlag(newState, 'pest_driven_off');
          newState = adjustQuality(newState, 'alchemy_affinity', 1);
          return { state: newState, log: '两味药熏走甲虫。灵田保住了，药也花了。' };
        },
      },
      {
        text: '亲手捉虫',
        effect: (state, random) => {
          let newState = setFlag(state, 'spirit_field_pest_seen');
          newState.resources = { ...newState.resources, essence: Math.max(0, newState.resources.essence - 10) };
          newState = setFlag(newState, 'pest_hand_picked');
          return { state: newState, log: '你蹲在田边捉了半日虫。精元折了十分，灵田无恙。' };
        },
      },
      {
        text: '不管',
        effect: (state, random) => {
          let newState = setFlag(state, 'spirit_field_pest_seen');
          newState.resources = { ...newState.resources, herbs: Math.max(0, newState.resources.herbs - 3) };
          return { state: newState, log: '你没有理会。虫啃了三株灵草，田里少了几分药香。' };
        },
      },
    ],
  },
{
    id: 'pill_hall_furnace_accident',
    text: '丹房炉火骤然暴涨，炉身发出嗡鸣。一股焦糊味弥漫开来，走炉了。',
    condition: (state) =>
      state.currentLocationId === 'pill_hall' &&
      !state.choices.flags['pill_hall_furnace_accident_seen'],
    weight: (state) => 8 + (state.choices.qualities['alchemy_affinity'] ?? 0) * 2,
    choices: [
      {
        text: '强行封炉',
        effect: (state, random) => {
          let newState = setFlag(state, 'pill_hall_furnace_accident_seen');
          newState.resources = { ...newState.resources, essence: Math.max(0, newState.resources.essence - 15), herbs: Math.max(0, newState.resources.herbs - 2) };
          newState = adjustQuality(newState, 'alchemy_affinity', 1);
          return { state: newState, log: '你以真气强压炉火。药材烧了二份，精元也折了十五，但炉未炸。' };
        },
      },
      {
        text: '放炉自灭',
        effect: (state, random) => {
          let newState = setFlag(state, 'pill_hall_furnace_accident_seen');
          newState.resources = { ...newState.resources, herbs: Math.max(0, newState.resources.herbs - 4) };
          return { state: newState, log: '你退开一步。炉火自行燃尽，四份药材报废。人无碍。' };
        },
      },
      {
        text: '趁势收丹',
        effect: (state, random) => {
          let newState = setFlag(state, 'pill_hall_furnace_accident_seen');
          if ((state.choices.qualities['alchemy_affinity'] ?? 0) >= 6) {
            newState.resources = { ...newState.resources, qi: newState.resources.qi + 3, dantoxin: newState.resources.dantoxin + 3 };
            newState = adjustQuality(newState, 'alchemy_affinity', 1);
            return { state: newState, log: '你趁火势转收残丹。真气多了三缕，但丹毒也涨了三分——药性偏了。' };
          }
          newState.resources = { ...newState.resources, wounds: newState.resources.wounds + 1, herbs: Math.max(0, newState.resources.herbs - 3) };
          return { state: newState, log: '药理不够，收丹失手。炸炉灼伤，药材全废。' };
        },
      },
    ],
  },
{
    id: 'pill_hall_master_teaching',
    text: '丹房深处，一位师尊正在论丹。几位弟子围坐，炉火照得众人面色忽明忽暗。',
    condition: (state) =>
      state.currentLocationId === 'pill_hall' &&
      realmAtLeast(state, Realm.FoundationEstablishment) &&
      !state.choices.flags['pill_hall_master_teaching_seen'],
    weight: (state) => 6 + (state.choices.qualities['alchemy_affinity'] ?? 0),
    choices: [
      {
        text: '旁听论丹',
        effect: (state, random) => {
          let newState = setFlag(state, 'pill_hall_master_teaching_seen');
          newState.resources = { ...newState.resources, insight: newState.resources.insight + 4 };
          newState = adjustQuality(newState, 'alchemy_affinity', 2);
          return { state: newState, log: '你听了一个时辰。药理上的几处关节忽然通了，见闻涨了四分。' };
        },
      },
      {
        text: '请教师尊',
        effect: (state, random) => {
          let newState = setFlag(state, 'pill_hall_master_teaching_seen');
          newState.resources = { ...newState.resources, insight: newState.resources.insight + 2, dantoxin: Math.max(0, newState.resources.dantoxin - 3) };
          newState = setFlag(newState, 'received_pill_hall_guidance');
          newState = adjustQuality(newState, 'alchemy_affinity', 1);
          return { state: newState, log: '师尊指出你炼丹中的几处偏差。丹毒退了三分，见闻涨了两分。' };
        },
      },
    ],
  },
{
    id: 'spirit_field_maze_discovery',
    text: '灵田深处，泥土下隐约传来嗡嗡震鸣。你循声挖开表土，发现一面上古阵盘，纹路复杂如迷宫。',
    condition: (state) =>
      (state.currentLocationId === 'spirit_field' || state.currentLocationId === 'herb_slope') &&
      realmAtLeast(state, Realm.QiCondensation) &&
      !state.secretRealm.discoveredRealms.includes('spirit_field_maze') &&
      (state.choices.qualities['alchemy_affinity'] ?? 0) >= 3,
    weight: () => 10,
    choices: [
      {
        text: '深入探查',
        effect: (state, random) => {
          let newState = discoverRealm(state, 'spirit_field_maze');
          newState = setFlag(newState, 'has_discovered_realm');
          newState.resources = { ...newState.resources, insight: newState.resources.insight + 2 };
          return { state: newState, log: '你沿着阵盘纹路前行，发现了灵田迷阵的入口。草药与阵法并存。' };
        },
      },
      {
        text: '记下位置',
        effect: (state, random) => {
          let newState = setFlag(state, 'spirit_field_maze_hint');
          newState.resources = { ...newState.resources, insight: newState.resources.insight + 1 };
          return { state: newState, log: '你记下阵盘位置。灵田迷阵仍在暗处。' };
        },
      },
    ],
  },
{
    id: 'spirit_field_maze_chain',
    text: '迷阵中，石板路忽然分作三条。左边药香最浓，中间有阵光闪烁，右边漆黑无声。',
    condition: (state) =>
      state.secretRealm.activeExploration === 'spirit_field_maze' &&
      state.secretRealm.explorationProgress >= 30 &&
      !state.choices.flags['spirit_field_maze_chain_seen'],
    weight: () => 80,
    choices: [
      {
        text: '循药香',
        effect: (state, random) => {
          let newState = setFlag(state, 'spirit_field_maze_chain_seen');
          newState.resources = { ...newState.resources, herbs: newState.resources.herbs + 5 };
          newState = adjustQuality(newState, 'alchemy_affinity', 1);
          return { state: newState, log: '药香尽头是一片上古药圃。你采了五味灵草。' };
        },
      },
      {
        text: '循阵光',
        effect: (state, random) => {
          let newState = setFlag(state, 'spirit_field_maze_chain_seen');
          newState.resources = { ...newState.resources, insight: newState.resources.insight + 3, qi: newState.resources.qi + 3 };
          return { state: newState, log: '阵光处是一座古阵核心。你参悟了一丝阵理，真气和见闻都有增长。' };
        },
      },
      {
        text: '入暗路',
        effect: (state, random) => {
          let newState = setFlag(state, 'spirit_field_maze_chain_seen');
          newState.resources = { ...newState.resources, coins: newState.resources.coins + 10, wounds: newState.resources.wounds + 1 };
          return { state: newState, log: '暗路尽头有一具骸骨和十枚钱。你拿了钱，但触发了机关，伤添一处。' };
        },
      },
    ],
  },
{
    id: 'spirit_field_blight',
    text: '灵田一角忽然枯萎。灵草叶片发黑，根部渗出暗色的液体。灵气枯竭之兆。',
    condition: (state) =>
      state.currentLocationId === 'spirit_field' &&
      !state.choices.flags['spirit_field_blight_seen'],
    weight: () => 10,
    choices: [
      {
        text: '切除枯萎部分',
        effect: (state, random) => {
          let newState = setFlag(state, 'spirit_field_blight_seen');
          newState.resources = {
            ...newState.resources,
            herbs: Math.max(0, newState.resources.herbs - 3),
            insight: newState.resources.insight + 2,
          };
          return { state: newState, log: '你切除枯萎灵草。药草少了三株，但枯萎不再蔓延。见闻长了二分。' };
        },
      },
      {
        text: '以灵力净化',
        effect: (state, random) => {
          let newState = setFlag(state, 'spirit_field_blight_seen');
          newState.resources = {
            ...newState.resources,
            qi: Math.max(0, newState.resources.qi - 10),
            herbs: Math.max(0, newState.resources.herbs - 1),
          };
          return { state: newState, log: '你以灵力净化灵田。真气折十缕，药草只少了一株，枯败之气已散。' };
        },
      },
      {
        text: '听之任之',
        effect: (state, random) => {
          let newState = setFlag(state, 'spirit_field_blight_seen');
          newState.resources = { ...newState.resources, herbs: Math.max(0, newState.resources.herbs - 5) };
          return { state: newState, log: '你没有理会。枯萎蔓延，药草少了五株。灵田需要照料。' };
        },
      },
    ],
  },
{
    id: 'spirit_field_spirit_rain',
    text: '天降灵雨。雨滴落在灵田中，每一滴都带着浓郁的灵气，灵草如饥似渴地吸收。',
    condition: (state) =>
      state.currentLocationId === 'spirit_field' &&
      !state.choices.flags['spirit_field_spirit_rain_seen'],
    weight: () => 12,
    choices: [
      {
        text: '接灵雨入田',
        effect: (state, random) => {
          let newState = setFlag(state, 'spirit_field_spirit_rain_seen');
          newState.resources = {
            ...newState.resources,
            herbs: newState.resources.herbs + 5,
            qi: newState.resources.qi + 3,
          };
          return { state: newState, log: '灵雨润田。药草多了五株，真气多了三缕。天赐之福。' };
        },
      },
      {
        text: '自身沐浴灵雨',
        effect: (state, random) => {
          let newState = setFlag(state, 'spirit_field_spirit_rain_seen');
          newState.resources = {
            ...newState.resources,
            qi: newState.resources.qi + 5,
            herbs: newState.resources.herbs + 2,
          };
          return { state: newState, log: '你在灵雨中沐浴。真气多了五缕，药草多了两株。身心俱润。' };
        },
      },
    ],
  },
{
    id: 'spirit_field_pest_infestation',
    text: '灵田中出现了虫害。灵虫啃食灵草根茎，叶片残缺不全。',
    condition: (state) =>
      state.currentLocationId === 'spirit_field' &&
      !state.choices.flags['spirit_field_pest_infestation_seen'],
    weight: () => 8,
    choices: [
      {
        text: '以灵力驱虫',
        effect: (state, random) => {
          let newState = setFlag(state, 'spirit_field_pest_infestation_seen');
          newState.resources = {
            ...newState.resources,
            qi: Math.max(0, newState.resources.qi - 5),
            herbs: Math.max(0, newState.resources.herbs - 1),
          };
          return { state: newState, log: '你以灵力驱除灵虫。真气折五缕，药草只损了一株。虫害暂止。' };
        },
      },
      {
        text: '采摘残余灵草',
        effect: (state, random) => {
          let newState = setFlag(state, 'spirit_field_pest_infestation_seen');
          newState.resources = { ...newState.resources, herbs: Math.max(0, newState.resources.herbs - 3) };
          return { state: newState, log: '你抢收残余灵草。药草还是少了三株，但至少没全毁。' };
        },
      },
    ],
  },
{
    id: 'pill_hall_furnace_accident',
    text: '丹炉忽然震动，炉口喷出一股灼热的药气。炼丹似乎出了差错。',
    condition: (state) =>
      state.currentLocationId === 'pill_hall' &&
      !state.choices.flags['pill_hall_furnace_accident_seen'],
    weight: () => 10,
    choices: [
      {
        text: '紧急封炉',
        effect: (state, random) => {
          let newState = setFlag(state, 'pill_hall_furnace_accident_seen');
          newState.resources = {
            ...newState.resources,
            herbs: Math.max(0, newState.resources.herbs - 2),
            dantoxin: newState.resources.dantoxin + 2,
          };
          return { state: newState, log: '你紧急封炉。药草损了两株，药气反噬令丹毒增了两分。炉子保住了。' };
        },
      },
      {
        text: '趁机取丹',
        effect: (state, random) => {
          let newState = setFlag(state, 'pill_hall_furnace_accident_seen');
          newState.resources = {
            ...newState.resources,
            herbs: Math.max(0, newState.resources.herbs - 3),
            dantoxin: newState.resources.dantoxin + 4,
            wounds: newState.resources.wounds + 1,
          };
          newState = adjustQuality(newState, 'alchemy_affinity', 2);
          return { state: newState, log: '你趁药气未散强行取丹。药草损三株，伤添一处，丹毒增四分。但你从中领悟了火候的微妙。' };
        },
      },
      {
        text: '撤离丹房',
        effect: (state, random) => {
          let newState = setFlag(state, 'pill_hall_furnace_accident_seen');
          newState.resources = { ...newState.resources, herbs: Math.max(0, newState.resources.herbs - 4) };
          return { state: newState, log: '你撤离丹房。炉中丹药全毁，药草损了四株。安全第一。' };
        },
      },
    ],
  },
{
    id: 'pill_hall_senior_guidance',
    text: '丹房中一位资深炼丹师正在调炉。他看了你的操作，微微摇头。',
    condition: (state) =>
      state.currentLocationId === 'pill_hall' &&
      !state.choices.flags['pill_hall_senior_guidance_seen'],
    weight: () => 10,
    choices: [
      {
        text: '虚心请教',
        effect: (state, random) => {
          let newState = setFlag(state, 'pill_hall_senior_guidance_seen');
          newState.resources = { ...newState.resources, insight: newState.resources.insight + 4 };
          newState = adjustQuality(newState, 'alchemy_affinity', 2);
          return { state: newState, log: '你虚心请教。前辈指点了几处关键火候，见闻长了四分，丹道理解深了。' };
        },
      },
      {
        text: '在一旁观察',
        effect: (state, random) => {
          let newState = setFlag(state, 'pill_hall_senior_guidance_seen');
          newState.resources = { ...newState.resources, insight: newState.resources.insight + 2 };
          newState = adjustQuality(newState, 'alchemy_affinity', 1);
          return { state: newState, log: '你默默观察前辈的手法。见闻长了二分，有些门道还需自悟。' };
        },
      },
    ],
  },
{
    id: 'pill_hall_waste_residue',
    text: '丹房角落堆着一些炼丹废渣。其中似有残余药性，尚未完全散尽。',
    condition: (state) =>
      state.currentLocationId === 'pill_hall' &&
      !state.choices.flags['pill_hall_waste_residue_seen'],
    weight: () => 6,
    choices: [
      {
        text: '提取残余药性',
        effect: (state, random) => {
          let newState = setFlag(state, 'pill_hall_waste_residue_seen');
          newState.resources = {
            ...newState.resources,
            herbs: newState.resources.herbs + 2,
            dantoxin: newState.resources.dantoxin + 2,
          };
          newState = adjustQuality(newState, 'alchemy_affinity', 1);
          return { state: newState, log: '你从废渣中提取出残余药性。草药添了两株，丹毒增了两分。废物利用。' };
        },
      },
      {
        text: '清理废渣',
        effect: (state, random) => {
          let newState = setFlag(state, 'pill_hall_waste_residue_seen');
          newState.resources = { ...newState.resources, insight: newState.resources.insight + 1 };
          return { state: newState, log: '你清理了废渣。丹房整洁了，见闻也长了一分。' };
        },
      },
    ],
  }
];
