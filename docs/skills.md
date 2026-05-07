# Skills 配置记录

更新时间：2026-05-07

## 已有本地 skills

当前本机已存在的相关技能包括：

- `web-access`：联网调研。
- `frontend-design`：前端界面设计。
- `webapp-testing`：本地 Web 应用测试。
- `algorithmic-art`：后续若需要程序化视觉素材可用。
- `skill-installer`：安装官方或 GitHub skills。
- `skill-creator`：创建和优化自定义 skills。

## 本次安装

通过官方 `openai/skills` curated 列表安装：

- `playwright-interactive`：后续实现 Web 游戏后，用于浏览器交互验证。
- `security-best-practices`：用于后续处理依赖、部署、密钥和仓库安全。

Codex 需要重启后才能在技能列表里自动出现新安装的全局 skills。

## 本次创建

已创建项目专用技能：

- 仓库内：`.agents/skills/xianxia-text-game-dev/SKILL.md`
- 本机全局：`C:\Users\user\.codex\skills\xianxia-text-game-dev\SKILL.md`

用途：当后续开发文字冒险、增量游戏、修仙系统、数值循环、剧情事件和浏览器实现时，触发该 skill，优先保持原创、数据驱动、可测试和渐进解锁。

该 skill 已同步当前设计方向：淡然旁观、普通开局、道途不早锁、世界自行运转、重复积累必须升格。

2026-05-06 补充：skill 还应约束寿元、五行/灵根/相性、地点账本、关系账本、选择状态账本和低占比斗法风险事件。

2026-05-07 补充：后续实现任务应优先检查 `docs/project-status.md`、`PLAN.md` 和 `docs/reviews/2026-05-07-current-project-review.md`，避免重复实现阶段 1A 已完成内容。

2026-05-07 补充：根据“地图而非手册”的 AGENTS.md 维护方式，项目 skill 已收敛为薄入口：触发后读取 `AGENTS.md`、状态/计划/设计文档和相关内容库，不再复制整套产品原则，避免多份规则漂移。

## 第三方 skill 策略

- 只安装来源明确、内容可审计、与当前任务直接相关的 skills。
- GitHub 上未审计的“game dev skill”先记录候选，不直接安装进全局目录。
- 如果后续找到高质量开源 skill，安装前先阅读 `SKILL.md`，确认没有危险命令、隐私收集或不合适的自动化行为。
