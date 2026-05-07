# 本地开发环境

更新时间：2026-05-07

## 已安装

- Git：已可用。
- Node.js LTS：已通过 `winget` 安装。
  - 安装路径：`C:\Program Files\nodejs`
  - Node：`v24.15.0`
  - npm：`11.12.1`
- GitHub CLI `gh`：当前未安装。

## 当前会话注意事项

当前 Codex 进程的 PATH 仍可能优先命中 Codex app 自带的 `node.exe`，该文件在当前 Windows 环境中会报“拒绝访问”。在新终端中通常会自动刷新 PATH；如果当前会话需要直接运行 Node，先执行：

```powershell
$env:Path = 'C:\Program Files\nodejs;' + $env:Path
node --version
npm --version
```

也可以直接调用：

```powershell
& 'C:\Program Files\nodejs\node.exe' --version
& 'C:\Program Files\nodejs\npm.cmd' --version
```

2026-05-07 验证：在当前 Codex shell 中直接执行 `npm` 会提示命令不存在；将 `C:\Program Files\nodejs` 前置到 PATH 后，`npm test` 与 `npm run build` 均可通过。

## 后续建议

- Web 原型可使用 Vite/TypeScript 工具链。
- 测试可使用 Vitest 做逻辑单元测试，Playwright 做浏览器烟测。
- 不提交 `node_modules` 和构建产物，依赖通过 `package.json` 锁定。
