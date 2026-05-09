# 文字修仙

一款受 `A Dark Room` 启发的原创纯文字修仙增量叙事游戏。当前仓库已完成阶段 2 与阶段 3 核心功能：核心逻辑、八个可选出身、灵根五行、功法相性、炼丹丹毒、九层炼气突破、筑基大瓶颈、金丹/元婴/化神/合体/大乘/渡劫全境界链路、道途/因果/心魔、宗门身份与规矩、洞府阵法与弟子杂役、秘境探索、飞升重置、186+ 事件、29 地点、51 功法、38 丹方、45 草药、14 秘境、466 测试用例、localStorage 存档（版本 14）已经建立。

## 当前内容

- `AGENTS.md`：所有 AI 代理和开发者应遵循的项目级指令。
- `docs/game-design.md`：核心玩法、资源、境界、叙事结构草案。
- `docs/design-direction.md`：当前讨论形成的设计方向。
- `docs/technical-direction.md`：多端浏览器、存档和测试路线。
- `docs/research/`：同类游戏调研、增量设计调研、仙侠品类审视、内容资料准备、AI 辅助开发经验。
- `docs/content-bank/`：节气、地点、NPC、灵根、五行、炼丹和草药的原创机制化素材库。
- `docs/project-status.md`：已开发、待开发工作梳理。
- `docs/experience.md`：持续维护的开发经验库。
- `docs/skills.md`：本地 skills 清单与适配记录。

## 运行

```bash
npm ci
npm run dev
```

验证：

```bash
npm test
npm run build
npm run smoke
```

## 下一步

1. PWA 离线能力（service worker + manifest）。
2. 部署到静态站点。
3. 评估云存档方案。
4. 让八个可选出身和灵根五行进入更多早期事件权重，而不是只影响起始数值和吐纳收益。
5. 拆分主要 UI 组件，为后续系统扩展降低维护成本。

## 本地环境

本项目在多台机器上开发：

- Linux 服务器（当前）：见 `docs/dev-environment.md`。
- Windows 工作电脑：见 `docs/dev-environment-pc.md`（历史归档）。

切换机器后先运行 `npm ci` 确保依赖一致。
