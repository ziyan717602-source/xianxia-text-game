---
name: xianxia-text-game-dev
description: Use this skill whenever building, designing, reviewing, or modifying this original xianxia text adventure / incremental browser game. Trigger for requests about A Dark Room-like mechanics, text games, idle/incremental loops, cultivation realms, alchemy, sects, exploration events, save systems, resource balancing, or AI-assisted game development in this repository.
---

# Xianxia Text Game Development

Use this workflow for this repository's original cultivation-themed text incremental game.

## Start

1. Read `AGENTS.md`, `docs/game-design.md`, and `docs/experience.md`.
2. Identify whether the task is design, implementation, testing, balancing, content writing, or research.
3. Keep the work original. Use genre-level concepts only; do not copy names, storylines, maps, item names, sects, or prose from existing IP.

## Design Rules

- Preserve gradual revelation: the player should not see the whole system at launch.
- Tie resources to fantasy meaning. `灵气` is not just currency; `心魔` and `丹毒` are costs, `因果` is long-tail consequence.
- Every new system needs a loop: input, output, risk, unlock, and recovery path.
- Prefer short repeatable text over long exposition in core UI.
- Add surprise through unlocking, event consequences, and changed verbs, not through hidden arbitrary punishments.

## Implementation Rules

- Keep simulation logic pure and testable outside the browser.
- Model resources, actions, unlocks, events, realms, and save data with typed structures.
- Save data must include a version and migration path.
- Random systems should accept a seed or random provider for testing.
- UI should render current state from game state; avoid storing authoritative state only in UI components.

## Testing Checklist

- Resource tick and manual actions produce expected deltas.
- Unlock conditions appear at the right time and do not regress after reload.
- Save/load survives refresh and future version migration.
- Breakthrough and risk systems have tests for success, failure, and edge thresholds.
- Browser smoke test covers first-run start, several actions, save refresh, and reset.

## Documentation

- Add durable lessons to `docs/experience.md`.
- Add external references to `docs/research/` with links and copyright notes.
- Update `PLAN.md` when a milestone is completed or split.
