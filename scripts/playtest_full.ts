/**
 * 全面玩家测试脚本 - 模拟真实玩家从凡人到飞升的完整流程
 * 
 * 测试目标：
 * 1. 验证游戏循环能正常运转
 * 2. 验证解锁链路完整
 * 3. 验证突破系统
 * 4. 验证丹药系统
 * 5. 验证宗门系统
 * 6. 验证洞府系统
 * 7. 验证弟子系统
 * 8. 验证秘境系统
 * 9. 验证事件系统
 * 10. 发现逻辑Bug和死锁
 */

import { createInitialState, createRng } from '../src/game/state';
import { processTick, TICK_INTERVAL_MS, processBatchTicks } from '../src/game/tick';
import { checkUnlocks } from '../src/game/unlock';
import { performAction, ACTIONS } from '../src/game/actions';
import { moveToLocation, getVisibleLocations } from '../src/game/location';
import { applyOrigin, hasSelectedOrigin } from '../src/game/origins';
import { rollEvent } from '../src/game/events';
import { EVENTS } from '../src/content/events';
import { ORIGINS, OriginId } from '../src/content/origins';
import { Realm, Season } from '../src/game/types';
import { serializeSave, deserializeSave } from '../src/storage/save';
import { getMaxStamina } from '../src/game/state';
import { calculateBreakthroughChance } from '../src/game/breakthrough';

interface TestIssue {
  phase: string;
  severity: 'critical' | 'major' | 'minor' | 'cosmetic';
  description: string;
  details?: string;
}

const issues: TestIssue[] = [];

function log(phase: string, msg: string) {
  console.log(`[${phase}] ${msg}`);
}

function reportIssue(phase: string, severity: TestIssue['severity'], description: string, details?: string) {
  issues.push({ phase, severity, description, details });
  const icon = severity === 'critical' ? '🔴' : severity === 'major' ? '🟠' : severity === 'minor' ? '🟡' : '🔵';
  console.log(`${icon} [${phase}] ${description}${details ? ' — ' + details : ''}`);
}

// Helper: simulate ticks
function simulateTicks(state: any, count: number): any {
  let s = state;
  for (let i = 0; i < count; i++) {
    s = processTick(s, TICK_INTERVAL_MS);
    s = checkUnlocks(s);
    
    // Handle events
    if (s.activeEventId) {
      const evt = EVENTS.find((e: any) => e.id === s.activeEventId);
      if (evt && evt.choices && evt.choices.length > 0) {
        // Always pick first choice (safest)
        const rng = createRng(s.seed, s.time.tick);
        const result = evt.choices[0].effect(s, rng);
        s = { ...result.state, activeEventId: null };
        s = checkUnlocks(s);
      } else {
        s = { ...s, activeEventId: null };
      }
    }
  }
  return s;
}

// Helper: do action safely
function doAction(state: any, actionId: string): { state: any; result: any } {
  const rng = createRng(state.seed, state.time.tick);
  const result = performAction(state, actionId, rng);
  let nextState = checkUnlocks(result.state);
  
  // Handle event triggered by action
  if (result.success && nextState.activeEventId) {
    const evt = EVENTS.find((e: any) => e.id === nextState.activeEventId);
    if (evt && evt.choices && evt.choices.length > 0) {
      const rng2 = createRng(nextState.seed, nextState.time.tick);
      const evtResult = evt.choices[0].effect(nextState, rng2);
      nextState = { ...evtResult.state, activeEventId: null };
      nextState = checkUnlocks(nextState);
    } else {
      nextState = { ...nextState, activeEventId: null };
    }
  }
  
  return { state: nextState, result };
}

// Helper: try action, report if it fails when it shouldn't
function tryAction(state: any, actionId: string, expectSuccess: boolean = true, phase: string = ''): any {
  const action = ACTIONS[actionId];
  if (!action) {
    reportIssue(phase || 'action', 'critical', `动作 ${actionId} 不存在于 ACTIONS 注册表`);
    return state;
  }
  
  const { state: nextState, result } = doAction(state, actionId);
  
  if (expectSuccess && !result.success) {
    reportIssue(phase || 'action', 'major', `动作 ${actionId} (${action.name}) 预期成功但失败了`, result.log);
  }
  if (!expectSuccess && result.success) {
    reportIssue(phase || 'action', 'minor', `动作 ${actionId} (${action.name}) 预期失败但成功了`, result.log);
  }
  
  return nextState;
}

// Helper: check resource state
function checkResources(state: any, phase: string) {
  const r = state.resources;
  if (r.essence < 0) reportIssue(phase, 'critical', '精元为负数', `essence=${r.essence}`);
  if (r.qi < 0) reportIssue(phase, 'major', '气为负数', `qi=${r.qi}`);
  if (r.insight < 0) reportIssue(phase, 'minor', '见闻为负数', `insight=${r.insight}`);
  if (r.dantoxin < 0) reportIssue(phase, 'critical', '丹毒为负数', `dantoxin=${r.dantoxin}`);
  if (r.wounds < 0) reportIssue(phase, 'critical', '伤为负数', `wounds=${r.wounds}`);
  if (r.lifespan <= 0) reportIssue(phase, 'critical', '寿元耗尽但游戏未结束', `lifespan=${r.lifespan}`);
  
  const maxEssence = getMaxStamina(state.realm);
  if (r.essence > maxEssence) reportIssue(phase, 'minor', '精元超过上限', `essence=${r.essence}, max=${maxEssence}`);
}

