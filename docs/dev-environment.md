# 本地开发环境（Linux 服务器 / Super Z Agent）

更新时间：2026-05-08

## 已安装

- **Git**：`v2.47.3`
- **Node.js**：`v24.14.1`（满足 Vite 要求的 `20.19+` 或 `22.12+`）
- **npm**：`v11.11.0`
- **Python**：`v3.12.13`
- **Playwright**：`v1.59.1`（Chromium for Testing 147，位于 `~/.cache/ms-playwright/`）

## 当前会话注意事项

- 运行命令时需要确保工作目录在项目根目录。如果 shell 当前目录是 `/home/z/my-project`，需要使用 `cd /home/z/my-project/xianxia-text-game` 或 `npm run <cmd> --prefix /home/z/my-project/xianxia-text-game`。
- Playwright 是全局安装，不在项目 `node_modules` 中；浏览器烟测脚本使用 `import('playwright')` 动态加载。
- 浏览器烟测需要先构建：`npm run build && npm run smoke`。

## 与 Windows 开发机的环境差异

见 `docs/dev-environment-pc.md`（个人 PC）和本文件的对比。

| 项目 | Linux 服务器（当前） | Windows 工作电脑 | Windows 个人 PC |
| --- | --- | --- | --- |
| 操作系统 | Linux | Windows | Windows |
| Node.js | v24.14.1 | v24.15.0 | v22.14.0 |
| npm | 11.11.0 | 11.12.1 | 10.9.2 |
| Git | v2.47.3 | 已可用 | v2.54.0 |
| GitHub CLI | 未安装 | 未安装 | v2.92.0 |
| Playwright | v1.59.1（全局） | 未安装 | 未安装 |
| 烟测方式 | Playwright headless | CDP + Edge | CDP + Edge |

### 兼容性说明

- Vite 要求 Node `20.19+` 或 `22.12+`，三台机器都满足。
- `package-lock.json` 使用 lockfile v3 格式（npm 11+ 生成），个人 PC 的 npm 10 可能生成 v2 格式。建议统一在服务器或工作电脑上执行 `npm ci`。
- 浏览器烟测脚本已适配：Linux 使用 Playwright，Windows 使用原始 CDP 脚本。

## 后续建议

- Web 原型使用 Vite + TypeScript + React。
- 测试使用 Vitest 做逻辑单元测试，Playwright 做浏览器烟测。
- 不提交 `node_modules` 和构建产物，依赖通过 `package.json` 锁定。
