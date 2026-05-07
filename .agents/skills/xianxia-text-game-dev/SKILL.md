---
name: xianxia-text-game-dev
description: Use this skill whenever building, designing, reviewing, or modifying this original xianxia text adventure / incremental browser game. Trigger for requests about A Dark Room-like mechanics, text games, idle/incremental loops, cultivation realms, alchemy, sects, exploration events, save systems, resource balancing, browser saves, or AI-assisted game development in this repository.
---

# Xianxia Text Game Development

Use this skill as a thin workflow entry for the project. `AGENTS.md` is the source of truth for hard rules; do not duplicate or override it here.

## Load Order

1. Read `AGENTS.md`.
2. Read `docs/project-status.md` and `PLAN.md` before implementation.
3. For design changes, read `docs/design-direction.md` and `docs/game-design.md`.
4. For content, event, location, cultivation, alchemy, sect, NPC, or balancing work, read `docs/content-bank/README.md` and the relevant content-bank file.
5. Use `docs/experience.md` for project lessons and `docs/reviews/` for historical review context.

## Work Loop

1. Classify the task: design, implementation, testing, balancing, content, research, or documentation.
2. State a short plan before code changes.
3. For new gameplay, define input, output, risk, unlock, recovery path, state ledger entry, and test points.
4. Keep the work original. Use genre-level concepts only; do not copy names, storylines, maps, sects, item names, or prose from existing IP.
5. Implement through typed, data-driven structures in `src/game`, `src/content`, and `src/storage`; keep React as the view layer.
6. Update docs when behavior, plans, content bank, or project status changes.

## Hard Checks

- Preserve detached observational tone, ordinary opening, gradual reveal, and paths that emerge from player behavior instead of early class locks.
- Important choices must persist as flags, tags, qualities, relationship entries, or other readable state.
- Save changes require versioned migrations and tests.
- Random event systems need seeded or injectable randomness for tests.
- UI action visibility must combine location, unlocks, required flags/realm, and forbidden conditions.
- Repetition should gain an upgrade path such as routine, batch, retreat, formation, cave, or sect supply.

## Verification

Use the smallest command set that proves the change:

- Docs only: `git diff --check`
- Core logic/content/storage: `npm test`
- UI or browser behavior: `npm run build` and `npm run smoke`
- Release-sized or risky changes: `npm test`, `npm run build`, and `npm run smoke`

Report commands run and any unverified risk in the final answer.
