import { describe, expect, it } from 'vitest';
import { PILL_RECIPES } from '../src/content/alchemy';
import { performAction } from '../src/game/actions';
import {
  getAlchemySummary,
  CLEANSING_PILL_RECIPE_ID,
  getDantoxinStageLabel,
  SMALL_QI_PILL_RECIPE_ID,
  STABILIZING_POWDER_RECIPE_ID,
} from '../src/game/alchemy';
import { getAvailableActionsAtLocation } from '../src/game/location';
import { createInitialState } from '../src/game/state';
import { Realm } from '../src/game/types';
import { checkUnlocks } from '../src/game/unlock';

function createQiAlchemyState() {
  let state = createInitialState(20260507);
  state.realm = Realm.QiCondensation;
  state.realmLayer = 1;
  state.currentLocationId = 'home';
  state.resources.essence = 100;
  state.resources.herbs = 10;
  state.resources.insight = 6;
  state.choices.qualities.action_bianyao_count = 2;
  state = checkUnlocks(state);
  return state;
}

describe('Alchemy system', () => {
  it('should unlock formula study after herb identification in qi condensation', () => {
    const state = createQiAlchemyState();

    expect(state.unlockedActions).toContain('study_qi_formula');
    expect(getAvailableActionsAtLocation(state)).toContain('study_qi_formula');
  });

  it('should learn the small qi pill recipe and reveal its alchemy summary', () => {
    let state = createQiAlchemyState();
    const result = performAction(state, 'study_qi_formula');
    expect(result.success).toBe(true);

    state = checkUnlocks(result.state);

    expect(state.alchemy.knownRecipeIds).toContain(SMALL_QI_PILL_RECIPE_ID);
    expect(state.choices.flags.known_recipe_small_qi_pill).toBe(true);
    expect(state.unlockedActions).toContain('brew_qi_pill');
    expect(getAvailableActionsAtLocation(state)).not.toContain('study_qi_formula');
    expect(getAlchemySummary(state).join(' / ')).toContain(PILL_RECIPES.small_qi_pill.name);
  });

  it('should brew and consume a pill with dantoxin cost', () => {
    let state = createQiAlchemyState();
    state = checkUnlocks(performAction(state, 'study_qi_formula').state);

    const brew = performAction(state, 'brew_qi_pill', () => 0.1);
    expect(brew.success).toBe(true);
    state = checkUnlocks(brew.state);

    expect(state.resources.qiPills).toBe(1);
    expect(state.unlockedActions).toContain('take_qi_pill');
    expect(getAvailableActionsAtLocation(state)).toContain('take_qi_pill');

    const beforeQi = state.resources.qi;
    const take = performAction(state, 'take_qi_pill');
    expect(take.success).toBe(true);
    state = take.state;

    expect(state.resources.qiPills).toBe(0);
    expect(state.resources.qi).toBeGreaterThan(beforeQi);
    expect(state.resources.dantoxin).toBe(3);
    expect(state.choices.flags.tasted_qi_pill).toBe(true);
  });

  it('should learn, brew, and take stabilizing powder as breakthrough support', () => {
    let state = createQiAlchemyState();
    state.resources.insight = 12;
    state.resources.qi = 20;
    state.resources.dantoxin = 12;
    state = checkUnlocks(performAction(state, 'study_qi_formula').state);
    state.choices.flags.bottleneck_qi_layer_2 = true;
    state = checkUnlocks(state);

    expect(getAvailableActionsAtLocation(state)).toContain('study_steady_formula');

    state = checkUnlocks(performAction(state, 'study_steady_formula').state);
    expect(state.alchemy.knownRecipeIds).toContain(STABILIZING_POWDER_RECIPE_ID);
    expect(state.unlockedActions).toContain('brew_stabilizing_powder');

    const brew = performAction(state, 'brew_stabilizing_powder', () => 0.1);
    expect(brew.success).toBe(true);
    state = checkUnlocks(brew.state);

    expect(state.resources.stabilizingPowders).toBe(1);
    expect(state.unlockedActions).toContain('take_stabilizing_powder');

    const take = performAction(state, 'take_stabilizing_powder');
    expect(take.success).toBe(true);
    state = take.state;

    expect(state.resources.stabilizingPowders).toBe(0);
    expect(state.resources.qi).toBe(18);
    expect(state.resources.dantoxin).toBe(11);
    expect(state.choices.flags.guarded_breakthrough).toBe(true);
    expect(getAlchemySummary(state).join(' / ')).toContain(PILL_RECIPES.stabilizing_powder.name);
  });

  it('should learn, brew, and take cleansing pills to handle heavy dantoxin', () => {
    let state = createQiAlchemyState();
    state.resources.essence = 220;
    state.resources.herbs = 24;
    state.resources.insight = 18;
    state.resources.dantoxin = 35;
    state.resources.wounds = 2;
    state.choices.qualities.reckless_breakthrough = 2;
    state = checkUnlocks(performAction(state, 'study_qi_formula').state);
    state = checkUnlocks(state);

    expect(getAvailableActionsAtLocation(state)).toContain('study_cleansing_formula');

    state = checkUnlocks(performAction(state, 'study_cleansing_formula').state);
    expect(state.alchemy.knownRecipeIds).toContain(CLEANSING_PILL_RECIPE_ID);
    expect(state.unlockedActions).toContain('brew_cleansing_pill');

    const brew = performAction(state, 'brew_cleansing_pill', () => 0.1);
    expect(brew.success).toBe(true);
    state = checkUnlocks(brew.state);

    expect(state.resources.cleansingPills).toBe(1);
    expect(state.unlockedActions).toContain('take_cleansing_pill');

    const take = performAction(state, 'take_cleansing_pill');
    expect(take.success).toBe(true);
    state = take.state;

    expect(state.resources.cleansingPills).toBe(0);
    expect(state.resources.dantoxin).toBe(20);
    expect(state.resources.wounds).toBe(1);
    expect(state.choices.qualities.reckless_breakthrough).toBe(1);
    expect(state.choices.flags.tasted_cleansing_pill).toBe(true);
    expect(getAlchemySummary(state).join(' / ')).toContain(PILL_RECIPES.cleansing_pill.name);
  });

  it('should mark meridian dantoxin as relieved when cleansing drops it below the threshold', () => {
    let state = createQiAlchemyState();
    state.resources.essence = 180;
    state.resources.herbs = 20;
    state.resources.insight = 14;
    state.resources.dantoxin = 62;
    state = checkUnlocks(performAction(state, 'study_qi_formula').state);
    state = checkUnlocks(performAction(state, 'study_cleansing_formula').state);
    state = checkUnlocks(performAction(state, 'brew_cleansing_pill', () => 0.1).state);

    state = performAction(state, 'take_cleansing_pill').state;

    expect(state.resources.dantoxin).toBe(47);
    expect(state.choices.flags.relieved_dantoxin_meridians).toBe(true);
    expect(getDantoxinStageLabel(state.resources.dantoxin)).toBe('药气冲突');
  });

  it('should leave residue and slight dantoxin on failed brewing', () => {
    let state = createQiAlchemyState();
    state = checkUnlocks(performAction(state, 'study_qi_formula').state);

    const result = performAction(state, 'brew_qi_pill', () => 0.99);

    expect(result.success).toBe(true);
    expect(result.state.resources.qiPills).toBe(0);
    expect(result.state.resources.dantoxin).toBe(1);
    expect(result.state.resources.insight).toBe(4);
  });

  it('should make dantoxin reduce breathing recovery', () => {
    const cleanState = createInitialState();
    cleanState.resources.essence = 70;
    const clean = performAction(cleanState, 'tiaoxi').state;

    const toxicState = createInitialState();
    toxicState.resources.essence = 70;
    toxicState.resources.dantoxin = 30;
    const toxic = performAction(toxicState, 'tiaoxi').state;

    expect(clean.resources.essence).toBe(100);
    expect(toxic.resources.essence).toBe(90);
    expect(getDantoxinStageLabel(30)).toBe('药气冲突');
  });
});
