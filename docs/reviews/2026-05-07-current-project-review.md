# 2026-05-07 项目全面审查

## 结论

当前项目已经从“立项文档”进入“阶段 1 原型骨架”状态：Vite + React + TypeScript、核心 `src/game` 逻辑、localStorage 存档、事件弹窗、地点/关系/选择账本、轻量斗法和 34 个 Vitest 测试都已建立。整体方向符合此前讨论的“淡然旁观、渐进揭示、道途不早锁、世界有记忆、反坐牢”的原则，但目前仍是骨架级可玩闭环，距离“有手感的第一阶段修行体验”还有一轮关键清洗。

验证结果：

```text
npm ci: passed
npm test: 9 test files, 34 tests passed
npm run build: passed
```

## 代码审查

### 已做得好的部分

- `src/game` 和 `src/ui` 已分层，核心状态变化没有完全塞进 React 组件。
- `GameState` 已包含资源、时间、境界、灵根、地点、关系、选择状态和事件阻塞状态。
- 测试覆盖了状态初始化、tick、行动、解锁、地点、关系、事件、斗法和存档迁移入口。
- `save.ts` 已有 `CURRENT_SAVE_VERSION` 和 `migrateSaveData`，后续可承接存档升级。
- 事件弹窗使用 `activeEventId` 暂停 tick，避免玩家在事件未处理时继续积累。
- 双机环境约束已经写入 `.npmrc`、`package.json engines`、`docs/dev-environment*.md`。

### 需要修复/优化

1. **UI 未接入地点行动过滤**
   `src/ui/App.tsx:73-87` 直接渲染 `unlockedActions`。这绕过了 `src/game/location.ts` 的 `getAvailableActionsAtLocation`，导致地点模型目前只在测试里有效。应改为按当前地点过滤行动，并提供地点切换 UI。

2. **地点配置与行动表不一致**
   `src/content/locations.ts:7` 写了 `guanxiang`，但 `src/game/actions.ts` 没有该行动；同时初始行动 `kuzuo` 不在 `home.availableActions` 中。当前 UI 不按地点过滤所以暂未暴露，一旦接入地点系统就会导致开局按钮消失或行动缺失。

3. **资源面板过早暴露，违背渐进揭示**
   `src/ui/App.tsx:55-64` 开局显示所有资源，包括寿元、伤势、钱、草药。此前设计明确要求资源未被感知前不显示。应增加 `discoveredResources` 或基于 flags/历史值的显示规则。

4. **离线 tick 仍是逐 tick 循环**
   `src/game/tick.ts:40-47` 对离线时间使用 `while` 循环。短期测试能过，但离线数小时/数天会造成大量状态复制和浏览器卡顿。需要批量结算基础恢复/寿元，再对事件抽样做上限控制。

5. **时间模型没有推进 day/season/year**
   `src/game/tick.ts:17-24` 只增加 tick 和扣寿元，`day/season/year` 不变。季节、年份和寿元压力是本项目的核心语法，应尽快实现日历推进。

6. **关系账本还没接入事件内容**
   `src/content/events.ts:54` 仍有 `TODO: add relationship`。受伤散修事件只设置 flag，没有产生 NPC 条目、人情或仇怨，世界记忆感不足。

7. **事件上下文无法保存动态变量**
   目前 `activeEventId` 只保存事件 id。若后续生成随机 NPC 名字、敌人强度、地点参数，仅存 id 不够。需要 `activeEventContext` 或 `pendingEvent` 结构。

8. **行动逻辑仍有硬编码和命名残留**
   `src/game/actions.ts:3` 说明行动还硬编码在逻辑层；`src/game/actions.ts:67` 日志仍写“体力不足”，前端资源叫“精元”。建议移入 `src/content/actions.ts`，并统一文案。

9. **UI 样式和模板残留较多**
   `src/style.css` 仍包含 Vite 模板的 hero/social/next-steps 样式，实际 UI 又大量 inline style。后续应拆 `ResourcePanel`、`ActionPanel`、`LogPanel`、`EventModal`，统一 CSS。

