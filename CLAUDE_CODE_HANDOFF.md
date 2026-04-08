# Liberty 1776 — Claude Code 交接文档

> 从 Cowork 桌面模式交接到 Claude Code CLI，供 GStack 工作流使用。
> 生成时间：2026-04-08

---

## 1. 项目概述

**Liberty 1776** 是一款单人浏览器卡牌游戏，主题为美国独立战争（1775-1783）。
- **目标用户**：Andy，11 岁五年级学生
- **灵感来源**：KARDS、Hearthstone
- **技术栈**：单文件 HTML/JS/CSS，零外部依赖，ES5 兼容
- **交付形态**：PWA（可安装到 iPad 桌面）

---

## 2. 当前状态：v5 READY FOR DEPLOYMENT

### 已完成的企业级工作流

| 阶段 | 状态 | 产出文件 |
|------|------|----------|
| PRD 产品需求 | ✅ | `docs/PRD.md` |
| ADR 架构决策 | ✅ | `docs/ADR.md` |
| 系统设计 | ✅ | `docs/SYSTEM_DESIGN.md` |
| 实现 (v5) | ✅ | `liberty_v5.html` (1545 行, 56KB) |
| 测试 | ✅ | `tests/test_game.js` + `docs/TEST_RESULTS.md` |
| 代码审查 | ✅ | `docs/CODE_REVIEW.md` |
| PWA 支持 | ✅ | `manifest.json` + `sw.js` + SVG icons |
| 玩家指南 | ✅ | `docs/PLAYER_GUIDE.md` |
| 部署 | ⬜ 未完成 | 需要 GitHub Pages 或其他托管 |

### 文件清单

```
Andy_Liberty_CardGame/
├── liberty_v5.html          # 游戏主文件 (md5: a847d493)
├── manifest.json            # PWA manifest
├── sw.js                    # Service Worker (cache-first)
├── icon-192.svg             # PWA 图标 192x192
├── icon-512.svg             # PWA 图标 512x512
├── docs/
│   ├── PRD.md               # 产品需求文档
│   ├── ADR.md               # 架构决策记录（6 项决策）
│   ├── SYSTEM_DESIGN.md     # 系统设计（状态机、双层卡牌、战斗引擎）
│   ├── CODE_REVIEW.md       # 代码审查报告
│   ├── TEST_RESULTS.md      # 测试报告
│   ├── TEST_SUMMARY.txt     # 测试摘要
│   └── PLAYER_GUIDE.md      # Andy 的玩家指南
├── tests/
│   └── test_game.js         # Node.js VM 自动化测试（15 轮模拟）
├── liberty_v4.html          # 旧版（有 bug，已废弃）
├── liberty_v3.html          # 旧版（极简 vibe coding 版）
├── liberty_v2.html          # 旧版（白屏 bug）
├── liberty.html             # 旧版 v1
└── _DIAGNOSTIC.html         # 浏览器环境诊断工具
```

---

## 3. 架构关键点

### 技术架构
- **模块模式**：IIFE (`var Liberty = (function() { ... })()`)
- **卡牌系统**：双层设计 — CardDef（不可变模板）+ CardInstance（运行时可变实例）
- **状态机**：`menu → player → animating → enemy → over`
- **战斗引擎**：**Mark-and-Sweep**（标记死亡单位，战斗全部结束后统一清除）
- **AI**：规则加权（单位优先 > 英雄 > 命令牌，cost×2 + 稀有度加权）
- **音效**：Web Audio API 程序化合成（无外部音频文件）
- **渲染**：集中式 `render()` 函数，所有 DOM 操作通过它触发

### 卡牌数据（22 张，11/阵营）

**Patriots**: Minuteman(1), Patriot Militia(2), Frontier Rifleman(3), Continental Regular(4), French Infantry(5), Washington(6,legendary), Lafayette(4,rare), Franklin(3,rare), Crossing Delaware(3,order), Declaration(2,order), Saratoga(4,order,rare)

**British**: Redcoat(2), Grenadier(3), Dragoon(3), Hessian(4), Royal Guards(5,rare), Cornwallis(6,legendary), Howe(5,rare), Tarleton(4,rare), Stamp Tax(2,order), Bunker Hill(4,order,rare), Blockade(3,order)

---

## 4. 已修复的 Bug（v4 → v5）

### Bug 1: 数组遍历时突变（v4 崩溃根因）⚠️ CRITICAL
- **症状**：出一次牌后游戏崩溃
- **根因**：`resolveCombat()` 在 `for` 循环内用 `Array.filter()` 替换 `G.enemy.board`，导致索引越界访问 undefined
- **修复**：Mark-and-Sweep — `resolveCombat()` 只设 `unit.dead = true`，`sweepDead()` 在所有战斗结束后统一清除

