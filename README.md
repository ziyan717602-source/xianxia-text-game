# 文字修仙

一款受 `A Dark Room` 启发的原创纯文字修仙增量叙事游戏。当前仓库处于立项阶段，已建立调研、设计、AI 协作和版本管理文档。

## 当前内容

- `AGENTS.md`：所有 AI 代理和开发者应遵循的项目级指令。
- `docs/game-design.md`：核心玩法、资源、境界、叙事结构草案。
- `docs/design-direction.md`：当前讨论形成的设计方向。
- `docs/technical-direction.md`：多端浏览器、存档和测试路线。
- `docs/research/similar-games.md`：同类游戏与可借鉴机制。
- `docs/research/incremental-design-patterns.md`：增量/文字游戏设计调研补充。
- `docs/research/xianxia-text-game-audit.md`：仙侠/文字游戏特点审视与设计查漏。
- `docs/research/ai-assisted-development.md`：AI 辅助开发工作流经验。
- `docs/experience.md`：持续维护的开发经验库。
- `docs/skills.md`：本地 skills 清单、已安装补充技能、项目专用 skill。
- `.github/copilot-instructions.md`、`.cursor/rules/xianxia-text-game.mdc`、`CLAUDE.md`：跨工具项目指令入口。
- `docs/dev-environment.md`：本地开发环境记录。

## 下一步

1. 创建 `Vite + TypeScript + React` Web 游戏骨架。
2. 实现最小可玩核心循环：吐纳、采药、读书、巡山、气/药/钱/见闻/寿元/伤积累、第一阶段事件解锁。
3. 加入存档、tick 模拟、基础测试和浏览器烟测。
4. 按 `docs/game-design.md` 扩展炼丹、探索、突破和宗门系统。

## 本地环境

本项目在两台机器上开发：

- 工作电脑：见 `docs/dev-environment.md`。
- 个人 PC：见 `docs/dev-environment-pc.md`。

切换机器后先运行 `npm ci` 确保依赖一致。两台机器的环境差异和兼容性说明见 `docs/dev-environment-pc.md`。