// Helper: force resources for testing
function setResources(state: any, overrides: Partial<typeof state.resources>): any {
  return {
    ...state,
    resources: { ...state.resources, ...overrides }
  };
}

// ============================================================
// PHASE 1: 初始化与出身选择
// ============================================================
function testPhase1_OriginSelection(): any {
  const phase = 'P1-出身';
  log(phase, '测试出身选择...');
  
  let state = createInitialState(42);
  
  // Test: initial state should have Mortal realm
  if (state.realm !== Realm.Mortal) {
    reportIssue(phase, 'critical', '初始境界不是凡人', `realm=${state.realm}`);
  }
  
  // Test: only kuzuo should be unlocked
  if (state.unlockedActions.length !== 1 || state.unlockedActions[0] !== 'kuzuo') {
    reportIssue(phase, 'major', '初始解锁动作不正确', `actions=${state.unlockedActions.join(',')}`);
  }
  
  // Test: try each origin
  for (const [originId, origin] of Object.entries(ORIGINS)) {
    if (!origin.selectable) continue;
    let testState = createInitialState(42);
    testState = applyOrigin(testState, originId as OriginId);
    
    if (!hasSelectedOrigin(testState)) {
      reportIssue(phase, 'critical', `选择出身 ${origin.name} 后未标记已选`, `origin=${originId}`);
    }
    
    // Check origin bonuses applied
    if (origin.bonusResources) {
      for (const [key, val] of Object.entries(origin.bonusResources)) {
        const actual = (testState.resources as any)[key];
        if (actual === undefined) {
          reportIssue(phase, 'major', `出身 ${origin.name} 的 bonusResources 包含不存在的字段: ${key}`);
        }
      }
    }
    
    // Check starting location
    if (origin.startLocation && testState.currentLocationId !== origin.startLocation) {
      reportIssue(phase, 'major', `出身 ${origin.name} 的起始位置不正确`, `expected=${origin.startLocation}, got=${testState.currentLocationId}`);
    }
  }
  
  // Choose herbalist_apprentice for best testing path (alchemy + herbs)
  state = applyOrigin(state, 'herbalist_apprentice');
  log(phase, `选择药铺学徒, 位置=${state.currentLocationId}, 草药=${state.resources.herbs}, 气=${state.resources.qi}`);
  
  checkResources(state, phase);
  return state;
}

// ============================================================
// PHASE 2: 凡人阶段 - 从枯坐到炼气
// ============================================================
function testPhase2_MortalToQi(state: any): any {
  const phase = 'P2-凡人';
  log(phase, '测试凡人阶段...');
  
  // Simulate some ticks to see if basic unlocks trigger
  state = simulateTicks(state, 5);
  checkResources(state, phase);
  
  // Do kuzuo to gain insight
  log(phase, `初始: insight=${state.resources.insight}, qi=${state.resources.qi}, unlockedActions=${state.unlockedActions.join(',')}`);
  
  // Do kuzuo several times to unlock tuna
  for (let i = 0; i < 5; i++) {
    state = tryAction(state, 'kuzuo', true, phase);
    state = simulateTicks(state, 2); // recover essence
    checkResources(state, phase);
  }
  
  log(phase, `枯坐5次后: insight=${state.resources.insight}, unlockedActions=${state.unlockedActions.join(',')}`);
  
  // Check if tuna is unlocked now
  if (!state.unlockedActions.includes('tuna')) {
    reportIssue(phase, 'major', '枯坐5次后吐纳未解锁', `insight=${state.resources.insight}, qi=${state.resources.qi}`);
  }
  
  // Do tuna to gain qi
  if (state.unlockedActions.includes('tuna')) {
    for (let i = 0; i < 10; i++) {
      if (state.resources.essence >= 5) {
        state = tryAction(state, 'tuna', true, phase);
      }
      state = simulateTicks(state, 3);
    }
    log(phase, `吐纳后: qi=${state.resources.qi}, insight=${state.resources.insight}`);
  }
  
  // Do more kuzuo + tuna to accumulate resources for yinqi
  for (let round = 0; round < 20; round++) {
    if (state.resources.essence >= 5 && state.unlockedActions.includes('tuna')) {
      state = tryAction(state, 'tuna', true, phase);
    } else if (state.resources.essence >= 3) {
      state = tryAction(state, 'kuzuo', true, phase);
    }
    state = simulateTicks(state, 5);
    
    // Try tiaoxi when essence is low
    if (state.resources.essence < 20 && state.unlockedActions.includes('tiaoxi')) {
      state = tryAction(state, 'tiaoxi', true, phase);
    }
  }
  
  log(phase, `修炼后: qi=${state.resources.qi}, insight=${state.resources.insight}, unlocked=${state.unlockedActions.join(',')}`);
  
  // Check for yinqi (enter Qi Condensation)
  if (state.unlockedActions.includes('yinqi')) {
    log(phase, '引气动作已解锁，尝试引气入体...');
    state = tryAction(state, 'yinqi', true, phase);
    if (state.realm !== Realm.QiCondensation) {
      reportIssue(phase, 'major', '引气后境界未变为炼气', `realm=${state.realm}`);
    }
    log(phase, `引气后: realm=${state.realm}, realmLayer=${state.realmLayer}`);
  } else {
    // Force it by giving enough resources
    log(phase, '引气未自然解锁，强制设置资源后测试...');
    state = setResources(state, { qi: 20, insight: 5 });
    state = checkUnlocks(state);
    if (state.unlockedActions.includes('yinqi')) {
      state = tryAction(state, 'yinqi', true, phase);
      log(phase, `强制引气后: realm=${state.realm}`);
    } else {
      reportIssue(phase, 'critical', '即使有足够资源，引气动作也不解锁', `qi=20, insight=5`);
    }
  }
  
  checkResources(state, phase);
  return state;
}