10. **HTML 元数据曾是模板值，本轮整理已修正**
    审查时发现 `index.html` 的 `lang="en"` 和标题 `tmp_vite` 不符合中文游戏；本轮整理已改为 `lang="zh-CN"` 和 `文字修仙`。

11. **缺少浏览器自动烟测**
    报告提到进行了浏览器烟测，但仓库中尚无 Playwright 配置或测试。当前验证主要是 Vitest + build。

12. **测试暂时偏“存在性”，缺少体验路径测试**
    现有测试证明函数可用，但还没有覆盖完整开局链路：枯坐 -> 玉简事件 -> 吐纳解锁 -> 调息/地点/事件。应增加跨模块流程测试。

### 环境审查

- 当前工作机 Node `v24.15.0`、npm `11.12.1`；个人 PC Node `v22.14.0`、npm `10.9.2`。
- `package.json` 要求 Node `>=22.12.0`，两台机器都满足。
- `.npmrc` 设置 `lockfile-version=3` 和 `engine-strict=true`，配合 `npm ci` 能降低 lockfile 差异。
- 当前 Codex 环境里 PATH 可能优先命中 WindowsApps 的不可执行 node，需要继续使用 `C:\Program Files\nodejs` 前置 PATH 的方法。

## 游戏设计审查

### 符合既定方向

- 开局改成“枯坐 -> 发现玉简 -> 吐纳”，比“读书/休息”更贴合修仙语境。
- 已用 `insight/essence/qi/lifespan/wounds` 等资源承接神识、精元、气、寿元、伤势。
- 已引入地点、关系、选择 flags/tags/qualities、轻量斗法等底层账本，方向正确。
- 事件弹窗能承载“选择必须停下来处理”的文字游戏体验。

### 存在偏差

1. **淡然旁观还不稳定**
   初始日志“你降生于世，凡人庸庸碌碌，而你心向长生”仍偏主角动机叙述。更适合改成冷静记录式，例如“某年春，你在檐下枯坐。”。

2. **开局仍有“破败茅草屋/刺痛奇遇”的天崩味倾向**
   我们曾确定“不做天崩开局”。当前文本“破败的茅草屋”略偏惨，可以保留朴素但降低苦难感。

3. **寿元开局可见会削弱渐进揭示**
   寿元是一等压力，但不一定一开始展示。更好的做法是数据层一直存在，UI 在闭关、重伤、突破或首次年份推进后显示。

4. **道途还只是计数，没有形成反馈**
   `action_tuna_count` 已记录，但尚未驱动道途、事件、解锁或文案变化。需要把 qualities 接到事件权重和后续路线。

5. **世界鲜活度还停留在模型层**
   地点和关系已经建模，但 UI 没有地点切换，事件也没有真正写入关系账本，季节不流转。玩家暂时感受不到世界在转。

6. **反坐牢机制只有 flag，没有玩法**
   `unlocked_rike_tuna` 已存在，但没有对应“日课/小周天/自动运转”行动或 UI。吐纳仍可能变成每隔几秒点击一次。

7. **普通开局路线尚未实现**
   目前没有山居、乡塾、坊市、外门、游方等出身差异，仍是单一开局。

8. **第一版目标“凡人 -> 炼气一层”还没跑通**
   当前有真气和吐纳，但没有境界提升、炼气一层条件、突破结果和结算文案。

## 优先级建议

### P0：先修一致性和可玩链路

- 接入地点行动过滤并修正 `home.availableActions`。
- 实现资源渐进揭示。
- 实现日历推进。
- 将关系账本接入第一批事件。
- 增加完整开局流程测试。

### P1：再补反坐牢和世界感

- `unlocked_rike_tuna` 对应实际日课/小周天玩法。
- 季节修正影响采药、调息、物价或事件权重。
- 增加地点切换 UI、近日摘要和世界日志。

### P2：然后扩内容

- 普通出身路线。
- 凡人到炼气一层。
- 坊市传闻、宗门影子、轻量斗法事件链。
