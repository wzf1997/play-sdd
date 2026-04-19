## 1. Monorepo 基础搭建

- [ ] 1.1 初始化根 `package.json`，配置 pnpm workspaces（packages/*、apps/*）
- [ ] 1.2 创建根 `tsconfig.base.json`，设置 strict、paths 等公共配置
- [ ] 1.3 创建 `packages/game-core/` 目录结构（src/types.ts、src/registry.ts、src/index.ts、package.json、tsconfig.json）
- [ ] 1.4 创建 `packages/bff-contracts/` 目录结构（src/game-api.ts、package.json、tsconfig.json）
- [ ] 1.5 运行 `pnpm install` 验证 workspace 依赖解析正常

## 2. game-core 包实现

- [ ] 2.1 实现 `GamePlugin`、`GameProps`、`BffRoute`、`Prize` TypeScript 接口（对应 game-plugin-interface spec）
- [ ] 2.2 实现 `registerGame` 和 `getGame` 注册表函数（内存单例 Map）
- [ ] 2.3 导出所有类型和函数（src/index.ts）
- [ ] 2.4 验证 TypeScript 编译通过（`pnpm -F game-core build`）

## 3. bff-contracts 包实现

- [ ] 3.1 定义 `InitRequest`、`InitResponse`、`PlayRequest`、`PlayResponse`、`ResultResponse` 接口
- [ ] 3.2 导出所有类型（src/index.ts）
- [ ] 3.3 验证 TypeScript 编译通过

## 4. Service 服务搭建

- [ ] 4.1 创建 `apps/service/` 目录，初始化 package.json（依赖：fastify、better-sqlite3、@types/better-sqlite3）
- [ ] 4.2 实现 SQLite 初始化脚本（`src/db.ts`），创建 campaigns、prizes、user_plays 三张表
- [ ] 4.3 实现 Demo 数据 seed 脚本（`src/seed.ts`），插入 demo-001 活动 + 三种玩法各自的奖品池
- [ ] 4.4 实现 `src/campaigns/` 模块：`getCampaign(id)`、`getConfig(campaignId)`
- [ ] 4.5 实现 `src/prizes/` 模块：`drawPrize(campaignId)`（按权重随机 + 库存检查）
- [ ] 4.6 实现 `src/users/` 模块：`getRemainingPlays(userId, campaignId)`、`recordPlay(userId, campaignId, gameId, prizeId)`
- [ ] 4.7 实现 Fastify 服务入口（`src/server.ts`），注册路由、启动时执行 seed
- [ ] 4.8 实现 `/api/internal/game/:gameId/init`、`/play`、`/result` 内部路由（供 BFF 调用）
- [ ] 4.9 验证 Service 服务可启动，seed 数据正常写入

## 5. BFF 服务搭建

- [ ] 5.1 创建 `apps/bff/` 目录，初始化 package.json（依赖：fastify、@fastify/rate-limit）
- [ ] 5.2 实现 auth 中间件（验证 x-user-token header 非空）
- [ ] 5.3 实现 rate-limit 插件（同一 userId 每秒最多 5 次 play 请求）
- [ ] 5.4 实现 grid9 路由文件（`src/routes/game/grid9.ts`）：init / play / result，转发至 Service 层
- [ ] 5.5 实现 spin-wheel 路由文件（`src/routes/game/spin-wheel.ts`）
- [ ] 5.6 实现 blind-box 路由文件（`src/routes/game/blind-box.ts`）
- [ ] 5.7 实现 BFF 服务入口（`src/server.ts`），自动扫描注册 routes/game/ 下所有路由
- [ ] 5.8 验证 BFF 服务可启动，三个游戏的 init 接口返回正确数据

## 6. Web 前端搭建

- [ ] 6.1 创建 `apps/web/` 目录，使用 `npm create vite` 初始化 React + TypeScript 项目
- [ ] 6.2 配置 vite.config.ts，添加对 game-core 包的路径别名
- [ ] 6.3 创建 `src/skins/default/tokens.css`，定义全部标准 CSS variables（蓝紫主色调）
- [ ] 6.4 在 `src/main.tsx` 中引入 default 皮肤 CSS，根元素添加 `skin-default` class

## 7. 游戏组件实现

- [ ] 7.1 实现 `src/games/Grid9/index.tsx`：3×3 宫格布局 + 跑马灯 CSS 动画 + onResult 回调
- [ ] 7.2 实现 `src/games/Grid9/index.tsx` 与 BFF init/play 接口对接（fetch）
- [ ] 7.3 实现 `src/games/SpinWheel/index.tsx`：SVG 圆形转盘 + CSS 旋转动画 + onResult 回调
- [ ] 7.4 实现 `src/games/SpinWheel/index.tsx` 与 BFF 接口对接，按 winIndex 计算目标旋转角度
- [ ] 7.5 实现 `src/games/BlindBox/index.tsx`：礼盒图案 + 开箱 CSS 动画 + onResult 回调
- [ ] 7.6 实现 `src/games/BlindBox/index.tsx` 与 BFF 接口对接
- [ ] 7.7 在 `src/main.tsx` 中调用 registerGame 注册三个游戏插件

## 8. Demo 落地页实现

- [ ] 8.1 实现 `src/pages/DemoCampaign.tsx`：Banner 区（全屏头图占位）+ 活动标题 + 倒计时组件
- [ ] 8.2 实现 GameTabs 组件（三个 Tab：九宫格 | 转盘 | 盲盒），点击切换当前游戏组件
- [ ] 8.3 实现 PrizeHistory 组件，调用 result 接口，展示中奖记录列表
- [ ] 8.4 在 onResult 回调中触发 PrizeHistory 刷新
- [ ] 8.5 验证 Demo 落地页在 375px 宽度下布局正常

## 9. 联调验证

- [ ] 9.1 同时启动 Service（端口 3001）、BFF（端口 3000）、Web（端口 5173），验证三个服务正常运行
- [ ] 9.2 在浏览器中完整走通九宫格抽奖流程（init → 动画 → play → onResult → 记录刷新）
- [ ] 9.3 在浏览器中完整走通转盘抽奖流程
- [ ] 9.4 在浏览器中完整走通盲盒开箱流程
- [ ] 9.5 验证次数耗尽后三种游戏均禁用按钮
- [ ] 9.6 验证切换皮肤（手动修改 class）后页面颜色正常更新