// ============================================================
// PHASE 3: 炼气阶段 - 内视灵根 + 突破
// ============================================================
function testPhase3_QiCondensation(state: any): any {
  const phase = 'P3-炼气';
  log(phase, '测试炼气阶段...');
  
  if (state.realm !== Realm.QiCondensation) {
    reportIssue(phase, 'critical', '不在炼气阶段，跳过测试');
    return state;
  }
  
  // Check inspect_root
  state = simulateTicks(state, 10);
  checkResources(state, phase);
  
  if (state.unlockedActions.includes('inspect_root')) {
    log(phase, '内视灵根已解锁...');
    state = tryAction(state, 'inspect_root', true, phase);
    if (!state.cultivation.rootKnown) {
      reportIssue(phase, 'major', '内视灵根后 rootKnown 仍为 false');
    }
    log(phase, `灵根: ${state.spiritualRoot}, 亲和: ${JSON.stringify(state.cultivation.phaseAffinities)}`);
  } else {
    reportIssue(phase, 'major', '炼气阶段内视灵根未解锁', `unlocked=${state.unlockedActions.join(',')}`);
  }
  
  // Check attune_technique
  if (state.cultivation.rootKnown && state.unlockedActions.includes('attune_technique')) {
    log(phase, '按相修订已解锁...');
    state = tryAction(state, 'attune_technique', true, phase);
    log(phase, `当前功法: ${state.cultivation.activeTechniqueId}`);
  }
  
  // Accumulate for rike_tuna
  log(phase, '积累资源解锁日课吐纳...');
  for (let round = 0; round < 15; round++) {
    if (state.resources.essence >= 5 && state.unlockedActions.includes('tuna')) {
      state = tryAction(state, 'tuna', true, phase);
    }
    state = simulateTicks(state, 5);
  }
  
  if (state.unlockedActions.includes('rike_tuna')) {
    log(phase, '日课吐纳已解锁');
  }
  
  // Test breakthrough: Qi Layer 2
  log(phase, '测试炼气二层突破...');
  
  // Need enough qi and insight for stabilize + breakthrough
  state = setResources(state, { qi: 40, insight: 5, essence: 80 });
  state = checkUnlocks(state);
  
  if (state.unlockedActions.includes('stabilize_bottleneck') || state.unlockedActions.includes('breakthrough_qi_2')) {
    // First stabilize
    if (state.unlockedActions.includes('stabilize_bottleneck')) {
      state = tryAction(state, 'stabilize_bottleneck', true, phase);
    }
    // Then breakthrough
    if (state.unlockedActions.includes('breakthrough_qi_2')) {
      state = tryAction(state, 'breakthrough_qi_2', true, phase);
      if (state.realmLayer < 2) {
        // Might fail due to RNG, that's ok, but check we can retry
        log(phase, '突破失败（可能是RNG），检查重试机制...');
        state = setResources(state, { qi: 200, insight: 50, essence: 200 });
        // Add lots of preparation
        for (let i = 0; i < 5; i++) {
          if (state.unlockedActions.includes('stabilize_bottleneck')) {
            state = tryAction(state, 'stabilize_bottleneck', true, phase);
          }
        }
        state = checkUnlocks(state);
        if (state.unlockedActions.includes('breakthrough_qi_2')) {
          state = tryAction(state, 'breakthrough_qi_2', true, phase);
        }
      }
      log(phase, `突破后: realm=${state.realm}, layer=${state.realmLayer}`);
    }
  } else {
    reportIssue(phase, 'major', '炼气阶段稳固关口/突破动作未解锁', `qi=${state.resources.qi}, insight=${state.resources.insight}`);
  }
  
  // Test travel to different locations
  log(phase, '测试地点切换...');
  const visibleLocations = getVisibleLocations(state);
  log(phase, `可见地点: ${visibleLocations.map((l: any) => l.name).join(', ')}`);
  
  for (const loc of visibleLocations) {
    const moveResult = moveToLocation(state, loc.id);
    if (moveResult.log.includes('无法')) {
      reportIssue(phase, 'minor', `无法移动到 ${loc.name}`, moveResult.log);
    }
    state = moveResult.state;
    state = checkUnlocks(state);
  }
  
  // Move back to home
  state = moveToLocation(state, 'home').state;
  state = checkUnlocks(state);
  
  checkResources(state, phase);
  return state;
}

