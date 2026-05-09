import { GameState, Resources, Realm } from '../types';
import { ACTIONS } from '../../content/actions';
import {
  applyAlchemyOutputModifiers,
  brewRecipe,
  BUDDHA_HEART_PILL_RECIPE_ID,
  CLEANSING_PILL_RECIPE_ID,
  CLOUD_GATHERING_PILL_RECIPE_ID,
  consumePill,
  DEMON_BANE_PILL_RECIPE_ID,
  FIRE_FURNACE_PILL_RECIPE_ID,
  FOUNDATION_EXPLOSION_PILL_RECIPE_ID,
  FOUNDATION_STRENGTHENING_PILL_RECIPE_ID,
  IRON_BODY_PILL_RECIPE_ID,
  learnRecipe,
  LONGEVITY_PILL_RECIPE_ID,
  MERIDIAN_CLEANSING_PILL_RECIPE_ID,
  NIGHT_SITTING_PILL_RECIPE_ID,
  NINE_TURN_FOUNDATION_PILL_RECIPE_ID,
  SHADOW_ESCAPE_PILL_RECIPE_ID,
  SMALL_QI_PILL_RECIPE_ID,
  SPIRIT_GATHERING_PILL_RECIPE_ID,
  SPIRIT_VEIN_PILL_RECIPE_ID,
  STABILIZING_POWDER_RECIPE_ID,
  WARM_FURNACE_PILL_RECIPE_ID,
  GOLDEN_CORE_FORMATION_PILL_RECIPE_ID,
  GOLDEN_CORE_STRENGTHENING_PILL_RECIPE_ID,
  GOLDEN_CORE_FIRE_PILL_RECIPE_ID,
  NASCENT_SOUL_NURTURING_PILL_RECIPE_ID,
  NASCENT_SOUL_SEPARATION_PILL_RECIPE_ID,
  NASCENT_SOUL_PROTECTION_PILL_RECIPE_ID,
  SPIRIT_TRANSFORM_PILL_RECIPE_ID,
  SPIRIT_TRANSFORM_FIRE_PILL_RECIPE_ID,
  INTEGRATION_PILL_RECIPE_ID,
  INTEGRATION_BODY_PILL_RECIPE_ID,
  MAHAYANA_PILL_RECIPE_ID,
  MAHAYANA_ENLIGHTENMENT_PILL_RECIPE_ID,
  TRIBULATION_PROTECTION_PILL_RECIPE_ID,
  HEAVENLY_TRIBULATION_PILL_RECIPE_ID,
  TRIBULATION_SOUL_PILL_RECIPE_ID,

} from '../alchemy';
import { resolveBreakthrough, stabilizeBreakthrough, getNextBreakthroughRule } from '../breakthrough';
import { applyCultivationOutputModifiers, attuneTechnique, revealRoot } from '../cultivation';
import { deriveGameTime, INITIAL_MAX_STAMINA, getMaxStamina } from '../state';
import { RESOURCE_LABELS, RESOURCE_KEYS } from '../resources';
import { advanceWorld, recordActionInWorld } from '../world';
import { REALM_LIFESPAN_DECAY_RATE } from '../tick';
import { revealDaoPath, getDaoPathLabel } from '../daopath';
import { updateKarmicWeight } from '../karma';
import { completeTask, setCurrentTask, registerOuterDisciple } from '../sect';
import { upgradeDwelling as upgradeDwellingLogic, installFormation as installFormationLogic, canUpgradeDwelling, canInstallFormation } from '../dwelling';
import { recruitFollower as recruitFollowerLogic, assignFollowerTask, collectFollowerIncome as collectFollowerIncomeLogic, canRecruitFollower } from '../follower';
import { discoverRealm, beginExploration, advanceExploration, completeExploration, abandonExploration, canExploreRealm, getSecretRealmDef } from '../secretRealm';
import { canAscend, triggerAscensionChoice, executeAscension, shouldShowAscensionThreshold } from '../ascension';
import { confrontDemon, suppressDemon, ignoreDemon } from '../innerDemon';

export { ACTIONS };

export interface ActionResult {
  state: GameState;
  log: string;
  success: boolean;
}

