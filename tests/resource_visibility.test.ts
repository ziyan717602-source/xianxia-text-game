import { describe, it, expect } from 'vitest';
import {
  RESOURCE_LABELS,
  getVisibleResourceIds,
  isDaoPathVisible,
  isKarmaVisible,
  isInnerDemonVisible,
} from '../src/game/resources';
import { createInitialState } from '../src/game/state';
import { Realm } from '../src/game/types';
import { ResourceId } from '../src/game/resources';

describe('RESOURCE_LABELS', () => {
  it('should have a non-empty label for every resource type in the Resources interface', () => {
    const requiredKeys: ResourceId[] = [
      'essence', 'qi', 'herbs', 'qiPills', 'stabilizingPowders',
      'cleansingPills', 'meridianCleansingPills', 'foundationStrengtheningPills',
      'spiritGatheringPills', 'warmFurnacePills', 'nightSittingPills',
      'cloudGatheringPills', 'ironBodyPills', 'demonBanePills',
      'foundationExplosionPills', 'spiritVeinPills', 'shadowEscapePills',
      'longevityPills', 'fireFurnacePills', 'nineTurnFoundationPills',
      'buddhaHeartPills', 'goldenCorePills', 'nascentSoulPills',
      'spiritTransformPills', 'integrationPills', 'mahayanaPills',
      'tribulationPills', 'heavenlyTribulationPills',
      'coins', 'insight', 'dantoxin', 'lifespan', 'wounds',
    ];

    for (const key of requiredKeys) {
      expect(RESOURCE_LABELS[key], `Missing label for ${key}`).toBeTruthy();
      expect(RESOURCE_LABELS[key].length, `Empty label for ${key}`).toBeGreaterThan(0);
    }
  });

  it('should have exactly 33 entries matching the Resources interface', () => {
    expect(Object.keys(RESOURCE_LABELS).length).toBe(33);
  });
});

