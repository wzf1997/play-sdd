## Why

移动端游戏落地页需要频繁上新玩法（九宫格、转盘、盲盒等），但每次新玩法都要从零开发，缺乏统一骨架和复用机制。本项目建立一套 Spec-Driven Development（SDD）框架，让开发者先写规格文档，再用 Cursor / Claude Code 按规格生成骨架层与 BFF 层代码，显著降低新玩法接入成本。

## What Changes

- 新建 Monorepo 工程（pnpm workspaces），包含四层架构：皮肤层、骨架层、BFF 层、服务层
- 引入 `game-core` 包，定义 `GamePlugin` 标准接口与游戏注册表
- 引入 `bff-contracts` 包，定义前后端共享的 API 类型契约
- 新建 BFF 服务（Node.js + Fastify），支持游戏路由自动扫描注册
- 新建 Service 服务（Node.js + Fastify + SQLite），管理活动/奖品/用户三个领域
- 新建 Web 前端（React + Vite），含可替换皮肤系统（CSS variables）
- 提供三种游戏插件：九宫格（grid9）、转盘（spin-wheel）、盲盒（blind-box）
- 提供一个示例落地页（Demo Campaign），展示三种玩法的 Tab 切换

## Capabilities

### New Capabilities

- `game-plugin-interface`: 定义 GamePlugin 标准接口、GameProps、BffRoute、Prize 类型，以及游戏注册表（register/get）
- `bff-game-api`: BFF 层标准游戏 API，包含 init / play / result 三个端点，支持鉴权和限流中间件
- `game-grid9`: 九宫格抽奖游戏插件，含 React 组件（动画）+ BFF 路由 + 业务规则
- `game-spin-wheel`: 转盘抽奖游戏插件，含 React 组件（旋转动画）+ BFF 路由 + 业务规则
- `game-blind-box`: 盲盒游戏插件，含 React 组件（开箱动画）+ BFF 路由 + 业务规则
- `skin-system`: 皮肤主题系统，基于 CSS variables，提供 default 皮肤，支持运行时切换
- `campaign-service`: 服务层活动管理，含 SQLite 数据模型（campaigns / prizes / user_plays）
- `demo-landing-page`: 示例落地页，Tab 切换三种玩法，展示框架完整能力

### Modified Capabilities

<!-- 无现有规格需要变更 -->

## Impact

- **新增依赖**：pnpm workspaces、React 18、Vite、Fastify、better-sqlite3、TypeScript
- **目录结构**：全新 Monorepo，不影响任何现有代码
- **API**：新增 `/api/game/:gameId/init`、`/api/game/:gameId/play`、`/api/game/:gameId/result` 三类端点
- **数据库**：本地 SQLite 文件，开发阶段零配置
