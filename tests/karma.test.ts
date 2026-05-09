import { describe, it, expect } from 'vitest';
import { createInitialState } from '../src/game/state';
import {
  calculateKarmicWeight,
  updateKarmicWeight,
  shouldTriggerKarmicReckoning,
  getKarmicBreakthroughPenalty,
  getKarmicEventWeightModifier,
  KARMIC_RECKONING_THRESHOLD,
} from '../src/game/karma';
import {
  checkDemonTrigger,
  confrontDemon,
  suppressDemon,
  ignoreDemon,
  applyDemonConsequence,
  getDemonLabel,
  getDemonEncounterText,
  DEMON_DEFS,
} from '../src/game/innerDemon';
import { migrateSaveData, CURRENT_SAVE_VERSION } from '../src/storage/save';

describe('Karma System', () => {
  it('should calculate zero karmic weight for fresh state', () => {
    const state = createInitialState(1);
    expect(calculateKarmicWeight(state)).toBe(0);
  });

  it('should count grudges from relationships', () => {
    const state = createInitialState(2);
    state.relationships['npc_1'] = {
      id: 'npc_1',
      identity: '散修',
      tags: [],
      lastInteractionTick: 0,
      debts: 1,
      favors: 0,
      grudges: 2,
      state: 'Alive',
    };

    // 2 grudges * 2 = 4, 1 debt * 1 = 1, total = 5
    expect(calculateKarmicWeight(state)).toBe(5);
  });

  it('should count debts from relationships', () => {
    const state = createInitialState(3);
    state.relationships['npc_1'] = {
      id: 'npc_1',
      identity: '散修',
      tags: [],
      lastInteractionTick: 0,
      debts: 3,
      favors: 2,
      grudges: 0,
      state: 'Alive',
    };

    // 3 debts * 1 = 3
    expect(calculateKarmicWeight(state)).toBe(3);
  });

  it('should count reckless_breakthrough quality', () => {
    const state = createInitialState(4);
    state.choices.qualities.reckless_breakthrough = 5;

    // 5 * 1 = 5
    expect(calculateKarmicWeight(state)).toBe(5);
  });

  it('should count suppressed_dantoxin_heat flag', () => {
    const state = createInitialState(5);
    state.choices.flags.suppressed_dantoxin_heat = true;

    expect(calculateKarmicWeight(state)).toBe(3);
  });

  it('should count robbed_cultivator flag', () => {
    const state = createInitialState(6);
    state.choices.flags.robbed_cultivator = true;

    expect(calculateKarmicWeight(state)).toBe(5);
  });

  it('should count karmic_weight quality', () => {
    const state = createInitialState(7);
    state.choices.qualities.karmic_weight = 4;

    expect(calculateKarmicWeight(state)).toBe(4);
  });

  it('should combine all karmic sources', () => {
    const state = createInitialState(8);
    state.relationships['npc_1'] = {
      id: 'npc_1', identity: '散修', tags: [], lastInteractionTick: 0,
      debts: 2, favors: 0, grudges: 1, state: 'Alive',
    };
    state.choices.qualities.reckless_breakthrough = 3;
    state.choices.flags.suppressed_dantoxin_heat = true;
    state.choices.flags.robbed_cultivator = true;
    state.choices.qualities.karmic_weight = 2;

    // grudges: 1*2=2, debts: 2*1=2, reckless: 3*1=3, suppressed: 3, robbed: 5, karmic_weight: 2*1=2
    // total = 2 + 2 + 3 + 3 + 5 + 2 = 17
    expect(calculateKarmicWeight(state)).toBe(17);
  });

  it('should update karmic weight in state', () => {
    const state = createInitialState(9);
    state.choices.qualities.reckless_breakthrough = 5;

    const updated = updateKarmicWeight(state);
    expect(updated.karma.karmicWeight).toBe(5);
  });

  it('should trigger karmic reckoning at threshold', () => {
    const state = createInitialState(10);
    state.karma.karmicWeight = 10;

    expect(shouldTriggerKarmicReckoning(state)).toBe(true);
  });

  it('should not trigger karmic reckoning below threshold', () => {
    const state = createInitialState(11);
    state.karma.karmicWeight = 9;

    expect(shouldTriggerKarmicReckoning(state)).toBe(false);
  });

  it('should not trigger karmic reckoning if already triggered', () => {
    const state = createInitialState(12);
    state.karma.karmicWeight = 15;
    state.karma.karmicEvents = ['karmic_reckoning'];

    expect(shouldTriggerKarmicReckoning(state)).toBe(false);
  });

  it('should calculate breakthrough penalty', () => {
    const state = createInitialState(13);
    state.karma.karmicWeight = 10;

    // 10 * 0.005 = 0.05
    expect(getKarmicBreakthroughPenalty(state)).toBeCloseTo(0.05);
  });

  it('should cap breakthrough penalty at 0.15', () => {
    const state = createInitialState(14);
    state.karma.karmicWeight = 100;

    expect(getKarmicBreakthroughPenalty(state)).toBe(0.15);
  });

  it('should calculate event weight modifier', () => {
    const state = createInitialState(15);
    state.karma.karmicWeight = 10;

    // 1 + min(2, 10 * 0.05) = 1 + 0.5 = 1.5
    expect(getKarmicEventWeightModifier(state)).toBeCloseTo(1.5);
  });
});

