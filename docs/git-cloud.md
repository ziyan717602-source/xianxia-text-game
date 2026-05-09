# Git 与云端协作

更新时间：2026-05-09

## 当前状态

- 本机已安装 Git。
- 当前目录已初始化为本地 git 仓库。
- 远端仓库已配置为 `origin`：`https://github.com/ziyan717602-source/xianxia-text-game.git`。
- 本地 `main` 已跟踪 `origin/main`。
- 未检测到 GitHub CLI `gh`，因此无法自动创建 GitHub 远程仓库。

## 推荐云端方案

当前已经完成远端配置。日常同步使用：

```powershell
git status --short
git pull --rebase
git push
```

如果以后迁移到 Gitee、GitLab 或自建 Git 服务，再替换远程 URL：

```powershell
git remote set-url origin https://gitee.com/<your-name>/<repo-name>.git
git push -u origin main
```

## 建议分支

- `main`：可运行、可演示状态。
- `feature/core-loop`：核心循环。
- `feature/save-system`：存档和迁移。
- `feature/cultivation-realms`：境界突破。
- `feature/exploration-events`：探索和事件。
- `glm/v0.2.0-snapshot`：GLM 版本原样快照，只读留档，不直接合并到 `main`。
- `integration/glm-v0.2.0`：从 `main` 出发，按系统小步吸收 GLM 内容。

## 提交习惯

```powershell
git status --short
git add .
git commit -m "docs: bootstrap xianxia text game project"
git push
```

## 跨设备开发建议

- 云端只存源码、文档、测试和小型素材。
- 不提交 `node_modules`、构建产物、临时截图、私钥和本地存档。
- 如果后续有大图、音频或模型文件，使用 Git LFS 或外部素材库。
- 每台电脑拉取后先阅读 `README.md` 和 `AGENTS.md`。
- 其他 Agent 或其他目录产出的版本，先导入独立快照分支；审查后再在 `integration/*` 分支中逐系统移植。

## GLM v0.2.0 快照

- 源目录：`C:\个人\GLM文字\xianxia-text-game-v0.2.0`
- 快照分支：`glm/v0.2.0-snapshot`
- 快照提交：`d29f875 chore: import GLM v0.2.0 snapshot`
- 导入审查：`docs/reviews/2026-05-09-glm-v0.2.0-import-review.md`
