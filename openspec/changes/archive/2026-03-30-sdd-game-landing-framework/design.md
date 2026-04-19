## Context

目前移动端游戏落地页每次新增玩法均需从零开发，前后端接口约定散落在口头沟通中，皮肤与逻辑耦合，难以复用。本项目采用 SDD（Spec-Driven Development）方法论，在 Monorepo 中建立清晰的四层架构，以 spec 文件作为唯一真相来源，Cursor / Claude Code 读取 spec 生成骨架层（game-core）与 BFF 层代码，皮肤层与逻辑层彻底解耦。

技术栈：React 18 + Vite（前端）、Node.js + Fastify（BFF & 服务层）、SQLite（本地数据库）、pnpm workspaces（Monorepo）、TypeScript 全栈。

## Goals / Non-Goals

**Goals:**
- 建立四层架构 Monorepo，层边界清晰，AI 生成范围明确
- 定义 `GamePlugin` 标准接口，使任意新玩法可注册到同一框架
- 定义 Spec 文档格式（YAML frontmatter + Markdown），驱动 AI 代码生成
- 实现三个游戏插件（grid9 / spin-wheel / blind-box）作为框架参考实现
- 实现可替换皮肤系统（CSS variables），皮肤切换不触碰游戏逻辑
- 交付一个可运行的 Demo 落地页

**Non-Goals:**
- 自动化代码生成 Pipeline（AI 生成仍由人工触发）
- 多租户/多活动并行管理后台
- 生产级 PostgreSQL 迁移（本期仅 SQLite）
- 移动端原生 App（仅 H5 落地页）

## Decisions

### D1：Monorepo 工具选择 pnpm workspaces

**选择**：pnpm workspaces（不引入 Turborepo / Nx）

**理由**：项目初期规模小，pnpm workspaces 零配置即可完成包引用，避免过早引入构建编排复杂度。后续如需增量构建缓存，再引入 Turborepo。

**备选**：Turborepo —— 优势是增量缓存，但当前三个 app + 两个 package 规模不值得。

---

### D2：游戏插件以 React 组件 + BFF 路由为单元

**选择**：每个 GamePlugin 同时携带 `component`（React）和 `bffRoutes`（Fastify 路由）

**理由**：游戏的前后端契约高度内聚，放在同一插件中避免前后端版本漂移，也让 AI 从单个 spec 生成完整插件。

**备选**：前后端分别注册 —— 灵活但增加协调成本。

---

### D3：皮肤系统基于 CSS Variables，不使用 CSS-in-JS

**选择**：每套皮肤提供一个 `tokens.css`，根元素 class 切换主题

**理由**：CSS variables 运行时零开销，无需构建工具支持，浏览器原生切换，与 React 组件完全解耦。

**备选**：Tailwind themes / styled-components —— 前者需要构建时生成，后者增加运行时 bundle 体积。

---

### D4：BFF 层为薄层，不持久化

**选择**：BFF 只做鉴权、聚合、类型转换，所有状态由 Service 层持久化

**理由**：BFF 无状态易于横向扩展，服务层边界清晰，便于将来拆分为独立微服务。

---

### D5：数据库选 SQLite（better-sqlite3）

**选择**：本期使用 SQLite，schema 设计为可迁移至 PostgreSQL

**理由**：开发阶段零配置，不依赖外部服务，表结构简单（campaigns / prizes / user_plays 三张表），better-sqlite3 同步 API 与 Fastify 集成简单。

## Risks / Trade-offs

- **[风险] 游戏动画复杂度**：九宫格/转盘动画需要精确帧控制，React 组件内用 CSS animation + requestAnimationFrame 实现，复杂度较高 → **缓解**：每个游戏组件独立开发，动画逻辑封装在组件内部，不影响框架层
- **[风险] Spec 格式漂移**：随着玩法增多，spec 格式可能出现不一致 → **缓解**：在 `docs/specs/` 中维护一份 `spec-template.md`，作为所有新 spec 的参考模版
- **[权衡] SQLite 并发限制**：SQLite 写操作串行，高并发场景会成为瓶颈 → **接受**：本期为 Demo 场景，并发量低；生产环境切换 PostgreSQL 时只需替换 service 层数据库驱动
- **[权衡] 游戏注册表为内存单例**：服务重启后注册表清空，需应用启动时重新注册 → **接受**：游戏插件在 `apps/web/src/main.tsx` 和 `apps/bff/src/server.ts` 启动时静态注册，无动态加载需求

## Open Questions

- 鉴权方案：Demo 阶段使用 header `x-user-token`（简单 UUID），是否需要对接真实用户体系？（本期不对接）
- 奖品核销：中奖后发奖链路是否需要回调通知？（本期只记录 user_plays，不做发奖回调）