describe('getVisibleResourceIds', () => {
  it('should always show essence', () => {
    const state = createInitialState();
    const visible = getVisibleResourceIds(state);
    expect(visible).toContain('essence');
  });

  it('should show qi when qi > 0', () => {
    const state = createInitialState();
    state.resources.qi = 5;
    const visible = getVisibleResourceIds(state);
    expect(visible).toContain('qi');
  });

  it('should show qi when found_jade_slip flag is set', () => {
    const state = createInitialState();
    state.choices.flags.found_jade_slip = true;
    const visible = getVisibleResourceIds(state);
    expect(visible).toContain('qi');
  });

  it('should show qi when unlocked_tuna flag is set', () => {
    const state = createInitialState();
    state.choices.flags.unlocked_tuna = true;
    const visible = getVisibleResourceIds(state);
    expect(visible).toContain('qi');
  });

  it('should not show qi when qi is 0 and no flags are set', () => {
    const state = createInitialState();
    const visible = getVisibleResourceIds(state);
    expect(visible).not.toContain('qi');
  });

  it('should show insight when insight > 0', () => {
    const state = createInitialState();
    state.resources.insight = 3;
    const visible = getVisibleResourceIds(state);
    expect(visible).toContain('insight');
  });

  it('should show insight when kuzuo has been performed', () => {
    const state = createInitialState();
    state.choices.qualities.action_kuzuo_count = 1;
    const visible = getVisibleResourceIds(state);
    expect(visible).toContain('insight');
  });

  it('should show herbs when at mountain_path', () => {
    const state = createInitialState();
    state.currentLocationId = 'mountain_path';
    const visible = getVisibleResourceIds(state);
    expect(visible).toContain('herbs');
  });

  it('should show herbs when herbs > 0', () => {
    const state = createInitialState();
    state.resources.herbs = 3;
    const visible = getVisibleResourceIds(state);
    expect(visible).toContain('herbs');
  });

  it('should show pill types when count > 0', () => {
    const state = createInitialState();
    state.resources.qiPills = 1;
    const visible = getVisibleResourceIds(state);
    expect(visible).toContain('qiPills');
  });

  it('should show pill types when has_* flag is set', () => {
    const state = createInitialState();
    state.choices.flags.has_qi_pill = true;
    const visible = getVisibleResourceIds(state);
    expect(visible).toContain('qiPills');
  });

  it('should show stabilizingPowders when count > 0 or has flag', () => {
    const state = createInitialState();
    state.resources.stabilizingPowders = 1;
    expect(getVisibleResourceIds(state)).toContain('stabilizingPowders');

    const state2 = createInitialState();
    state2.choices.flags.has_stabilizing_powder = true;
    expect(getVisibleResourceIds(state2)).toContain('stabilizingPowders');
  });

  it('should show cleansingPills when count > 0 or has flag', () => {
    const state = createInitialState();
    state.resources.cleansingPills = 1;
    expect(getVisibleResourceIds(state)).toContain('cleansingPills');
  });

  it('should show warmFurnacePills when count > 0 or has flag', () => {
    const state = createInitialState();
    state.resources.warmFurnacePills = 1;
    expect(getVisibleResourceIds(state)).toContain('warmFurnacePills');

    const state2 = createInitialState();
    state2.choices.flags.has_warm_furnace_pill = true;
    expect(getVisibleResourceIds(state2)).toContain('warmFurnacePills');
  });

  it('should show nightSittingPills when count > 0 or has flag', () => {
    const state = createInitialState();
    state.resources.nightSittingPills = 1;
    expect(getVisibleResourceIds(state)).toContain('nightSittingPills');

    const state2 = createInitialState();
    state2.choices.flags.has_night_sitting_pill = true;
    expect(getVisibleResourceIds(state2)).toContain('nightSittingPills');
  });

  it('should show demonBanePills when count > 0 or has flag', () => {
    const state = createInitialState();
    state.resources.demonBanePills = 1;
    expect(getVisibleResourceIds(state)).toContain('demonBanePills');
  });

  it('should show coins when coins > 0 or at market', () => {
    const state = createInitialState();
    state.resources.coins = 5;
    expect(getVisibleResourceIds(state)).toContain('coins');

    const state2 = createInitialState();
    state2.currentLocationId = 'market';
    expect(getVisibleResourceIds(state2)).toContain('coins');
  });

  it('should show dantoxin when dantoxin > 0 or tasted_qi_pill flag', () => {
    const state = createInitialState();
    state.resources.dantoxin = 5;
    expect(getVisibleResourceIds(state)).toContain('dantoxin');

    const state2 = createInitialState();
    state2.choices.flags.tasted_qi_pill = true;
    expect(getVisibleResourceIds(state2)).toContain('dantoxin');
  });

  it('should show wounds when wounds > 0', () => {
    const state = createInitialState();
    state.resources.wounds = 1;
    const visible = getVisibleResourceIds(state);
    expect(visible).toContain('wounds');
  });

  it('should not show wounds when wounds is 0', () => {
    const state = createInitialState();
    const visible = getVisibleResourceIds(state);
    expect(visible).not.toContain('wounds');
  });

  it('should show lifespan when year > 1', () => {
    const state = createInitialState();
    state.time.year = 2;
    const visible = getVisibleResourceIds(state);
    expect(visible).toContain('lifespan');
  });

  it('should show lifespan when wounds > 0', () => {
    const state = createInitialState();
    state.resources.wounds = 1;
    const visible = getVisibleResourceIds(state);
    expect(visible).toContain('lifespan');
  });

  it('should show lifespan when tiaoxi has been performed', () => {
    const state = createInitialState();
    state.choices.qualities.action_tiaoxi_count = 1;
    const visible = getVisibleResourceIds(state);
    expect(visible).toContain('lifespan');
  });

  it('should show integrationPills when count > 0', () => {
    const state = createInitialState();
    state.resources.integrationPills = 1;
    expect(getVisibleResourceIds(state)).toContain('integrationPills');
  });

  it('should show mahayanaPills when count > 0', () => {
    const state = createInitialState();
    state.resources.mahayanaPills = 1;
    expect(getVisibleResourceIds(state)).toContain('mahayanaPills');
  });

  it('should show tribulationPills when count > 0', () => {
    const state = createInitialState();
    state.resources.tribulationPills = 1;
    expect(getVisibleResourceIds(state)).toContain('tribulationPills');
  });

  it('should show heavenlyTribulationPills when count > 0', () => {
    const state = createInitialState();
    state.resources.heavenlyTribulationPills = 1;
    expect(getVisibleResourceIds(state)).toContain('heavenlyTribulationPills');
  });

  it('should show multiple pill types when multiple counts > 0', () => {
    const state = createInitialState();
    state.resources.qiPills = 1;
    state.resources.stabilizingPowders = 1;
    state.resources.cleansingPills = 1;
    const visible = getVisibleResourceIds(state);
    expect(visible).toContain('qiPills');
    expect(visible).toContain('stabilizingPowders');
    expect(visible).toContain('cleansingPills');
  });
});

describe('isDaoPathVisible', () => {
  it('should return false when no path is set', () => {
    const state = createInitialState();
    expect(isDaoPathVisible(state)).toBe(false);
  });

  it('should return true when a path is set', () => {
    const state = createInitialState();
    state.daoPath.currentPath = 'sword';
    expect(isDaoPathVisible(state)).toBe(true);
  });
});

describe('isKarmaVisible', () => {
  it('should return false when karmic weight < 5', () => {
    const state = createInitialState();
    state.karma.karmicWeight = 3;
    expect(isKarmaVisible(state)).toBe(false);
  });

  it('should return true when karmic weight >= 5', () => {
    const state = createInitialState();
    state.karma.karmicWeight = 5;
    expect(isKarmaVisible(state)).toBe(true);
  });
});

describe('isInnerDemonVisible', () => {
  it('should return false when no active demon', () => {
    const state = createInitialState();
    expect(isInnerDemonVisible(state)).toBe(false);
  });

  it('should return true when active demon exists', () => {
    const state = createInitialState();
    state.innerDemon.activeDemon = 'demon_of_rashness';
    expect(isInnerDemonVisible(state)).toBe(true);
  });
});