// ============================================================
// PHASE 4: 炼气高层 → 筑基
// ============================================================
function testPhase4_QiToFoundation(state: any): any {
  const phase = 'P4-筑基';
  log(phase, '测试炼气→筑基...');
  
  // Force to Qi Layer 9
  state = { ...state, realm: Realm.QiCondensation, realmLayer: 9 };
  state = setResources(state, { qi: 200, insight: 50, essence: 200, dantoxin: 0, wounds: 0 });
  state = checkUnlocks(state);
  
  // Test stabilize + breakthrough for Foundation
  if (state.unlockedActions.includes('stabilize_bottleneck')) {
    for (let i = 0; i < 5; i++) {
      state = tryAction(state, 'stabilize_bottleneck', true, phase);
    }
  }
  state = checkUnlocks(state);
  
  log(phase, `准备筑基前: unlockedActions=${state.unlockedActions.filter((a: string) => a.includes('foundation') || a.includes('breakthrough')).join(',')}`);
  
  if (state.unlockedActions.includes('breakthrough_foundation')) {
    state = tryAction(state, 'breakthrough_foundation', true, phase);
    log(phase, `筑基后: realm=${state.realm}, layer=${state.realmLayer}`);
  } else {
    reportIssue(phase, 'major', '筑基突破动作未解锁', `layer=9, prepared=${JSON.stringify(state.breakthrough.preparation)}`);
    // Force breakthrough for further testing
    state = { ...state, realm: Realm.FoundationEstablishment, realmLayer: 0 };
    state = checkUnlocks(state);
  }
  
  if (state.realm !== Realm.FoundationEstablishment) {
    reportIssue(phase, 'critical', '筑基失败但应成功（资源充足）');
    // Force for further testing
    state = { ...state, realm: Realm.FoundationEstablishment, realmLayer: 0 };
    state = checkUnlocks(state);
  }
  
  checkResources(state, phase);
  return state;
}

// ============================================================
// PHASE 5: 筑基阶段 - 宗门、洞府、炼丹
// ============================================================
function testPhase5_Foundation(state: any): any {
  const phase = 'P5-筑基';
  log(phase, '测试筑基阶段系统...');
  
  if (state.realm !== Realm.FoundationEstablishment) {
    reportIssue(phase, 'critical', '不在筑基阶段');
    return state;
  }
  
  state = setResources(state, { qi: 200, insight: 50, essence: 200, herbs: 20, coins: 100 });
  state = checkUnlocks(state);
  
  // Test Sect system
  log(phase, '测试宗门系统...');
  const sectActions = state.unlockedActions.filter((a: string) => a.startsWith('sect_'));
  log(phase, `宗门动作: ${sectActions.join(', ')}`);
  
  if (sectActions.length === 0) {
    reportIssue(phase, 'major', '筑基阶段没有宗门相关动作');
  }
  
  // Try to register at outer gate
  state = moveToLocation(state, 'outer_gate').state;
  state = checkUnlocks(state);
  
  // Do sect chores
  for (let i = 0; i < 5; i++) {
    if (state.unlockedActions.includes('sect_chore')) {
      state = tryAction(state, 'sect_chore', true, phase);
    }
    if (state.unlockedActions.includes('sect_errand')) {
      state = tryAction(state, 'sect_errand', true, phase);
    }
    state = simulateTicks(state, 5);
  }
  
  log(phase, `宗门状态: rank=${state.sect.rank}, contribution=${state.sect.contribution}`);
  
  // Test Dwelling system
  log(phase, '测试洞府系统...');
  state = moveToLocation(state, 'home').state;
  state = checkUnlocks(state);
  
  if (state.unlockedActions.includes('establish_dwelling')) {
    state = tryAction(state, 'establish_dwelling', true, phase);
    log(phase, `洞府等级: ${state.dwelling.level}, 自动气/天: ${state.dwelling.autoQiPerDay}`);
  } else {
    reportIssue(phase, 'major', '筑基阶段建洞府未解锁');
  }
  
  if (state.dwelling.level >= 1 && state.unlockedActions.includes('upgrade_dwelling')) {
    state = setResources(state, { ...state.resources, coins: 200, herbs: 30 });
    state = tryAction(state, 'upgrade_dwelling', true, phase);
    log(phase, `升级洞府后: level=${state.dwelling.level}`);
  }
  
  // Test Alchemy system
  log(phase, '测试炼丹系统...');
  const alchemyActions = state.unlockedActions.filter((a: string) => a.startsWith('study_') || a.startsWith('brew_') || a.startsWith('take_'));
  log(phase, `炼丹动作: ${alchemyActions.join(', ')}`);
  
  if (alchemyActions.length === 0) {
    reportIssue(phase, 'major', '筑基阶段没有炼丹相关动作');
  }
  
  // Try to study and brew a basic pill
  if (state.unlockedActions.includes('study_small_gathering_pill_formula')) {
    state = tryAction(state, 'study_small_gathering_pill_formula', true, phase);
  }
  if (state.unlockedActions.includes('brew_small_gathering_pill')) {
    state = tryAction(state, 'brew_small_gathering_pill', true, phase);
    log(phase, `炼丹后: alchemy_affinity=${state.choices.qualities.alchemy_affinity || 0}, qiPills=${state.resources.qiPills}`);
  }
  
  // Try to take a pill
  if (state.resources.qiPills > 0 && state.unlockedActions.includes('take_small_gathering_pill')) {
    state = tryAction(state, 'take_small_gathering_pill', true, phase);
    log(phase, `服丹后: qi=${state.resources.qi}, dantoxin=${state.resources.dantoxin}`);
  }
  
  // Test Follower system
  log(phase, '测试弟子系统...');
  if (state.dwelling.level >= 1 && state.unlockedActions.includes('recruit_servant')) {
    state = tryAction(state, 'recruit_servant', true, phase);
    log(phase, `弟子数: ${Object.keys(state.followers.followers).length}`);
  }
  
  // Test Secret Realm
  log(phase, '测试秘境系统...');
  const srActions = state.unlockedActions.filter((a: string) => a.includes('secret') || a.includes('realm'));
  log(phase, `秘境相关动作: ${srActions.join(', ')}`);
  
  checkResources(state, phase);
  return state;
}

