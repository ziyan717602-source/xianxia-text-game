---
name: xianxia-text-game-dev
description: Use this skill whenever building, designing, reviewing, or modifying this original xianxia text adventure / incremental browser game. Trigger for requests about A Dark Room-like mechanics, text games, idle/incremental loops, cultivation realms, alchemy, sects, exploration events, save systems, resource balancing, or AI-assisted game development in this repository.
---

# Xianxia Text Game Development

Use this workflow for this repository's original cultivation-themed text incremental game.

## Start

1. Read `AGENTS.md`, `docs/project-status.md`, `PLAN.md`, `docs/design-direction.md`, `docs/game-design.md`, and `docs/experience.md`.
2. For content, event, location, cultivation, alchemy, sect, NPC, or balancing work, also read `docs/content-bank/README.md` and the relevant content-bank file before changing game content.
3. Identify whether the task is design, implementation, testing, balancing, content writing, or research.
4. Keep the work original. Use genre-level concepts only; do not copy names, storylines, maps, item names, sects, or prose from existing IP.

## Design Rules

- Preserve gradual revelation: the player should not see the whole system at launch.
- Keep the tone detached and observational. The game records consequences; it does not moralize or flatter the player.
- Start from ordinary lives, not disaster survival or chosen-one melodrama.
- Do not lock the player into a cultivation path at the beginning. Paths should emerge from repeated behavior, missed chances, and accumulated consequences.
- Treat lifespan/time pressure as a first-class system, not just flavor text.
- Reserve data space for spiritual roots, five elements, technique affinity, pill properties, location qi, tribulations, and sect rules even if the first UI hides most of it.
- Tie resources to fantasy meaning. `灵气` is not just currency; `心魔` and `丹毒` are costs, `因果` is long-tail consequence.
- Every new system needs a loop: input, output, risk, unlock, and recovery path.
- Prefer short repeatable text over long exposition in core UI.
- Add surprise through unlocking, event consequences, and changed verbs, not through hidden arbitrary punishments.
- Make the world feel alive through calendars, locations, prices, NPC traces, and state-weighted events that continue whether or not the player focuses on them.
- Important choices must enter a state ledger as flags, tags, or qualities that future events, prices, NPCs, tribulations, or logs can read.
- Maintain lightweight location and relationship ledgers from the first prototype.
- Combat should be low-to-medium emphasis but present as risk events: avoid/flee, negotiate, ask for help, or fight.
- Repetition must upgrade: manual action -> routine -> batch/retreat -> automation/infrastructure -> new decision layer.

## Implementation Rules

- Keep simulation logic pure and testable outside the browser.
- Model resources, actions, unlocks, events, realms, and save data with typed structures.
- Model locations, NPC/relationship entries, and choice flags/tags/qualities explicitly.
- Save data must include a version and migration path.
- Random systems should accept a seed or random provider for testing.
- UI should render current state from game state; avoid storing authoritative state only in UI components.
- Default to Vite + TypeScript + React for the browser shell, but keep `src/game` framework-independent.
- The current repository has completed phase 1C and is in phase 2. Ordinary origins, root affinity, technique attunement, the first alchemy/dantoxin slice, and the first qi-layer breakthrough slice are implemented. Before implementing new features, check `docs/project-status.md` and `PLAN.md`; use `docs/reviews/2026-05-07-current-project-review.md` as historical context for why the cleanup exists.

## Testing Checklist

- Resource tick and manual actions produce expected deltas.
- Unlock conditions appear at the right time and do not regress after reload.
- Save/load survives refresh and future version migration.
- Breakthrough and risk systems have tests for success, failure, and edge thresholds.
- Browser smoke test covers first-run start, several actions, save refresh, and reset.
- Basic browser smoke is available through `npm run smoke`; extend it when UI flows grow.
- World/event tests cover seeded event generation, route weighting, missed-event expiry, and automation unlock thresholds.

## Documentation

- Add durable lessons to `docs/experience.md`.
- Add external references to `docs/research/` with links and copyright notes.
- Keep mechanism-ready content in `docs/content-bank/`; each item should be convertible into state, event data, logs, resources, or tests.
- Update `PLAN.md` when a milestone is completed or split.
