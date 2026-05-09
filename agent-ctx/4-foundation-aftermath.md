# Task 4 - Foundation Aftermath Multi-Round Events & Post-Foundation Actions

## Agent: Main Agent

## Summary

Successfully implemented all foundation aftermath multi-round events, post-foundation actions, and supporting infrastructure.

## Changes Made

### 1. `src/content/events.ts` — 4 new events added

- **foundation_scar_lingering** (筑基骨伤缠绵): 2nd round scar event, triggers when player has `nursed_foundation_scar` or `ignored_foundation_scar` flag. 3 choices: 调养经脉, 药浴化瘀, 强撑运功.
- **guardian_favor_recalled** (护法还人情): 2nd round guardian debt, triggers when player has `thanked_foundation_guardian` flag. 2 choices: 应下差事, 婉拒.
- **foundation_debt_collector** (坊市催账人): 2nd round market debt, triggers when player has `foundation_debt_delayed` flag. 3 choices: 付清本息, 再拖一期, 抵药还账.
- **foundation_establishment_morning** (筑基后首日): Triggered right after foundation success, weight 100. 2 choices: 巡视新身, 静坐体悟.

### 2. `src/content/actions.ts` — 3 new actions added

- **foundation_daily_practice** (筑基日课): essence 25, qi+6 insight+1, cooldown 10, requires FoundationEstablishment + foundation_morning_seen
- **inner_gate_rumor** (内门传闻): essence 10, insight+3, cooldown 8, requires FoundationEstablishment + outer_gate
- **foundation_meditation** (筑基静修): essence 50 herbs 2, qi+12 insight+2, cooldown 30, risk 0.05, requires FoundationEstablishment + home

### 3. `src/game/actions.ts` — Action routing + custom logs

- Added `foundation_daily_practice` → `quiet_cultivation`
- Added `inner_gate_rumor` → `sect_trace`
- Added `foundation_meditation` → `quiet_cultivation`
- Added custom log messages for all 3 new actions

### 4. `src/content/locations.ts` — Location updates

- Home: Added `foundation_daily_practice`, `foundation_meditation` to availableActions; added event weights for `foundation_scar_lingering` and `foundation_establishment_morning`
- Outer gate: Added `inner_gate_rumor` to availableActions; added event weight for `guardian_favor_recalled`
- Market: Added event weight for `foundation_debt_collector`

### 5. `src/content/unlocks.ts` — 4 new unlock rules

- `unlock_foundation_daily_practice`: Requires FoundationEstablishment + foundation_morning_seen
- `unlock_foundation_meditation`: Requires FoundationEstablishment
- `unlock_inner_gate_rumor`: Requires FoundationEstablishment

### 6. `src/game/breakthrough.ts` — Summary update

- `getBreakthroughSummary` now also works for `FoundationEstablishment` realm (previously returned empty for non-QiCondensation)

### 7. `tests/foundation_aftermath.test.ts` — 54 new tests

All 54 tests passing, covering all new events and actions.

## Test Results

- **185 tests passing** (131 existing + 54 new)
- **Build succeeds** with no TypeScript errors

## New Flags Added

- `foundation_scar_lingering_seen`, `meridians_nursed`, `used_herb_bath`, `pushed_through_scar`
- `guardian_favor_recalled_seen`, `completed_guardian_favor`, `declined_guardian_favor`
- `foundation_debt_collector_seen`, `foundation_debt_fully_settled`, `foundation_debt_delayed_again`, `paid_debt_in_herbs`
- `foundation_morning_seen`, `surveyed_new_body`
