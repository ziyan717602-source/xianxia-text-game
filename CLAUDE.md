@AGENTS.md

# Claude Code Instructions

Do not copy proprietary xianxia IP. Keep gameplay logic data-driven, testable, and separated from UI.

## Multi-Agent Note

This project is developed across multiple AI agents and environments. The canonical project instructions are in `AGENTS.md`. All agents (Claude Code, Cursor, Copilot, Super Z) should reference `AGENTS.md` as the source of truth rather than maintaining separate rule sets.

- Current primary environment: Linux server (Super Z Agent). See `docs/dev-environment.md`.
- Windows environment is archived: see `docs/dev-environment-pc.md`.
- Browser smoke test uses Playwright on Linux; original CDP script for Windows is no longer maintained.
