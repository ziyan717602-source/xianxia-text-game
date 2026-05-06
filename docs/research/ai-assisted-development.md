# AI 辅助游戏/程序开发经验调研

更新时间：2026-05-06

## 可靠做法

- 把项目长期规则写进仓库级指令文件。Codex 支持 `AGENTS.md`，GitHub Copilot 支持 `.github/copilot-instructions.md`，Claude Code 支持 `CLAUDE.md`，Cursor 支持 `.cursor/rules`。
- 让 AI 先读项目规则、计划和测试约束，再写代码。游戏开发很容易被“看起来能跑”的 UI 掩盖玩法逻辑问题。
- 将玩法数据和逻辑从 UI 中拆出来，便于 AI 修改数值时不破坏界面。
- 要求每个功能都有可验证结果：资源变化、解锁条件、存档迁移、浏览器烟测截图或 Playwright 测试。
- 对“改进体验”类任务，要求 AI 先说明目标指标，例如减少点击疲劳、提升前 5 分钟解锁密度、降低等待时间。
- 维护经验文档，记录提示词、失败案例、测试命令和决策原因，让后续代理继承上下文。

## 对本项目的具体配置

- `AGENTS.md`：主指令源。
- `.github/copilot-instructions.md`：让 GitHub Copilot 继承同一套项目约束。
- `CLAUDE.md`：通过 `@AGENTS.md` 导入同一套项目约束。
- `.cursor/rules/xianxia-text-game.mdc`：让 Cursor 在修改项目时遵循同样的原创和测试要求。
- `.agents/skills/xianxia-text-game-dev/SKILL.md`：仓库级专用 skill。
- `C:\Users\user\.codex\skills\xianxia-text-game-dev\SKILL.md`：本机 Codex 专用全局 skill，重启 Codex 后生效。

## 来源

- [OpenAI Codex browser games use case](https://developers.openai.com/codex/use-cases/browser-games)
- [OpenAI Codex AGENTS.md guide](https://developers.openai.com/codex/guides/agents-md)
- [OpenAI Codex skills](https://developers.openai.com/codex/skills)
- [GitHub Copilot repository custom instructions](https://docs.github.com/en/copilot/customizing-copilot/adding-repository-custom-instructions-for-github-copilot)
- [Claude Code memory](https://docs.anthropic.com/en/docs/claude-code/memory)
- [Cursor rules](https://docs.cursor.com/context/rules)