export const ACTION_ROUTE_QUALITIES: Record<string, string> = {
  kuzuo: 'quiet_cultivation',
  tuna: 'quiet_cultivation',
  tiaoxi: 'quiet_cultivation',
  rike_tuna: 'quiet_cultivation',
  short_retreat: 'quiet_cultivation',
  inspect_root: 'quiet_cultivation',
  attune_technique: 'quiet_cultivation',
  study_qi_formula: 'alchemy_affinity',
  study_steady_formula: 'alchemy_affinity',
  study_cleansing_formula: 'alchemy_affinity',
  brew_qi_pill: 'alchemy_affinity',
  brew_stabilizing_powder: 'alchemy_affinity',
  brew_cleansing_pill: 'alchemy_affinity',
  take_qi_pill: 'alchemy_affinity',
  take_stabilizing_powder: 'alchemy_affinity',
  take_cleansing_pill: 'alchemy_affinity',
  study_meridian_cleansing_formula: 'alchemy_affinity',
  brew_meridian_cleansing_pill: 'alchemy_affinity',
  take_meridian_cleansing_pill: 'alchemy_affinity',
  study_foundation_strengthening_formula: 'alchemy_affinity',
  brew_foundation_strengthening_pill: 'alchemy_affinity',
  take_foundation_strengthening_pill: 'alchemy_affinity',
  study_spirit_gathering_formula: 'alchemy_affinity',
  brew_spirit_gathering_pill: 'alchemy_affinity',
  take_spirit_gathering_pill: 'alchemy_affinity',
  study_warm_furnace_formula: 'alchemy_affinity',
  brew_warm_furnace_pill: 'alchemy_affinity',
  take_warm_furnace_pill: 'alchemy_affinity',
  study_night_sitting_formula: 'alchemy_affinity',
  brew_night_sitting_pill: 'alchemy_affinity',
  take_night_sitting_pill: 'alchemy_affinity',
  study_cloud_gathering_formula: 'alchemy_affinity',
  brew_cloud_gathering_pill: 'alchemy_affinity',
  take_cloud_gathering_pill: 'alchemy_affinity',
  study_iron_body_formula: 'alchemy_affinity',
  brew_iron_body_pill: 'alchemy_affinity',
  take_iron_body_pill: 'alchemy_affinity',
  study_demon_bane_formula: 'alchemy_affinity',
  brew_demon_bane_pill: 'alchemy_affinity',
  take_demon_bane_pill: 'alchemy_affinity',
  study_foundation_explosion_formula: 'alchemy_affinity',
  brew_foundation_explosion_pill: 'alchemy_affinity',
  take_foundation_explosion_pill: 'alchemy_affinity',
  study_spirit_vein_formula: 'alchemy_affinity',
  brew_spirit_vein_pill: 'alchemy_affinity',
  take_spirit_vein_pill: 'alchemy_affinity',
  study_shadow_escape_formula: 'alchemy_affinity',
  brew_shadow_escape_pill: 'alchemy_affinity',
  take_shadow_escape_pill: 'alchemy_affinity',
  study_longevity_formula: 'alchemy_affinity',
  brew_longevity_pill: 'alchemy_affinity',
  take_longevity_pill: 'alchemy_affinity',
  study_fire_furnace_formula: 'alchemy_affinity',
  brew_fire_furnace_pill: 'alchemy_affinity',
  take_fire_furnace_pill: 'alchemy_affinity',
  study_nine_turn_foundation_formula: 'alchemy_affinity',
  brew_nine_turn_foundation_pill: 'alchemy_affinity',
  take_nine_turn_foundation_pill: 'alchemy_affinity',
  study_buddha_heart_formula: 'alchemy_affinity',
  brew_buddha_heart_pill: 'alchemy_affinity',
  take_buddha_heart_pill: 'alchemy_affinity',
  // New location action routes
  water_meditation: 'quiet_cultivation',
  collect_night_dew: 'alchemy_affinity',
  explore_ruins: 'combat_edge',
  sweep_temple: 'quiet_cultivation',
  read_stone_tablet: 'quiet_cultivation',
  identify_herb: 'alchemy_affinity',
  protect_seedling: 'alchemy_affinity',
  listen_traveler: 'market_ties',
  hire_boat: 'market_ties',
  stabilize_bottleneck: 'quiet_cultivation',
  breakthrough_qi_2: 'quiet_cultivation',
  breakthrough_qi_3: 'quiet_cultivation',
  breakthrough_qi_4: 'quiet_cultivation',
  breakthrough_qi_5: 'quiet_cultivation',
  breakthrough_qi_6: 'quiet_cultivation',
  breakthrough_qi_7: 'quiet_cultivation',
  breakthrough_qi_8: 'quiet_cultivation',
  breakthrough_qi_9: 'quiet_cultivation',
  breakthrough_foundation: 'quiet_cultivation',
  breakthrough_spirit_transformation: 'quiet_cultivation',
  breakthrough_integration: 'quiet_cultivation',
  breakthrough_mahayana: 'quiet_cultivation',
  breakthrough_tribulation: 'quiet_cultivation',
  withdraw_foundation: 'quiet_cultivation',
  seek_foundation_guardian: 'sect_trace',
  borrow_foundation_pill: 'reckless_breakthrough',
  caiyao: 'alchemy_affinity',
  bianyao: 'alchemy_affinity',
  xunshan: 'combat_edge',
  trade: 'market_ties',
  gossip: 'market_ties',
  sect_chore: 'sect_trace',
  sect_errand: 'sect_trace',
  sect_supply: 'sect_trace',
  sect_roll_call: 'sect_trace',
  sect_patrol: 'sect_trace',
  listen_lesson: 'sect_trace',
  yinqi: 'quiet_cultivation',
  foundation_daily_practice: 'quiet_cultivation',
  inner_gate_rumor: 'sect_trace',
  foundation_meditation: 'quiet_cultivation',
  // F4: Sect deepening
  inner_gate_task: 'sect_trace',
  report_task_completion: 'sect_trace',
  attend_sect_ceremony: 'sect_trace',
  // F5: Dwelling
  establish_dwelling: 'quiet_cultivation',
  upgrade_dwelling: 'quiet_cultivation',
  install_formation: 'quiet_cultivation',
  // F6: Market
  open_market_stall: 'market_ties',
  buy_rare_herbs: 'market_ties',
  // F7: Follower
  recruit_servant: 'sect_trace',
  recruit_disciple: 'sect_trace',
  recruit_guard: 'sect_trace',
  assign_herb_gathering: 'market_ties',
  assign_patrol_duty: 'sect_trace',
  collect_follower_income: 'market_ties',
  // F8: Secret Realm
  explore_secret_realm: 'combat_edge',
  continue_exploration: 'combat_edge',
  claim_exploration_loot: 'quiet_cultivation',
  abandon_exploration: 'quiet_cultivation',
  // F9: Ascension
  attempt_ascension: 'quiet_cultivation',
  golden_core_practice: 'quiet_cultivation',
  nascent_soul_practice: 'quiet_cultivation',
  breakthrough_golden_core: 'quiet_cultivation',
  breakthrough_nascent_soul: 'quiet_cultivation',
  confront_demon: 'quiet_cultivation',
  suppress_demon: 'quiet_cultivation',
  ignore_demon: 'quiet_cultivation',

  study_golden_core_formation_formula: 'alchemy_affinity',
  brew_golden_core_formation_pill: 'alchemy_affinity',
  take_golden_core_formation_pill: 'alchemy_affinity',
  study_golden_core_strengthening_formula: 'alchemy_affinity',
  brew_golden_core_strengthening_pill: 'alchemy_affinity',
  take_golden_core_strengthening_pill: 'alchemy_affinity',
  study_golden_core_fire_formula: 'alchemy_affinity',
  brew_golden_core_fire_pill: 'alchemy_affinity',
  take_golden_core_fire_pill: 'alchemy_affinity',
  study_nascent_soul_nurturing_formula: 'alchemy_affinity',
  brew_nascent_soul_nurturing_pill: 'alchemy_affinity',
  take_nascent_soul_nurturing_pill: 'alchemy_affinity',
  study_nascent_soul_separation_formula: 'alchemy_affinity',
  brew_nascent_soul_separation_pill: 'alchemy_affinity',
  take_nascent_soul_separation_pill: 'alchemy_affinity',
  study_nascent_soul_protection_formula: 'alchemy_affinity',
  brew_nascent_soul_protection_pill: 'alchemy_affinity',
  take_nascent_soul_protection_pill: 'alchemy_affinity',
  study_spirit_transform_formula: 'alchemy_affinity',
  brew_spirit_transform_pill: 'alchemy_affinity',
  take_spirit_transform_pill: 'alchemy_affinity',
  study_spirit_transform_fire_formula: 'alchemy_affinity',
  brew_spirit_transform_fire_pill: 'alchemy_affinity',
  take_spirit_transform_fire_pill: 'alchemy_affinity',
  study_integration_formula: 'alchemy_affinity',
  brew_integration_pill: 'alchemy_affinity',
  take_integration_pill: 'alchemy_affinity',
  study_integration_body_formula: 'alchemy_affinity',
  brew_integration_body_pill: 'alchemy_affinity',
  take_integration_body_pill: 'alchemy_affinity',
  study_mahayana_formula: 'alchemy_affinity',
  brew_mahayana_pill: 'alchemy_affinity',
  take_mahayana_pill: 'alchemy_affinity',
  study_mahayana_enlightenment_formula: 'alchemy_affinity',
  brew_mahayana_enlightenment_pill: 'alchemy_affinity',
  take_mahayana_enlightenment_pill: 'alchemy_affinity',
  study_tribulation_protection_formula: 'alchemy_affinity',
  brew_tribulation_protection_pill: 'alchemy_affinity',
  take_tribulation_protection_pill: 'alchemy_affinity',
  study_heavenly_tribulation_formula: 'alchemy_affinity',
  brew_heavenly_tribulation_pill: 'alchemy_affinity',
  take_heavenly_tribulation_pill: 'alchemy_affinity',
  study_tribulation_soul_formula: 'alchemy_affinity',
  brew_tribulation_soul_pill: 'alchemy_affinity',
  take_tribulation_soul_pill: 'alchemy_affinity',
  // New location action routes
  tend_field: 'alchemy_affinity',
  use_furnace: 'alchemy_affinity',
  receive_mission: 'sect_trace',
  search_altar: 'combat_edge',
  meditate_dark: 'quiet_cultivation',
  mine_crystal: 'alchemy_affinity',
  explore_depths: 'combat_edge',
  drink_tea: 'market_ties',
  listen_rumor: 'market_ties',
  gamble_dice: 'market_ties',
  hunt_beast: 'combat_edge',
  gather_demonic_herb: 'alchemy_affinity',
  set_trap: 'combat_edge',
  cliff_meditation: 'quiet_cultivation',
  face_heavenly_wind: 'quiet_cultivation',
  core_gate_cultivation: 'quiet_cultivation',
  core_gate_exchange: 'market_ties',
  seek_elder_guidance: 'quiet_cultivation',
  spirit_lake_meditation: 'quiet_cultivation',
  dive_for_treasure: 'combat_edge',
  face_tribulation: 'quiet_cultivation',
  thunder_cultivation: 'quiet_cultivation',
  search_battlefield: 'combat_edge',
  commune_with_remnants: 'quiet_cultivation',
  explore_void: 'combat_edge',
  gather_void_essence: 'quiet_cultivation',
  study_celestial_script: 'quiet_cultivation',
  meditate_on_dao: 'quiet_cultivation',
  patrol_seal: 'sect_trace',
  gather_demonic_material: 'alchemy_affinity',
  spirit_mountain_retreat: 'quiet_cultivation',
  comprehend_dao: 'quiet_cultivation',
  face_heavenly_tribulation: 'quiet_cultivation',
  stabilize_dao_foundation: 'quiet_cultivation',
  gather_immortal_herb: 'alchemy_affinity',
  meditate_garden: 'quiet_cultivation',
  plant_herb: 'alchemy_affinity',
  harvest_herb: 'alchemy_affinity',
  study_advanced_formula: 'alchemy_affinity',
  practice_sword: 'combat_edge',
  observe_sword_intent: 'combat_edge',
  attend_ceremony: 'sect_trace',
  meditate_detox: 'quiet_cultivation',
  spirit_transformation_practice: 'quiet_cultivation',
  integration_practice: 'quiet_cultivation',
  mahayana_practice: 'quiet_cultivation',
  tribulation_practice: 'quiet_cultivation',
};