describe('Inner Demon System', () => {
  it('should not trigger demon without conditions', () => {
    const state = createInitialState(20);
    const result = checkDemonTrigger(state);

    expect(result.triggered).toBe(false);
    expect(result.demonId).toBeNull();
    expect(result.state.innerDemon.activeDemon).toBeNull();
  });

  it('should trigger demon_of_rashness when conditions are met', () => {
    const state = createInitialState(21);
    state.choices.qualities.reckless_breakthrough = 5;
    state.resources.dantoxin = 30;

    const result = checkDemonTrigger(state);

    expect(result.triggered).toBe(true);
    expect(result.demonId).toBe('demon_of_rashness');
    expect(result.state.innerDemon.activeDemon).toBe('demon_of_rashness');
    expect(result.state.innerDemon.demonProgress).toBeGreaterThan(0);
  });

  it('should trigger demon_of_attachment when conditions are met', () => {
    const state = createInitialState(22);
    state.relationships['npc_1'] = {
      id: 'npc_1', identity: '散修', tags: [], lastInteractionTick: 0,
      debts: 5, favors: 3, grudges: 0, state: 'Alive',
    };

    const result = checkDemonTrigger(state);

    expect(result.triggered).toBe(true);
    expect(result.demonId).toBe('demon_of_attachment');
  });

  it('should trigger demon_of_pride when a quality reaches 25', () => {
    const state = createInitialState(23);
    state.choices.qualities.quiet_cultivation = 25;

    const result = checkDemonTrigger(state);

    expect(result.triggered).toBe(true);
    expect(result.demonId).toBe('demon_of_pride');
  });

  it('should trigger demon_of_toxicity when dantoxin reaches 80', () => {
    const state = createInitialState(24);
    state.resources.dantoxin = 80;

    const result = checkDemonTrigger(state);

    expect(result.triggered).toBe(true);
    expect(result.demonId).toBe('demon_of_toxicity');
  });

  it('should not trigger demon that has been suppressed', () => {
    const state = createInitialState(25);
    state.resources.dantoxin = 80;
    state.innerDemon.suppressedDemons = ['demon_of_toxicity'];

    const result = checkDemonTrigger(state);

    expect(result.triggered).toBe(false);
  });

  it('should increment progress for active demon', () => {
    const state = createInitialState(26);
    state.innerDemon.activeDemon = 'demon_of_toxicity';
    state.innerDemon.demonProgress = 30;
    state.resources.dantoxin = 85;

    const result = checkDemonTrigger(state);

    expect(result.state.innerDemon.demonProgress).toBeGreaterThan(30);
    expect(result.state.innerDemon.activeDemon).toBe('demon_of_toxicity');
  });

  it('should clear demon if conditions no longer met', () => {
    const state = createInitialState(27);
    state.innerDemon.activeDemon = 'demon_of_toxicity';
    state.innerDemon.demonProgress = 50;
    state.resources.dantoxin = 10; // below 80

    const result = checkDemonTrigger(state);

    expect(result.state.innerDemon.activeDemon).toBeNull();
    expect(result.state.innerDemon.demonProgress).toBe(0);
  });

  it('should confront demon: costs qi+essence, clears demon, gains insight', () => {
    const state = createInitialState(28);
    state.innerDemon.activeDemon = 'demon_of_rashness';
    state.innerDemon.demonProgress = 50;
    state.resources.qi = 10;
    state.resources.essence = 50;
    state.resources.insight = 0;

    const result = confrontDemon(state);

    expect(result.state.innerDemon.activeDemon).toBeNull();
    expect(result.state.innerDemon.demonProgress).toBe(0);
    expect(result.state.innerDemon.suppressedDemons).toContain('demon_of_rashness');
    expect(result.state.resources.qi).toBe(5);
    expect(result.state.resources.essence).toBe(30);
    expect(result.state.resources.insight).toBe(3);
    expect(result.log).toContain('直面');
  });

  it('should suppress demon: costs lifespan, demon goes away temporarily', () => {
    const state = createInitialState(29);
    state.innerDemon.activeDemon = 'demon_of_rashness';
    state.innerDemon.demonProgress = 50;
    const originalLifespan = state.resources.lifespan;

    const result = suppressDemon(state);

    expect(result.state.innerDemon.activeDemon).toBeNull();
    expect(result.state.innerDemon.demonProgress).toBe(0);
    // Suppress does NOT add to suppressedDemons
    expect(result.state.innerDemon.suppressedDemons).not.toContain('demon_of_rashness');
    expect(result.state.resources.lifespan).toBe(originalLifespan - 80);
  });

  it('should ignore demon with consequences at 100 progress', () => {
    const state = createInitialState(30);
    state.innerDemon.activeDemon = 'demon_of_rashness';
    state.innerDemon.demonProgress = 100;
    state.resources.qi = 20;
    const originalLifespan = state.resources.lifespan;

    const result = ignoreDemon(state);

    expect(result.state.resources.qi).toBe(12); // -8
    expect(result.state.resources.wounds).toBe(2); // +2
    expect(result.state.resources.lifespan).toBe(originalLifespan - 120);
    expect(result.state.innerDemon.activeDemon).toBeNull();
  });

  it('should ignore demon without consequences if progress below 100', () => {
    const state = createInitialState(31);
    state.innerDemon.activeDemon = 'demon_of_rashness';
    state.innerDemon.demonProgress = 50;

    const result = ignoreDemon(state);

    expect(result.state.innerDemon.activeDemon).toBe('demon_of_rashness');
    expect(result.state.innerDemon.demonProgress).toBe(50);
    expect(result.log).toContain('理会');
  });

  it('should apply demon consequence at 100 progress', () => {
    const state = createInitialState(32);
    state.innerDemon.activeDemon = 'demon_of_rashness';
    state.innerDemon.demonProgress = 100;
    state.resources.qi = 20;

    const result = applyDemonConsequence(state);

    expect(result.state.resources.qi).toBe(12);
    expect(result.state.resources.wounds).toBe(2);
    expect(result.state.innerDemon.activeDemon).toBeNull();
  });

  it('should not apply demon consequence if progress below 100', () => {
    const state = createInitialState(33);
    state.innerDemon.activeDemon = 'demon_of_rashness';
    state.innerDemon.demonProgress = 50;

    const result = applyDemonConsequence(state);

    expect(result.log).toBe('');
    expect(result.state.innerDemon.activeDemon).toBe('demon_of_rashness');
  });

  it('should return demon labels', () => {
    expect(getDemonLabel('demon_of_rashness')).toBe('冒进之魔');
    expect(getDemonLabel('demon_of_attachment')).toBe('执念之魔');
    expect(getDemonLabel('demon_of_pride')).toBe('傲慢之魔');
    expect(getDemonLabel('demon_of_toxicity')).toBe('药毒之魔');
  });

  it('should return encounter text', () => {
    expect(getDemonEncounterText('demon_of_rashness').length).toBeGreaterThan(0);
    expect(getDemonEncounterText('demon_of_toxicity').length).toBeGreaterThan(0);
  });
});

