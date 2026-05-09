# 文字修仙项目 Agent 指南

本文件是给 AI Coding Agent 的项目地图，不是完整手册。打开项目后先读这里；需要细节时按"文档导航"进入 `docs/`。只有"不知道就会写错"的硬规则放在本文件，设计细节、素材和复盘放到专题文档。

## 1. 项目概览

本仓库开发一款受 `A Dark Room` 结构启发的原创纯文字/低图形化修仙增量叙事游戏。可借鉴的是"渐进揭示、资源循环、探索解锁、叙事反转"，不能复刻任何现有游戏、小说、影视或仙侠 IP 的专有名称、人物、剧情、地图、宗门设定。

技术栈为 Vite + TypeScript + React。核心玩法逻辑保持框架无关，浏览器只是运行和展示外壳。

当前阶段：凡人→炼气→筑基早期链路已验证可玩；金丹及更高境界内容（金丹→元婴→化神→合体→大乘→渡劫）为实验性草案，框架已搭建但可玩性待验证。道途、因果、心魔（8 种）、宗门身份、洞府阵法、弟子杂役、秘境探索、飞升重置等系统均已接入代码；38 方丹药、29 地点、51 功法等高境界内容属于待验证内容。剩余工作为 PWA 离线能力、部署和云存档评估。详见 `PLAN.md` 与 `docs/project-status.md`。

## 2. 运行环境

当前开发环境为 Linux 服务器（Super Z Agent），基础工具链：

| 工具 | 版本 | 备注 |
| --- | --- | --- |
| Node.js | v24.14.1 | 满足 Vite 要求 |
| npm | 11.11.0 | |
| Git | v2.47.3 | |
| Playwright | v1.59.1 | 替代原 Windows CDP 烟测 |
| Python | 3.12.13 | 辅助脚本 |

多环境开发记录：
- Linux 服务器（当前）：见 `docs/dev-environment.md`。
- Windows 工作电脑：见 `docs/dev-environment-pc.md`（历史归档）。
- 切换机器后先 `npm ci` 确保 lockfile 一致。

## 3. 快速命令

| 目标 | 命令 |
| --- | --- |
| 安装依赖 | `npm ci` |
| 本地开发 | `npm run dev` |
| 单元测试 | `npm test` |
| 类型检查与构建 | `npm run build` |
| 浏览器烟测 | `npm run smoke` |
| 空白/换行检查 | `git diff --check` |

验证闭环：改逻辑至少跑 `npm test`；改 UI 至少跑 `npm run build` 和 `npm run smoke`；只改文档至少跑 `git diff --check`。失败时先修到命令通过，再汇报结果。

## 4. 目录地图

```text
src/game/        框架无关的模拟、资源、行动、境界、事件、存档数据结构
src/content/     数据驱动内容：行动、解锁、地点、出身、功法、丹方、突破规则
src/storage/     存档读写、版本号与迁移逻辑
src/ui/          React 界面，只渲染状态和派发行动，不保存权威玩法状态
tests/           Vitest 单元测试与回归路线测试
scripts/         本地验证脚本
docs/            设计、技术、素材、调研、经验和阶段状态
agent-ctx/       Agent 上下文记录（阶段性工作文档）
```

## 5. 硬性产品规则

- 保持原创。可使用灵气、筑基、金丹、丹药、法器、阵法等通用概念，不复制具体 IP 的命名、剧情、地图、宗门或文风。
- 基调淡然旁观，不煽情、不评判。系统记录后果，玩家自己选择。
- 开局普通，不做天崩开局、饥荒求生或天命主角。
- 不要早早锁定职业或道途。道途应由长期行为、资源偏好、错过的机会和账本后果自然长出来。
- 文本是第一界面，UI 服务玩法；不要把游戏做成营销页、设定展示页或纯卡片陈列。
- 每个新增系统都必须强化"修行、瓶颈、选择、代价"，并能说清输入、输出、风险、解锁、恢复路径。
- 寿元是一等压力；时间推进、闭关、失败和飞升结算都要能读到寿元影响。
- 五行、灵根、功法相性、丹药药性、地点灵气是底层语法；早期 UI 可以隐藏，数据模型要预留。
- 重要选择必须写入状态账本，以 flag、tag、quality 或关系记录供后续事件、价格、NPC、劫数、日志读取。
- 世界要显得自行运转：季节、地点、物价、NPC 去留、人情旧债、机缘过期等变化应进入状态或事件权重。
- 重复积累必须有升格路径：手动操作 -> 日课/批量 -> 闭关/阵法/洞府/宗门供给 -> 新决策层。
- 斗法可以低占比，但不能缺席；优先作为风险事件和资源检验，而不是动作战斗。