// ============================================================
// PHASE 6: 金丹阶段
// ============================================================
function testPhase6_GoldenCore(state: any): any {
  const phase = 'P6-金丹';
  log(phase, '测试金丹阶段...');
  
  state = { ...state, realm: Realm.GoldenCore, realmLayer: 0 };
  state = setResources(state, { qi: 500, insight: 100, essence: 300, herbs: 50, coins: 300, dantoxin: 0, wounds: 0 });
  state = checkUnlocks(state);
  
  log(phase, `金丹解锁动作: ${state.unlockedActions.join(', ')}`);
  
  // Check new locations
  const visibleLocations = getVisibleLocations(state);
  const goldenLocations = visibleLocations.filter((l: any) => l.qiDensity >= 3.0);
  log(phase, `高灵气密度地点: ${goldenLocations.map((l: any) => `${l.name}(密度${l.qiDensity})`).join(', ')}`);
  
  // Test high realm cultivation actions
  if (state.unlockedActions.includes('golden_core_practice')) {
    state = tryAction(state, 'golden_core_practice', true, phase);
  }
  
  // Test disciple recruitment (GoldenCore + dwelling >= 2)
  if (state.dwelling.level < 2) {
    state = { ...state, dwelling: { ...state.dwelling, level: 2 } };
    state = checkUnlocks(state);
  }
  if (state.unlockedActions.includes('recruit_disciple')) {
    state = tryAction(state, 'recruit_disciple', true, phase);
  }
  
  checkResources(state, phase);
  return state;
}

// ============================================================
// PHASE 7: 元婴阶段
// ============================================================
function testPhase7_NascentSoul(state: any): any {
  const phase = 'P7-元婴';
  log(phase, '测试元婴阶段...');
  
  state = { ...state, realm: Realm.NascentSoul, realmLayer: 0 };
  state = setResources(state, { qi: 1000, insight: 200, essence: 500, coins: 500, dantoxin: 0, wounds: 0 });
  state = checkUnlocks(state);
  
  // Test NascentSoul specific actions
  if (state.unlockedActions.includes('nascent_soul_practice')) {
    state = tryAction(state, 'nascent_soul_practice', true, phase);
  }
  
  // Test Thunder Peak location
  state = moveToLocation(state, 'thunder_peak').state;
  state = checkUnlocks(state);
  
  if (state.unlockedActions.includes('thunder_cultivation')) {
    state = tryAction(state, 'thunder_cultivation', true, phase);
    log(phase, `雷修日课结果: qi=${state.resources.qi}`);
  }
  
  // Test ascension availability
  if (state.realm === Realm.NascentSoul && state.resources.qi >= 200) {
    log(phase, '飞升应已可用...');
    // Don't actually ascend, just check
  }
  
  checkResources(state, phase);
  return state;
}

// ============================================================
// PHASE 8: 事件系统深度测试
// ============================================================
function testPhase8_Events(state: any): any {
  const phase = 'P8-事件';
  log(phase, '测试事件系统...');
  
  // Test event rolling for different game states
  let eventsTriggered = 0;
  let eventsErrored = 0;
  
  for (let tick = 0; tick < 1000; tick++) {
    state = processTick(state, TICK_INTERVAL_MS);
    state = checkUnlocks(state);
    
    if (state.activeEventId) {
      eventsTriggered++;
      const evt = EVENTS.find((e: any) => e.id === state.activeEventId);
      if (!evt) {
        reportIssue(phase, 'critical', `事件 ${state.activeEventId} 不存在于EVENTS注册表`);
        state = { ...state, activeEventId: null };
        continue;
      }
      
      if (!evt.choices || evt.choices.length === 0) {
        reportIssue(phase, 'major', `事件 ${evt.id} 没有选项`);
        state = { ...state, activeEventId: null };
        continue;
      }
      
      // Try each choice
      try {
        const rng = createRng(state.seed, state.time.tick);
        const choiceIdx = Math.floor(rng() * evt.choices.length);
        const result = evt.choices[choiceIdx].effect(state, rng);
        if (!result.state || !result.log) {
          reportIssue(phase, 'major', `事件 ${evt.id} 选项${choiceIdx}返回缺少state或log`);
        }
        state = { ...result.state, activeEventId: null };
        state = checkUnlocks(state);
      } catch (err: any) {
        eventsErrored++;
        reportIssue(phase, 'critical', `事件 ${evt.id} 选项执行报错`, err.message);
        state = { ...state, activeEventId: null };
      }
    }
  }
  
  log(phase, `1000 ticks中触发事件: ${eventsTriggered}次, 错误: ${eventsErrored}次`);
  
  if (eventsTriggered === 0) {
    reportIssue(phase, 'major', '1000 ticks中没有任何事件触发');
  }
  
  checkResources(state, phase);
  return state;
}