### Bug 2: 玩家单位永不刷新
- **症状**：攻击一次后单位永远 exhausted
- **根因**：`endTurn()` 只重置敌方 exhausted，新回合未重置玩家单位
- **修复**：在 enemyTurn 结束、新玩家回合开始时添加 `G.player.board[i].exhausted = false` 循环

### Bug 3: `_drawCards` 硬编码为玩家
- **症状**：敌方英雄 Howe 的 battleCry 抽牌，结果抽给了玩家
- **根因**：`_drawCards()` 只从 `G.player.deck` 抽取
- **修复**：引入 `_activeSide` 上下文变量，`playCard` 和 `enemyTurn` 分别设置后再调用 battleCry

### Bug 4: 满场时无法打出命令牌
- **症状**：场上 5 个单位时，命令牌变灰不可用
- **根因**：`canPlayCard()` 对所有卡牌类型一刀切检查 `board.length < 5`
- **修复**：命令牌跳过场上数量检查（`if (type === "order") return true`）

### Bug 5: AI 优先打命令牌不下兵
- **症状**：AI 每回合先花光资源打命令牌，不铺场
- **根因**：命令牌 priority = 10+，单位 priority = cost（1-6）
- **修复**：单位 priority = cost×2 + 稀有度加权，命令牌 priority = cost+1

---

## 5. 待办事项（Claude Code 接手后）

### P0 — 部署
```bash
# 初始化仓库
git init
git add liberty_v5.html manifest.json sw.js icon-192.svg icon-512.svg docs/ tests/
git commit -m "Liberty 1776 v5 — production build with enterprise workflow"

# 创建 GitHub 仓库并推送
gh repo create liberty-1776 --public --source=. --push

# 开启 GitHub Pages
# GitHub 仓库 Settings → Pages → Branch: main → Save
# 上线后访问: https://<username>.github.io/liberty-1776/liberty_v5.html
```

### P1 — GStack 工作流
```bash
/review          # GStack 代码审查（可能发现更多问题）
/qa              # GStack 自动化 QA
/ship            # GStack 部署
```

### P2 — 后续迭代（Andy 试玩反馈后）
- [ ] AI 难度调节（简单/普通/困难）
- [ ] 新卡牌（法国援军、海军系列、间谍系列）
- [ ] 成就系统（「首胜」「10连胜」「收集全部卡牌」）
- [ ] 战役模式（按历史时间线打关卡：列克星敦 → 邦克山 → 特伦顿 → 萨拉托加 → 约克镇）
- [ ] 多人对战（WebRTC P2P）

### P3 — 已知技术债
- [ ] `_activeSide` 全局上下文变量不够优雅，应改为传参
- [ ] battleCry 函数直接引用 `G.player`/`G.enemy`，耦合度高
- [ ] 没有 undo/replay 系统
- [ ] 缺少 ESLint 配置
- [ ] CSS 没有提取为变量（颜色、尺寸硬编码）

---

## 6. 测试验证命令

```bash
# 语法检查
node --check <(sed -n '/<script>/,/<\/script>/p' liberty_v5.html | sed '1d;$d')

# 自动化测试（15 轮模拟）
node tests/test_game.js

# 预期输出：
# ✅ Script loaded, Liberty exposed
# ✅ Game started as Patriots
# ✅ Turn 1-10 completed — NO CRASH
# ✅ 5 turns as British — no crash
# ✅✅✅ ALL TESTS PASSED ✅✅✅
```

---

## 7. 部署后验证清单

- [ ] iPad Safari 打开链接，游戏正常显示
- [ ] 选择 Patriots，游戏开始，手牌显示 4 张
- [ ] 打出一张 1-cost 单位，单位出现在战场
- [ ] 点 End Turn，敌方 AI 正常行动（不崩溃）
- [ ] 打完 10 轮不崩溃
- [ ] 打出命令牌（如 Declaration of Independence），效果正常触发
- [ ] 满场（5 单位）时命令牌仍可使用
- [ ] 点击卡牌显示历史事实 tooltip
- [ ] HP 降到 0 时游戏结束画面正常
- [ ] Share → Add to Home Screen → 图标显示正确
- [ ] 断网后从主屏幕打开，游戏仍可运行（Service Worker 缓存）

---

## 8. 联系方式

- **项目负责人**：Lijuan (lexieljzhao@gmail.com)
- **最终用户**：Andy (andy.mingzhang.du@gmail.com)
- **设备**：Andy 的 iPad，Apple ID 同上

---

*此文档由 Cowork 家族办公室 · 教育与人才发展部 生成，交接至 Claude Code CLI + GStack 工作流。*