## 6. 硬性工程规则

- `src/game` 逻辑必须可测试、可注入随机源，不依赖 React 或浏览器全局状态。
- 数值与世界内容优先放在 `src/content` 或数据文件，避免散落在 UI 组件里。
- 存档必须有版本号；任何破坏性字段变更都要更新迁移逻辑和存档测试。
- UI 行动列表必须同时读取地点可用行动、解锁状态、所需 flag/境界和禁用条件，不能只看 `unlockedActions`。
- UI 资源面板必须渐进揭示，不能开局展示所有资源。
- 离线收益不能长期依赖逐 tick `while` 循环；涉及长时间结算时要批量化。
- 核心逻辑变更要有单元测试：资源 tick、行动结算、解锁、事件、突破、存档迁移、回归路线。
- UI 变更要做浏览器烟测；当前环境优先使用 Playwright（已安装 v1.59.1）。
- 内容素材要机制化再落地；事件至少明确地点/季节/条件/权重/后果，不把长设定直接塞进 UI。
- 不引入复杂服务端、大框架或云依赖，除非它能明显降低长期维护成本。
- 禁止提交 API key、私有 token、登录态、个人账号信息和不可分享的私有素材。

## 7. 工作流（Super Z Agent 适配）

### 7.1 任务分类与路由

1. 先判断任务类型：设计、实现、测试、平衡、内容、调研、文档整理。
2. 实现前读 `docs/project-status.md`、`PLAN.md` 和相关源码，避免重复实现已完成内容。
3. 设计改动先读 `docs/design-direction.md` 与 `docs/game-design.md`；内容改动先读 `docs/content-bank/README.md` 和对应素材文件。
4. 新玩法先写清资源流、解锁条件、失败/代价、状态账本和测试点，再动代码。

### 7.2 子 Agent 使用

本项目使用 Super Z Agent 架构。可用的子 Agent 类型及适用场景：

| 子 Agent 类型 | 适用场景 | 不适用场景 |
| --- | --- | --- |
| `Explore` | 快速搜索代码、定位文件、理解代码结构 | 需要完整对话上下文的任务 |
| `Plan` | 设计实现方案、识别关键文件、架构权衡 | 简单的文件读取 |
| `general-purpose` | 多步骤独立任务：搜索、数据获取、代码生成 | 需要技能合规或格式化输出的任务 |
| `frontend-styling-expert` | CSS 样式、响应式设计、动画、布局 | 游戏逻辑实现 |
| `full-stack-developer` | Next.js 全栈开发 | 本项目不使用 Next.js |

**注意**：本项目是 Vite + React 项目，不是 Next.js 项目。`full-stack-developer` 和 `fullstack-dev` 子 Agent 主要用于 Next.js 场景；对于本项目的纯前端开发，应使用 `general-purpose` 或 `Explore` 子 Agent 处理独立子任务。

### 7.3 Skill 使用

当前环境已安装的相关 Skills（位于 `/home/z/my-project/skills/`）：

| Skill | 用途 | 何时使用 |
| --- | --- | --- |
| `code-reviewer` | 代码审查 | 完成功能后审查、PR 审查 |
| `webapp-testing` | Web 应用测试 | UI 变更后用 Playwright 测试 |
| `frontend-design` | 前端界面设计 | 新 UI 组件设计或样式调整 |
| `web-search` | 联网搜索 | 需要最新信息或调研 |
| `web-reader` | 网页内容提取 | 阅读网页文章或文档 |
| `charts` | 图表可视化 | 生成架构图、流程图 |
| `neat-freak` | 文档同步整理 | 阶段性收尾、同步文档 |
| `superpowers` | 开发方法论 | 规划、调试、TDD 等结构化开发 |
| `skill-creator` | 创建新 Skill | 需要项目特化技能时 |

### 7.4 代码改动与验证

5. 代码改动保持小步可验证；完成后运行对应命令，并把测试结果写入最终回复。
6. 阶段推进后同步 `README.md`、`PLAN.md`、`docs/project-status.md` 和必要的内容文档。
7. 可复用经验沉淀到 `docs/experience.md`；外部资料沉淀到 `docs/research/`，附链接和版权边界。

### 7.5 工作日志

所有 Agent 的工作记录统一写入 `/home/z/my-project/worklog.md`，包含 Task ID、Agent 名称、任务描述、具体步骤和阶段总结。

## 8. 当前优先级

