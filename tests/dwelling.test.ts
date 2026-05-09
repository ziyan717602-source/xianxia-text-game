import { describe, expect, it } from 'vitest';
import { createInitialState, TICKS_PER_DAY } from '../src/game/state';
import { processTick, TICK_INTERVAL_MS } from '../src/game/tick';
import { Realm } from '../src/game/types';
import {
  CAVE_BATCH_MAX_DAYS,
  CAVE_DWELLING_BATCH_LAST_DAY,
  CAVE_HERB_PLOT_BATCH_LAST_DAY,
} from '../src/game/dwelling';

describe('Dwelling batch upkeep', () => {
  it('should batch stable cave dwelling qi gains by elapsed game days', () => {
    let state = createInitialState();
    state.realm = Realm.FoundationEstablishment;
    state.realmLayer = 1;
    state.choices.flags.reached_foundation = true;
    state.choices.flags.cave_dwelling = true;
    state.choices.flags.maintained_cave_dwelling = true;
    state.choices.qualities[CAVE_DWELLING_BATCH_LAST_DAY] = 0;

    state = processTick(state, TICK_INTERVAL_MS * TICKS_PER_DAY * 20);

    expect(state.resources.qi).toBe(4);
    expect(state.choices.qualities[CAVE_DWELLING_BATCH_LAST_DAY]).toBe(20);
    expect(state.choices.qualities.cave_dwelling_batch_days).toBe(20);
    expect(state.choices.tags.dwelling).toBe('cave_dwelling_keeping');
  });

  it('should not lose residual days before a cave dwelling payout cycle', () => {
    let state = createInitialState();
    state.realm = Realm.FoundationEstablishment;
    state.realmLayer = 1;
    state.choices.flags.cave_dwelling = true;
    state.choices.flags.maintained_cave_dwelling = true;
    state.choices.qualities[CAVE_DWELLING_BATCH_LAST_DAY] = 0;

    state = processTick(state, TICK_INTERVAL_MS * TICKS_PER_DAY * 4);
    expect(state.resources.qi).toBe(0);
    expect(state.choices.qualities[CAVE_DWELLING_BATCH_LAST_DAY]).toBe(0);

    state = processTick(state, TICK_INTERVAL_MS * TICKS_PER_DAY);
    expect(state.resources.qi).toBe(1);
    expect(state.choices.qualities[CAVE_DWELLING_BATCH_LAST_DAY]).toBe(5);
  });

  it('should batch cave herb plot supply and leave a ripening hook', () => {
    let state = createInitialState();
    state.realm = Realm.FoundationEstablishment;
    state.realmLayer = 1;
    state.choices.flags.cave_dwelling = true;
    state.choices.flags.cave_herb_plot = true;
    state.choices.flags.cave_herb_seed_stock = true;
    state.choices.qualities[CAVE_DWELLING_BATCH_LAST_DAY] = 0;
    state.choices.qualities[CAVE_HERB_PLOT_BATCH_LAST_DAY] = 0;

    state = processTick(state, TICK_INTERVAL_MS * TICKS_PER_DAY * 25);

    expect(state.resources.herbs).toBe(5);
    expect(state.choices.qualities[CAVE_HERB_PLOT_BATCH_LAST_DAY]).toBe(25);
    expect(state.choices.qualities.cave_herb_plot_batch_days).toBe(25);
    expect(state.choices.flags.cave_herb_plot_ripening_pending).toBe(true);
    expect(state.choices.tags.cave_support).toBe('herb_plot_regular');
  });

  it('should let arranged outer gate supply improve cave batches and create an account hook', () => {
    let state = createInitialState();
    state.realm = Realm.FoundationEstablishment;
    state.realmLayer = 1;
    state.choices.flags.cave_dwelling = true;
    state.choices.flags.cave_herb_plot = true;
    state.choices.flags.cave_supply_arranged = true;
    state.choices.qualities[CAVE_DWELLING_BATCH_LAST_DAY] = 0;
    state.choices.qualities[CAVE_HERB_PLOT_BATCH_LAST_DAY] = 0;

    state = processTick(state, TICK_INTERVAL_MS * TICKS_PER_DAY * 80);

    expect(state.resources.qi).toBe(20);
    expect(state.resources.herbs).toBe(10);
    expect(state.choices.flags.cave_supply_account_pending).toBe(true);
    expect(state.choices.flags.cave_supply_account_seen).toBe(false);
    expect(state.choices.flags.cave_dwelling_upkeep_pending).toBeUndefined();
    expect(state.choices.tags.dwelling).toBe('cave_dwelling_supplied');
  });

  it('should degrade cave supply batches when supply accounts are left unpaid', () => {
    let state = createInitialState();
    state.realm = Realm.FoundationEstablishment;
    state.realmLayer = 1;
    state.choices.flags.cave_dwelling = true;
    state.choices.flags.cave_herb_plot = true;
    state.choices.flags.cave_supply_arranged = true;
    state.choices.flags.cave_supply_account_deferred = true;
    state.choices.qualities[CAVE_DWELLING_BATCH_LAST_DAY] = 0;
    state.choices.qualities[CAVE_HERB_PLOT_BATCH_LAST_DAY] = 0;

    state = processTick(state, TICK_INTERVAL_MS * TICKS_PER_DAY * 70);

    expect(state.resources.qi).toBe(10);
    expect(state.resources.herbs).toBe(5);
    expect(state.choices.flags.cave_supply_strain_pending).toBe(true);
    expect(state.choices.flags.cave_supply_account_pending).toBe(true);
    expect(state.choices.tags.dwelling).toBe('cave_dwelling_supply_strained');
    expect(state.choices.qualities.sect_discipline).toBe(-1);
  });

  it('should cap very long cave dwelling batch gains', () => {
    let state = createInitialState();
    state.realm = Realm.FoundationEstablishment;
    state.realmLayer = 1;
    state.choices.flags.cave_dwelling = true;
    state.choices.flags.maintained_cave_dwelling = true;
    state.choices.qualities[CAVE_DWELLING_BATCH_LAST_DAY] = 0;

    state = processTick(state, TICK_INTERVAL_MS * TICKS_PER_DAY * 200);

    expect(state.resources.qi).toBe(Math.floor(CAVE_BATCH_MAX_DAYS / 5));
    expect(state.choices.qualities[CAVE_DWELLING_BATCH_LAST_DAY]).toBe(200);
    expect(state.choices.flags.cave_dwelling_batch_capped).toBe(true);
    expect(state.choices.flags.cave_dwelling_upkeep_pending).toBe(true);
  });
});
