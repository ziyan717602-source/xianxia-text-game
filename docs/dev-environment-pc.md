# 本地开发环境（个人 PC）

更新时间：2026-05-06

## 已安装

- **Git**：`v2.54.0`，通过 `winget install Git.Git` 安装。
  - 安装路径：`C:\Program Files\Git`
- **GitHub CLI (gh)**：`v2.92.0`，通过 `winget install GitHub.cli` 安装。
  - 已认证账号 `ziyan717602-source`，协议 HTTPS。
- **Node.js**：`v22.14.0`（LTS）。
  - 安装路径：`D:\Program Files\Nodejs`
- **npm**：`v10.9.2`。

## 当前会话注意事项

当前终端可能未自动刷新 PATH。如果 `git`、`gh` 等命令无法识别，先执行：

```powershell
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
```

## 与工作电脑的环境差异

见 `docs/dev-environment.md`（工作电脑）和本文件的对比。

| 项目 | 工作电脑 | 个人 PC | 是否冲突 |
| --- | --- | --- | --- |
| Node.js | v24.15.0 | v22.14.0 | ⚠️ 见下方说明 |
| npm | 11.12.1 | 10.9.2 | ⚠️ 见下方说明 |
| Git | 已可用（版本未记录） | v2.54.0 | ✅ 无冲突 |
| GitHub CLI | 未安装 | v2.92.0 | ✅ 无冲突（PC 多装了，不影响） |
| Node 安装路径 | `C:\Program Files\nodejs` | `D:\Program Files\Nodejs` | ✅ 无冲突（各自本地路径） |

### Node.js 版本差异分析

- 工作电脑：**Node v24.15.0**（Current 线）
- 个人 PC：**Node v22.14.0**（LTS 线）

**影响评估：**

- Vite 要求 Node `20.19+` 或 `22.12+`。**两台机器都满足**。
- npm 大版本不同（11 vs 10），可能导致 `package-lock.json` 格式差异（lockfile v3 vs v2）。
- TypeScript、Vitest、React 等依赖对 Node 22/24 均兼容。

**建议：将个人 PC 的 Node 升级到 v24 LTS（待 v24 进入 LTS 后），或将工作电脑降级到 v22 LTS。在此之前注意以下事项。**

### 避免冲突的操作规范

1. **锁定 lockfile 版本**：项目初始化时使用 `npm install`（而非 `npm i --legacy-peer-deps`），两台机器都遵守同一 `package-lock.json`。
2. **统一 npm lockfile 版本**：在 `.npmrc` 中显式指定 `lockfile-version=3`，避免两台机器生成不同格式的 lockfile。
3. **在 `package.json` 中指定 engines**：
   ```json
   "engines": {
     "node": ">=22.12.0"
   }
   ```
4. **切换机器后先 `npm ci`**：确保依赖与 lockfile 完全一致，而非 `npm install`（后者可能修改 lockfile）。
5. **不提交 `node_modules`**：已在 `.gitignore` 中配置。

## 后续建议

- Web 原型使用 Vite + TypeScript + React。
- 测试使用 Vitest 做逻辑单元测试，Playwright 做浏览器烟测。
- 不提交 `node_modules` 和构建产物，依赖通过 `package.json` 锁定。
