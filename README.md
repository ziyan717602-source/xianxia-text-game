# 文字修仙

一款受 `A Dark Room` 启发的原创纯文字修仙增量叙事游戏。当前仓库已进入阶段 2：核心逻辑、普通出身、灵根五行、功法相性、炼丹丹毒第一版、稳息散稳冲路径、清躁丸/丹毒入脉处理、炼气突破、筑基大瓶颈、筑基收功、筑基日课、护法/借丹支援及牵连事件、筑基后坊市旧账和外门筑基名册、短闭关、聚气阵/阵中闭关、筑基稳息与阵脚重排事件、外门短差/供给、外门点卯/巡值/失期处罚、地点、关系账本、状态调制事件、世界日志、localStorage 存档、早期数值基准和基础测试已经建立。

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
- `docs/reports/2026-05-07-stage1c-balance-pass.md`：阶段 1C 首轮手感基准与数值调整说明。
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

1. 继续阶段 2：扩展筑基后的多轮牵连、同门关系和洞府/阵法长期维护后果。
2. 让五个普通出身和灵根五行进入更多早期事件权重，而不是只影响起始数值和吐纳收益。
3. 拆分主要 UI 组件，为后续系统扩展降低维护成本。

## 本地环境

本项目在两台机器上开发：

- 工作电脑：见 `docs/dev-environment.md`。
- 个人 PC：见 `docs/dev-environment-pc.md`。

切换机器后先运行 `npm ci` 确保依赖一致。两台机器的环境差异和兼容性说明见 `docs/dev-environment-pc.md`。
