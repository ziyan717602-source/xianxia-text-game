import { describe, expect, it } from 'vitest';
import { TECHNIQUES } from '../src/content/cultivation';
import { performAction } from '../src/game/actions';
import {
  applyCultivationOutputModifiers,
  attuneTechnique,
  createInitialCultivationState,
  getCultivationSummary,
  getRecommendedTechniqueId,
  revealRoot,
} from '../src/game/cultivation';
import { createInitialState } from '../src/game/state';
import { Realm, Season } from '../src/game/types';

describe('Cultivation roots and techniques', () => {
  it('should derive deterministic latent cultivation data from seed', () => {
    const first = createInitialCultivationState(12345);
    const second = createInitialCultivationState(12345);

    expect(first).toEqual(second);
    expect(first.rootKnown).toBe(false);
    expect(Object.values(first.phaseAffinities).some((value) => value > 0)).toBe(true);
    expect(first.knownTechniqueIds).toEqual(['small_breathing']);
  });

  it('should reveal latent root without changing it at character creation', () => {
    let state = createInitialState(12345);
    state.realm = Realm.QiCondensation;
    state.realmLayer = 1;

    expect(state.spiritualRoot).toBe('Mortal');
    expect(getCultivationSummary(state)).toEqual([]);

    const result = revealRoot(state);
    state = result.state;

    expect(state.cultivation.rootKnown).toBe(true);
    expect(state.choices.flags.root_known).toBe(true);
    expect(state.spiritualRoot).toBe(state.cultivation.latentRoot);
    expect(result.log).toContain('灵根');
    expect(getCultivationSummary(state)[0]).toContain('灵根');
  });

  it('should attune the active technique to the dominant phase', () => {
    let state = createInitialState(99);
    state = revealRoot(state).state;

    const techniqueId = getRecommendedTechniqueId(state);
    const result = attuneTechnique(state);

    expect(result.state.cultivation.activeTechniqueId).toBe(techniqueId);
    expect(result.state.cultivation.knownTechniqueIds).toContain(techniqueId);
    expect(result.state.choices.flags.attuned_technique).toBe(true);
    expect(result.log).toContain(TECHNIQUES[techniqueId].name);
  });

  it('should boost qi output after root reveal and technique attunement', () => {
    let state = createInitialState(42);
    state = revealRoot(state).state;
    state = attuneTechnique(state).state;
    state.time.season = Season.Spring;
    state.currentLocationId = 'home';

    const output = applyCultivationOutputModifiers(state, 'tuna', { qi: 1 });

    expect(output.qi).toBeGreaterThan(1);
  });

  it('should perform inspect_root and attune_technique actions', () => {
    let state = createInitialState(7);
    state.realm = Realm.QiCondensation;
    state.realmLayer = 1;
    state.resources.insight = 3;
    state.resources.essence = 100;
    state.unlockedActions.push('inspect_root', 'attune_technique');

    const inspect = performAction(state, 'inspect_root');
    expect(inspect.success).toBe(true);
    expect(inspect.state.choices.flags.root_known).toBe(true);

    const attune = performAction(inspect.state, 'attune_technique');
    expect(attune.success).toBe(true);
    expect(attune.state.choices.flags.attuned_technique).toBe(true);
  });
});
