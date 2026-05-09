import { describe, it, expect } from 'vitest';
import { checkDemonTrigger, confrontDemon, suppressDemon, ignoreDemon, DEMON_DEFS } from '../src/game/innerDemon';
import { createInitialState } from '../src/game/state';
import { Realm } from '../src/game/types';

describe('Inner Demon System', () => {
  it('should not trigger demon when conditions are not met', () => {
    const state = createInitialState();
    const result = checkDemonTrigger(state);
    expect(result.triggered).toBe(false);
    expect(result.demonId).toBeNull();
  });

  it('should trigger demon of rashness when conditions are met', () => {
    let state = createInitialState();
    state = {
      ...state,
      realm: Realm.QiCondensation,
      choices: {
        ...state.choices,
        qualities: {
          ...state.choices.qualities,
          reckless_breakthrough: 5,
        },
      },
      resources: {
        ...state.resources,
        dantoxin: 30,
      },
    };
    const result = checkDemonTrigger(state);
    expect(result.triggered).toBe(true);
    expect(result.demonId).toBe('demon_of_rashness');
    expect(result.state.innerDemon.activeDemon).toBe('demon_of_rashness');
  });

  it('should confront demon and clear it', () => {
    let state = createInitialState();
    state = {
      ...state,
      innerDemon: {
        activeDemon: 'demon_of_rashness',
        demonProgress: 30,
        suppressedDemons: [],
      },
      resources: {
        ...state.resources,
        qi: 10,
        essence: 30,
      },
    };
    const result = confrontDemon(state);
    expect(result.state.innerDemon.activeDemon).toBeNull();
    expect(result.state.innerDemon.demonProgress).toBe(0);
    expect(result.state.innerDemon.suppressedDemons).toContain('demon_of_rashness');
  });

  it('should suppress demon at lifespan cost', () => {
    let state = createInitialState();
    state = {
      ...state,
      innerDemon: {
        activeDemon: 'demon_of_rashness',
        demonProgress: 30,
        suppressedDemons: [],
      },
      resources: {
        ...state.resources,
        lifespan: 1000,
      },
    };
    const result = suppressDemon(state);
    expect(result.state.innerDemon.activeDemon).toBeNull();
    expect(result.state.resources.lifespan).toBeLessThan(1000);
  });

  it('should apply consequences when demon progress reaches 100', () => {
    let state = createInitialState();
    state = {
      ...state,
      innerDemon: {
        activeDemon: 'demon_of_rashness',
        demonProgress: 100,
        suppressedDemons: [],
      },
      resources: {
        ...state.resources,
        qi: 20,
        wounds: 0,
        lifespan: 1000,
      },
    };
    const result = ignoreDemon(state);
    expect(result.state.resources.qi).toBeLessThan(20);
    expect(result.state.resources.wounds).toBeGreaterThan(0);
  });

  it('should have all 8 demon definitions', () => {
    expect(DEMON_DEFS.length).toBe(8);
  });

  it('should not trigger suppressed demon again', () => {
    let state = createInitialState();
    state = {
      ...state,
      realm: Realm.QiCondensation,
      choices: {
        ...state.choices,
        qualities: {
          ...state.choices.qualities,
          reckless_breakthrough: 5,
        },
      },
      resources: {
        ...state.resources,
        dantoxin: 30,
      },
      innerDemon: {
        activeDemon: null,
        demonProgress: 0,
        suppressedDemons: ['demon_of_rashness'],
      },
    };
    const result = checkDemonTrigger(state);
    // demon_of_rashness is suppressed, should not trigger
    expect(result.demonId).not.toBe('demon_of_rashness');
  });
});