// ============================================================
// PHASE 9: 存档系统
// ============================================================
function testPhase9_SaveLoad(state: any): any {
  const phase = 'P9-存档';
  log(phase, '测试存档系统...');
  
  try {
    const serialized = serializeSave(state, Date.now());
    log(phase, `存档大小: ${serialized.length} bytes`);
    
    const loaded = deserializeSave(serialized);
    
    // Compare key fields
    if (loaded.realm !== state.realm) {
      reportIssue(phase, 'critical', '存档加载后realm不一致', `${loaded.realm} vs ${state.realm}`);
    }
    if (loaded.realmLayer !== state.realmLayer) {
      reportIssue(phase, 'critical', '存档加载后realmLayer不一致');
    }
    if (loaded.resources.qi !== state.resources.qi) {
      reportIssue(phase, 'major', '存档加载后qi不一致', `${loaded.resources.qi} vs ${state.resources.qi}`);
    }
    if (loaded.seed !== state.seed) {
      reportIssue(phase, 'major', '存档加载后seed不一致');
    }
    if (Object.keys(loaded.unlockedActions).length !== Object.keys(state.unlockedActions).length) {
      reportIssue(phase, 'major', '存档加载后解锁动作数不一致');
    }
    
    log(phase, '存档加载对比完成');
    return loaded;
  } catch (err: any) {
    reportIssue(phase, 'critical', '存档/读档过程报错', err.message);
    return state;
  }
}

// ============================================================
// PHASE 10: 边界条件与压力测试
// ============================================================
function testPhase10_EdgeCases(state: any): any {
  const phase = 'P10-边界';
  log(phase, '测试边界条件...');
  
  // Test: dantoxin spiral
  log(phase, '测试丹毒死亡螺旋...');
  let toxicState = { ...state };
  toxicState = setResources(toxicState, { dantoxin: 100, essence: 5, wounds: 8 });
  toxicState = simulateTicks(toxicState, 50);
  if (toxicState.resources.wounds >= 10) {
    log(phase, '丹毒→伤→死亡 螺旋验证: wounds达到10（游戏应结束）');
  } else if (toxicState.resources.essence > 0) {
    log(phase, '丹毒螺旋: 50 ticks后 wounds=' + toxicState.resources.wounds);
  }
  
  // Test: batch tick processing
  log(phase, '测试批量结算...');
  let batchState = { ...state };
  batchState.resources.essence = 200;
  try {
    const batched = processBatchTicks(batchState, 10000);
    if (batched.resources.lifespan <= 0) {
      log(phase, '批量结算10000 ticks后寿元耗尽（预期）');
    } else {
      log(phase, `批量结算后: lifespan=${batched.resources.lifespan}, tick=${batched.time.tick}`);
    }
  } catch (err: any) {
    reportIssue(phase, 'critical', '批量结算报错', err.message);
  }
  
  // Test: every action with insufficient resources
  log(phase, '测试资源不足时的动作...');
  let brokeState = { ...state, resources: { ...state.resources, essence: 0, qi: 0, insight: 0, coins: 0, herbs: 0 } };
  for (const actionId of state.unlockedActions) {
    const rng = createRng(brokeState.seed, brokeState.time.tick);
    try {
      const result = performAction(brokeState, actionId, rng);
      // Most should fail due to insufficient resources, but none should crash
      if (result.success) {
        // Some actions might be free, that's ok
      }
    } catch (err: any) {
      reportIssue(phase, 'critical', `资源不足时执行 ${actionId} 报错`, err.message);
    }
  }
  
  // Test: invalid action
  log(phase, '测试无效动作...');
  try {
    const rng = createRng(state.seed, state.time.tick);
    const result = performAction(state, 'nonexistent_action', rng);
    if (result.success) {
      reportIssue(phase, 'critical', '无效动作竟然成功了');
    }
  } catch (err: any) {
    // Expected to fail gracefully
    log(phase, `无效动作处理: ${err.message}`);
  }
  
  // Test: move to locked location
  log(phase, '测试锁定地点...');
  const moveResult = moveToLocation(state, 'tribulation_platform');
  if (moveResult.log.includes('无法') || moveResult.state.currentLocationId !== 'tribulation_platform') {
    log(phase, '无法移到渡劫台（预期）');
  } else {
    reportIssue(phase, 'major', '凡人/低境界可移到渡劫台');
  }
  
  // Test: Dao path calculation with extreme qualities
  log(phase, '测试道途极端值...');
  let extremeState = { ...state };
  extremeState.choices.qualities = {
    alchemy_affinity: 50,
    quiet_cultivation: 50,
    combat_edge: 50,
    market_ties: 50,
    sect_trace: 50,
  };
  // Simulate ticks to trigger dao path recalculation
  extremeState = simulateTicks(extremeState, 100);
  if (extremeState.daoPath.currentPath) {
    log(phase, `极端道途: ${extremeState.daoPath.currentPath}`);
  }
  
  checkResources(state, phase);
  return state;
}