近期进入收尾阶段：PWA 离线能力、部署到静态站点、评估云存档。不要回头重做阶段 1C/2/3 的已实现功能，除非是修 bug 或平衡回归。优先关注事件池扩展、离线收益批量结算和 UI 组件拆分。注意：金丹及以上境界内容为实验性草案，尚未经充分可玩性验证，文档中相关描述应标注"待验证"。

## 9. 文档导航

| 文档 | 何时阅读 |
| --- | --- |
| `README.md` | 给人看的项目入口、运行方式和当前功能摘要 |
| `docs/project-status.md` | 每次实现前确认当前完成度、存档版本、测试状态 |
| `PLAN.md` | 选择下一步开发内容、更新阶段计划 |
| `docs/technical-direction.md` | 技术栈、模块边界、存档和测试策略 |
| `docs/design-direction.md` | 基调、道途、世界鲜活感、重复积累升格等设计方向 |
| `docs/game-design.md` | 核心循环、资源系统、境界结构、事件框架 |
| `docs/content-bank/README.md` | 内容资料入口；写地点、NPC、草药、丹方、宗门前必读 |
| `docs/research/` | 外部调研记录，只借鉴机制，不搬运受版权保护内容 |
| `docs/reviews/` | 历史审查与调整原因 |
| `docs/experience.md` | 项目和 AI 协作经验、提示词、踩坑 |
| `docs/git-cloud.md` | 远程仓库和跨设备协作说明 |
| `docs/skills.md` | 本地/项目 skills 配置记录 |
| `docs/dev-environment.md` | 当前 Linux 开发环境记录 |
| `docs/dev-environment-pc.md` | 历史 Windows 开发环境记录（归档） |

## 10. Git 分支与提交规则

### 10.1 分支策略

| 分支 | 用途 | 权限 |
| --- | --- | --- |
| `main` | Codex 维护的稳定主线 | **禁止提交、禁止 push** |
| `glm/v0.2.0-snapshot` | GLM v0.2.0 的原样快照 | **只读留档，禁止继续提交** |
| `glm/dev` | GLM Agent 的开发分支 | 所有 GLM 开发在此进行 |

**硬性规则**：
1. 所有开发在 `glm/dev` 分支进行，禁止在 `main` 上直接提交。
2. 禁止 push 到 `main`，禁止将 `glm/dev` 合并到 `main`。
3. 不要直接 merge `main`；如需吸收 `main` 新内容，先说明再操作。
4. 每次开发前必须确认当前在 `glm/dev` 分支。
5. **禁止 force push** 到任何远程分支（`git push --force` / `--force-with-lease` 均禁止）。
6. **禁止 rebase 已推送到 origin 的提交**，避免协作历史混乱。
7. 如需临时切分支，先 `git stash` 或提交 WIP commit，不要带着脏工作树切换。

### 10.2 开发前准备

```bash
git fetch origin
git switch glm/dev
git pull --ff-only   # --ff-only 确保不产生无意义的 merge commit
npm ci
```

**注意事项**：
- `--ff-only` 失败说明远端有新提交与本地分歧，应先 `git stash` 再 `git pull --rebase` 解决。
- `npm ci` 严格按 lockfile 安装，保证环境一致；不要用 `npm install`。

### 10.3 开发后提交

```bash
npm test
npm run build
git status --short
git add <本次修改的文件>
git commit -m "feat: ..."   # 或 fix:/docs:/refactor:/test:/chore:
git push origin glm/dev
```

### 10.4 提交规范

- **不要提交**：`node_modules`、`dist`、`.env`、token、本地存档、浏览器缓存。
- 每个提交只做一个清楚的功能或修复。
- 新玩法要补测试。
- 改了玩法、计划或项目状态，要同步 `README.md`、`PLAN.md`、`docs/project-status.md` 等文档。
- Commit message 格式：`<type>: <简述>`，type 可选 `feat`/`fix`/`docs`/`refactor`/`test`/`chore`。

### 10.5 多工具协作

- 工作树可能有他人改动；不要回滚未亲自修改的内容。
- Cursor、Copilot 等项目指令应引用本文件，避免多份规则漂移。
- 当前环境 Git 可用但未配置 `gh` CLI；使用 `git` 命令进行推送和拉取。

## 11. 规则迭代

遇到 AI bad case 时按执行力补规则：能脚本检查的，优先加脚本或测试；全局硬规则放本文件；模块细节放对应 `docs/`；一次性经验写 `docs/experience.md`。保持本文件像地图，避免堆成长手册。
