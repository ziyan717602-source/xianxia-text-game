# 技术路线

更新时间：2026-05-09

## 目标

- 多端浏览器可玩：桌面、手机、平板。
- 可本地存档，后续可云存档。
- 可离线打开基础游戏。
- 核心逻辑可测试，不依赖 UI。
- 静态部署优先，避免早期引入后端复杂度。

## 默认栈

- Vite + TypeScript + React。
- Vitest：核心逻辑单元测试。
- Playwright：浏览器烟测。
- PWA：后续加入 service worker 和 manifest，支持离线与安装。

Vite 官方文档说明它面向现代 Web 项目，提供开发服务器和生产构建；当前 Vite 要求 Node.js `20.19+` 或 `22.12+`。Windows 工作电脑已安装 Node.js `24.15.0`，Linux 服务器已安装 Node.js `v24.14.1`，均满足要求。

## 架构边界

```text
src/game        纯逻辑：tick、资源、行动、事件、境界、地点、关系、状态账本、存档迁移
src/content     数据：路线、动作、事件、文本片段、境界、资源、地点、NPC 原型
src/ui          React UI：渲染状态、按钮、日志、设置、存档界面
src/storage     localStorage / IndexedDB / 云存档适配层
tests           逻辑测试与浏览器烟测
```

UI 不保存权威状态。所有关键状态都来自 `src/game`。

## 当前实现状态

截至 2026-05-09，项目已实现：

- Vite + React + TypeScript 工程。
- `src/game` 纯逻辑：tick、资源、行动、事件、境界、地点、关系、道途、因果、心魔、宗门、洞府、弟子、秘境、飞升。
- `src/content` 事件（186）、地点（29）、解锁配置（136+）、功法（51）、丹方（38）、草药（45）、秘境（14）、道途（12）、心魔（8）。
- `src/storage/save.ts` localStorage 存档和迁移入口（版本 14）。
- `src/ui` 主界面和 game loop hook，渐进揭示所有系统面板。
- Vitest 466 个测试用例，30 个测试文件。
- Playwright 浏览器烟测脚本 `npm run smoke`。

当前架构缺口：

- 事件仍只保存 `activeEventId`，后续动态 NPC/敌人/地点参数需要 `activeEventContext`。
- UI 已统一到单份 CSS，但还未拆分 `ResourcePanel`、`ActionPanel`、`LogPanel`、`EventModal`。
- 离线收益已做基础批量 tick，后续事件抽样、日课、闭关仍需要更细的批量结算规则。
- PWA 离线能力、静态部署、云存档评估尚未启动。

## 状态模型

第一版就应显式建模：

- 资源：气、精元、药、钱、见闻/神识、寿元、伤。
- 地点账本：地点 id、行动、事件权重、危险度、物价、灵气、季节修正。
- 关系账本：对象 id、身份、关系标签、最近交互、债/人情/仇怨、存活/离开/坐化状态。
- 选择状态：flags、tags、qualities，供后续事件和日志读取。
- 随机源：seed + 可注入 random provider，保证事件测试稳定。

## 存档阶段

### 阶段 1：本地 JSON 存档

- 使用 `localStorage` 保存小型版本化 JSON。
- 提供导出/导入存档码，解决跨设备迁移。
- 每个存档包含 `version`、`createdAt`、`updatedAt`、`seed`。

### 阶段 2：结构化本地存档

- 事件日志、多存档位、统计和历史变复杂后迁到 IndexedDB。
- IndexedDB 适合大量结构化数据，但 API 更复杂，应通过封装层隔离。

### 阶段 3：云存档

- 只在核心玩法稳定后接入。
- 候选：Firebase、Supabase、自建轻量 API。
- 必须处理账号、冲突合并、离线写入、隐私和迁移。

## 测试要求

- 每个资源和行动有确定性测试。
- 随机事件接受 seed 或 random provider。
- 地点事件权重、关系账本、flags/tags/qualities 有测试。
- 存档迁移必须有旧版本样例测试。
- 浏览器烟测覆盖：新开局、执行若干行动、刷新恢复、导出导入、重置。