// ============================================================
// PHASE 11: 动作完整性检查
// ============================================================
function testPhase11_ActionIntegrity(state: any): any {
  const phase = 'P11-动作完整性';
  log(phase, '检查所有注册动作的完整性...');
  
  for (const [id, action] of Object.entries(ACTIONS) as [string, any][]) {
    // Check action has required fields
    if (!action.name) reportIssue(phase, 'major', `动作 ${id} 缺少name`);
    if (!action.cost) reportIssue(phase, 'minor', `动作 ${id} 缺少cost`);
    if (!action.output) reportIssue(phase, 'minor', `动作 ${id} 缺少output`);
    if (action.cost && action.cost.lifespan) {
      reportIssue(phase, 'minor', `动作 ${id} 的cost包含lifespan（应通过tick自动消耗）`);
    }
    if (action.output && action.output.lifespan) {
      reportIssue(phase, 'minor', `动作 ${id} 的output包含lifespan（应通过特殊逻辑处理）`);
    }
    
    // Check that output resources are valid keys
    if (action.output) {
      for (const key of Object.keys(action.output)) {
        if (!(key in state.resources)) {
          reportIssue(phase, 'major', `动作 ${id} 的output包含无效字段: ${key}`);
        }
      }
    }
    if (action.cost) {
      for (const key of Object.keys(action.cost)) {
        if (!(key in state.resources)) {
          reportIssue(phase, 'major', `动作 ${id} 的cost包含无效字段: ${key}`);
        }
      }
    }
    
    // Check actionGroup
    if (!action.actionGroup) {
      reportIssue(phase, 'minor', `动作 ${id} 缺少actionGroup`);
    }
  }
  
  log(phase, `共检查 ${Object.keys(ACTIONS).length} 个动作`);
  return state;
}

// ============================================================
// PHASE 12: 事件完整性检查
// ============================================================
function testPhase12_EventIntegrity(state: any): any {
  const phase = 'P12-事件完整性';
  log(phase, '检查所有事件的完整性...');
  
  for (const evt of EVENTS) {
    if (!evt.id) reportIssue(phase, 'critical', '事件缺少id');
    if (!evt.text) reportIssue(phase, 'major', `事件 ${evt.id} 缺少text`);
    if (!evt.choices || evt.choices.length === 0) {
      reportIssue(phase, 'major', `事件 ${evt.id} 没有选项`);
      continue;
    }
    
    // Test each choice can execute without error
    for (let i = 0; i < evt.choices.length; i++) {
      const choice = evt.choices[i];
      if (!choice.text) {
        reportIssue(phase, 'major', `事件 ${evt.id} 选项${i}缺少text`);
      }
      if (!choice.effect || typeof choice.effect !== 'function') {
        reportIssue(phase, 'critical', `事件 ${evt.id} 选项${i}缺少effect函数`);
        continue;
      }
      
      // Try executing the choice with a test state
      try {
        const testState = createInitialState(42);
        // Apply origin first
        const withOrigin = applyOrigin(testState, 'herbalist_apprentice');
        const rng = createRng(withOrigin.seed, 100);
        const result = choice.effect(withOrigin, rng);
        if (!result || !result.state) {
          reportIssue(phase, 'major', `事件 ${evt.id} 选项${i}的effect返回缺少state`);
        }
        if (!result || !result.log) {
          reportIssue(phase, 'minor', `事件 ${evt.id} 选项${i}的effect返回缺少log`);
        }
      } catch (err: any) {
        // Some events require specific state, that's ok
        // But if it's a simple null access error, report it
        if (err.message.includes('Cannot read') || err.message.includes('undefined')) {
          reportIssue(phase, 'major', `事件 ${evt.id} 选项${i}执行报错（可能缺少状态检查）`, err.message);
        }
      }
    }
  }
  
  log(phase, `共检查 ${EVENTS.length} 个事件`);
  return state;
}

// ============================================================
// PHASE 13: 解锁链路完整性
// ============================================================
function testPhase13_UnlockChain(state: any): any {
  const phase = 'P13-解锁链';
  log(phase, '测试解锁链路完整性...');
  
  // Start fresh and trace the full unlock chain
  let s = createInitialState(42);
  s = applyOrigin(s, 'herbalist_apprentice');
  
  const unlockHistory: string[] = [];
  
  // Simulate progression with sufficient resources
  for (let tick = 0; tick < 50000; tick++) {
    // Periodically boost resources to ensure progression isn't blocked
    if (tick % 1000 === 0) {
      s.resources.essence = Math.max(s.resources.essence, getMaxStamina(s.realm));
      if (s.resources.insight < 20) s.resources.insight += 5;
    }
    
    s = processTick(s, TICK_INTERVAL_MS);
    
    // Handle events automatically
    if (s.activeEventId) {
      const evt = EVENTS.find((e: any) => e.id === s.activeEventId);
      if (evt && evt.choices && evt.choices.length > 0) {
        const rng = createRng(s.seed, s.time.tick);
        const result = evt.choices[0].effect(s, rng);
        s = { ...result.state, activeEventId: null };
      } else {
        s = { ...s, activeEventId: null };
      }
    }
    
    const newUnlocks = checkUnlocks(s);
    if (newUnlocks.unlockedActions.length > s.unlockedActions.length) {
      const added = newUnlocks.unlockedActions.filter((a: string) => !s.unlockedActions.includes(a));
      for (const a of added) {
        unlockHistory.push(`tick=${tick} realm=${s.realm}L${s.realmLayer}: ${a}`);
      }
    }
    s = newUnlocks;
    
    // Do some actions
    if (tick % 50 === 0 && s.resources.essence >= 10) {
      const availableActions = s.unlockedActions.filter((a: string) => {
        const action = ACTIONS[a];
        if (!action) return false;
        if (action.conditions.requiredRealm && !checkRealmRequirement(s.realm, action.conditions.requiredRealm)) return false;
        return true;
      });
      
      if (availableActions.length > 0) {
        const pick = availableActions[Math.floor(createRng(s.seed, tick)() * availableActions.length)];
        const result = doAction(s, pick);
        s = result.state;
      }
    }
    
    // Check for death
    if (s.resources.lifespan <= 0 || s.resources.wounds >= 10) {
      log(phase, `角色在tick=${tick}死亡, realm=${s.realm}L${s.realmLayer}`);
      break;
    }
  }
  
  log(phase, '解锁历史:');
  for (const entry of unlockHistory) {
    log(phase, `  ${entry}`);
  }
  
  // Check: should have at least some basic unlocks
  if (!s.unlockedActions.includes('tuna') && !s.unlockedActions.includes('rike_tuna')) {
    reportIssue(phase, 'critical', '50000 ticks后吐纳/日课吐纳仍未解锁');
  }
  
  return state;
}

