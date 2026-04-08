# Liberty 1776 — Andy's American Revolution Card Game

**项目类型**: 教育与人才发展部 · Andy学业项目
**日期**: 2026-04-04
**目标学员**: Andy (Grade 5)
**学习目标**: 通过KARDS风格的卡牌对战游戏，掌握美国独立战争(1775–1783)的关键人物、战役、事件与因果关系。

---

## 1. 游戏简介

**Liberty 1776** 是一款受 [KARDS](https://www.kards.com/) 启发的单页面卡牌对战游戏。玩家扮演大陆军(Patriots)或英国王室(British Crown)，通过部署士兵、发布命令、召唤历史英雄，攻破敌方司令部(HQ)取得胜利。

**核心数字**:
- 40+ 张真实历史卡牌 (单位 / 命令 / 英雄)
- 2 个阵营: Patriots / British
- 25 HP HQ · 10 Supply 上限
- 双排战线系统 (Frontline + Support)
- AI对手 · 历史事实侧边栏

---

## 2. 如何开始

1. 打开文件夹 `Andy_Liberty_CardGame/`
2. 双击 `liberty.html` —— 在Chrome/Safari/Edge任意浏览器中打开即可运行
3. 无需联网、无需安装、无依赖

---

## 3. 游戏机制 (KARDS核心元素)

**战场布局**: 每方有两排 —— 前线(Frontline)和支援(Support)。攻击时必须先清空敌方前线才能打到支援单位或HQ。

**资源系统**: 每回合Supply上限+1 (最高10)并回满。玩家用Supply支付卡牌费用。

**单位能力**:
- **Blitz** — 入场即可行动 (骑兵/掷弹兵)
- **Ambush** — 埋伏部署 (游击队)
- **Support only** — 只能放后排，不能攻击但提供火力 (炮兵)
- **Hero** — 每牌组唯一，带光环加成 (Washington/Cornwallis等)

**胜利条件**: 将敌方HQ血量打到0。

---

## 4. 学习价值 (教育与人才发展部视角)

每张卡牌都对应**真实历史**，鼠标悬停会显示详细说明。每次首次打出一张卡，右侧 *Historical Record* 会记录一条历史事实。Andy在玩一局游戏(约15–20分钟)的过程中，会自然接触到以下知识点:

- **关键人物**: Washington, Lafayette, Daniel Morgan, John Paul Jones, Cornwallis, Tarleton, Howe, Major André
- **关键战役**: Lexington & Concord, Ticonderoga, Trenton, Saratoga, Cowpens, Yorktown
- **关键事件**: Stamp Act, Boston Occupation, Common Sense, Declaration of Independence, Valley Forge, French Alliance
- **军事概念**: 民兵 vs 正规军、游击战术、海军封锁、雇佣兵(Hessians)、殖民地内战(Loyalists)

---

## 5. GitHub资源参考

本游戏从零用原生HTML/JS构建，未引入外部依赖以保证离线运行。设计时参考了以下开源项目的思路:

- **boardgame.io** — 回合制状态管理模式
- **KARDS机制参考** — Frontline/Support分区、Blitz/Ambush关键字、Kredits资源系统
- **card-game-simulator** (Unity开源) — 卡面布局设计

如需将来升级为联机版或AI强化版，可以直接迁移到 `boardgame.io` 框架。

---

## 6. 跨部门联动 (家族CEO备注)

- **教育部**: 建议Andy每玩完一局，把侧边栏的历史事实抄3条到笔记本，形成"游戏→笔记"闭环
- **日常运营部**: 可列入周末家庭活动清单，每周日下午30分钟
- **传承部**: 这是Andy第一个"由AI为他定制的学习产品"，建议保存为家族数字资产

---

## 7. 后续迭代方向 (v2路线图)

| 优先级 | 功能 | 部门 |
|---|---|---|
| P0 | 增加"任务挑战"模式 (重演Yorktown等真实战役) | 教育部 |
| P1 | 添加Civil War和WWII两个扩展包 | 教育部 |
| P2 | 成就系统 + 历史知识测验 | 教育部 |
| P3 | Andy可自己设计卡牌的编辑器 | 教育部+人才发展 |

---

## [教育与人才发展部 · 下一步行动]

1. **今晚**: 打开 `liberty.html` 让Andy试玩一局，观察他的兴趣和理解程度
2. **本周**: 收集Andy反馈 (难度/卡牌数量/视觉风格)，迭代v1.1
3. **本月**: 如果Andy喜欢，启动"任务模式"开发，把他五年级正在学的美国史内容全部映射进去
4. **归档**: 本文件存入Obsidian `家族管理/教育部/Andy/Liberty1776项目/`
