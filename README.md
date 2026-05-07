# 文字修仙

一款受 `A Dark Room` 启发的原创纯文字修仙增量叙事游戏。当前仓库已进入阶段 1 原型：工程骨架、核心逻辑、事件弹窗、localStorage 存档和基础测试已经建立，但完整第一阶段修行体验仍在开发中。

## 当前内容

- `AGENTS.md`：所有 AI 代理和开发者应遵循的项目级指令。
- `docs/game-design.md`：核心玩法、资源、境界、叙事结构草案。
- `docs/design-direction.md`：当前讨论形成的设计方向。
- `docs/technical-direction.md`：多端浏览器、存档和测试路线。
- `docs/research/similar-games.md`：同类游戏与可借鉴机制。
- `docs/research/incremental-design-patterns.md`：增量/文字游戏设计调研补充。
- `docs/research/xianxia-text-game-audit.md`：仙侠/文字游戏特点审视与设计查漏。
- `docs/research/2026-05-07-content-prep.md`：阶段 1C/2 后续内容资料准备与来源边界。
- `docs/research/ai-assisted-development.md`：AI 辅助开发工作流经验。
- `docs/content-bank/`：节气、地点、NPC、灵根、五行、炼丹和草药的原创机制化素材库。
- `docs/project-status.md`：已开发、待开发工作梳理。
- `docs/reviews/2026-05-07-current-project-review.md`：当前代码与游戏设计全面审查。
- `docs/reports/`：历史进度报告和审计报告。
- `docs/experience.md`：持续维护的开发经验库。
- `docs/skills.md`：本地 skills 清单、已安装补充技能、项目专用 skill。
- `.github/copilot-instructions.md`、`.cursor/rules/xianxia-text-game.mdc`、`CLAUDE.md`：跨工具项目指令入口。
- `docs/dev-environment.md`：本地开发环境记录。

## 运行

```powershell
npm ci
npm run dev
```

验证：

```powershell
npm test
npm run build
npm run smoke
```

## 下一步

1. 完成阶段 1C 剩余项：状态调制事件、近日摘要、世界日志和首轮数值手感测试。
2. 按 `docs/content-bank/` 落地第一批地点/节气/关系调制事件，保持短文本和状态账本可读。
3. 调整“枯坐 -> 玉简 -> 吐纳 -> 日课 -> 引气入体 -> 炼气一层”的前 20-30 分钟节奏。
4. 扩展坊市、宗门传闻和第一批长期后果事件。

## 本地环境

本项目在两台机器上开发：

- 工作电脑：见 `docs/dev-environment.md`。
- 个人 PC：见 `docs/dev-environment-pc.md`。

切换机器后先运行 `npm ci` 确保依赖一致。两台机器的环境差异和兼容性说明见 `docs/dev-environment-pc.md`。
