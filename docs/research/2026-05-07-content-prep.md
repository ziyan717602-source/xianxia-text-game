# 2026-05-07 后续内容资料准备

本轮调研目标：为阶段 1C 和阶段 2 提前准备游戏资料、信息和文本素材，不直接改玩法代码。

## 资料来源

- [Xiuzhen (Immortality Cultivation) Fantasy](https://vtechworks.lib.vt.edu/server/api/core/bitstreams/daedeaa0-ebe2-4e36-b6ce-52747b8b608d/content)：学术文章，说明修真/修仙幻想从道教炼养、武侠和网络文学中发展出“通过修炼追求更高存在状态”的类型语法。
- [Xianxia - Wikipedia](https://en.wikipedia.org/wiki/Xianxia)：仅作类型概览辅助，确认仙侠常受中国神话、道教、佛教、儒家、武术、中医、民间信仰和炼丹等传统元素影响。
- [Qi - Britannica](https://www.britannica.com/topic/qi-Chinese-philosophy)：将 qi 作为中国哲学、医学和宗教中的宇宙性身心能量来理解，可转化为游戏里的真气/灵气系统。
- [Wuxing - Britannica](https://www.britannica.com/topic/wuxing)：五行/五相与变化、方向、季节、颜色等关联，适合做地点、季节、功法和药性相性。
- [Wuxing - Internet Encyclopedia of Philosophy](https://iep.utm.edu/wuxing/)：强调 wuxing 更宜理解为动态的五种“过程/相”，而非固定物质元素；这对游戏里的相生相克和季节流转更有用。
- [The 24 Solar Terms - Hong Kong Observatory](https://www.weather.gov.hk/en/gts/time/24solarterms.htm)：二十四节气按黄道 24 个等分位置组织，可作为游戏日历、季节事件和物候变化素材。
- [The Four Natures and Five Flavors - Bencao Dian](https://bencaodian.org/en/concepts/four-natures-five-flavors/)：草药可用性味、归经、升降浮沉等属性描述；本项目只借鉴分类结构，所有草药和丹药均虚构，不提供医疗建议。
- [How to design idle games - Machinations](https://machinations.io/articles/idle-games-and-how-to-design-them)：增量/放置游戏应有低门槛核心循环、可花费资源的经济层、可见进度和更复杂的元循环。
- [Variables - Twine Cookbook](https://twinery.org/cookbook/terms/terms_variables.html)：文字游戏的状态记忆可用变量保存，支持后续段落读取；对应本项目的 flags/tags/qualities/relationships。
- [ink - inkle](https://www.inklestudios.com/ink/)：专业互动叙事工具强调文本优先、逻辑嵌入、可测试写作；对应本项目“短文本 + 状态账本”的内容方式。

## 转化原则

- 只借鉴公共文化概念和机制结构，不使用任何现有 IP 的专有名称、角色、剧情、地图、宗门、法宝或文案。
- 所有草药、丹方、功法和宗门名称先做项目原创命名。
- 中医、炼丹、气功等现实概念只作为幻想系统素材，不做现实功效描述。
- 优先准备可进入数据结构的素材：`id`、地点、季节、权重、条件、资源变化、flag/tag/quality、关系变化。

## 对当前计划的直接支持

### 阶段 1C

- 第一批状态调制事件：使用地点、季节、关系、道途权重。
- 近日摘要和世界日志：使用节气、地点传闻、NPC 去留和资源短缺生成短句。
- 20-30 分钟手感测试：使用增量游戏低门槛核心循环和元循环原则检查节奏。

### 阶段 2

- 普通开局路线：山居、乡塾、坊市、外门、游方。
- 灵根/五行/功法相性：把五行当作变化相位，影响效率、瓶颈、地点灵气和季节加成。
- 丹药/丹毒/配方：用药性轴设计丹药，而非单纯“加数值”。
- 宗门传闻/外门规矩：先做世界痕迹，再做完整系统。
