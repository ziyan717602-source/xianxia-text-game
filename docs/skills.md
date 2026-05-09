# Skills 配置记录

更新时间：2026-05-08

## 环境说明

当前开发环境为 Linux 服务器（Super Z Agent）。Skills 位于 `/home/z/my-project/skills/`，通过 Super Z 的 Skill 工具调用。每个 Skill 的核心逻辑记录在其 `SKILL.md` 文件中。

## Super Z 内置 Skills（与本项目相关）

以下 Skills 是 Super Z Agent 平台内置的，无需额外安装，按需调用：

| Skill | 用途 | 何时使用 |
| --- | --- | --- |
| `code-reviewer` | 代码审查，支持本地变更和远程 PR | 完成功能后审查代码质量 |
| `webapp-testing` | 使用 Playwright 测试本地 Web 应用 | UI 变更后做浏览器烟测 |
| `frontend-design` | 前端界面设计，避免通用 AI 美学 | 新 UI 组件或样式调整 |
| `web-search` | 联网搜索最新信息 | 调研同类游戏、查技术文档 |
| `web-reader` | 网页内容提取 | 阅读在线文章、API 文档 |
| `charts` | 图表与可视化 | 生成架构图、流程图、数据可视化 |
| `neat-freak` | 会话结束后文档洁癖级审查与同步 | 阶段收尾、同步 docs/ 与 AGENTS.md |
| `superpowers` | 完整开发方法论系统（7 个子 skill） | 规划、TDD、调试等结构化开发 |
| `skill-creator` | 创建新 Skill | 需要项目特化技能时 |
| `pdf` / `docx` / `xlsx` / `ppt` | 文档生成 | 需要输出报告、分析文档 |
| `image-generation` | AI 图片生成 | 游戏美术素材、UI 图标 |
| `VLM` | 图片理解 | 分析设计稿或截图 |
| `ASR` | 语音转文字 | 音频素材处理 |

## 项目专用 Skill

### xianxia-text-game-dev

- 位置：`.agents/skills/xianxia-text-game-dev/SKILL.md`
- 来源：项目自建（原为 Codex skill）
- 功能：项目开发的轻量触发入口，加载 `AGENTS.md`、`PLAN.md` 和相关文档
- 注意：当前 Super Z 环境不自动加载 `.agents/skills/`，开发时应直接参考 `AGENTS.md`

## 第三方 Skill 适配记录（2026-05-08 安装）

从 GitHub 下载并适配安装的 Skills，全部针对 Super Z Agent 架构深度适配：

### 1. skill-creator（Anthropic）
- 来源：https://github.com/anthropics/skills/tree/main/skills/skill-creator
- 状态：已适配（平台内置版本）
- 功能：创建新 skill、修改优化现有 skill、运行评估、基准测试

### 2. web-access（eze-is）
- 来源：https://github.com/eze-is/web-access
- 状态：已适配（v2.5.0-z1），已合并到平台内置 `web-search` / `web-reader`
- 功能：联网搜索、网页抓取、登录后操作

### 3. neat-freak（KKKKhazix）
- 来源：https://github.com/KKKKhazix/khazix-skills/tree/main/neat-freak
- 状态：已适配（v1.0.0-z1）
- 功能：会话结束后的知识库审查与同步

### 4. superpowers（obra）
- 来源：https://github.com/obra/superpowers
- 状态：已适配（v5.1.0-z1）
- 功能：完整开发方法论系统（brainstorming、writing-plans、TDD 等 7 个子 skill）

### 5. frontend-design（Anthropic）
- 来源：https://github.com/anthropics/skills/tree/main/skills/frontend-design
- 状态：已适配（v1.0.0-z1）
- 功能：创建独特、生产级前端界面

### 6. fullstack-developer（awesome-llm-apps）
- 来源：https://github.com/Shubhamsaboo/awesome-llm-apps/tree/main/awesome_agent_skills/fullstack-developer
- 状态：已适配（v1.0.0-z1）
- 功能：通用全栈开发参考（与 fullstack-dev 互补）
- 注意：本项目使用 Vite + React，不是 Next.js；此 Skill 的通用参考仍有价值

### 7. code-reviewer（Google Gemini CLI）
- 来源：https://github.com/google-gemini/gemini-cli/tree/main/.gemini/skills/code-reviewer
- 状态：已适配（v1.0.0-z1）
- 功能：代码审查，支持本地变更和远程 PR

### 8. webapp-testing（Anthropic）
- 来源：https://github.com/anthropics/skills/tree/main/skills/webapp-testing
- 状态：已适配（v1.0.0-z1）
- 功能：使用 Playwright 测试本地 Web 应用
- 适配要点：增加了 Playwright 替代 CDP 的方案，与当前 Linux 环境一致

## Skill 使用策略

- 优先使用 Super Z 平台内置 Skill，确保与当前环境完全兼容。
- 所有安装的第三方 Skill 均经过适配流程：读取原版 → 理解核心原理 → 识别平台绑定特性 → 适配为 Super Z 格式 → 增加版本标记。
- 项目专用逻辑放 `AGENTS.md` 和 `docs/`，不依赖特定 Skill 的触发词。
