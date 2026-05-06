# GitHub Copilot Instructions

Follow `AGENTS.md` as the project source of truth. For design work, also read `docs/design-direction.md`.

This is an original xianxia text incremental game inspired by the design structure of `A Dark Room`, not a clone and not a derivative of any existing novel/game IP.

When generating code:

- Keep simulation logic separate from UI.
- Prefer typed data structures for resources, actions, events, and save data.
- Add or update tests for resource ticks, unlock conditions, save migration, and realm progression.
- Do not add secrets, API keys, local-only paths, or copyrighted names.
