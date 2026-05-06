# 增量/文字游戏设计调研补充

更新时间：2026-05-06

## 参考来源

- [A Dark Room GitHub](https://github.com/doublespeakgames/adarkroom)
- [The making of A Dark Room](https://www.pocketgamer.biz/shedding-light-the-making-of-a-dark-room/)
- [Level 13 GitHub](https://github.com/nroutasuo/level13)
- [Fallen London](https://www.failbettergames.com/games/fallen-london)
- [Twine](https://twinery.org/)
- [ink](https://www.inklestudios.com/ink/)
- [Machinations: How to design idle games](https://machinations.io/articles/idle-games-and-how-to-design-them)
- [GameAnalytics: core loop](https://www.gameanalytics.com/blog/how-to-perfect-your-games-core-loop)
- [Vite guide](https://vite.dev/guide/)
- [MDN localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage)
- [MDN IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [MDN PWA offline operation](https://developer.mozilla.org/docs/Web/Progressive_web_apps/Guides/Offline_and_background_operation)

## 设计经验

### 渐进揭示

`A Dark Room` 和 `Level 13` 都不是一开始展示完整菜单，而是随着玩家推进逐步开放地点、资源、行动和长期目标。对本项目的启示：

- 开局 UI 必须窄。
- 新系统需要通过玩家行动或世界变化出现。
- 每次展开都要改变玩家对原有资源的理解。

### 核心循环与 meta loop

Machinations 的 idle game 设计文章强调低门槛核心循环、经济设计、离线进展和更复杂的 meta loop。对本项目的启示：

- 初期核心循环要简单：行动 -> 资源 -> 转化 -> 解锁。
- 中后期 meta loop 不能只是倍率，应加入瓶颈、寿元、道途、因果、飞升。
- 离线收益应存在，但关键选择不应在离线期间自动替玩家做。

### 反重复

增量游戏玩家能接受重复，但不能接受长期无意义点击。社区讨论中常见共识是：旧机制应该逐步自动化，新机制成为当前注意力中心。对本项目的启示：

- 手动动作最多是学习阶段。
- 批量操作、日课、闭关、阵法和托管是必须的。
- 如果玩家需要一直重复点击同一个低阶动作，说明设计失败。

### 鲜活世界

文字游戏不靠视觉密度，而靠状态变化和可记忆事件。对本项目的启示：

- 季节、地点、人物关系、物价、传闻和机缘应有自己的变化。
- 随机事件要被状态调制，不做孤立的随机奖惩。
- 日志既记录玩家，也记录世界照常运转。

### 状态账本

文字游戏最怕“选项很多但世界不记得”。Twine 和 ink 都强调变量、条件逻辑和分支能力；`Fallen London` 的长期魅力也来自选择、声望、职业、地点和季节活动持续积累。对本项目的启示：

- 少做一次性选项，多做可被后续读取的状态。
- 选择后果用 flag/tag/quality 组织，避免不可维护的指数级分支。
- 短会话需要“近日摘要”和清晰的下一步。

### 仙侠系统语法

修仙游戏常见复杂度来自五行、风水、灵根、功法、丹药、法宝、寿元、天劫和宗门关系。对本项目的启示：

- 早期不展示全表，但核心数据结构要预留。
- 寿元和时间推进必须参与设计。
- 地点、季节、相性和关系共同调制事件，比纯随机更有修仙味。

## 程序经验

- Vite 适合轻量静态 Web 游戏，后续部署到 GitHub Pages、Netlify、Vercel 都容易。
- `localStorage` 适合第一版小型 JSON 存档，跨浏览器会话保留。
- IndexedDB 适合后续大量结构化存档和日志。
- PWA service worker 可让游戏在无网络时仍打开基础资源。
- 核心游戏逻辑应独立于 React，便于测试、迁移和未来可能的移动壳封装。