function checkRealmRequirement(current: Realm, required: Realm): boolean {
  const order = [
    Realm.Mortal, Realm.QiCondensation, Realm.FoundationEstablishment,
    Realm.GoldenCore, Realm.NascentSoul, Realm.SpiritTransformation,
    Realm.Integration, Realm.Mahayana, Realm.Tribulation
  ];
  return order.indexOf(current) >= order.indexOf(required);
}

// ============================================================
// PHASE 14: UI数据完整性
// ============================================================
function testPhase14_UIData(state: any): any {
  const phase = 'P14-UI数据';
  log(phase, '测试UI数据完整性...');
  
  // Check that all unlocked actions have valid data for UI display
  for (const actionId of state.unlockedActions) {
    const action = ACTIONS[actionId];
    if (!action) {
      reportIssue(phase, 'critical', `解锁动作 ${actionId} 不在ACTIONS注册表中`);
      continue;
    }
    
    // Check name is not empty
    if (!action.name || action.name.trim() === '') {
      reportIssue(phase, 'major', `动作 ${actionId} 名称为空`);
    }
    
    // Check actionGroup for UI categorization
    if (!action.actionGroup) {
      reportIssue(phase, 'minor', `动作 ${actionId} 缺少actionGroup分类`);
    }
  }
  
  // Check locations have valid data
  const visibleLocations = getVisibleLocations(state);
  for (const loc of visibleLocations) {
    if (!loc.name) reportIssue(phase, 'major', `地点 ${loc.id} 缺少name`);
    if (!loc.availableActions) reportIssue(phase, 'minor', `地点 ${loc.id} 缺少availableActions`);
    if (loc.qiDensity <= 0) reportIssue(phase, 'major', `地点 ${loc.name} 灵气密度≤0`);
  }
  
  return state;
}

// ============================================================
// MAIN: Run all phases
// ============================================================
function main() {
  console.log('='.repeat(60));
  console.log('  文字修仙 - 全面玩家测试');
  console.log('='.repeat(60));
  console.log('');
  
  let state = testPhase1_OriginSelection();
  state = testPhase2_MortalToQi(state);
  state = testPhase3_QiCondensation(state);
  state = testPhase4_QiToFoundation(state);
  state = testPhase5_Foundation(state);
  state = testPhase6_GoldenCore(state);
  state = testPhase7_NascentSoul(state);
  state = testPhase8_Events(state);
  state = testPhase9_SaveLoad(state);
  state = testPhase10_EdgeCases(state);
  state = testPhase11_ActionIntegrity(state);
  state = testPhase12_EventIntegrity(state);
  state = testPhase13_UnlockChain(state);
  state = testPhase14_UIData(state);
  
  // Summary
  console.log('');
  console.log('='.repeat(60));
  console.log('  测试结果汇总');
  console.log('='.repeat(60));
  
  const critical = issues.filter(i => i.severity === 'critical');
  const major = issues.filter(i => i.severity === 'major');
  const minor = issues.filter(i => i.severity === 'minor');
  const cosmetic = issues.filter(i => i.severity === 'cosmetic');
  
  console.log(`\n总计发现 ${issues.length} 个问题:`);
  console.log(`  🔴 严重 (Critical): ${critical.length}`);
  console.log(`  🟠 重要 (Major): ${major.length}`);
  console.log(`  🟡 次要 (Minor): ${minor.length}`);
  console.log(`  🔵 美观 (Cosmetic): ${cosmetic.length}`);
  
  if (critical.length > 0) {
    console.log('\n--- 严重问题 ---');
    for (const i of critical) {
      console.log(`  [${i.phase}] ${i.description}${i.details ? ' — ' + i.details : ''}`);
    }
  }
  
  if (major.length > 0) {
    console.log('\n--- 重要问题 ---');
    for (const i of major) {
      console.log(`  [${i.phase}] ${i.description}${i.details ? ' — ' + i.details : ''}`);
    }
  }
  
  if (minor.length > 0) {
    console.log('\n--- 次要问题 ---');
    for (const i of minor) {
      console.log(`  [${i.phase}] ${i.description}${i.details ? ' — ' + i.details : ''}`);
    }
  }
  
  if (cosmetic.length > 0) {
    console.log('\n--- 美观问题 ---');
    for (const i of cosmetic) {
      console.log(`  [${i.phase}] ${i.description}${i.details ? ' — ' + i.details : ''}`);
    }
  }
  
  // Write issues to file for later processing
  const fs = require('fs');
  fs.writeFileSync(
    '/home/z/my-project/download/playtest_issues.json',
    JSON.stringify(issues, null, 2),
    'utf-8'
  );
  console.log('\n问题列表已保存到 /home/z/my-project/download/playtest_issues.json');
}

main();
