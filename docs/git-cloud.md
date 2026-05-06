# Git 与云端协作

更新时间：2026-05-06

## 当前状态

- 本机已安装 Git。
- 当前目录初始化为本地 git 仓库后，可立即版本管理。
- 未检测到 GitHub CLI `gh`，因此无法自动创建 GitHub 远程仓库。
- 当前还缺少用户的云端仓库 URL，不能安全地替你设置真实 `origin`。

## 推荐云端方案

优先使用 GitHub 私有仓库或公开仓库：

```powershell
git remote add origin https://github.com/<your-name>/<repo-name>.git
git branch -M main
git push -u origin main
```

如果使用 Gitee、GitLab 或自建 Git 服务，只需替换远程 URL：

```powershell
git remote add origin https://gitee.com/<your-name>/<repo-name>.git
git push -u origin main
```

## 建议分支

- `main`：可运行、可演示状态。
- `feature/core-loop`：核心循环。
- `feature/save-system`：存档和迁移。
- `feature/cultivation-realms`：境界突破。
- `feature/exploration-events`：探索和事件。

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
- 每台电脑拉取后先阅读 `README.md` 和 `agents.md`。