describe('Save Migration for V10', () => {
  it('should migrate V9 saves by adding dao path, karma, and inner demon states', () => {
    const state = createInitialState(100);
    const { daoPath, karma, innerDemon, ...stateWithoutNew } = state;
    const migrated = migrateSaveData({
      version: 9,
      state: stateWithoutNew,
      createdAt: 1,
      updatedAt: 1,
      seed: 100,
    });

    expect(migrated.version).toBe(CURRENT_SAVE_VERSION);
    expect(migrated.state.daoPath.currentPath).toBeNull();
    expect(migrated.state.daoPath.pathAffinity).toEqual({});
    expect(migrated.state.daoPath.pathRevealedAtTick).toBeNull();
    expect(migrated.state.karma.karmicWeight).toBe(0);
    expect(migrated.state.karma.karmicEvents).toEqual([]);
    expect(migrated.state.innerDemon.activeDemon).toBeNull();
    expect(migrated.state.innerDemon.demonProgress).toBe(0);
    expect(migrated.state.innerDemon.suppressedDemons).toEqual([]);
  });

  it('should preserve existing dao path data during migration if present', () => {
    const state = createInitialState(101);
    const stateWithPartial = {
      ...state,
      daoPath: { currentPath: 'alchemist', pathAffinity: { alchemist: 18 }, pathRevealedAtTick: 500 },
    };
    const { karma, innerDemon, ...stateWithoutKarmaDemon } = stateWithPartial;

    const migrated = migrateSaveData({
      version: 9,
      state: stateWithoutKarmaDemon,
      createdAt: 1,
      updatedAt: 1,
      seed: 101,
    });

    expect(migrated.version).toBe(CURRENT_SAVE_VERSION);
    expect(migrated.state.daoPath.currentPath).toBe('alchemist');
    expect(migrated.state.daoPath.pathAffinity.alchemist).toBe(18);
    expect(migrated.state.karma.karmicWeight).toBe(0);
    expect(migrated.state.innerDemon.activeDemon).toBeNull();
  });
});