function firstMissingCost(resources: Resources, cost: Partial<Resources>): keyof Resources | null {
  for (const key of RESOURCE_KEYS) {
    const amount = cost[key] ?? 0;
    if (amount > 0 && resources[key] < amount) return key;
  }
  return null;
}

function firstMissingMinResource(resources: Resources, minResources: Partial<Resources> = {}): keyof Resources | null {
  for (const key of RESOURCE_KEYS) {
    const amount = minResources[key] ?? 0;
    if (amount > 0 && resources[key] < amount) return key;
  }
  return null;
}

function spendTicks(state: GameState, ticks: number): GameState {
  if (ticks <= 0) return state;

  const lifespanDecayRate = REALM_LIFESPAN_DECAY_RATE[state.realm] ?? 1.0;
  const lifespanDecay = ticks * lifespanDecayRate;

  return advanceWorld({
    ...state,
    resources: {
      ...state.resources,
      lifespan: Math.max(0, state.resources.lifespan - lifespanDecay),
    },
    time: deriveGameTime(state.time.tick + ticks),
  });
}

export function performAction(state: GameState, actionId: string, random?: () => number): ActionResult {
  const action = ACTIONS[actionId];
  if (!action) {
    return { state, log: `未知的行动: ${actionId}`, success: false };
  }

  const missingCost = firstMissingCost(state.resources, action.cost);
  if (missingCost) {
    return { state, log: `${RESOURCE_LABELS[missingCost]}不足，无法进行${action.name}`, success: false };
  }

  const missingMinResource = firstMissingMinResource(state.resources, action.conditions.minResources);
  if (missingMinResource) {
    return { state, log: `${RESOURCE_LABELS[missingMinResource]}不足，无法进行${action.name}`, success: false };
  }

  // Check conditions
  const missingFlag = action.conditions.requiredFlags?.find((flag) => !state.choices.flags[flag]);
  if (missingFlag) {
    return { state, log: `尚未满足${action.name}的条件。`, success: false };
  }
  const forbiddenFlag = action.conditions.forbiddenFlags?.find((flag) => state.choices.flags[flag]);
  if (forbiddenFlag) {
    return { state, log: `${action.name}已无须重复。`, success: false };
  }
  if (action.conditions.requiredLocation && state.currentLocationId !== action.conditions.requiredLocation) {
    return { state, log: `此地无法进行${action.name}`, success: false };
  }
  if (action.conditions.requiredRealm) {
    const REALM_ORDER = [Realm.Mortal, Realm.QiCondensation, Realm.FoundationEstablishment, Realm.GoldenCore, Realm.NascentSoul, Realm.SpiritTransformation, Realm.Integration, Realm.Mahayana, Realm.Tribulation];
    if (REALM_ORDER.indexOf(state.realm) < REALM_ORDER.indexOf(action.conditions.requiredRealm)) {
      return { state, log: `当前境界无法进行${action.name}`, success: false };
    }
  }

  // Deduct costs
  let newState = { ...state };
  newState.resources = { ...state.resources };

  for (const key of RESOURCE_KEYS) {
    newState.resources[key] -= action.cost[key] ?? 0;
  }
  // Clamp resources to non-negative
  for (const key of RESOURCE_KEYS) {
    if (key !== 'lifespan') { // lifespan is handled separately in tick
      newState.resources[key] = Math.max(0, newState.resources[key]);
    }
  }
  // Risk check
  const rand = action.riskProbability > 0 ? (random ? random() : 0.5) : 1; // default 0.5 if no rng provided (should not happen in gameplay)
  if (rand < action.riskProbability) {
    // Basic risk consequence for now: action fails, maybe essence lost
    newState = spendTicks(newState, action.cooldown);
    return { 
      state: newState, 
      log: `进行${action.name}时遭遇意外，未能获得收益。`, 
      success: false 
    };
  }

  if (actionId === 'yinqi') {
    newState.realm = Realm.QiCondensation;
    newState.realmLayer = 1;
    newState.choices = {
      ...newState.choices,
      flags: {
        ...newState.choices.flags,
        entered_qi_condensation: true,
      },
    };
  }

  let customLog: string | null = null;

  if (actionId === 'inspect_root') {
    const result = revealRoot(newState);
    newState = result.state;
    customLog = result.log;
  }

  if (actionId === 'attune_technique') {
    const result = attuneTechnique(newState);
    newState = result.state;
    customLog = result.log;
  }

  if (actionId === 'study_qi_formula') {
    const result = learnRecipe(newState, SMALL_QI_PILL_RECIPE_ID);
    newState = result.state;
    customLog = result.log;
  }

  if (actionId === 'study_steady_formula') {
    const result = learnRecipe(newState, STABILIZING_POWDER_RECIPE_ID);
    newState = result.state;
    customLog = result.log;
  }

  if (actionId === 'study_cleansing_formula') {
    const result = learnRecipe(newState, CLEANSING_PILL_RECIPE_ID);
    newState = result.state;
    customLog = result.log;
  }

  if (actionId === 'brew_qi_pill') {
    const result = brewRecipe(newState, SMALL_QI_PILL_RECIPE_ID, random);
    newState = result.state;
    customLog = result.log;
  }

  if (actionId === 'brew_stabilizing_powder') {
    const result = brewRecipe(newState, STABILIZING_POWDER_RECIPE_ID, random);
    newState = result.state;
    customLog = result.log;
  }

  if (actionId === 'brew_cleansing_pill') {
    const result = brewRecipe(newState, CLEANSING_PILL_RECIPE_ID, random);
    newState = result.state;
    customLog = result.log;
  }

  if (actionId === 'take_qi_pill') {
    const result = consumePill(newState, SMALL_QI_PILL_RECIPE_ID);
    newState = result.state;
    customLog = result.log;
  }

  if (actionId === 'take_stabilizing_powder') {
    const result = consumePill(newState, STABILIZING_POWDER_RECIPE_ID);
    newState = result.state;
    customLog = result.log;
  }

  if (actionId === 'take_cleansing_pill') {
    const result = consumePill(newState, CLEANSING_PILL_RECIPE_ID);
    newState = result.state;
    customLog = result.log;
  }

  // New pill: meridian cleansing
  if (actionId === 'study_meridian_cleansing_formula') {
    const result = learnRecipe(newState, MERIDIAN_CLEANSING_PILL_RECIPE_ID);
    newState = result.state;
    customLog = result.log;
  }

  if (actionId === 'brew_meridian_cleansing_pill') {
    const result = brewRecipe(newState, MERIDIAN_CLEANSING_PILL_RECIPE_ID, random);
    newState = result.state;
    customLog = result.log;
  }

  if (actionId === 'take_meridian_cleansing_pill') {
    const result = consumePill(newState, MERIDIAN_CLEANSING_PILL_RECIPE_ID);
    newState = result.state;
    customLog = result.log;
  }

  // New pill: foundation strengthening
  if (actionId === 'study_foundation_strengthening_formula') {
    const result = learnRecipe(newState, FOUNDATION_STRENGTHENING_PILL_RECIPE_ID);
    newState = result.state;
    customLog = result.log;
  }

  if (actionId === 'brew_foundation_strengthening_pill') {
    const result = brewRecipe(newState, FOUNDATION_STRENGTHENING_PILL_RECIPE_ID, random);
    newState = result.state;
    customLog = result.log;
  }

  if (actionId === 'take_foundation_strengthening_pill') {
    const result = consumePill(newState, FOUNDATION_STRENGTHENING_PILL_RECIPE_ID);
    newState = result.state;
    customLog = result.log;
    // Foundation strengthening pill: +1 breakthrough preparation for current target
    const rule = getNextBreakthroughRule(newState);
    if (rule) {
      const currentPrep = newState.breakthrough.preparation[rule.id] ?? 0;
      newState = {
        ...newState,
        breakthrough: {
          ...newState.breakthrough,
          preparation: {
            ...newState.breakthrough.preparation,
            [rule.id]: Math.min(rule.preparationCap, currentPrep + 1),
          },
        },
      };
    }
  }

  // New pill: spirit gathering
  if (actionId === 'study_spirit_gathering_formula') {
    const result = learnRecipe(newState, SPIRIT_GATHERING_PILL_RECIPE_ID);
    newState = result.state;
    customLog = result.log;
  }

  if (actionId === 'brew_spirit_gathering_pill') {
    const result = brewRecipe(newState, SPIRIT_GATHERING_PILL_RECIPE_ID, random);
    newState = result.state;
    customLog = result.log;
  }

  if (actionId === 'take_spirit_gathering_pill') {
    const result = consumePill(newState, SPIRIT_GATHERING_PILL_RECIPE_ID);
    newState = result.state;
    customLog = result.log;
  }

  // New pill: warm furnace
  if (actionId === 'study_warm_furnace_formula') {
    const result = learnRecipe(newState, WARM_FURNACE_PILL_RECIPE_ID);
    newState = result.state;
    customLog = result.log;
  }

  if (actionId === 'brew_warm_furnace_pill') {
    const result = brewRecipe(newState, WARM_FURNACE_PILL_RECIPE_ID, random);
    newState = result.state;
    customLog = result.log;
  }

  if (actionId === 'take_warm_furnace_pill') {
    const result = consumePill(newState, WARM_FURNACE_PILL_RECIPE_ID);
    newState = result.state;
    customLog = result.log;
  }

  // New pill: night sitting
  if (actionId === 'study_night_sitting_formula') {
    const result = learnRecipe(newState, NIGHT_SITTING_PILL_RECIPE_ID);
    newState = result.state;
    customLog = result.log;
  }

  if (actionId === 'brew_night_sitting_pill') {
    const result = brewRecipe(newState, NIGHT_SITTING_PILL_RECIPE_ID, random);
    newState = result.state;
    customLog = result.log;
  }

  if (actionId === 'take_night_sitting_pill') {
    const result = consumePill(newState, NIGHT_SITTING_PILL_RECIPE_ID);
    newState = result.state;
    customLog = result.log;
  }

  // New pill: cloud gathering
  if (actionId === 'study_cloud_gathering_formula') {
    const result = learnRecipe(newState, CLOUD_GATHERING_PILL_RECIPE_ID);
    newState = result.state;
    customLog = result.log;
  }

  if (actionId === 'brew_cloud_gathering_pill') {
    const result = brewRecipe(newState, CLOUD_GATHERING_PILL_RECIPE_ID, random);
    newState = result.state;
    customLog = result.log;
  }

  if (actionId === 'take_cloud_gathering_pill') {
    const result = consumePill(newState, CLOUD_GATHERING_PILL_RECIPE_ID);
    newState = result.state;
    customLog = result.log;
  }

  // New pill: iron body
  if (actionId === 'study_iron_body_formula') {
    const result = learnRecipe(newState, IRON_BODY_PILL_RECIPE_ID);
    newState = result.state;
    customLog = result.log;
  }

  if (actionId === 'brew_iron_body_pill') {
    const result = brewRecipe(newState, IRON_BODY_PILL_RECIPE_ID, random);
    newState = result.state;
    customLog = result.log;
  }

  if (actionId === 'take_iron_body_pill') {
    const result = consumePill(newState, IRON_BODY_PILL_RECIPE_ID);
    newState = result.state;
    customLog = result.log;
  }

  // New pill: demon bane
  if (actionId === 'study_demon_bane_formula') {
    const result = learnRecipe(newState, DEMON_BANE_PILL_RECIPE_ID);
    newState = result.state;
    customLog = result.log;
  }

  if (actionId === 'brew_demon_bane_pill') {
    const result = brewRecipe(newState, DEMON_BANE_PILL_RECIPE_ID, random);
    newState = result.state;
    customLog = result.log;
  }

  if (actionId === 'take_demon_bane_pill') {
    const result = consumePill(newState, DEMON_BANE_PILL_RECIPE_ID);
    newState = result.state;
    customLog = result.log;
  }

  // New pill: foundation explosion
  if (actionId === 'study_foundation_explosion_formula') {
    const result = learnRecipe(newState, FOUNDATION_EXPLOSION_PILL_RECIPE_ID);
    newState = result.state;
    customLog = result.log;
  }

  if (actionId === 'brew_foundation_explosion_pill') {
    const result = brewRecipe(newState, FOUNDATION_EXPLOSION_PILL_RECIPE_ID, random);
    newState = result.state;
    customLog = result.log;
  }

  if (actionId === 'take_foundation_explosion_pill') {
    const result = consumePill(newState, FOUNDATION_EXPLOSION_PILL_RECIPE_ID);
    newState = result.state;
    customLog = result.log;
  }

  // New pill: spirit vein
  if (actionId === 'study_spirit_vein_formula') {
    const result = learnRecipe(newState, SPIRIT_VEIN_PILL_RECIPE_ID);
    newState = result.state;
    customLog = result.log;
  }

  if (actionId === 'brew_spirit_vein_pill') {
    const result = brewRecipe(newState, SPIRIT_VEIN_PILL_RECIPE_ID, random);
    newState = result.state;
    customLog = result.log;
  }

  if (actionId === 'take_spirit_vein_pill') {
    const result = consumePill(newState, SPIRIT_VEIN_PILL_RECIPE_ID);
    newState = result.state;
    customLog = result.log;
  }

  // New pill: shadow escape
  if (actionId === 'study_shadow_escape_formula') {
    const result = learnRecipe(newState, SHADOW_ESCAPE_PILL_RECIPE_ID);
    newState = result.state;
    customLog = result.log;
  }

  if (actionId === 'brew_shadow_escape_pill') {
    const result = brewRecipe(newState, SHADOW_ESCAPE_PILL_RECIPE_ID, random);
    newState = result.state;
    customLog = result.log;
  }

  if (actionId === 'take_shadow_escape_pill') {
    const result = consumePill(newState, SHADOW_ESCAPE_PILL_RECIPE_ID);
    newState = result.state;
    customLog = result.log;
  }

  // New pill: longevity
  if (actionId === 'study_longevity_formula') {
    const result = learnRecipe(newState, LONGEVITY_PILL_RECIPE_ID);
    newState = result.state;
    customLog = result.log;
  }

  if (actionId === 'brew_longevity_pill') {
    const result = brewRecipe(newState, LONGEVITY_PILL_RECIPE_ID, random);
    newState = result.state;
    customLog = result.log;
  }

  if (actionId === 'take_longevity_pill') {
    const result = consumePill(newState, LONGEVITY_PILL_RECIPE_ID);
    newState = result.state;
    customLog = result.log;
  }

  // New pill: fire furnace
  if (actionId === 'study_fire_furnace_formula') {
    const result = learnRecipe(newState, FIRE_FURNACE_PILL_RECIPE_ID);
    newState = result.state;
    customLog = result.log;
  }

  if (actionId === 'brew_fire_furnace_pill') {
    const result = brewRecipe(newState, FIRE_FURNACE_PILL_RECIPE_ID, random);
    newState = result.state;
    customLog = result.log;
  }

  if (actionId === 'take_fire_furnace_pill') {
    const result = consumePill(newState, FIRE_FURNACE_PILL_RECIPE_ID);
    newState = result.state;
    customLog = result.log;
  }

  // New pill: nine turn foundation
  if (actionId === 'study_nine_turn_foundation_formula') {
    const result = learnRecipe(newState, NINE_TURN_FOUNDATION_PILL_RECIPE_ID);
    newState = result.state;
    customLog = result.log;
  }

  if (actionId === 'brew_nine_turn_foundation_pill') {
    const result = brewRecipe(newState, NINE_TURN_FOUNDATION_PILL_RECIPE_ID, random);
    newState = result.state;
    customLog = result.log;
  }

  if (actionId === 'take_nine_turn_foundation_pill') {
    const result = consumePill(newState, NINE_TURN_FOUNDATION_PILL_RECIPE_ID);
    newState = result.state;
    customLog = result.log;
  }

  // New pill: buddha heart
  if (actionId === 'study_buddha_heart_formula') {
    const result = learnRecipe(newState, BUDDHA_HEART_PILL_RECIPE_ID);
    newState = result.state;
    customLog = result.log;
  }

  if (actionId === 'brew_buddha_heart_pill') {
    const result = brewRecipe(newState, BUDDHA_HEART_PILL_RECIPE_ID, random);
    newState = result.state;
    customLog = result.log;
  }

  if (actionId === 'take_buddha_heart_pill') {
    const result = consumePill(newState, BUDDHA_HEART_PILL_RECIPE_ID);
    newState = result.state;
    customLog = result.log;
  }
  // New pill: golden core formation
  if (actionId === 'study_golden_core_formation_formula') {
    const result = learnRecipe(newState, GOLDEN_CORE_FORMATION_PILL_RECIPE_ID);
    newState = result.state;
    customLog = result.log;
  }
  if (actionId === 'brew_golden_core_formation_pill') {
    const result = brewRecipe(newState, GOLDEN_CORE_FORMATION_PILL_RECIPE_ID, random);
    newState = result.state;
    customLog = result.log;
  }
  if (actionId === 'take_golden_core_formation_pill') {
    const result = consumePill(newState, GOLDEN_CORE_FORMATION_PILL_RECIPE_ID);
    newState = result.state;
    customLog = result.log;
  }
  // New pill: golden core strengthening
  if (actionId === 'study_golden_core_strengthening_formula') {
    const result = learnRecipe(newState, GOLDEN_CORE_STRENGTHENING_PILL_RECIPE_ID);
    newState = result.state;
    customLog = result.log;
  }
  if (actionId === 'brew_golden_core_strengthening_pill') {
    const result = brewRecipe(newState, GOLDEN_CORE_STRENGTHENING_PILL_RECIPE_ID, random);
    newState = result.state;
    customLog = result.log;
  }
  if (actionId === 'take_golden_core_strengthening_pill') {
    const result = consumePill(newState, GOLDEN_CORE_STRENGTHENING_PILL_RECIPE_ID);
    newState = result.state;
    customLog = result.log;
    newState = { ...newState, resources: { ...newState.resources, dantoxin: Math.max(0, newState.resources.dantoxin - 2) } };
  }
  // New pill: golden core fire
  if (actionId === 'study_golden_core_fire_formula') {
    const result = learnRecipe(newState, GOLDEN_CORE_FIRE_PILL_RECIPE_ID);
    newState = result.state;
    customLog = result.log;
  }
  if (actionId === 'brew_golden_core_fire_pill') {
    const result = brewRecipe(newState, GOLDEN_CORE_FIRE_PILL_RECIPE_ID, random);
    newState = result.state;
    customLog = result.log;
  }
  if (actionId === 'take_golden_core_fire_pill') {
    const result = consumePill(newState, GOLDEN_CORE_FIRE_PILL_RECIPE_ID);
    newState = result.state;
    customLog = result.log;
    // Dantoxin already applied by consumePill via recipe.dantoxin
  }
  // New pill: nascent soul nurturing
  if (actionId === 'study_nascent_soul_nurturing_formula') {
    const result = learnRecipe(newState, NASCENT_SOUL_NURTURING_PILL_RECIPE_ID);
    newState = result.state;
    customLog = result.log;
  }
  if (actionId === 'brew_nascent_soul_nurturing_pill') {
    const result = brewRecipe(newState, NASCENT_SOUL_NURTURING_PILL_RECIPE_ID, random);
    newState = result.state;
    customLog = result.log;
  }
  if (actionId === 'take_nascent_soul_nurturing_pill') {
    const result = consumePill(newState, NASCENT_SOUL_NURTURING_PILL_RECIPE_ID);
    newState = result.state;
    customLog = result.log;
  }
  // New pill: nascent soul separation
  if (actionId === 'study_nascent_soul_separation_formula') {
    const result = learnRecipe(newState, NASCENT_SOUL_SEPARATION_PILL_RECIPE_ID);
    newState = result.state;
    customLog = result.log;
  }
  if (actionId === 'brew_nascent_soul_separation_pill') {
    const result = brewRecipe(newState, NASCENT_SOUL_SEPARATION_PILL_RECIPE_ID, random);
    newState = result.state;
    customLog = result.log;
  }
  if (actionId === 'take_nascent_soul_separation_pill') {
    const result = consumePill(newState, NASCENT_SOUL_SEPARATION_PILL_RECIPE_ID);
    newState = result.state;
    customLog = result.log;
    newState = { ...newState, choices: { ...newState.choices, flags: { ...newState.choices.flags, nascent_soul_separation_active: true } } };
  }
  // New pill: nascent soul protection
  if (actionId === 'study_nascent_soul_protection_formula') {
    const result = learnRecipe(newState, NASCENT_SOUL_PROTECTION_PILL_RECIPE_ID);
    newState = result.state;
    customLog = result.log;
  }
  if (actionId === 'brew_nascent_soul_protection_pill') {
    const result = brewRecipe(newState, NASCENT_SOUL_PROTECTION_PILL_RECIPE_ID, random);
    newState = result.state;
    customLog = result.log;
  }
  if (actionId === 'take_nascent_soul_protection_pill') {
    const result = consumePill(newState, NASCENT_SOUL_PROTECTION_PILL_RECIPE_ID);
    newState = result.state;
    customLog = result.log;
    newState = { ...newState, resources: { ...newState.resources, wounds: Math.max(0, newState.resources.wounds - 1) } };
  }
  // New pill: spirit transform
  if (actionId === 'study_spirit_transform_formula') {
    const result = learnRecipe(newState, SPIRIT_TRANSFORM_PILL_RECIPE_ID);
    newState = result.state;
    customLog = result.log;
  }
  if (actionId === 'brew_spirit_transform_pill') {
    const result = brewRecipe(newState, SPIRIT_TRANSFORM_PILL_RECIPE_ID, random);
    newState = result.state;
    customLog = result.log;
  }
  if (actionId === 'take_spirit_transform_pill') {
    const result = consumePill(newState, SPIRIT_TRANSFORM_PILL_RECIPE_ID);
    newState = result.state;
    customLog = result.log;
  }
  // New pill: spirit transform fire
  if (actionId === 'study_spirit_transform_fire_formula') {
    const result = learnRecipe(newState, SPIRIT_TRANSFORM_FIRE_PILL_RECIPE_ID);
    newState = result.state;
    customLog = result.log;
  }
  if (actionId === 'brew_spirit_transform_fire_pill') {
    const result = brewRecipe(newState, SPIRIT_TRANSFORM_FIRE_PILL_RECIPE_ID, random);
    newState = result.state;
    customLog = result.log;
  }
  if (actionId === 'take_spirit_transform_fire_pill') {
    const result = consumePill(newState, SPIRIT_TRANSFORM_FIRE_PILL_RECIPE_ID);
    newState = result.state;
    customLog = result.log;
    // Dantoxin already applied by consumePill via recipe.dantoxin
  }
  // New pill: integration
  if (actionId === 'study_integration_formula') {
    const result = learnRecipe(newState, INTEGRATION_PILL_RECIPE_ID);
    newState = result.state;
    customLog = result.log;
  }
  if (actionId === 'brew_integration_pill') {
    const result = brewRecipe(newState, INTEGRATION_PILL_RECIPE_ID, random);
    newState = result.state;
    customLog = result.log;
  }
  if (actionId === 'take_integration_pill') {
    const result = consumePill(newState, INTEGRATION_PILL_RECIPE_ID);
    newState = result.state;
    customLog = result.log;
  }
  // New pill: integration body
  if (actionId === 'study_integration_body_formula') {
    const result = learnRecipe(newState, INTEGRATION_BODY_PILL_RECIPE_ID);
    newState = result.state;
    customLog = result.log;
  }
  if (actionId === 'brew_integration_body_pill') {
    const result = brewRecipe(newState, INTEGRATION_BODY_PILL_RECIPE_ID, random);
    newState = result.state;
    customLog = result.log;
  }
  if (actionId === 'take_integration_body_pill') {
    const result = consumePill(newState, INTEGRATION_BODY_PILL_RECIPE_ID);
    newState = result.state;
    customLog = result.log;
    newState = { ...newState, resources: { ...newState.resources, wounds: Math.max(0, newState.resources.wounds - 2) } };
  }
  // New pill: mahayana
  if (actionId === 'study_mahayana_formula') {
    const result = learnRecipe(newState, MAHAYANA_PILL_RECIPE_ID);
    newState = result.state;
    customLog = result.log;
  }
  if (actionId === 'brew_mahayana_pill') {
    const result = brewRecipe(newState, MAHAYANA_PILL_RECIPE_ID, random);
    newState = result.state;
    customLog = result.log;
  }
  if (actionId === 'take_mahayana_pill') {
    const result = consumePill(newState, MAHAYANA_PILL_RECIPE_ID);
    newState = result.state;
    customLog = result.log;
  }
  // New pill: mahayana enlightenment
  if (actionId === 'study_mahayana_enlightenment_formula') {
    const result = learnRecipe(newState, MAHAYANA_ENLIGHTENMENT_PILL_RECIPE_ID);
    newState = result.state;
    customLog = result.log;
  }
  if (actionId === 'brew_mahayana_enlightenment_pill') {
    const result = brewRecipe(newState, MAHAYANA_ENLIGHTENMENT_PILL_RECIPE_ID, random);
    newState = result.state;
    customLog = result.log;
  }
  if (actionId === 'take_mahayana_enlightenment_pill') {
    const result = consumePill(newState, MAHAYANA_ENLIGHTENMENT_PILL_RECIPE_ID);
    newState = result.state;
    customLog = result.log;
    newState = { ...newState, choices: { ...newState.choices, qualities: { ...newState.choices.qualities, dao_affinity: (newState.choices.qualities.dao_affinity ?? 0) + 1 } } };
  }
  // New pill: tribulation protection
  if (actionId === 'study_tribulation_protection_formula') {
    const result = learnRecipe(newState, TRIBULATION_PROTECTION_PILL_RECIPE_ID);
    newState = result.state;
    customLog = result.log;
  }
  if (actionId === 'brew_tribulation_protection_pill') {
    const result = brewRecipe(newState, TRIBULATION_PROTECTION_PILL_RECIPE_ID, random);
    newState = result.state;
    customLog = result.log;
  }
  if (actionId === 'take_tribulation_protection_pill') {
    const result = consumePill(newState, TRIBULATION_PROTECTION_PILL_RECIPE_ID);
    newState = result.state;
    customLog = result.log;
    newState = { ...newState, resources: { ...newState.resources, wounds: Math.max(0, newState.resources.wounds - 2), dantoxin: Math.max(0, newState.resources.dantoxin - 5) } };
  }
  // New pill: heavenly tribulation
  if (actionId === 'study_heavenly_tribulation_formula') {
    const result = learnRecipe(newState, HEAVENLY_TRIBULATION_PILL_RECIPE_ID);
    newState = result.state;
    customLog = result.log;
  }
  if (actionId === 'brew_heavenly_tribulation_pill') {
    const result = brewRecipe(newState, HEAVENLY_TRIBULATION_PILL_RECIPE_ID, random);
    newState = result.state;
    customLog = result.log;
  }
  if (actionId === 'take_heavenly_tribulation_pill') {
    const result = consumePill(newState, HEAVENLY_TRIBULATION_PILL_RECIPE_ID);
    newState = result.state;
    customLog = result.log;
    // Dantoxin already applied by consumePill via recipe.dantoxin
  }
  // New pill: tribulation soul
  if (actionId === 'study_tribulation_soul_formula') {
    const result = learnRecipe(newState, TRIBULATION_SOUL_PILL_RECIPE_ID);
    newState = result.state;
    customLog = result.log;
  }
  if (actionId === 'brew_tribulation_soul_pill') {
    const result = brewRecipe(newState, TRIBULATION_SOUL_PILL_RECIPE_ID, random);
    newState = result.state;
    customLog = result.log;
  }
  if (actionId === 'take_tribulation_soul_pill') {
    const result = consumePill(newState, TRIBULATION_SOUL_PILL_RECIPE_ID);
    newState = result.state;
    customLog = result.log;
    newState = { ...newState, resources: { ...newState.resources, dantoxin: Math.max(0, newState.resources.dantoxin - 3) }, choices: { ...newState.choices, flags: { ...newState.choices.flags, tribulation_soul_protected: true } } };
  }


  // New location actions
  if (actionId === 'meditate_detox') {
    customLog = '你盘膝入定，引气逼毒。丹田灼热，毒气缓缓从毛孔渗出。';
  }

  if (actionId === 'water_meditation') {
    customLog = '你坐于溪旁，水声入耳。气息随水波往复，心境渐宁。';
  }

  if (actionId === 'collect_night_dew') {
    customLog = '夜露凝于叶尖，你一叶一叶收下。晨起可用。';
  }

  if (actionId === 'explore_ruins') {
    customLog = '废观残垣间，你寻到些旧物。风过，尘灰扑面。';
  }

  if (actionId === 'sweep_temple') {
    customLog = '你扫了殿前落叶。尘去阶净，心也静了一分。';
  }

  if (actionId === 'read_stone_tablet') {
    newState = {
      ...newState,
      choices: {
        ...newState.choices,
        flags: {
          ...newState.choices.flags,
          read_stone_tablet: true,
        },
      },
    };
    customLog = '石碑上刻着半部残诀。你反复诵读，字迹渐隐。';
  }

  if (actionId === 'identify_herb') {
    customLog = '你辨出两株药的寒热归经。药性虽异，炮制可调。';
  }

  if (actionId === 'protect_seedling') {
    newState = {
      ...newState,
      choices: {
        ...newState.choices,
        flags: {
          ...newState.choices.flags,
          protected_seedling: true,
        },
        qualities: {
          ...newState.choices.qualities,
          alchemy_affinity: (newState.choices.qualities.alchemy_affinity ?? 0) + 1,
        },
      },
    };
    customLog = '你为药苗除虫松土。叶尖新绿，长势喜人。';
  }

  if (actionId === 'listen_traveler') {
    customLog = '渡客言语间透着外头的消息。你默默记下。';
  }

  if (actionId === 'hire_boat') {
    customLog = '你雇了条船顺流而去。沿岸见闻，比山中日月宽阔。';
  }

  if (actionId === 'stabilize_bottleneck') {
    const result = stabilizeBreakthrough(newState);
    newState = result.state;
    customLog = result.log;
  }

  if (actionId.startsWith('breakthrough_')) {
    const result = resolveBreakthrough(newState, actionId, random);
    newState = result.state;
    customLog = result.log;
  }

  if (actionId === 'seek_foundation_guardian') {
    newState = {
      ...newState,
      choices: {
        ...newState.choices,
        flags: {
          ...newState.choices.flags,
          foundation_guardian: true,
          sought_foundation_guardian: true,
          foundation_guardian_account_open: true,
        },
        tags: {
          ...newState.choices.tags,
          sect_trace: 'guardian',
        },
        qualities: {
          ...newState.choices.qualities,
          sect_trace: (newState.choices.qualities.sect_trace ?? 0) + 1,
        },
      },
    };
    customLog = '外门有人应下护法。话不多，价钱记在前头。';
  }

  if (actionId === 'borrow_foundation_pill') {
    newState = {
      ...newState,
      choices: {
        ...newState.choices,
        flags: {
          ...newState.choices.flags,
          borrowed_foundation_aid: true,
          foundation_pill_debt_open: true,
        },
        tags: {
          ...newState.choices.tags,
          market_debt: 'foundation_pill',
        },
        qualities: {
          ...newState.choices.qualities,
          market_ties: (newState.choices.qualities.market_ties ?? 0) + 1,
          reckless_breakthrough: (newState.choices.qualities.reckless_breakthrough ?? 0) + 1,
        },
      },
    };
    customLog = '坊市有人借你一枚筑基用丹。药气重，账也重。';
  }

  if (actionId === 'withdraw_foundation') {
    const currentPreparation = newState.breakthrough.preparation.foundation ?? 0;
    newState = {
      ...newState,
      resources: {
        ...newState.resources,
        dantoxin: Math.max(0, newState.resources.dantoxin - 3),
        wounds: Math.max(0, newState.resources.wounds - 1),
      },
      breakthrough: {
        ...newState.breakthrough,
        preparation: {
          ...newState.breakthrough.preparation,
          foundation: Math.max(1, currentPreparation - 1),
        },
        lastTargetId: 'foundation',
      },
      choices: {
        ...newState.choices,
        flags: {
          ...newState.choices.flags,
          withdrew_foundation: true,
          foundation_guardian: false,
          borrowed_foundation_aid: false,
        },
        tags: {
          ...newState.choices.tags,
          foundation_pause: 'withdrew',
        },
        qualities: {
          ...newState.choices.qualities,
          reckless_breakthrough: Math.max(0, (newState.choices.qualities.reckless_breakthrough ?? 0) - 1),
        },
      },
    };
    customLog = '你把筑基关口压回周天。气未散尽，护法与借丹都暂且作罢。';
  }

  if (actionId === 'short_retreat') {
    customLog = '你闭门三日。日课并作一段，气息涨落有常。';
  }

  if (actionId === 'foundation_daily_practice') {
    customLog = '筑基日课毕。真气在周天往复，比炼气时沉稳一分。';
  }

  if (actionId === 'inner_gate_rumor') {
    customLog = '内门的只言片语飘出来。你听到了从前听不到的事。';
  }

  if (actionId === 'foundation_meditation') {
    customLog = '你入静修。筑基后的气脉比从前宽厚，静中更见深远。';
  }

  if (actionId === 'sect_chore') {
    newState = {
      ...newState,
      sect: { ...newState.sect, contribution: newState.sect.contribution + 1, discipline: newState.sect.discipline + 1 },
      choices: {
        ...newState.choices,
        flags: {
          ...newState.choices.flags,
          completed_sect_chore: true,
        },
      },
    };
    customLog = '你做完了一天的杂务。规矩记了一笔。';
  }

  if (actionId === 'listen_lesson') {
    newState = {
      ...newState,
      sect: { ...newState.sect, contribution: newState.sect.contribution + 1 },
      choices: {
        ...newState.choices,
        flags: {
          ...newState.choices.flags,
          attended_lesson: true,
        },
      },
    };
    customLog = '你在殿下听了一节功课。';
  }

  if (actionId === 'sect_roll_call') {
    newState = {
      ...newState,
      sect: { ...newState.sect, discipline: newState.sect.discipline + 1 },
      choices: {
        ...newState.choices,
        flags: {
          ...newState.choices.flags,
          attended_outer_gate_roll_call: true,
        },
        tags: {
          ...newState.choices.tags,
          sect_status: 'roll_called',
        },
        qualities: {
          ...newState.choices.qualities,
          sect_discipline: (newState.choices.qualities.sect_discipline ?? 0) + 1,
        },
      },
    };
    customLog = '点名应到。规矩记了一笔。';
  }

  if (actionId === 'sect_patrol') {
    newState = {
      ...newState,
      sect: { ...newState.sect, contribution: newState.sect.contribution + 2, discipline: newState.sect.discipline + 1 },
      choices: {
        ...newState.choices,
        flags: {
          ...newState.choices.flags,
          accepted_outer_gate_patrol: true,
          completed_sect_patrol: true,
        },
        tags: {
          ...newState.choices.tags,
          sect_status: 'patrol',
        },
        qualities: {
          ...newState.choices.qualities,
          sect_contribution: (newState.choices.qualities.sect_contribution ?? 0) + 1,
          sect_discipline: (newState.choices.qualities.sect_discipline ?? 0) + 1,
        },
      },
    };
    customLog = '巡值一圈，无异常。';
  }

  if (actionId === 'sect_errand') {
    newState = {
      ...newState,
      sect: { ...newState.sect, contribution: newState.sect.contribution + 2 },
      choices: {
        ...newState.choices,
        flags: {
          ...newState.choices.flags,
          completed_sect_errand: true,
        },
      },
    };
    customLog = '你跑完了一趟差事。';
  }

  if (actionId === 'sect_supply') {
    customLog = '外门按册给了些供给。数目不多，账上有名。';
  }

  // F4: Sect deepening actions
  if (actionId === 'inner_gate_task') {
    const deadline = newState.time.tick + 600; // 60 cooldown * 10 ticks
    newState = setCurrentTask(newState, 'inner_gate_task', deadline);
    newState = {
      ...newState,
      choices: {
        ...newState.choices,
        flags: { ...newState.choices.flags, has_active_sect_task: true },
      },
    };
    customLog = '你领了一件内门差事。限期不长，需在期限内复命。';
  }

  if (actionId === 'report_task_completion') {
    if (newState.sect.currentTask) {
      newState = completeTask(newState);
      newState = {
        ...newState,
        choices: {
          ...newState.choices,
          flags: { ...newState.choices.flags, has_active_sect_task: false },
        },
      };
      customLog = '差事交了。贡献薄上添了一笔。';
    }
  }

  if (actionId === 'attend_sect_ceremony') {
    newState = {
      ...newState,
      sect: { ...newState.sect, contribution: newState.sect.contribution + 2 },
    };
    customLog = '典礼肃穆。你在香案前站了很久，宗门又多记了你一笔。';
  }

  // F5: Dwelling actions
  // Note: Use original `state` (not `newState`) for dwelling/formation logic because
  // upgradeDwellingLogic/installFormationLogic internally deduct their own costs.
  // The generic cost deduction above already ran on newState, so passing newState would
  // cause double cost deduction. By passing `state`, the logic functions handle cost
  // deduction correctly on their own.
  if (actionId === 'establish_dwelling') {
    newState = upgradeDwellingLogic(state);
    if (newState.dwelling.level === 1) {
      customLog = '你开出一处简陋洞府。虽小，已是自己的地方。';
    } else {
      customLog = '开辟洞府未成。';
    }
  }

  if (actionId === 'upgrade_dwelling') {
    const prevLevel = state.dwelling.level;
    newState = upgradeDwellingLogic(state);
    if (newState.dwelling.level > prevLevel) {
      customLog = '洞府扩建完成。灵气比从前浓厚几分。';
    } else {
      customLog = '扩建未能进行。';
    }
  }

  if (actionId === 'install_formation') {
    const prevLevel = state.dwelling.formationLevel;
    newState = installFormationLogic(state);
    if (newState.dwelling.formationLevel > prevLevel) {
      customLog = '阵法布成。洞府中灵气运转有序。';
    } else {
      customLog = '布阵未能进行。';
    }
  }

  // F7: Follower actions
  if (actionId === 'recruit_servant') {
    if (canRecruitFollower(newState, 'servant')) {
      newState = recruitFollowerLogic(newState, 'servant');
      customLog = '你招到一名杂役。手脚利索，忠心尚可。';
    } else {
      customLog = '无法招到杂役。';
    }
  }

  if (actionId === 'recruit_disciple') {
    if (canRecruitFollower(newState, 'disciple')) {
      newState = recruitFollowerLogic(newState, 'disciple');
      customLog = '你收了一名弟子。天资尚可，日后可期。';
    } else {
      customLog = '无法收弟子。';
    }
  }

  if (actionId === 'recruit_guard') {
    if (canRecruitFollower(newState, 'guard')) {
      newState = recruitFollowerLogic(newState, 'guard');
      customLog = '你招了一名护卫。铁壁般的人，守在洞府门前。';
    } else {
      customLog = '无法招护卫。';
    }
  }

  if (actionId === 'assign_herb_gathering') {
    const followerIds = Object.keys(newState.followers.followers);
    const unassigned = followerIds.find(id => !newState.followers.followers[id].taskAssignment);
    if (unassigned) {
      newState = assignFollowerTask(newState, unassigned, 'herb_gathering');
      customLog = '你派了一名随从去采药。';
    } else {
      customLog = '没有空闲的随从可派。';
    }
  }

  if (actionId === 'assign_patrol_duty') {
    const followerIds = Object.keys(newState.followers.followers);
    const unassigned = followerIds.find(id => !newState.followers.followers[id].taskAssignment);
    if (unassigned) {
      newState = assignFollowerTask(newState, unassigned, 'patrol_duty');
      customLog = '你派了一名随从去巡山。';
    } else {
      customLog = '没有空闲的随从可派。';
    }
  }

  if (actionId === 'collect_follower_income') {
    newState = collectFollowerIncomeLogic(newState);
    customLog = '你收了随从的成果。';
  }

  // F8: Secret Realm actions
  if (actionId === 'explore_secret_realm') {
    // Find the first discovered realm that can be explored
    const discovered = newState.secretRealm.discoveredRealms;
    const explorable = discovered.find(r => canExploreRealm(newState, r));
    if (explorable) {
      newState = beginExploration(newState, explorable);
      if (newState.secretRealm.activeExploration === explorable) {
        newState = {
          ...newState,
          choices: {
            ...newState.choices,
            flags: {
              ...newState.choices.flags,
              exploring_secret_realm: true,
            },
          },
        };
        const def = getSecretRealmDef(explorable);
        customLog = `你踏入${def?.name ?? '秘境'}。前路未知，步步为营。`;
      }
    } else {
      customLog = '没有可探索的秘境。';
    }
  }

  if (actionId === 'continue_exploration') {
    if (newState.secretRealm.activeExploration) {
      // Advance by 20-40 randomly
      const progressGain = 20 + Math.floor((random ? random() : 0.5) * 20); // default 0.5 if no rng provided
      const result = advanceExploration(newState, progressGain);
      newState = result.state;

      if (newState.secretRealm.explorationProgress >= 100) {
        newState = {
          ...newState,
          choices: {
            ...newState.choices,
            flags: {
              ...newState.choices.flags,
              exploration_complete: true,
            },
          },
        };
        customLog = '你已探尽此秘境。可收取成果。';
      } else {
        customLog = `探索深入。进度：${Math.floor(newState.secretRealm.explorationProgress)}%。`;
      }

      // Risk of encounter during exploration
      const dangerLevel = getSecretRealmDef(newState.secretRealm.activeExploration ?? '')?.dangerLevel ?? 1;
      const encounterChance = dangerLevel * 0.03;
      if ((random ? random() : 0.5) < encounterChance) { // default 0.5 if no rng provided
        newState.resources = {
          ...newState.resources,
          wounds: newState.resources.wounds + 1,
        };
        customLog += ' 途中遭遇意外，添了一处伤。';
      }
    } else {
      customLog = '当前没有正在探索的秘境。';
    }
  }

  if (actionId === 'claim_exploration_loot') {
    const result = completeExploration(newState, random);
    newState = result.state;
    customLog = result.log;
    // Clear exploration flags
    newState = {
      ...newState,
      choices: {
        ...newState.choices,
        flags: {
          ...newState.choices.flags,
          exploring_secret_realm: false,
          exploration_complete: false,
        },
      },
    };
  }

  if (actionId === 'abandon_exploration') {
    const result = abandonExploration(newState, random);
    newState = result.state;
    customLog = result.log;
    // Clear exploration flags
    newState = {
      ...newState,
      choices: {
        ...newState.choices,
        flags: {
          ...newState.choices.flags,
          exploring_secret_realm: false,
          exploration_complete: false,
        },
      },
    };
  }

  // F9: Ascension
  if (actionId === 'attempt_ascension') {
    if (canAscend(newState)) {
      newState = triggerAscensionChoice(newState);
      customLog = '天门在望。飞升之兆已现，你面临抉择。';
    } else {
      customLog = '修为未至飞升之境。';
    }
  }

  if (actionId === 'golden_core_practice') {
    customLog = '金丹日课毕。丹火不熄，真气在周天中流转。';
  }

  if (actionId === 'nascent_soul_practice') {
    customLog = '元婴日课毕。元神渐出，灵气顺行。';
  }

  if (actionId === 'spirit_transformation_practice') {
    customLog = '化神日课毕。灵识所及，渐有不同。';
  }

  if (actionId === 'integration_practice') {
    customLog = '合体日课毕。灵气运转渐自如。';
  }

  if (actionId === 'mahayana_practice') {
    customLog = '大乘日课毕。大道将成，天劫在望。';
  }

  if (actionId === 'tribulation_practice') {
    customLog = '渡劫日课毕。天雷将至，道心不移。';
  }

  // Inner demon actions
  if (actionId === 'confront_demon') {
    const result = confrontDemon(newState);
    newState = result.state;
    customLog = result.log;
  }

  if (actionId === 'suppress_demon') {
    const result = suppressDemon(newState);
    newState = result.state;
    customLog = result.log;
  }

  if (actionId === 'ignore_demon') {
    const result = ignoreDemon(newState);
    newState = result.state;
    customLog = result.log;
  }

  const adjustedOutput = applyAlchemyOutputModifiers(
    newState,
    actionId,
    applyCultivationOutputModifiers(newState, actionId, action.output)
  );

  // Add outputs
  for (const key of RESOURCE_KEYS) {
    newState.resources[key] += adjustedOutput[key] ?? 0;
  }
  newState.resources.essence = Math.min(getMaxStamina(newState.realm), newState.resources.essence);
  newState.resources.lifespan = Math.max(0, newState.resources.lifespan);

  // Record action count
  const countKey = `action_${actionId}_count`;
  const routeQuality = ACTION_ROUTE_QUALITIES[actionId];
  newState.choices = {
    ...newState.choices,
    flags: {
      ...newState.choices.flags,
      [`completed_${actionId}`]: true,
    },
    qualities: {
      ...newState.choices.qualities,
      [countKey]: (newState.choices.qualities[countKey] || 0) + 1,
      ...(routeQuality
        ? { [routeQuality]: (newState.choices.qualities[routeQuality] || 0) + 0.2 }
        : {}),
    }
  };
  newState = recordActionInWorld(newState, actionId);
  newState = spendTicks(newState, action.cooldown);

  // Universal post-action ledger updates — always execute regardless of special paths
  newState = updateKarmicWeight(newState);

  // Update dao path affinity and check for reveal
  const pathResult = revealDaoPath(newState);
  newState = pathResult.state;
  if (pathResult.revealed && pathResult.newPath) {
    const pathLabel = getDaoPathLabel(pathResult.newPath);
    const pathNote = pathResult.newPath === newState.daoPath.currentPath && newState.daoPath.pathRevealedAtTick === newState.time.tick
      ? `你的道途渐显——${pathLabel}。`
      : `道途有变——${pathLabel}。`;
    return {
      state: newState,
      log: customLog
        ? `${actionId === 'yinqi' ? '气入丹田，周身微鸣。你踏入炼气一层。' : customLog} ${pathNote}`
        : pathNote,
      success: true,
    };
  }

  return {
    state: newState,
    log: actionId === 'yinqi'
      ? '气入丹田，周身微鸣。你踏入炼气一层。'
      : customLog
        ? customLog
      : actionId === 'rike_tuna'
        ? '一段日课毕，气息在周身往复数回。'
        : `进行了${action.name}。`,
    success: true,
  };
}
